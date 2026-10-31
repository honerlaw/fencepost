import type { Parsed } from './types';

const TOO_LARGE = { ok: false, error: 'body too large' } as const;

/**
 * Reads the body as text, refusing anything over `limit` bytes. The stream is read in chunks
 * and dropped once it passes the limit, so a body without Content-Length can't fill memory.
 */
export async function readBody(request: Request, limit: number): Promise<Parsed<unknown>> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > limit) return TOO_LARGE;
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        // The client went away mid-upload.
        return { ok: false, error: 'incomplete body' };
      }
      const { done, value } = chunk;
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {
          // The answer is already decided; a failed cancel changes nothing.
        });
        return TOO_LARGE;
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'invalid JSON' };
  }
}
