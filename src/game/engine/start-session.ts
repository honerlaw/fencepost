import { initialFetchState } from '../fetch-policy';
import type { PlayedCard, Progress } from '../types';
import { advance } from './advance';
import { titleKey } from './title-key';
import type { Deps, GameState } from './types';

function unplayedStarters(deck: PlayedCard[], recent: string[]): PlayedCard[] {
  const played = new Set(recent.map((title) => titleKey(title)));
  return deck.filter((card) => !played.has(titleKey(card.title)));
}

/**
 * Starts a session: first-timers get the starter deck, picking up after any cards already
 * answered, skipped or flagged, and returning players get a welcome card.
 */
export function startSession(saved: Progress, starterDeck: PlayedCard[], deps: Deps): GameState {
  const starter = saved.starterDone ? [] : unplayedStarters(starterDeck, saved.recent);
  // Card 6 sets `starterDone` itself. This catches a deck edited over the air, which would hang on loading.
  const progress = starter.length === 0 ? { ...saved, starterDone: true } : saved;
  const base: GameState = {
    progress,
    combo: 0,
    current: { kind: 'loading', since: deps.now },
    queue: [],
    starter,
    sinceRematch: 0,
    lastAnsweredId: null,
    answers: 0,
    sessionStarted: false,
    fetch: initialFetchState,
  };
  if (progress.starterDone) return { ...base, current: { kind: 'welcome' } };
  return advance(base, deps);
}
