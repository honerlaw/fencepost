import { describe, expect, it } from 'vitest';

import { seededRng } from './rng';
import {
  BOSS_WORD,
  canSwipeAdvance,
  celebrationsFor,
  displayStreak,
  hapticFor,
  localDay,
  multiplierFor,
  previousDay,
  rankFor,
  RIGHT_WORDS,
  rollDouble,
  scoreAnswer,
  shouldCancelInBackground,
  swipeDirection,
  updateStreak,
  verdictWord,
  WRONG_WORDS,
} from './rules';

describe('scoring', () => {
  it('steps the multiplier every 3 in a row, capped at 3x', () => {
    expect([1, 2, 3, 5, 6, 9, 12, 30].map((combo) => multiplierFor(combo))).toEqual([1, 1, 1.5, 1.5, 2, 2.5, 3, 3]);
  });

  it('scores 100 base, 300 for a boss, doubled on a 2x card', () => {
    expect(scoreAnswer({ correct: true, boss: false, double: false, combo: 1 }).points).toBe(100);
    expect(scoreAnswer({ correct: true, boss: true, double: false, combo: 1 }).points).toBe(300);
    expect(scoreAnswer({ correct: true, boss: false, double: true, combo: 3 })).toEqual({
      points: 300,
      multiplier: 1.5,
      doubled: true,
    });
    expect(scoreAnswer({ correct: true, boss: true, double: false, combo: 12 }).points).toBe(900);
  });

  it('scores 0 for a wrong answer', () => {
    expect(scoreAnswer({ correct: false, boss: true, double: true, combo: 9 }).points).toBe(0);
  });
});

describe('daily streak', () => {
  it('formats the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });

  it('starts at 1 for a first answer', () => {
    expect(updateStreak({ streak: 0, lastDay: '' }, '2026-10-29')).toEqual({
      streak: 1,
      lastDay: '2026-10-29',
      increased: false,
    });
  });

  it('does not change on a later answer the same day', () => {
    expect(updateStreak({ streak: 4, lastDay: '2026-10-29' }, '2026-10-29')).toEqual({
      streak: 4,
      lastDay: '2026-10-29',
      increased: false,
    });
  });

  it('goes up by one the next day', () => {
    expect(updateStreak({ streak: 4, lastDay: '2026-10-28' }, '2026-10-29')).toEqual({
      streak: 5,
      lastDay: '2026-10-29',
      increased: true,
    });
  });

  it('resets to 1 after a gap of 2+ days', () => {
    expect(updateStreak({ streak: 9, lastDay: '2026-10-26' }, '2026-10-29')).toEqual({
      streak: 1,
      lastDay: '2026-10-29',
      increased: false,
    });
  });

  it('shows 0 once the last answer was before yesterday', () => {
    expect(displayStreak(5, '2026-10-29', '2026-10-29')).toBe(5);
    expect(displayStreak(5, '2026-10-28', '2026-10-29')).toBe(5);
    expect(displayStreak(5, '2026-10-27', '2026-10-29')).toBe(0);
    expect(displayStreak(0, '', '2026-10-29')).toBe(0);
  });
});

describe('ranks', () => {
  it('maps XP to rank names at the thresholds', () => {
    expect([0, 799, 800, 2500, 6000, 12_000, 25_000, 50_000, 100_000, 1e7].map((xp) => rankFor(xp).name)).toEqual([
      'Intern',
      'Intern',
      'Junior',
      'Mid-level',
      'Senior',
      'Staff',
      'Principal',
      'Distinguished',
      'Fellow',
      'Fellow',
    ]);
  });

  it('reports progress to the next rank', () => {
    expect(rankFor(400)).toMatchObject({ floor: 0, next: 800, progress: 0.5 });
    expect(rankFor(100_000)).toMatchObject({ next: null, progress: 1 });
  });
});

describe('verdicts, haptics and celebrations', () => {
  it('picks words from the right lists', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 20; i++) {
      expect(RIGHT_WORDS).toContain(verdictWord(true, false, rng));
      expect(WRONG_WORDS).toContain(verdictWord(false, true, rng));
    }
    expect(verdictWord(true, true, rng)).toBe(BOSS_WORD);
  });

  it('taps lightly when right and double-buzzes when wrong', () => {
    expect(hapticFor(true)).toBe('light');
    expect(hapticFor(false)).toBe('double');
  });

  const noStreak = { streak: 1, lastDay: '2026-10-29', increased: false };

  it('toasts a promotion', () => {
    expect(celebrationsFor({ xpBefore: 5900, xpAfter: 6100, combo: 1, streak: noStreak })).toEqual([
      'Promoted to Senior',
    ]);
  });

  it('toasts every 5th answer in a row', () => {
    expect(celebrationsFor({ xpBefore: 0, xpAfter: 100, combo: 5, streak: noStreak })).toEqual(['5 in a row']);
    expect(celebrationsFor({ xpBefore: 0, xpAfter: 100, combo: 10, streak: noStreak })).toEqual(['10 in a row']);
    expect(celebrationsFor({ xpBefore: 0, xpAfter: 100, combo: 7, streak: noStreak })).toEqual([]);
  });

  it('toasts a streak going up on the first answer of the day', () => {
    expect(
      celebrationsFor({ xpBefore: 0, xpAfter: 0, combo: 0, streak: { streak: 4, lastDay: '', increased: true } }),
    ).toEqual(['4-day streak']);
  });
});

describe('serve-time and gesture policies', () => {
  it('marks about 12% of generated cards 2x, never a boss', () => {
    const rng = seededRng(42);
    let doubles = 0;
    for (let i = 0; i < 10_000; i++) if (rollDouble({ boss: false }, rng)) doubles++;
    expect(doubles / 10_000).toBeGreaterThan(0.1);
    expect(doubles / 10_000).toBeLessThan(0.14);
    for (let i = 0; i < 1000; i++) expect(rollDouble({ boss: true }, rng)).toBe(false);
  });

  it('advances on swipe only when answered and not mid-scroll', () => {
    expect(canSwipeAdvance({ answered: true, scrolling: false })).toBe(true);
    expect(canSwipeAdvance({ answered: false, scrolling: false })).toBe(false);
    expect(canSwipeAdvance({ answered: true, scrolling: true })).toBe(false);
  });

  it('cancels an in-flight batch after more than a minute in the background', () => {
    expect(shouldCancelInBackground(null, 1_000_000)).toBe(false);
    expect(shouldCancelInBackground(0, 60_000)).toBe(false);
    expect(shouldCancelInBackground(0, 60_001)).toBe(true);
  });

  it.each([
    { dx: 0, dy: -60, want: 'up' },
    { dx: 39, dy: -60, want: 'up' },
    { dx: 60, dy: 0, want: 'right' },
    { dx: -60, dy: 0, want: 'left' },
    { dx: 90, dy: -59, want: 'right' },
    { dx: -90, dy: 59, want: 'left' },
    // A diagonal is neither, or a slanted right swipe would tap Next.
    { dx: 70, dy: -62, want: null },
    { dx: 60, dy: -60, want: null },
    { dx: -70, dy: -62, want: null },
    { dx: 40, dy: -60, want: null },
    // Too short, or downward.
    { dx: 59, dy: 0, want: null },
    { dx: 0, dy: -59, want: null },
    { dx: 0, dy: 200, want: null },
  ])('reads a drag of ($dx, $dy) as $want', ({ dx, dy, want }) => {
    expect(swipeDirection(dx, dy)).toBe(want);
  });
});
