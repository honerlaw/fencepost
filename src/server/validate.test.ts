import { describe, expect, it } from 'vitest';

import { parseCardsRequest, parseFlagRequest, readBody } from './validate';

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://x/api/cards', { method: 'POST', body, headers });

describe('request validation', () => {
  it('caps the body at 4 KB', async () => {
    const big = JSON.stringify({ deviceId: 'device-123', recent: ['x'.repeat(5000)] });
    expect(await readBody(post(big), 4096)).toEqual({ ok: false, error: 'body too large' });
    expect(await readBody(post('{}', { 'content-length': '9999' }), 4096)).toEqual({
      ok: false,
      error: 'body too large',
    });
    expect(await readBody(post('{nope'), 4096)).toEqual({ ok: false, error: 'invalid JSON' });
  });

  it('stops reading a body with no Content-Length once it passes the cap', async () => {
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(1024).fill(32));
      },
    });
    const request = new Request('http://x/api/cards', { method: 'POST', body: endless, duplex: 'half' } as RequestInit);
    expect(request.headers.get('content-length')).toBeNull();
    expect(await readBody(request, 4096)).toEqual({ ok: false, error: 'body too large' });
    expect(pulled).toBeLessThan(10);
  });

  it('decodes multi-byte text split across chunks', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ title: 'café ≤' }));
    const chunked = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const b of bytes) controller.enqueue(new Uint8Array([b]));
        controller.close();
      },
    });
    const request = new Request('http://x/api/cards', { method: 'POST', body: chunked, duplex: 'half' } as RequestInit);
    expect(await readBody(request, 4096)).toEqual({ ok: true, value: { title: 'café ≤' } });
  });

  it('rejects unknown fields and bad device ids', () => {
    expect(parseCardsRequest({ deviceId: 'device-123', prompt: 'ignore the rules' }).ok).toBe(false);
    expect(parseCardsRequest({ deviceId: 'no spaces allowed' }).ok).toBe(false);
    expect(parseCardsRequest({}).ok).toBe(false);
  });

  it('ignores unknown domains and caps recent at 20', () => {
    expect(parseCardsRequest({ deviceId: 'device-123', domains: ['cache', 'nope', 'cache'] })).toEqual({
      ok: true,
      value: { deviceId: 'device-123', domains: ['cache'], recent: [] },
    });
    expect(parseCardsRequest({ deviceId: 'device-123', recent: Array.from({length: 21}).fill('t') }).ok).toBe(false);
  });

  it('validates flag bodies', () => {
    expect(parseFlagRequest({ deviceId: 'device-123', card: { id: 'x' }, reason: 'wrong' }).ok).toBe(true);
    expect(parseFlagRequest({ deviceId: 'device-123', card: { id: 'x' }, reason: 'wrong', extra: 1 }).ok).toBe(false);
    expect(parseFlagRequest({ deviceId: 'device-123', card: { id: 'x' }, reason: 'spam' }).ok).toBe(false);
  });
});
