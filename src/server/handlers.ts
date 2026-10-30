import type { DomainId, Rng } from '@/game/types';
import type { CardSource } from './card-source';
import { hashDevice } from './log';
import { makePlan, pickDomain, pickFlavor } from './plan';
import { buildPrompt } from './prompt';
import { takeAll, type LimitResult, type RateLimiter } from './rate-limit';
import { MAX_BODY_BYTES, MAX_FLAG_BODY_BYTES, parseCardsRequest, parseFlagRequest, readBody } from './validate';

export const PING_MS = 10_000;
export const BATCH_TIMEOUT_MS = 90_000;
/** Remembered per device so the next batch picks a different domain. */
const MAX_REMEMBERED_DEVICES = 10_000;

export interface HandlerDeps {
  /** Null when OPENROUTER_API_KEY or CARD_MODEL is missing: /api/cards answers 503. */
  source: CardSource | null;
  batchSize: number;
  limits: {
    cardsDevice: RateLimiter;
    cardsIp: RateLimiter;
    flagDevice: RateLimiter;
    flagIp: RateLimiter;
  };
  rng: Rng;
  now: () => number;
  log: (entry: Record<string, unknown>) => void;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function limited(result: LimitResult & { ok: false }) {
  return json({ error: 'rate_limited' }, 429, { 'retry-after': String(result.retryAfterSec) });
}

/**
 * Fly puts the caller's address in Fly-Client-IP. Elsewhere, the last X-Forwarded-For hop is
 * the one the nearest proxy appended; earlier hops are whatever the client sent.
 */
export function clientIp(request: Request): string {
  return request.headers.get('fly-client-ip') ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? 'unknown';
}

export function createHandlers(deps: HandlerDeps) {
  const lastDomain = new Map<string, DomainId>();

  const remember = (deviceId: string, domain: DomainId) => {
    lastDomain.delete(deviceId);
    lastDomain.set(deviceId, domain);
    if (lastDomain.size > MAX_REMEMBERED_DEVICES) lastDomain.delete(lastDomain.keys().next().value!);
  };

  async function health(): Promise<Response> {
    return json({ ok: true });
  }

  /** Order: validate (400) → rate limit, consuming a token (429) → configured (503) → stream. */
  async function cards(request: Request): Promise<Response> {
    const body = await readBody(request, MAX_BODY_BYTES);
    if (!body.ok) return json({ error: body.error }, body.error === 'body too large' ? 413 : 400);
    const parsed = parseCardsRequest(body.value);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const params = parsed.value;

    const limit = takeAll([
      [deps.limits.cardsIp, clientIp(request)],
      [deps.limits.cardsDevice, params.deviceId],
    ]);
    if (!limit.ok) return limited(limit);

    const source = deps.source;
    if (!source) return json({ error: 'unavailable' }, 503);

    const domain = pickDomain(params.domains, lastDomain.get(params.deviceId), deps.rng);
    remember(params.deviceId, domain);
    const plan = makePlan(deps.batchSize, deps.rng);
    const prompt = buildPrompt({ domain, plan, flavor: pickFlavor(deps.rng), recent: params.recent });
    const started = deps.now();
    const device = await hashDevice(params.deviceId);

    const abort = new AbortController();
    const onClientAbort = () => abort.abort(new Error('client closed'));
    // The client may already have gone during the awaits above; a listener added now would never fire.
    if (request.signal.aborted) onClientAbort();
    else request.signal.addEventListener('abort', onClientAbort);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        let firstCard = false;
        let timedOut = false;
        let sent = 0;
        const write = (event: Record<string, unknown>) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          } catch {
            closed = true;
          }
        };

        write({ event: 'start', domain, count: plan.length });
        // Reasoning models can think for a while before the first card; pings keep proxies from timing out.
        const ping = setInterval(() => write({ event: 'ping' }), PING_MS);
        const timeout = setTimeout(() => {
          timedOut = true;
          abort.abort(new Error('timeout'));
        }, BATCH_TIMEOUT_MS);

        void (async () => {
          let outcome = 'ok';
          let stats: Awaited<ReturnType<CardSource['getBatch']>> | null = null;
          try {
            stats = await source.getBatch({ domain, plan, prompt, signal: abort.signal }, (card) => {
              if (!firstCard) {
                firstCard = true;
                clearInterval(ping);
              }
              sent++;
              write({ event: 'card', card });
            });
            if (timedOut) {
              outcome = 'timeout';
              write({ event: 'error', code: 'timeout' });
            } else if (request.signal.aborted) {
              outcome = 'client_abort';
            } else {
              write({ event: 'done', sent: stats.sent });
            }
          } catch {
            outcome = timedOut ? 'timeout' : request.signal.aborted ? 'client_abort' : 'error';
            write({ event: 'error', code: timedOut ? 'timeout' : 'upstream_error' });
          } finally {
            clearInterval(ping);
            clearTimeout(timeout);
            request.signal.removeEventListener('abort', onClientAbort);
            if (!closed) {
              closed = true;
              try {
                controller.close();
              } catch {
                // Already closed by the client.
              }
            }
            deps.log({
              event: 'batch',
              device,
              domain,
              model: stats?.model ?? null,
              sent: stats?.sent ?? sent,
              dropped: stats?.dropped ?? null,
              latencyMs: deps.now() - started,
              usage: stats?.usage ?? null,
              outcome,
            });
          }
        })();
      },
      cancel() {
        abort.abort(new Error('client closed'));
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'application/x-ndjson',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    });
  }

  async function flag(request: Request): Promise<Response> {
    const body = await readBody(request, MAX_FLAG_BODY_BYTES);
    if (!body.ok) return json({ error: body.error }, body.error === 'body too large' ? 413 : 400);
    const parsed = parseFlagRequest(body.value);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const limit = takeAll([
      [deps.limits.flagIp, clientIp(request)],
      [deps.limits.flagDevice, parsed.value.deviceId],
    ]);
    if (!limit.ok) return limited(limit);
    deps.log({ event: 'flag', device: await hashDevice(parsed.value.deviceId), reason: parsed.value.reason, card: parsed.value.card });
    return json({ ok: true });
  }

  return { health, cards, flag };
}

export type Handlers = ReturnType<typeof createHandlers>;
