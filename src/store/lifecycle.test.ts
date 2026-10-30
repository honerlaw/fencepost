import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLifecycle } from './lifecycle';

afterEach(() => vi.useRealTimers());

function setup() {
  vi.useFakeTimers();
  const calls = { flush: 0, cancel: 0 };
  const lifecycle = createLifecycle({ flush: () => calls.flush++, cancelFetch: () => calls.cancel++, now: Date.now });
  return { lifecycle, calls };
}

describe('app lifecycle', () => {
  it('saves progress as soon as the app is hidden', () => {
    const { lifecycle, calls } = setup();
    lifecycle.hidden();
    expect(calls.flush).toBe(1);
  });

  it('leaves the batch alone for a short trip to the background', () => {
    const { lifecycle, calls } = setup();
    lifecycle.hidden();
    vi.advanceTimersByTime(30_000);
    lifecycle.visible();
    vi.advanceTimersByTime(120_000);
    expect(calls.cancel).toBe(0);
  });

  it('cancels the batch after more than a minute hidden', () => {
    const { lifecycle, calls } = setup();
    lifecycle.hidden();
    vi.advanceTimersByTime(60_001);
    expect(calls.cancel).toBe(1);
  });

  it('cancels on return when timers were paused in the background', () => {
    const { lifecycle, calls } = setup();
    lifecycle.hidden();
    lifecycle.dispose(); // stands in for a timer that never fired
    vi.setSystemTime(Date.now() + 90_000);
    lifecycle.visible();
    expect(calls.cancel).toBe(1);
  });
});
