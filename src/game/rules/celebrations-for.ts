import { rankFor } from './rank-for';
import type { StreakUpdate } from './types';

export function celebrationsFor(opts: {
  xpBefore: number;
  xpAfter: number;
  combo: number;
  streak: StreakUpdate;
}): string[] {
  const toasts: string[] = [];
  const before = rankFor(opts.xpBefore);
  const after = rankFor(opts.xpAfter);
  if (after.index > before.index) toasts.push(`Promoted to ${after.name}`);
  if (opts.combo > 0 && opts.combo % 5 === 0) toasts.push(`${opts.combo} in a row`);
  if (opts.streak.increased) toasts.push(`${opts.streak.streak}-day streak`);
  return toasts;
}
