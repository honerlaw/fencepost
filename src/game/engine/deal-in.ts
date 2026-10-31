import { advance } from './advance';
import type { Deps, GameState } from './types';

export function dealIn(state: GameState, deps: Deps): GameState {
  return advance({ ...state, sessionStarted: true }, deps);
}
