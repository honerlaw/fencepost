import type { DomainId } from '@/game/types';
import type { BatchStats } from '../card-source';
import { hashDevice } from '../log';
import { makePlan, pickDomain, pickFlavor } from '../plan';
import { buildPrompt } from '../prompt';
import { takeAll, type LimitResult } from '../rate-limit';
import { MAX_BODY_BYTES, MAX_FLAG_BODY_BYTES, parseCardsRequest, parseFlagRequest, readBody } from '../validate';
import { clientIp } from './client-ip';
import { BATCH_TIMEOUT_MS, PING_MS } from './constants';
import type { HandlerDeps, Handlers } from './types';

/** Remembered per device so the next batch picks a different domain. */
const MAX_REMEMBERED_DEVICES = 10_000;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'content-type': 'application/json', ...headers } });

function limited(result: LimitResult & { ok: false }) {
  return json({ error: 'rate_limited' }, 429, { 'retry-after': String(result.retryAfterSec) });
}

function health(): Promise<Response> {
  return Promise.resolve(json({ ok: true }));
}

export function createHandlers(deps: HandlerDeps): Handlers {
  const lastDomain = new Map<string, DomainId>();

  const remember = (deviceId: string, domain: DomainId) => {
    lastDomain.delete(deviceId);
    lastDomain.set(deviceId, domain);
    for (const oldest of lastDomain.keys()) {
      if (lastDomain.size <= MAX_REMEMBERED_DEVICES) break;
      lastDomain.delete(oldest);
    }
  };

  /** Order: validate (400) → rate limit, consuming a token (429) → configured (503) → stream. */
  async function cards(request: Request): Promise<Response> {
    const body = await readBody(request, MAX_BODY_BYTES);
    if (!body.ok) return json({ error: body.error }, body.error === 'body too large' ? 413 : 400);
    const parsed = parseCardsRequest(body.value);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const params = parsed.value;

    const limit = takeAll([
      [deps.limits.cardsIp, clientIp(request, deps.behindFly === true)],
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
        // Shared with the timers and the batch task, which all change it.
        const run = { closed: false, firstCard: false, timedOut: false, sent: 0 };
        const write = (event: Record<string, unknown>) => {
          if (run.closed) return;
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          } catch {
            run.closed = true;
          }
        };

        write({ event: 'start', domain, count: plan.length });
        // Reasoning models can think for a while before the first card; pings keep proxies from timing out.
        const ping = setInterval(() => write({ event: 'ping' }), PING_MS);
        const timeout = setTimeout(() => {
          run.timedOut = true;
          abort.abort(new Error('timeout'));
        }, BATCH_TIMEOUT_MS);

        const onCard = (card: unknown) => {
          if (!run.firstCard) {
            run.firstCard = true;
            clearInterval(ping);
          }
          run.sent++;
          write({ event: 'card', card });
        };

        const finished = (stats: BatchStats): string => {
          if (run.timedOut) {
            write({ event: 'error', code: 'timeout' });
            return 'timeout';
          }
          if (request.signal.aborted) return 'client_abort';
          write({ event: 'done', sent: stats.sent });
          return 'ok';
        };

        const failed = (): string => {
          write({ event: 'error', code: run.timedOut ? 'timeout' : 'upstream_error' });
          if (run.timedOut) return 'timeout';
          return request.signal.aborted ? 'client_abort' : 'error';
        };

        const batch = async (): Promise<{ outcome: string; stats: BatchStats | null }> => {
          try {
            const stats = await source.getBatch({ domain, plan, prompt, signal: abort.signal }, onCard);
            return { outcome: finished(stats), stats };
          } catch {
            return { outcome: failed(), stats: null };
          }
        };

        const close = () => {
          if (run.closed) return;
          run.closed = true;
          try {
            controller.close();
          } catch {
            // Already closed by the client.
          }
        };

        const finish = async () => {
          const { outcome, stats } = await batch();
          clearInterval(ping);
          clearTimeout(timeout);
          request.signal.removeEventListener('abort', onClientAbort);
          close();
          deps.log({
            event: 'batch',
            device,
            domain,
            model: stats?.model ?? null,
            sent: stats?.sent ?? run.sent,
            dropped: stats?.dropped ?? null,
            latencyMs: deps.now() - started,
            usage: stats?.usage ?? null,
            outcome,
          });
        };

        finish().catch(() => {
          // Only logging can throw here, after the stream has closed: nothing is left to tell the client.
        });
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
      [deps.limits.flagIp, clientIp(request, deps.behindFly === true)],
      [deps.limits.flagDevice, parsed.value.deviceId],
    ]);
    if (!limit.ok) return limited(limit);
    deps.log({
      event: 'flag',
      device: await hashDevice(parsed.value.deviceId),
      reason: parsed.value.reason,
      card: parsed.value.card,
    });
    return json({ ok: true });
  }

  return { health, cards, flag };
}
