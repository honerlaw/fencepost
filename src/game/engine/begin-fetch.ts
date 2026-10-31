import { fetchStarted, type FetchDecision } from '../fetch-policy';
import type { Deps, GameState } from './types';

export function beginFetch(state: GameState, decision: FetchDecision | 'manual', deps: Deps): GameState {
  const next = { ...state, fetch: fetchStarted(state.fetch, decision) };
  // A Try again from the error card shows the loading card straight away.
  return next.current.kind === 'error' ? { ...next, current: { kind: 'loading', since: deps.now } } : next;
}
