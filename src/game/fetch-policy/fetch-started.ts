import type { FetchDecision, FetchState } from './types';

export function fetchStarted(fetch: FetchState, decision: FetchDecision | 'manual'): FetchState {
  return {
    inFlight: true,
    domain: null,
    // A manual retry clears the error; an auto retry keeps the streak's budget spent.
    error: decision === 'manual' ? null : fetch.error,
    autoRetryUsed: decision === 'auto-retry' || (decision !== 'manual' && fetch.autoRetryUsed),
    received: 0,
  };
}
