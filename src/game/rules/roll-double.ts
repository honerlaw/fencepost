import type { Rng } from '../types';
import { DOUBLE_CHANCE } from './constants';

/** Generated cards may be served as 2x; boss, rematch and starter cards never are. */
export function rollDouble(card: { boss: boolean }, rng: Rng): boolean {
  return !card.boss && rng() < DOUBLE_CHANCE;
}
