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
/** Keys kept per limiter; past this the least recently used key is dropped. */
export const MAX_KEYS = 50_000;

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
  // Map order is recency order: a key is re-inserted on every use, so the first key is the stalest.
  const buckets = new Map<string, Bucket>();

  /** The bucket for `key` brought up to time `t`, without storing it. */
  const current = (key: string, t: number): Bucket => {
    const b = buckets.get(key) ?? { tokens: rule.burst, updated: t, dayStart: t, dayCount: 0 };
    const fresh = t - b.dayStart >= DAY_MS;
    return {
      tokens: Math.min(rule.burst, b.tokens + (t - b.updated) / rule.refillMs),
      updated: t,
      dayStart: fresh ? t : b.dayStart,
      dayCount: fresh ? 0 : b.dayCount,
    };
  };

  const verdict = (b: Bucket, t: number): LimitResult => {
    if (rule.perDay != null && b.dayCount >= rule.perDay) {
      return { ok: false, retryAfterSec: Math.ceil((b.dayStart + DAY_MS - t) / 1000) };
    }
    if (b.tokens < 1) return { ok: false, retryAfterSec: Math.ceil(((1 - b.tokens) * rule.refillMs) / 1000) };
    return { ok: true };
  };

  /** Whether `key` has a token, without consuming it or storing anything. */
  function check(key: string): LimitResult {
    const t = now();
    return verdict(current(key, t), t);
  }

  /** Consumes a token for `key` if one is available. */
  function take(key: string): LimitResult {
    const t = now();
    const b = current(key, t);
    const result = verdict(b, t);
    if (result.ok) {
      b.tokens -= 1;
      b.dayCount += 1;
    }
    buckets.delete(key);
    buckets.set(key, b);
    while (buckets.size > MAX_KEYS) buckets.delete(buckets.keys().next().value!);
    return result;
  }

  return { check, take, size: () => buckets.size };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/**
 * Checks every limiter first and consumes from all of them only when all allow it,
 * so a refusal by one (say the IP) charges nothing to the others (say the device).
 */
export function takeAll(checks: [RateLimiter, string][]): LimitResult {
  for (const [limiter, key] of checks) {
    const result = limiter.check(key);
    if (!result.ok) return result;
  }
  for (const [limiter, key] of checks) limiter.take(key);
  return { ok: true };
}
