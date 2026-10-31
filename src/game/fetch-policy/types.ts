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

export type FetchDecision = 'fetch' | 'auto-retry' | 'wait';
