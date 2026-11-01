// ---- Scoring ----

export const BASE_POINTS = 100;

export const BOSS_POINTS = 300;

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

// ---- Verdicts, haptics, celebrations ----

export const RIGHT_WORDS = ['Nice catch.', 'Clean.', 'LGTM.', 'Ship it.', 'Exactly.', 'Sharp.'] as const;

export const BOSS_WORD = 'Boss down.';

export const WRONG_WORDS = ['Not quite.', 'Bug escaped.', 'Rolled back.', 'Close, but no.'] as const;

// ---- Serve-time flags ----

export const DOUBLE_CHANCE = 0.12;

/** How far a swipe travels to count. */
export const SWIPE_DISTANCE = 60;

/** A swipe must run this many times further along its axis than across it. */
export const SWIPE_DOMINANCE = 1.5;

export const BACKGROUND_CANCEL_MS = 60_000;
