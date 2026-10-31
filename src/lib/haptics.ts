import * as Haptics from 'expo-haptics';

import type { HapticPattern } from '@/game/rules';

/** A light tap for right, a double buzz (the error notification) for wrong. */
export function playHaptic(pattern: HapticPattern): void {
  const done =
    pattern === 'light'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  done.catch(() => {
    // Devices without a haptic engine reject, and there is no fallback to offer.
  });
}
