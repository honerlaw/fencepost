import { fetchStarted, type FetchDecision } from '../fetch-policy';
import type { Deps, GameState } from './types';

export function beginFetch(state: GameState, decision: FetchDecision | 'manual', deps: Deps): GameState {
  const next = { ...state, fetch: fetchStarted(state.fetch, decision) };
  if (next.current.kind !== 'error') return next;
  // A Try again shows the loading card straight away. If the last card played is the only rematch
  // left, it's what put the player here, so it's allowed back or a failed retry lands here again.
  return { ...next, lastAnsweredId: null, current: { kind: 'loading', since: deps.now } };
}
