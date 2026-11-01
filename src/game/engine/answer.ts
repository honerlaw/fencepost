import { celebrationsFor, hapticFor, localDay, scoreAnswer, updateStreak, verdictWord } from '../rules';
import type { Progress } from '../types';
import { isCorrect } from './is-correct';
import { pushHistory } from './push-history';
import { pushRecent } from './push-recent';
import { toBack } from './to-back';
import type { AnswerResult, Deps, GameState } from './types';
import { withoutCard } from './without-card';

/**
 * Grades the current card. For order cards `picked` lists step indexes (into the
 * correct order) in the sequence the player placed them.
 */
export function answer(state: GameState, picked: number | number[], deps: Deps): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || slot.result) return state;
  const card = slot.card;
  const correct = isCorrect(card, picked);
  const combo = correct ? state.combo + 1 : 0;
  const score = scoreAnswer({ correct, boss: card.boss, double: card.double === true, combo });
  const streak = updateStreak(state.progress, localDay(new Date(deps.now)));
  const wasMissed = state.progress.missed.some((c) => c.id === card.id);
  const reviewed = { correct, picked, score, verdict: verdictWord(correct, card.boss, deps.rng), flagged: false };

  let missed = state.progress.missed;
  if (!correct) missed = toBack(missed, card);
  else if (wasMissed) missed = withoutCard(missed, card.id);

  const lastStarter = card.starter === true && state.starter.length === 0;
  const progress: Progress = {
    ...state.progress,
    xp: state.progress.xp + score.points,
    answered: state.progress.answered + 1,
    correct: state.progress.correct + (correct ? 1 : 0),
    bestCombo: Math.max(state.progress.bestCombo, combo),
    streak: streak.streak,
    lastDay: streak.lastDay,
    missed,
    recent: pushRecent(state.progress.recent, card.title),
    history: pushHistory(state.progress.history, { card, result: reviewed }),
    starterDone: state.progress.starterDone || lastStarter,
  };

  const result: AnswerResult = {
    ...reviewed,
    toasts: celebrationsFor({ xpBefore: state.progress.xp, xpAfter: progress.xp, combo, streak }),
    haptic: hapticFor(correct),
    undo: { combo: state.combo },
  };

  return {
    ...state,
    progress,
    combo,
    current: { kind: 'card', card, result },
    lastAnsweredId: card.id,
    answers: state.answers + 1,
    sessionStarted: true,
  };
}
