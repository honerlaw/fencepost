import type { Progress } from '../types';
import { advance } from './advance';
import { pushRecent } from './push-recent';
import { toBack } from './to-back';
import type { Deps, GameState } from './types';

/** Skip: no points, no combo change. A skipped rematch goes to the back of the queue. */
export function skip(state: GameState, deps: Deps): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || slot.result) return state;
  const card = slot.card;
  const progress: Progress = {
    ...state.progress,
    missed: card.rematch === true ? toBack(state.progress.missed, card) : state.progress.missed,
    recent: pushRecent(state.progress.recent, card.title),
    starterDone: state.progress.starterDone || (card.starter === true && state.starter.length === 0),
  };
  return advance({ ...state, progress, lastAnsweredId: card.id, sessionStarted: true }, deps);
}
