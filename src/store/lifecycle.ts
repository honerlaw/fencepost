import { BACKGROUND_CANCEL_MS, shouldCancelInBackground } from '@/game/rules';

export interface LifecycleDeps {
  /** Writes pending progress now. */
  flush: () => void;
  /** Cancels an in-flight batch, keeping cards that already arrived. */
  cancelFetch: () => void;
  now: () => number;
}

export interface Lifecycle {
  hidden: () => void;
  visible: () => void;
  dispose: () => void;
}

/**
 * What happens when the app is hidden and shown again: save straight away, and cancel a
 * batch that is still loading after more than a minute in the background. The timer
 * covers platforms that keep JS running; the elapsed-time check on return covers ones
 * that pause it.
 */
export function createLifecycle(deps: LifecycleDeps): Lifecycle {
  let hiddenAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
  };

  return {
    hidden() {
      deps.flush();
      if (hiddenAt != null) return;
      hiddenAt = deps.now();
      clear();
      timer = setTimeout(deps.cancelFetch, BACKGROUND_CANCEL_MS + 1);
    },
    visible() {
      clear();
      if (shouldCancelInBackground(hiddenAt, deps.now())) deps.cancelFetch();
      hiddenAt = null;
    },
    dispose: clear,
  };
}
