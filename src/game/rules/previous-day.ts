import { localDay } from './local-day';

export function previousDay(day: string): string {
  const [y = 0, m = 1, d = 1] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}
