import { RECENT_SENT } from './constants';
import { pendingTitles } from './pending-titles';
import { titleKey } from './title-key';
import type { GameState } from './types';

/**
 * Titles the model is told not to repeat, oldest first. Pending titles go last, so the
 * cap only ever cuts history: at most 8 are pending when a batch is requested.
 */
export function recentForRequest(state: GameState): string[] {
  const titles = [...state.progress.recent, ...pendingTitles(state)];
  return titles
    .filter((title, i) => {
      const key = titleKey(title);
      return !key || !titles.slice(i + 1).some((later) => titleKey(later) === key);
    })
    .slice(-RECENT_SENT);
}
