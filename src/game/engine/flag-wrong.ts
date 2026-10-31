import type { Progress } from '../types';
import { pushRecent } from './push-recent';
import type { GameState } from './types';
import { withoutCard } from './without-card';

/** "Card was wrong", offered only after a wrong answer: undo its effect on the run. */
export function flagWrong(state: GameState): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || !slot.result || slot.result.correct || slot.result.flagged) return state;
  const progress: Progress = {
    ...state.progress,
    answered: Math.max(0, state.progress.answered - 1),
    missed: withoutCard(state.progress.missed, slot.card.id),
    recent: pushRecent(state.progress.recent, slot.card.title),
  };
  return {
    ...state,
    progress,
    combo: slot.result.undo.combo,
    current: { ...slot, result: { ...slot.result, flagged: true } },
  };
}
