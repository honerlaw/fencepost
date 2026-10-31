import { previousDay } from './previous-day';

/** The streak is shown as 0 once the last answer was before yesterday. */
export function displayStreak(streak: number, lastDay: string, today: string): number {
  if (!lastDay) return 0;
  return lastDay === today || lastDay === previousDay(today) ? streak : 0;
}
