import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { flushProgress, gameStore } from '@/store';
import { createLifecycle } from '@/store/lifecycle';

/** Saves progress when the app is hidden and cancels a batch after a minute in the background. */
export function useAppLifecycle() {
  useEffect(() => {
    const lifecycle = createLifecycle({
      flush: () => void flushProgress(),
      cancelFetch: () => gameStore.getState().cancelFetch(),
      now: Date.now,
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') lifecycle.hidden();
      else if (state === 'active') lifecycle.visible();
    });
    // Browsers: pagehide fires on reload and tab close, where AppState may not.
    const onPageHide = () => void flushProgress();
    if (Platform.OS === 'web') globalThis.addEventListener?.('pagehide', onPageHide);
    return () => {
      sub.remove();
      lifecycle.dispose();
      if (Platform.OS === 'web') globalThis.removeEventListener?.('pagehide', onPageHide);
    };
  }, []);
}
