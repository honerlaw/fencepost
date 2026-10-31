import { pick } from '../rng';
import type { Rng } from '../types';
import { BOSS_WORD, RIGHT_WORDS, WRONG_WORDS } from './constants';

export function verdictWord(correct: boolean, boss: boolean, rng: Rng): string {
  if (!correct) return pick(WRONG_WORDS, rng);
  return boss ? BOSS_WORD : pick(RIGHT_WORDS, rng);
}
