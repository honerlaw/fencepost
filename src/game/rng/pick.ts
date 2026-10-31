import type { Rng } from '../types';

export function pick<T>(items: readonly T[], rng: Rng): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick needs a non-empty list');
  return item;
}
