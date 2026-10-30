import { MockLanguageModelV4 } from 'ai/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLiveCardSource } from './card-source';
import { handlersFromEnv } from './from-env';
import { BATCH_TIMEOUT_MS, clientIp, createHandlers, PING_MS } from './handlers';
import { createRateLimiter } from './rate-limit';

const DEVICE = 'device-1234';
const API_KEY = 'sk-or-v1-test-secret';

const modelCard = (title: string) => ({
  type: 'model',
  title,
  prompt: 'Pick one.',
  code: null,
  input: null,
  options: ['Unique constraint', 'Check then insert', 'Retry later'],
  correct: 'Unique constraint',
  bad_line: null,
  steps: null,
  why: 'Only the constraint is atomic.',
});

const FINISH = {
  type: 'finish',
  finishReason: { unified: 'stop', raw: 'stop' },
  usage: { inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 50, text: 50, reasoning: 0 } },
};

/** A mock model whose stream we drive by hand. */
function handModel() {
  let controller!: ReadableStreamDefaultController<unknown>;
  const stream = new ReadableStream({ start: (c) => void (controller = c) });
  const model = new MockLanguageModelV4({ doStream: async () => ({ stream: stream as never }) });
  return {
    model,
    open: () => controller.enqueue({ type: 'text-start', id: 't' }),
    text: (delta: string) => controller.enqueue({ type: 'text-delta', id: 't', delta }),
    finish: () => {
      controller.enqueue({ type: 'text-end', id: 't' });
      controller.enqueue(FINISH);
      controller.close();
    },
  };
}

/** A mock model that streams `elements` as one JSON array, a few characters at a time. */
function scriptedModel(elements: unknown[]) {
  const json = JSON.stringify({ elements });
  const parts = json.match(/[\s\S]{1,40}/g)!;
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(c) {
          c.enqueue({ type: 'text-start', id: 't' });
          for (const delta of parts) c.enqueue({ type: 'text-delta', id: 't', delta });
          c.enqueue({ type: 'text-end', id: 't' });
          c.enqueue(FINISH);
          c.close();
        },
      }) as never,
    }),
  });
}

const failingModel = () =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw new Error('upstream 500');
    },
  });

function setup(models: Record<string, MockLanguageModelV4>, order = Object.keys(models)) {
  const logs: Record<string, unknown>[] = [];
  let id = 0;
  const handlers = createHandlers({
    source: createLiveCardSource({
      models: order,
      languageModel: (m) => models[m],
      maxOutputTokens: 4321,
      rng: () => 0.5,
      newId: () => `card-${++id}`,
    }),
    batchSize: 5,
    limits: {
      cardsDevice: createRateLimiter({ burst: 100, refillMs: 1 }),
      cardsIp: createRateLimiter({ burst: 100, refillMs: 1 }),
      flagDevice: createRateLimiter({ burst: 2, refillMs: 60_000 }),
      flagIp: createRateLimiter({ burst: 100, refillMs: 1 }),
    },
    rng: () => 0.5,
    now: Date.now,
    log: (entry) => logs.push(entry),
  });
  return { handlers, logs };
}

const cardsRequest = (body: unknown = { deviceId: DEVICE, domains: ['cache'] }, signal?: AbortSignal) =>
  new Request('http://localhost/api/cards', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, signal });

/** Reads NDJSON lines from a response one at a time. */
function lines(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return async function next(): Promise<Record<string, unknown> | null> {
    for (;;) {
      const nl = buffer.indexOf('\n');
      if (nl !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        return JSON.parse(line);
      }
      const { done, value } = await reader.read();
      if (done) return null;
      buffer += decoder.decode(value, { stream: true });
    }
  };
}

