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

/** Reads the body as text, refusing anything over `limit` bytes. */
export async function readBody(request: Request, limit: number): Promise<Parsed<unknown>> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > limit) return { ok: false, error: 'body too large' };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > limit) return { ok: false, error: 'body too large' };
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
