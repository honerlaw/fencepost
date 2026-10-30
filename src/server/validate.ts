import { z } from 'zod';

import { isDomainId } from '@/cards/domains';
import type { DomainId } from '@/game/types';

export const MAX_BODY_BYTES = 4 * 1024;
/** A flagged card carries its code and options, so the flag body gets a little more room. */
export const MAX_FLAG_BODY_BYTES = 8 * 1024;

const deviceId = z.string().min(8).max(64).regex(/^[A-Za-z0-9-]+$/);

const CardsRequest = z.strictObject({
  deviceId,
  domains: z.array(z.string().max(40)).max(24).optional(),
  recent: z.array(z.string().max(200)).max(20).optional(),
});

const FlagRequest = z.strictObject({
  deviceId,
  card: z.record(z.string(), z.unknown()),
  reason: z.literal('wrong'),
});

export interface CardsParams {
  deviceId: string;
  /** Known domains only; empty means all. */
  domains: DomainId[];
  recent: string[];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

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
        await reader.cancel().catch(() => {});
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

export function parseCardsRequest(body: unknown): Parsed<CardsParams> {
  const parsed = CardsRequest.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid request' };
  const { deviceId: id, domains = [], recent = [] } = parsed.data;
  // Unknown domain ids are ignored rather than rejected (older clients, renamed topics).
  return { ok: true, value: { deviceId: id, domains: [...new Set(domains.filter(isDomainId))], recent } };
}

export function parseFlagRequest(body: unknown): Parsed<z.infer<typeof FlagRequest>> {
  const parsed = FlagRequest.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid request' };
  return { ok: true, value: parsed.data };
}
