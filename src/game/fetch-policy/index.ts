/** Prefetch and retry rules for generated batches. Pure: the store asks, then acts. */

export {
  LOW_WATER,
  AUTO_RETRY_AFTER_ANSWERS,
  MIN_FETCH_GAP_MS,
  BATCH_DEADLINE_MS,
  initialFetchState,
} from './constants';
export { decideFetch } from './decide-fetch';
export { errorCodeForStatus } from './error-code-for-status';
export { fetchFailed } from './fetch-failed';
export { fetchStarted } from './fetch-started';
export { fetchSucceeded } from './fetch-succeeded';
export type { FetchErrorCode, FetchState, FetchDecision } from './types';
