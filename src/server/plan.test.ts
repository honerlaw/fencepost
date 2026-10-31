import { describe, expect, it } from 'vitest';

import { DOMAIN_IDS } from '@/cards/domains';
import { seededRng } from '@/game/rng';
import { makePlan, pickDomain, TYPE_WEIGHTS } from './plan';

describe('plan maker', () => {
  it('makes 5 slots with at most one boss', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 2000; i++) {
      const plan = makePlan(5, rng);
      expect(plan).toHaveLength(5);
      expect(plan.filter((s) => s.boss).length).toBeLessThanOrEqual(1);
    }
  });

  it('rolls a boss in about 18% of slots until one lands', () => {
    // P(no boss in 5 slots) = 0.82^5 ≈ 0.371, so about 62.9% of batches have one.
    const rng = seededRng(11);
    let withBoss = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) if (makePlan(5, rng).some((s) => s.boss)) withBoss++;
    expect(withBoss / N).toBeCloseTo(1 - 0.82 ** 5, 1);
    // A single slot is a boss 18% of the time.
    let first = 0;
    for (let i = 0; i < N; i++) if (makePlan(1, rng)[0].boss) first++;
    expect(first / N).toBeGreaterThan(0.165);
    expect(first / N).toBeLessThan(0.195);
  });

  it('weights card types flaw 30, break 25, trace 15, model 15, order 15', () => {
    const rng = seededRng(3);
    const counts: Record<string, number> = {};
    const N = 40_000;
    for (let i = 0; i < N; i++) {
      const [slot] = makePlan(1, rng);
      counts[slot.type] = (counts[slot.type] ?? 0) + 1;
    }
    for (const [type, weight] of Object.entries(TYPE_WEIGHTS)) expect(counts[type] / N).toBeCloseTo(weight / 100, 1);
  });
});

describe('domain choice', () => {
  it('picks from the requested domains, or all of them', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 200; i++) expect(['cache', 'jobs']).toContain(pickDomain(['cache', 'jobs'], undefined, rng));
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(pickDomain([], undefined, rng));
    expect(seen.size).toBe(DOMAIN_IDS.length);
  });

  it("avoids the device's previous domain when there is a choice", () => {
    const rng = seededRng(9);
    for (let i = 0; i < 200; i++) expect(pickDomain(['cache', 'jobs'], 'cache', rng)).toBe('jobs');
    for (let i = 0; i < 200; i++) expect(pickDomain([], 'cache', rng)).not.toBe('cache');
    expect(pickDomain(['cache'], 'cache', rng)).toBe('cache');
  });
});
