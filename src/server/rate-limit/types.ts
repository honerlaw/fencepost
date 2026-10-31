export interface BucketRule {
  /** Requests allowed back to back. */
  burst: number;
  /** One token comes back every `refillMs`. */
  refillMs: number;
  /** Hard cap per rolling day; omit for none. */
  perDay?: number;
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export interface RateLimiter {
  check: (key: string) => LimitResult;
  take: (key: string) => LimitResult;
  size: () => number;
}
