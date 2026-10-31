import type { LimitResult, RateLimiter } from './types';

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
