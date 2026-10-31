import { batchFailed } from './batch-failed';
import { isWaiting } from './is-waiting';
import type { Deps, GameState } from './types';

/**
 * Called when a batch request is cancelled (backgrounded); cards already queued stay.
 * A loading card would wait forever, so it becomes the error card with Try again.
 */
export function batchCancelled(state: GameState, deps: Deps): GameState {
  if (isWaiting(state)) return batchFailed(state, 'network', deps);
  return { ...state, fetch: { ...state.fetch, inFlight: false } };
}
