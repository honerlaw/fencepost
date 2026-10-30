import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { BACKGROUND_CANCEL_MS, shouldCancelInBackground } from '@/game/rules';
import { flushProgress, gameStore } from '@/store';

/** Saves progress when the app is hidden and cancels a batch after a minute in the background. */
export function useAppLifecycle() {
  useEffect(() => {
    let backgroundedAt: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onHide = () => {
      void flushProgress();
      backgroundedAt = Date.now();
      timer = setTimeout(() => gameStore.getState().cancelFetch(), BACKGROUND_CANCEL_MS);
    };
    const onShow = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      // JS timers can be paused in the background, so check the elapsed time on return too.
      if (shouldCancelInBackground(backgroundedAt, Date.now())) gameStore.getState().cancelFetch();
      backgroundedAt = null;
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') onHide();
      else if (state === 'active' && backgroundedAt != null) onShow();
    });

    // Browsers: pagehide fires on reload and tab close, where AppState may not.
    const onPageHide = () => void flushProgress();
    if (Platform.OS === 'web') globalThis.addEventListener?.('pagehide', onPageHide);

    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
      if (Platform.OS === 'web') globalThis.removeEventListener?.('pagehide', onPageHide);
    };
  }, []);
}
