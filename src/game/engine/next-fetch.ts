import { decideFetch, type FetchDecision } from '../fetch-policy';
import type { GameState } from './types';

// ---- Fetch lifecycle ----

export function nextFetch(state: GameState): FetchDecision {
  return decideFetch(state.fetch, {
    queued: state.queue.length,
    sessionStarted: state.sessionStarted,
    answers: state.answers,
  });
}
