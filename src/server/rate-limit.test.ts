import { describe, expect, it } from 'vitest';

import { createRateLimiter, MAX_KEYS, takeAll } from './rate-limit';

describe('rate limiter', () => {
  it('allows a burst, then one token per refill interval', () => {
    let now = 0;
    const limiter = createRateLimiter({ burst: 1, refillMs: 20_000 }, () => now);
    expect(limiter.take('device-a')).toEqual({ ok: true });
    expect(limiter.take('device-a')).toEqual({ ok: false, retryAfterSec: 20 });
    // Keys are independent.
    expect(limiter.take('device-b')).toEqual({ ok: true });
    now = 15_000;
    expect(limiter.take('device-a')).toEqual({ ok: false, retryAfterSec: 5 });
    now = 20_000;
    expect(limiter.take('device-a')).toEqual({ ok: true });
  });

  it('enforces the daily cap', () => {
    let now = 0;
    const limiter = createRateLimiter({ burst: 100, refillMs: 1, perDay: 3 }, () => now);
    for (let i = 0; i < 3; i++) expect(limiter.take('d').ok).toBe(true);
    const refused = limiter.take('d');
    expect(refused.ok).toBe(false);
    now = 24 * 60 * 60 * 1000;
    expect(limiter.take('d').ok).toBe(true);
  });

  it('checks the device and the IP', () => {
    const device = createRateLimiter({ burst: 5, refillMs: 1000 }, () => 0);
    const ip = createRateLimiter({ burst: 2, refillMs: 1000 }, () => 0);
    expect(takeAll([[device, 'a'], [ip, '1.2.3.4']]).ok).toBe(true);
    expect(takeAll([[device, 'b'], [ip, '1.2.3.4']]).ok).toBe(true);
    // A third device on the same IP is refused by the IP bucket.
    expect(takeAll([[device, 'c'], [ip, '1.2.3.4']]).ok).toBe(false);
  });

  it('charges nothing when any limiter refuses', () => {
    const ip = createRateLimiter({ burst: 1, refillMs: 10_000 }, () => 0);
    const device = createRateLimiter({ burst: 1, refillMs: 20_000 }, () => 0);
    expect(takeAll([[ip, '1.1.1.1'], [device, 'a']]).ok).toBe(true);
    // The IP refuses, so device b keeps its token and is not even stored.
    expect(takeAll([[ip, '1.1.1.1'], [device, 'b']]).ok).toBe(false);
    expect(device.size()).toBe(1);
    expect(takeAll([[ip, '2.2.2.2'], [device, 'b']]).ok).toBe(true);
    // And when the device refuses, the IP keeps its token.
    expect(takeAll([[ip, '3.3.3.3'], [device, 'a']]).ok).toBe(false);
    expect(ip.check('3.3.3.3').ok).toBe(true);
  });

  it('keeps at most MAX_KEYS keys, dropping the least recently used', () => {
    const limiter = createRateLimiter({ burst: 1, refillMs: 1000 }, () => 0);
    limiter.take('oldest');
    limiter.take('kept');
    for (let i = 0; i < MAX_KEYS - 2; i++) limiter.take(`k${i}`);
    limiter.take('kept');
    expect(limiter.size()).toBe(MAX_KEYS);
    limiter.take('new');
    expect(limiter.size()).toBe(MAX_KEYS);
    // 'oldest' was evicted (fresh bucket again); 'kept' was used recently, so it is still spent.
    expect(limiter.check('oldest').ok).toBe(true);
    expect(limiter.check('kept').ok).toBe(false);
  });
});
