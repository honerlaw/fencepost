import { SWIPE_DISTANCE, SWIPE_DOMINANCE } from './constants';
import type { SwipeDirection } from './types';

function dominant(along: number, across: number): boolean {
  return Math.abs(along) >= SWIPE_DISTANCE && Math.abs(along) > SWIPE_DOMINANCE * Math.abs(across);
}

/** Reads a finished drag. A diagonal is no swipe at all, so a slanted drag can't tap Next by accident. */
export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  if (dominant(dx, dy)) return dx > 0 ? 'right' : 'left';
  return dominant(dy, dx) && dy < 0 ? 'up' : null;
}
