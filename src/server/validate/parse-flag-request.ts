import { z } from 'zod';
import { deviceId } from './constants';
import type { Parsed } from './types';

const FlagRequest = z.strictObject({
  deviceId,
  card: z.record(z.string(), z.unknown()),
  reason: z.literal('wrong'),
});

export function parseFlagRequest(body: unknown): Parsed<z.infer<typeof FlagRequest>> {
  const parsed = FlagRequest.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid request' };
  return { ok: true, value: parsed.data };
}
