import { previousDay } from './previous-day';
import type { StreakUpdate } from './types';

/** Applied on every answer; only the first answer of a local day can change the streak. */
export function updateStreak(prev: { streak: number; lastDay: string }, today: string): StreakUpdate {
  if (prev.lastDay === today) return { streak: Math.max(prev.streak, 1), lastDay: today, increased: false };
  if (prev.lastDay && prev.lastDay === previousDay(today)) {
    return { streak: prev.streak + 1, lastDay: today, increased: true };
  }
  return { streak: 1, lastDay: today, increased: false };
}
