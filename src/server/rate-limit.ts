export interface BucketRule {
  /** Requests allowed back to back. */
  burst: number;
  /** One token comes back every `refillMs`. */
  refillMs: number;
  /** Hard cap per rolling day; omit for none. */
  perDay?: number;
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Idle keys are swept so the maps can't grow without bound. */
const MAX_KEYS = 50_000;

interface Bucket {
  tokens: number;
  updated: number;
  dayStart: number;
  dayCount: number;
}

/**
 * In-memory token buckets, one per key. Per machine only: with more than one machine
 * these move to Redis (handoff §11).
 */
export function createRateLimiter(rule: BucketRule, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  const sweep = (t: number) => {
    if (buckets.size < MAX_KEYS) return;
    for (const [key, b] of buckets) if (t - b.updated > Math.max(rule.refillMs * rule.burst, DAY_MS)) buckets.delete(key);
  };

  /** Consumes a token for `key` if one is available. */
  function take(key: string): LimitResult {
    const t = now();
    sweep(t);
    const b = buckets.get(key) ?? { tokens: rule.burst, updated: t, dayStart: t, dayCount: 0 };
    b.tokens = Math.min(rule.burst, b.tokens + (t - b.updated) / rule.refillMs);
    b.updated = t;
    if (t - b.dayStart >= DAY_MS) {
      b.dayStart = t;
      b.dayCount = 0;
    }
    buckets.set(key, b);
    if (rule.perDay != null && b.dayCount >= rule.perDay) {
      return { ok: false, retryAfterSec: Math.ceil((b.dayStart + DAY_MS - t) / 1000) };
    }
    if (b.tokens < 1) return { ok: false, retryAfterSec: Math.ceil(((1 - b.tokens) * rule.refillMs) / 1000) };
    b.tokens -= 1;
    b.dayCount += 1;
    return { ok: true };
  }

  return { take };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/** Takes from every limiter in order; stops at the first refusal. */
export function takeAll(checks: [RateLimiter, string][]): LimitResult {
  for (const [limiter, key] of checks) {
    const result = limiter.take(key);
    if (!result.ok) return result;
  }
  return { ok: true };
}
