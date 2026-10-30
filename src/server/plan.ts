import { DOMAIN_IDS } from '@/cards/domains';
import { pick } from '@/game/rng';
import type { CardType, DomainId, Rng } from '@/game/types';

export const TYPE_WEIGHTS: Record<CardType, number> = { flaw: 30, break: 25, trace: 15, model: 15, order: 15 };
export const BOSS_CHANCE = 0.18;

export const FLAVORS = [
  'a Friday dinner rush',
  'a holiday weekend',
  'the night the clocks change',
  'a flash sale',
  'the last day of the month',
  'a launch in a new city',
  'a flaky mobile network',
  'a customer who taps twice',
  'a server restart mid-request',
  'a leap day',
  'a VIP customer',
  'a completely full house',
  'two data centers',
  'a slow downstream service',
] as const;

export interface PlanSlot {
  type: CardType;
  boss: boolean;
}

function weightedType(rng: Rng): CardType {
  const entries = Object.entries(TYPE_WEIGHTS) as [CardType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0];
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

/** One domain per batch: random from the requested ones (or all), avoiding the device's last one when there's a choice. */
export function pickDomain(requested: readonly DomainId[], previous: DomainId | undefined, rng: Rng): DomainId {
  const pool = requested.length > 0 ? requested : DOMAIN_IDS;
  const fresh = pool.filter((d) => d !== previous);
  return pick(fresh.length > 0 ? fresh : pool, rng);
}

export function pickFlavor(rng: Rng): string {
  return pick(FLAVORS, rng);
}
