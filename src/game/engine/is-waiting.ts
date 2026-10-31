import type { GameState } from './types';

/** True when the current slot is a status card waiting for something playable. */
export function isWaiting(state: GameState): boolean {
  return state.current.kind === 'loading' || state.current.kind === 'error';
}
