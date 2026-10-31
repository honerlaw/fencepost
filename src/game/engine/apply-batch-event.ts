import { normalizeGenerated } from '../incoming';
import { fetchSucceeded } from '../fetch-policy';
import { advance } from './advance';
import { batchFailed } from './batch-failed';
import { isWaiting } from './is-waiting';
import type { BatchEvent, Deps, GameState } from './types';

export function applyBatchEvent(state: GameState, ev: BatchEvent, deps: Deps): GameState {
  switch (ev.event) {
    case 'start': {
      return { ...state, fetch: { ...state.fetch, domain: ev.domain } };
    }
    case 'card': {
      const card = normalizeGenerated(ev.card);
      if (!card) return state;
      const next = {
        ...state,
        queue: [...state.queue, card],
        fetch: { ...state.fetch, received: state.fetch.received + 1 },
      };
      // The loading card is swapped for the first card the moment it arrives.
      return isWaiting(next) ? advance(next, deps) : next;
    }
    case 'done': {
      // A batch that produced nothing playable counts as a failure, so it can't refetch in a loop.
      if (ev.sent === 0 || state.fetch.received === 0) return batchFailed(state, 'upstream_error', deps);
      const next = { ...state, fetch: fetchSucceeded(state.fetch) };
      return isWaiting(next) ? advance(next, deps) : next;
    }
    case 'error': {
      return batchFailed(state, 'upstream_error', deps);
    }
    case 'ping': {
      return state;
    }
  }
}
