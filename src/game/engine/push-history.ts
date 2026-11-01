import type { ReviewEntry } from '../types';
import { MAX_HISTORY } from './constants';

/** Adds an answered card, dropping the oldest past the cap. */
export function pushHistory(history: ReviewEntry[] = [], entry: ReviewEntry): ReviewEntry[] {
  return [...history, entry].slice(-MAX_HISTORY);
}