async function all(res: Response) {
  const next = lines(res);
  const out: Record<string, unknown>[] = [];
  for (let line = await next(); line; line = await next()) out.push(line);
  return out;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('/api/cards streaming', () => {
  it('streams start, each card as it completes, then done', async () => {
    const m = handModel();
    const { handlers } = setup({ primary: m.model });
    const res = await handlers.cards(cardsRequest());
    expect(res.headers.get('content-type')).toBe('application/x-ndjson');
    const next = lines(res);
    expect(await next()).toEqual({ event: 'start', domain: 'cache', count: 5 });

    m.open();
    m.text(`{"elements":[${JSON.stringify(modelCard('First'))},`);
    m.text(JSON.stringify(modelCard('Second')).slice(0, 10));
    // The first card arrives while the model is still writing the second.
    const first = await next();
    expect(first).toMatchObject({ event: 'card', card: { title: 'First', type: 'model', domain: 'cache' } });

    m.text(JSON.stringify(modelCard('Second')).slice(10) + ']}');
    m.finish();
    expect(await next()).toMatchObject({ event: 'card', card: { title: 'Second' } });
    expect(await next()).toEqual({ event: 'done', sent: 2 });
    expect(await next()).toBeNull();
  });

  it('drops malformed elements without crashing; done.sent counts the survivors', async () => {
    const elements = [modelCard('Good one'), { type: 'nope' }, { ...modelCard('Bad answer'), correct: 'Not an option' }, 'garbage', modelCard('Good two')];
    const { handlers, logs } = setup({ primary: scriptedModel(elements) });
    const events = await all(await handlers.cards(cardsRequest()));
    expect(events.filter((e) => e.event === 'card').map((e) => (e.card as { title: string }).title)).toEqual(['Good one', 'Good two']);
    expect(events.at(-1)).toEqual({ event: 'done', sent: 2 });
    await vi.waitFor(() => expect(logs).toHaveLength(1));
    expect(logs[0]).toMatchObject({ sent: 2, dropped: 3 });
  });

  it('keeps plan slots aligned when an element is dropped (the boss stays on its slot)', async () => {
    const source = createLiveCardSource({ models: ['m'], languageModel: () => scriptedModel([{ type: 'nope' }, modelCard('A'), modelCard('B')]), maxOutputTokens: 100, rng: () => 0.5, newId: () => 'id' });
    const cards: { title: string; boss: boolean }[] = [];
    await source.getBatch(
      { domain: 'cache', plan: [{ type: 'model', boss: false }, { type: 'model', boss: false }, { type: 'model', boss: true }], prompt: 'p', signal: new AbortController().signal },
      (c) => cards.push(c)
    );
    expect(cards.map((c) => [c.title, c.boss])).toEqual([
      ['A', false],
      ['B', true],
    ]);
  });

  it('retries once with the fallback model when the first fails before any card', async () => {
    const fallback = scriptedModel([modelCard('From fallback')]);
    const { handlers, logs } = setup({ primary: failingModel(), fallback });
    const events = await all(await handlers.cards(cardsRequest()));
    expect(events.map((e) => e.event)).toEqual(['start', 'card', 'done']);
    expect(fallback.doStreamCalls).toHaveLength(1);
    await vi.waitFor(() => expect(logs[0]).toMatchObject({ model: 'fallback', outcome: 'ok' }));
  });

  it('ends with an error event when every model fails', async () => {
    const { handlers, logs } = setup({ primary: failingModel(), fallback: failingModel() });
    const events = await all(await handlers.cards(cardsRequest()));
    expect(events).toEqual([{ event: 'start', domain: 'cache', count: 5 }, { event: 'error', code: 'upstream_error' }]);
    await vi.waitFor(() => expect(logs[0]).toMatchObject({ outcome: 'error', sent: 0 }));
  });

  it('pings every 10 s until the first card', async () => {
    vi.useFakeTimers();
    const m = handModel();
    const { handlers } = setup({ primary: m.model });
    const next = lines(await handlers.cards(cardsRequest()));
    expect(await next()).toMatchObject({ event: 'start' });
    await vi.advanceTimersByTimeAsync(PING_MS);
    expect(await next()).toEqual({ event: 'ping' });
    await vi.advanceTimersByTimeAsync(PING_MS);
    expect(await next()).toEqual({ event: 'ping' });
    m.open();
    m.text(`{"elements":[${JSON.stringify(modelCard('One'))},{`);
    expect(await next()).toMatchObject({ event: 'card' });
    // No pings once a card has been sent.
    await vi.advanceTimersByTimeAsync(PING_MS * 3);
    m.text(`"type":"nope"}]}`);
    m.finish();
    expect(await next()).toEqual({ event: 'done', sent: 1 });
  });

  it('gives up after 90 s with an error event', async () => {
    vi.useFakeTimers();
    const m = handModel();
    const { handlers, logs } = setup({ primary: m.model });
    const res = await handlers.cards(cardsRequest());
    const done = all(res);
    await vi.advanceTimersByTimeAsync(BATCH_TIMEOUT_MS);
    const events = await done;
    expect(events.at(-1)).toEqual({ event: 'error', code: 'timeout' });
    expect(m.model.doStreamCalls[0].abortSignal?.aborted).toBe(true);
    await vi.waitFor(() => expect(logs[0]).toMatchObject({ outcome: 'timeout' }));
  });

  it('cancels the model call and closes the stream when the client goes away', async () => {
    const m = handModel();
    const { handlers, logs } = setup({ primary: m.model });
    const client = new AbortController();
    const res = await handlers.cards(cardsRequest(undefined, client.signal));
    const next = lines(res);
    expect(await next()).toMatchObject({ event: 'start' });
    await vi.waitFor(() => expect(m.model.doStreamCalls).toHaveLength(1));
    client.abort();
    expect(await next()).toBeNull();
    expect(m.model.doStreamCalls[0].abortSignal?.aborted).toBe(true);
    await vi.waitFor(() => expect(logs[0]).toMatchObject({ outcome: 'client_abort' }));
  });

  it('cancels the model call when the client left before the stream started', async () => {
    const m = handModel();
    const { handlers, logs } = setup({ primary: m.model });
    const client = new AbortController();
    client.abort();
    await handlers.cards(cardsRequest(undefined, client.signal));
    await vi.waitFor(() => expect(logs[0]).toMatchObject({ outcome: 'client_abort' }));
    expect(m.model.doStreamCalls.every((c) => c.abortSignal?.aborted)).toBe(true);
  });

  it('uses Fly-Client-IP, else the last X-Forwarded-For hop', () => {
    const req = (headers: Record<string, string>) => new Request('http://x/', { headers });
    expect(clientIp(req({ 'fly-client-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('9.9.9.9');
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1, 203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIp(req({}))).toBe('unknown');
  });

  it('passes the output-token cap to the model', async () => {
    const model = scriptedModel([modelCard('Capped')]);
    const { handlers } = setup({ primary: model });
    await all(await handlers.cards(cardsRequest()));
    expect(model.doStreamCalls[0].maxOutputTokens).toBe(4321);
  });

  it('logs one JSON batch line with a hashed device id and no secrets', async () => {
    const { handlers, logs } = setup({ primary: scriptedModel([modelCard('Logged')]) });
    await all(await handlers.cards(cardsRequest()));
    await vi.waitFor(() => expect(logs).toHaveLength(1));
    const line = logs[0];
    expect(line).toMatchObject({ event: 'batch', domain: 'cache', model: 'primary', sent: 1, dropped: 0, usage: { input: 100, output: 50 }, outcome: 'ok' });
    expect(line.device).toMatch(/^[0-9a-f]{16}$/);
    expect(typeof line.latencyMs).toBe('number');
    expect(JSON.stringify(line)).not.toContain(DEVICE);
  });

  it('never logs the API key, even when the upstream call fails', async () => {
    const printed: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => void printed.push(args.join(' ')));
    try {
      // Port 9 (discard) refuses the connection, so the provider call errors out.
      const handlers = handlersFromEnv({ OPENROUTER_API_KEY: API_KEY, CARD_MODEL: 'test/model', OPENROUTER_BASE_URL: 'http://127.0.0.1:9/api/v1' });
      const events = await all(await handlers.cards(cardsRequest()));
      expect(events.at(-1)).toEqual({ event: 'error', code: 'upstream_error' });
      await vi.waitFor(() => expect(printed.some((l) => l.includes('"event":"batch"'))).toBe(true));
    } finally {
      spy.mockRestore();
    }
    expect(printed.join('\n')).not.toContain(API_KEY);
  });
});

describe('/api/cards request order', () => {
  it('validates (400), then rate limits (429), then checks configuration (503)', async () => {
    const handlers = createHandlers({
      source: null,
      batchSize: 5,
      limits: {
        cardsDevice: createRateLimiter({ burst: 1, refillMs: 20_000 }),
        cardsIp: createRateLimiter({ burst: 100, refillMs: 1 }),
        flagDevice: createRateLimiter({ burst: 1, refillMs: 1 }),
        flagIp: createRateLimiter({ burst: 1, refillMs: 1 }),
      },
      rng: () => 0.5,
      now: Date.now,
      log: () => {},
    });
    expect((await handlers.cards(cardsRequest({ deviceId: DEVICE, prompt: 'x' }))).status).toBe(400);
    expect((await handlers.cards(cardsRequest({ deviceId: DEVICE, recent: ['x'.repeat(5000)] }))).status).toBe(413);
    expect((await handlers.cards(cardsRequest())).status).toBe(503);
    const limited = await handlers.cards(cardsRequest());
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('20');
  });
});

describe('/api/flag', () => {
  const flag = (body: unknown) => new Request('http://localhost/api/flag', { method: 'POST', body: JSON.stringify(body) });
  const valid = { deviceId: DEVICE, card: { id: 'c1', title: 'Overlapping bookings' }, reason: 'wrong' };

  it('logs a valid flag as one JSON line', async () => {
    const { handlers, logs } = setup({ primary: scriptedModel([]) });
    const res = await handlers.flag(flag(valid));
    expect(res.status).toBe(200);
    expect(logs).toEqual([{ event: 'flag', device: expect.stringMatching(/^[0-9a-f]{16}$/), reason: 'wrong', card: valid.card }]);
  });

  it('rejects unknown fields', async () => {
    const { handlers } = setup({ primary: scriptedModel([]) });
    expect((await handlers.flag(flag({ ...valid, note: 'hi' }))).status).toBe(400);
  });

  it('is rate limited', async () => {
    const { handlers } = setup({ primary: scriptedModel([]) });
    expect((await handlers.flag(flag(valid))).status).toBe(200);
    expect((await handlers.flag(flag(valid))).status).toBe(200);
    const third = await handlers.flag(flag(valid));
    expect(third.status).toBe(429);
    expect(third.headers.get('retry-after')).toBeTruthy();
  });
});

describe('/api/health', () => {
  it('answers ok', async () => {
    const { handlers } = setup({ primary: scriptedModel([]) });
    expect(await (await handlers.health()).json()).toEqual({ ok: true });
  });
});
