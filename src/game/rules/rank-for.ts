import { RANKS } from './constants';
import type { RankInfo } from './types';

export function rankFor(xp: number): RankInfo {
  let index = 0;
  let rank: (typeof RANKS)[number] = RANKS[0];
  for (const [i, candidate] of RANKS.entries()) {
    if (xp >= candidate.xp) {
      index = i;
      rank = candidate;
    }
  }
  const floor = rank.xp;
  const next = RANKS[index + 1]?.xp ?? null;
  const progress = next == null ? 1 : (xp - floor) / (next - floor);
  return { name: rank.name, index, floor, next, progress };
}
