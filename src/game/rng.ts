import type { Rng } from './types';

/** Deterministic RNG (mulberry32) for tests and reproducible shuffles. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d_2b_79_f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick needs a non-empty list');
  return item;
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const [a, b] = [out[i], out[j]];
    if (a !== undefined && b !== undefined) [out[i], out[j]] = [b, a];
  }
  return out;
}

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
