import type { GameState } from './types';

/**
 * Titles the player has on screen or still to come, in play order. None of these reach
 * `progress.recent` until they're played.
 */
export function pendingTitles(state: GameState): string[] {
  const current = state.current.kind === 'card' ? [state.current.card] : [];
  return [...current, ...state.starter, ...state.queue].map((card) => card.title);
}
