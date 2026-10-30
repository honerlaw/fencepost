import type { HapticPattern } from '@/game/rules';

/** Browsers have no haptics worth using here. */
export function playHaptic(_pattern: HapticPattern): void {}
