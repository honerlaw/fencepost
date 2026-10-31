import type { FetchState } from './types';

export function fetchSucceeded(fetch: FetchState): FetchState {
  return { ...fetch, inFlight: false, error: null, autoRetryUsed: false };
}
