import { pendingTitles } from './pending-titles';
import { titleKey } from './title-key';
import type { GameState } from './types';

/** True when a card with this title would repeat one in history, in play, or in the rematch list. */
export function isSeenTitle(state: GameState, title: string): boolean {
  const key = titleKey(title);
  if (!key) return false;
  const seen = [...state.progress.recent, ...pendingTitles(state), ...state.progress.missed.map((card) => card.title)];
  return seen.some((other) => titleKey(other) === key);
}
