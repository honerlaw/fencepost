import { initialFetchState } from '../fetch-policy';
import type { PlayedCard, Progress } from '../types';
import { advance } from './advance';
import type { Deps, GameState } from './types';

/** Starts a session: first-timers get the starter deck, returning players a welcome card. */
export function startSession(progress: Progress, starterDeck: PlayedCard[], deps: Deps): GameState {
  const base: GameState = {
    progress,
    combo: 0,
    current: { kind: 'loading', since: deps.now },
    queue: [],
    starter: progress.starterDone ? [] : starterDeck,
    sinceRematch: 0,
    lastAnsweredId: null,
    answers: 0,
    sessionStarted: false,
    fetch: initialFetchState,
  };
  if (progress.starterDone) return { ...base, current: { kind: 'welcome' } };
  return advance(base, deps);
}
