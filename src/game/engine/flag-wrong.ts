import type { Progress, ReviewEntry } from '../types';
import { pushRecent } from './push-recent';
import type { GameState } from './types';
import { withoutCard } from './without-card';

function flagNewest(history: ReviewEntry[] = [], cardId: string): ReviewEntry[] {
  const newest = history.at(-1);
  if (newest?.card.id !== cardId) return history;
  return [...history.slice(0, -1), { ...newest, result: { ...newest.result, flagged: true } }];
}

/** "Card was wrong", offered only after a wrong answer: undo its effect on the run. */
export function flagWrong(state: GameState): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || !slot.result || slot.result.correct || slot.result.flagged) return state;
  const progress: Progress = {
    ...state.progress,
    answered: Math.max(0, state.progress.answered - 1),
    missed: withoutCard(state.progress.missed, slot.card.id),
    recent: pushRecent(state.progress.recent, slot.card.title),
    history: flagNewest(state.progress.history, slot.card.id),
  };
  return {
    ...state,
    progress,
    combo: slot.result.undo.combo,
    current: { ...slot, result: { ...slot.result, flagged: true } },
  };
}
