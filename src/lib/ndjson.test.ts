import { describe, expect, it } from 'vitest';

import { asBatchEvent, readNdjson } from './ndjson';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

describe('readNdjson', () => {
  it('emits each line as it completes, across chunk boundaries', async () => {
    const seen: unknown[] = [];
    await readNdjson(streamOf(['{"event":"st', 'art","count":5}\n{"event":"pi', 'ng"}\n', '{"event":"done","sent":1}']), (v) => seen.push(v));
    expect(seen).toEqual([{ event: 'start', count: 5 }, { event: 'ping' }, { event: 'done', sent: 1 }]);
  });

  it('skips blank and malformed lines', async () => {
    const seen: unknown[] = [];
    await readNdjson(streamOf(['\n{oops\n', '{"event":"ping"}\n\n']), (v) => seen.push(v));
    expect(seen).toEqual([{ event: 'ping' }]);
  });

  it('decodes multi-byte characters split across chunks', async () => {
    const bytes = new TextEncoder().encode('{"t":"≤"}\n');
    const seen: unknown[] = [];
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 7));
        c.enqueue(bytes.slice(7));
        c.close();
      },
    });
    await readNdjson(stream, (v) => seen.push(v));
    expect(seen).toEqual([{ t: '≤' }]);
  });

  it('accepts only known events', () => {
    expect(asBatchEvent({ event: 'card', card: {} })).not.toBeNull();
    expect(asBatchEvent({ event: 'nope' })).toBeNull();
    expect(asBatchEvent('x')).toBeNull();
  });
});
