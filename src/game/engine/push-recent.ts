import { MAX_RECENT } from './constants';

export function pushRecent(recent: string[], title: string): string[] {
  return [...recent.filter((t) => t !== title), title].slice(-MAX_RECENT);
}
