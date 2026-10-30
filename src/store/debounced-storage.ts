import type { StateStorage } from 'zustand/middleware';

export interface DebouncedStorage extends StateStorage {
  /** Writes any pending value now (call when the app goes to the background). Never rejects. */
  flush: () => Promise<void>;
}

/** Coalesces writes so progress is saved about once per second, not on every set. */
export function debounceStorage(storage: StateStorage, delayMs: number): DebouncedStorage {
  let pending: { name: string; value: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** Never rejects: a failed write is kept (unless a newer one arrived) and retried on the next flush. */
  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const write = pending;
    pending = null;
    try {
      await storage.setItem(write.name, write.value);
    } catch {
      pending ??= write;
    }
  };

  return {
    getItem: (name) => storage.getItem(name),
    removeItem: (name) => storage.removeItem(name),
    setItem: (name, value) => {
      pending = { name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
  };
}
