import type { ReviewEntry } from '../types';
import type { GameState } from './types';

/**
 * The cards a player can go back to, newest first. `answer` records a card as it grades it,
 * so while an answered card is on screen the newest entry is that card, and it is left out.
 */
export function reviewEntries(state: GameState): ReviewEntry[] {
  const history = state.progress.history ?? [];
  const onScreen = state.current.kind === 'card' && state.current.result != null;
  return (onScreen ? history.slice(0, -1) : history).toReversed();
}
