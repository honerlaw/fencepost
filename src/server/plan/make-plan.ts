import type { CardType, Rng } from '@/game/types';
import { BOSS_CHANCE, TYPE_WEIGHTS } from './constants';
import type { PlanSlot } from './types';

function weightedType(rng: Rng): CardType {
  const entries = Object.entries(TYPE_WEIGHTS) as [CardType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries.at(-1)?.[0] ?? 'order';
}

/** `n` slots with weighted types; each slot has an 18% boss chance, at most one boss per batch. */
export function makePlan(n: number, rng: Rng): PlanSlot[] {
  let bossUsed = false;
  return Array.from({ length: n }, () => {
    const type = weightedType(rng);
    const boss = !bossUsed && rng() < BOSS_CHANCE;
    if (boss) bossUsed = true;
    return { type, boss };
  });
}
