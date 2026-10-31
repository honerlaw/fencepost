import { rollDouble } from '../rules';
import type { Card, PlayedCard } from '../types';
import { REMATCH_EVERY } from './constants';
import type { Deps, GameState } from './types';

function dueRematch(state: GameState): Card | undefined {
  return state.progress.missed.find((c) => c.id !== state.lastAnsweredId);
}

function serve(state: GameState, card: PlayedCard, isRematch: boolean): GameState {
  return {
    ...state,
    current: { kind: 'card', card, result: null },
    sinceRematch: isRematch ? 0 : state.sinceRematch + 1,
  };
}

/**
 * Serve order: starter cards (until done) → a rematch if due → the generated
 * queue → a rematch while waiting → a status card.
 */
export function advance(state: GameState, deps: Deps): GameState {
  const [starter, ...laterStarters] = state.starter;
  if (!state.progress.starterDone && starter) return serve({ ...state, starter: laterStarters }, starter, false);
  const rematch = dueRematch(state);
  if (rematch && state.sinceRematch >= REMATCH_EVERY) {
    return serve(state, { ...rematch, rematch: true }, true);
  }
  const [queued, ...rest] = state.queue;
  if (queued) {
    const served: PlayedCard = rollDouble(queued, deps.rng) ? { ...queued, double: true } : queued;
    return serve({ ...state, queue: rest }, served, false);
  }
  if (rematch) return serve(state, { ...rematch, rematch: true }, true);
  if (state.fetch.error && !state.fetch.inFlight)
    return { ...state, current: { kind: 'error', code: state.fetch.error.code } };
  return { ...state, current: { kind: 'loading', since: deps.now } };
}
