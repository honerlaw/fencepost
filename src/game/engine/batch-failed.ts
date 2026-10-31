import { fetchFailed, type FetchErrorCode } from '../fetch-policy';
import { advance } from './advance';
import { isWaiting } from './is-waiting';
import type { Deps, GameState } from './types';

export function batchFailed(state: GameState, code: FetchErrorCode, deps: Deps): GameState {
  const next = { ...state, fetch: fetchFailed(state.fetch, code, state.answers) };
  return isWaiting(next) ? advance(next, deps) : next;
}
