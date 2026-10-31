import { BASE_POINTS, BOSS_POINTS } from './constants';
import { multiplierFor } from './multiplier-for';
import type { Score } from './types';

export function scoreAnswer(opts: { correct: boolean; boss: boolean; double: boolean; combo: number }): Score {
  if (!opts.correct) return { points: 0, multiplier: 1, doubled: false };
  const multiplier = multiplierFor(opts.combo);
  const base = opts.boss ? BOSS_POINTS : BASE_POINTS;
  const doubled = opts.double;
  return { points: Math.round(base * multiplier) * (doubled ? 2 : 1), multiplier, doubled };
}
