import { pick } from '@/game/rng';
import type { Rng } from '@/game/types';
import { FLAVORS } from './constants';

export function pickFlavor(rng: Rng): string {
  return pick(FLAVORS, rng);
}
