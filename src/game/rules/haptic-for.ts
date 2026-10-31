import type { HapticPattern } from './types';

export function hapticFor(correct: boolean): HapticPattern {
  return correct ? 'light' : 'double';
}
