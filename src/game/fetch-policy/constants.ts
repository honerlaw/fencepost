import type { FetchState } from './types';

export const LOW_WATER = 2;

export const AUTO_RETRY_AFTER_ANSWERS = 3;

/**
 * Batches start at least this far apart. The server allows one batch per device per 20 s, and a 429
 * never retries on its own, so the client waits out the gap instead of tripping it.
 */
export const MIN_FETCH_GAP_MS = 20_000;

/** A batch still open after this long is given up: the server ends every batch within 120 s. */
export const BATCH_DEADLINE_MS = 130_000;

export const initialFetchState: FetchState = {
  inFlight: false,
  domain: null,
  error: null,
  autoRetryUsed: false,
  received: 0,
};
