import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { flushProgress, gameStore } from '@/store';
import { createLifecycle } from '@/store/lifecycle';

function saveProgress(): void {
  flushProgress().catch(() => {
    // flush never rejects: it keeps a failed write for the next one.
  });
}

/** Saves progress when the app is hidden and cancels a batch after a minute in the background. */
export function useAppLifecycle(): void {
  useEffect(() => {
    const lifecycle = createLifecycle({
      flush: saveProgress,
      cancelFetch: () => gameStore.getState().cancelFetch(),
      now: Date.now,
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') lifecycle.hidden();
      else if (state === 'active') lifecycle.visible();
    });
    // Browsers: pagehide fires on reload and tab close, where AppState may not.
    if (Platform.OS === 'web') globalThis.addEventListener('pagehide', saveProgress);
    return () => {
      sub.remove();
      lifecycle.dispose();
      if (Platform.OS === 'web') globalThis.removeEventListener('pagehide', saveProgress);
    };
  }, []);
}
