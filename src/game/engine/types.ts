import type { HapticPattern, Score } from '../rules';
import type { FetchErrorCode, FetchState } from '../fetch-policy';
import type { PlayedCard, Progress, Rng } from '../types';

export interface AnswerResult {
  correct: boolean;
  /** Tapped line / option index, or the order the player placed the steps in. */
  picked: number | number[];
  score: Score;
  verdict: string;
  toasts: string[];
  haptic: HapticPattern;
  /** Undo data for "card was wrong". */
  undo: { combo: number };
  flagged: boolean;
}

export type Slot =
  | { kind: 'card'; card: PlayedCard; result: AnswerResult | null }
  | { kind: 'welcome' }
  | { kind: 'loading'; since: number }
  | { kind: 'error'; code: FetchErrorCode };

export interface GameState {
  progress: Progress;
  combo: number;
  current: Slot;
  /** Generated cards waiting to be served. */
  queue: PlayedCard[];
  /** Starter cards still to play this session (empty once the deck is done). */
  starter: PlayedCard[];
  sinceRematch: number;
  lastAnsweredId: string | null;
  answers: number;
  /** True after the first answer, skip or "Deal me in"; nothing is fetched before. */
  sessionStarted: boolean;
  fetch: FetchState;
}

export interface Deps {
  now: number;
  rng: Rng;
}

/** One event from the /api/cards NDJSON stream. */
export type BatchEvent =
  | { event: 'start'; domain: string; count: number }
  | { event: 'card'; card: unknown }
  | { event: 'ping' }
  | { event: 'done'; sent: number }
  | { event: 'error'; code: string };
