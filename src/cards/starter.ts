import type { DomainId, PlayedCard, Rng } from '@/game/types';
import { normalize } from './normalize';
import starterDeck from './starter-deck.json';

export const STARTER_COUNT = starterDeck.length;

export function starterId(index: number): string {
  return `starter-${index + 1}`;
}

/**
 * The hand-checked starter cards, run through the same normalize as generated cards.
 * Ids are stable (`starter-1`…) so rematches of them survive app restarts.
 */
export function loadStarterDeck(rng: Rng): PlayedCard[] {
  return starterDeck.map((entry, index) => {
    const { domain, double, ...raw } = entry;
    const card = normalize(raw, {
      domain: domain as DomainId,
      boss: false,
      rng,
      id: starterId(index),
      newId: () => starterId(index),
    });
    if (!card) throw new Error(`Starter card ${index + 1} failed normalize`);
    return { ...card, starter: true, ...(double ? { double: true } : {}) };
  });
}
