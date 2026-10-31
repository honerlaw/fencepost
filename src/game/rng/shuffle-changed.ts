import type { Rng } from '../types';
import { shuffle } from './shuffle';

/** Shuffles until the order differs from the input (inputs of length < 2 are returned as-is). */
export function shuffleChanged<T>(items: readonly T[], rng: Rng): T[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 20; attempt++) {
    const out = shuffle(items, rng);
    if (out.some((item, i) => item !== items[i])) return out;
  }
  // Guaranteed different: rotate by one.
  return [...items.slice(1), ...items.slice(0, 1)];
}
