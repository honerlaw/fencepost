import { useState } from 'react';

import { reviewEntries, type GameState } from '@/game/engine';
import type { ReviewEntry } from '@/game/types';

interface Review {
  /** The card being looked at, or null on the live slot. */
  entry: ReviewEntry | null;
  /** How many cards back from the live slot; 0 is the live slot. */
  position: number;
  hasOlder: boolean;
  older: () => void;
  newer: () => void;
  exit: () => void;
}

/**
 * Which earlier card is showing. This stays out of the store on purpose: a reviewed card is only ever
 * read from history, so nothing here can reach `answer` or change progress.
 */
export function useReview(game: GameState | null): Review {
  const [back, setBack] = useState(0);
  const entries = game ? reviewEntries(game) : [];
  const position = Math.min(back, entries.length);
  const hasOlder = position < entries.length;
  return {
    entry: entries[entries.length - position] ?? null,
    position,
    hasOlder,
    older: () => setBack(hasOlder ? position + 1 : position),
    newer: () => setBack(Math.max(0, position - 1)),
    exit: () => setBack(0),
  };
}
