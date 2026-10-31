import { pick } from './rng';
import type { Rng } from './types';

// ---- Scoring ----

export const BASE_POINTS = 100;
export const BOSS_POINTS = 300;

/** `combo` counts this answer: the 3rd right answer in a row is combo 3. */
export function multiplierFor(combo: number): number {
  return Math.min(3, 1 + 0.5 * Math.floor(combo / 3));
}

export interface Score {
  points: number;
  multiplier: number;
  doubled: boolean;
}

export function scoreAnswer(opts: { correct: boolean; boss: boolean; double: boolean; combo: number }): Score {
  if (!opts.correct) return { points: 0, multiplier: 1, doubled: false };
  const multiplier = multiplierFor(opts.combo);
  const base = opts.boss ? BOSS_POINTS : BASE_POINTS;
  const doubled = opts.double;
  return { points: Math.round(base * multiplier) * (doubled ? 2 : 1), multiplier, doubled };
}

// ---- Daily streak ----

/** Local calendar date as "YYYY-MM-DD". */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

export interface StreakUpdate {
  streak: number;
  lastDay: string;
  /** True only when a consecutive-day answer raised the streak above 1. */
  increased: boolean;
}

/** Applied on every answer; only the first answer of a local day can change the streak. */
export function updateStreak(prev: { streak: number; lastDay: string }, today: string): StreakUpdate {
  if (prev.lastDay === today) return { streak: Math.max(prev.streak, 1), lastDay: today, increased: false };
  if (prev.lastDay && prev.lastDay === previousDay(today)) {
    return { streak: prev.streak + 1, lastDay: today, increased: true };
  }
  return { streak: 1, lastDay: today, increased: false };
}

/** The streak is shown as 0 once the last answer was before yesterday. */
export function displayStreak(streak: number, lastDay: string, today: string): number {
  if (!lastDay) return 0;
  return lastDay === today || lastDay === previousDay(today) ? streak : 0;
}

// ---- Ranks ----

export const RANKS = [
  { name: 'Intern', xp: 0 },
  { name: 'Junior', xp: 800 },
  { name: 'Mid-level', xp: 2500 },
  { name: 'Senior', xp: 6000 },
  { name: 'Staff', xp: 12_000 },
  { name: 'Principal', xp: 25_000 },
  { name: 'Distinguished', xp: 50_000 },
  { name: 'Fellow', xp: 100_000 },
] as const;

export interface RankInfo {
  name: string;
  index: number;
  floor: number;
  /** XP needed for the next rank; null at the top. */
  next: number | null;
  /** 0..1 progress from this rank's floor to the next. */
  progress: number;
}

export function rankFor(xp: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) index = i;
  const floor = RANKS[index].xp;
  const next = index + 1 < RANKS.length ? RANKS[index + 1].xp : null;
  const progress = next == null ? 1 : (xp - floor) / (next - floor);
  return { name: RANKS[index].name, index, floor, next, progress };
}

// ---- Verdicts, haptics, celebrations ----

export const RIGHT_WORDS = ['Nice catch.', 'Clean.', 'LGTM.', 'Ship it.', 'Exactly.', 'Sharp.'] as const;
export const BOSS_WORD = 'Boss down.';
export const WRONG_WORDS = ['Not quite.', 'Bug escaped.', 'Rolled back.', 'Close, but no.'] as const;

export function verdictWord(correct: boolean, boss: boolean, rng: Rng): string {
  if (!correct) return pick(WRONG_WORDS, rng);
  return boss ? BOSS_WORD : pick(RIGHT_WORDS, rng);
}

/** A light tap when right, a double buzz when wrong. */
export type HapticPattern = 'light' | 'double';

export function hapticFor(correct: boolean): HapticPattern {
  return correct ? 'light' : 'double';
}

export function celebrationsFor(opts: {
  xpBefore: number;
  xpAfter: number;
  combo: number;
  streak: StreakUpdate;
}): string[] {
  const toasts: string[] = [];
  const before = rankFor(opts.xpBefore);
  const after = rankFor(opts.xpAfter);
  if (after.index > before.index) toasts.push(`Promoted to ${after.name}`);
  if (opts.combo > 0 && opts.combo % 5 === 0) toasts.push(`${opts.combo} in a row`);
  if (opts.streak.increased) toasts.push(`${opts.streak.streak}-day streak`);
  return toasts;
}

// ---- Serve-time flags ----

export const DOUBLE_CHANCE = 0.12;

/** Generated cards may be served as 2x; boss, rematch and starter cards never are. */
export function rollDouble(card: { boss: boolean }, rng: Rng): boolean {
  return !card.boss && rng() < DOUBLE_CHANCE;
}

// ---- Swipe and background policy ----

/** Swiping up advances only once the card is answered and the card isn't mid-scroll. */
export function canSwipeAdvance(opts: { answered: boolean; scrolling: boolean }): boolean {
  return opts.answered && !opts.scrolling;
}

export const BACKGROUND_CANCEL_MS = 60_000;

/** Cancel an in-flight batch once the app has been in the background for over a minute. */
export function shouldCancelInBackground(backgroundedAt: number | null, now: number): boolean {
  return backgroundedAt != null && now - backgroundedAt > BACKGROUND_CANCEL_MS;
}
