import { z } from 'zod';

import type { PlayedCard } from './types';

const domain = z.enum([
  'reservations',
  'meetings',
  'parking',
  'payments',
  'checkout',
  'ratelimit',
  'rides',
  'cache',
  'jobs',
  'chat',
  'elevator',
  'library',
]);
const base = {
  id: z.string().min(1),
  domain,
  title: z.string().min(1),
  prompt: z.string().min(1),
  why: z.string().min(1),
  boss: z.boolean(),
};
const code = z.array(z.string()).min(2);
const options = z.array(z.string()).min(3).max(5);

const ServerCard = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('flaw'), code, answer: z.number().int().min(0) }),
  z.object({ ...base, type: z.literal('break'), code, options, answer: z.number().int().min(0) }),
  z.object({
    ...base,
    type: z.literal('trace'),
    code,
    input: z.string().optional(),
    options,
    answer: z.number().int().min(0),
  }),
  z.object({ ...base, type: z.literal('model'), options, answer: z.number().int().min(0) }),
  z.object({ ...base, type: z.literal('order'), steps: z.array(z.string()).min(3).max(7) }),
]);

/**
 * Checks a card from the server stream before it can be played. The server already
 * validated it; this guards the client against a mismatched or truncated payload.
 */
export function normalizeGenerated(input: unknown): PlayedCard | null {
  const parsed = ServerCard.safeParse(input);
  if (!parsed.success) return null;
  const card = parsed.data;
  if (card.type === 'flaw' && card.answer >= card.code.length) return null;
  if ('options' in card && card.answer >= card.options.length) return null;
  return card;
}
