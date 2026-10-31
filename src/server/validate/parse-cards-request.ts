import { z } from 'zod';
import { isDomainId } from '@/cards/domains';
import { deviceId } from './constants';
import type { CardsParams, Parsed } from './types';

const CardsRequest = z.strictObject({
  deviceId,
  domains: z.array(z.string().max(40)).max(24).optional(),
  recent: z.array(z.string().max(200)).max(20).optional(),
});

export function parseCardsRequest(body: unknown): Parsed<CardsParams> {
  const parsed = CardsRequest.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid request' };
  const { deviceId: id, domains = [], recent = [] } = parsed.data;
  // Unknown domain ids are ignored rather than rejected (older clients, renamed topics).
  return { ok: true, value: { deviceId: id, domains: [...new Set(domains.filter(isDomainId))], recent } };
}
