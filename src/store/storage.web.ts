import type { StateStorage } from 'zustand/middleware';

/**
 * Web: localStorage. expo-sqlite on web needs wasm plus COOP/COEP headers, so it is not used here.
 * Every access is guarded because storage can be missing (server rendering) or blocked (private mode).
 */
export const platformStorage: StateStorage = {
  getItem: (name) => {
    try {
      return globalThis.localStorage?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      globalThis.localStorage?.setItem(name, value);
    } catch {
      // Progress just won't persist this session.
    }
  },
  removeItem: (name) => {
    try {
      globalThis.localStorage?.removeItem(name);
    } catch {
      // Nothing to remove.
    }
  },
};
