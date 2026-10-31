/** Prefetch and retry rules for generated batches. Pure: the store asks, then acts. */

export const LOW_WATER = 2;
export const AUTO_RETRY_AFTER_ANSWERS = 3;
/**
 * Batches start at least this far apart. The server allows one batch per device per 20 s, and a 429
 * never retries on its own, so the client waits out the gap instead of tripping it.
 */
export const MIN_FETCH_GAP_MS = 20_000;
/** A batch still open after this long is given up: the server ends every batch within 90 s. */
export const BATCH_DEADLINE_MS = 100_000;

export type FetchErrorCode = 'rate_limited' | 'unavailable' | 'network' | 'upstream_error' | 'bad_request';

export interface FetchState {
  inFlight: boolean;
  /** Domain announced by the current batch's `start` event. */
  domain: string | null;
  error: { code: FetchErrorCode; atAnswer: number } | null;
  /** One automatic retry per failure streak; reset when a batch succeeds. */
  autoRetryUsed: boolean;
  /** Playable cards the current batch has delivered so far. */
  received: number;
}

export const initialFetchState: FetchState = {
  inFlight: false,
  domain: null,
  error: null,
  autoRetryUsed: false,
  received: 0,
};

export type FetchDecision = 'fetch' | 'auto-retry' | 'wait';

export function decideFetch(
  fetch: FetchState,
  ctx: { queued: number; sessionStarted: boolean; answers: number },
): FetchDecision {
  if (fetch.inFlight || !ctx.sessionStarted || ctx.queued > LOW_WATER) return 'wait';
  if (!fetch.error) return 'fetch';
  // Rate limits never retry on their own; other errors get one retry, 3 answers later.
  if (fetch.error.code === 'rate_limited' || fetch.autoRetryUsed) return 'wait';
  return ctx.answers >= fetch.error.atAnswer + AUTO_RETRY_AFTER_ANSWERS ? 'auto-retry' : 'wait';
}

export function fetchStarted(fetch: FetchState, decision: FetchDecision | 'manual'): FetchState {
  return {
    inFlight: true,
    domain: null,
    // A manual retry clears the error; an auto retry keeps the streak's budget spent.
    error: decision === 'manual' ? null : fetch.error,
    autoRetryUsed: decision === 'auto-retry' ? true : decision === 'manual' ? false : fetch.autoRetryUsed,
    received: 0,
  };
}

export function fetchSucceeded(fetch: FetchState): FetchState {
  return { ...fetch, inFlight: false, error: null, autoRetryUsed: false };
}

export function fetchFailed(fetch: FetchState, code: FetchErrorCode, answers: number): FetchState {
  return { ...fetch, inFlight: false, error: { code, atAnswer: answers } };
}

/** Maps an HTTP status from /api/cards to an error code. */
export function errorCodeForStatus(status: number): FetchErrorCode {
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 413) return 'bad_request';
  if (status === 503) return 'unavailable';
  return 'upstream_error';
}
