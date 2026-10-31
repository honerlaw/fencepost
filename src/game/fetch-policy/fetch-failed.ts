import type { FetchErrorCode, FetchState } from './types';

export function fetchFailed(fetch: FetchState, code: FetchErrorCode, answers: number): FetchState {
  return { ...fetch, inFlight: false, error: { code, atAnswer: answers } };
}
