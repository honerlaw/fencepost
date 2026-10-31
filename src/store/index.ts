import * as Crypto from 'expo-crypto';
import { useStore } from 'zustand';

import { fetchBatch, reportCard } from '@/lib/cards-client';
import { debounceStorage } from './debounced-storage';
import { createGameStore, type GameStore } from './game-store';
import { platformStorage } from './storage';

const storage = debounceStorage(platformStorage, 1000);

export const gameStore = createGameStore({
  storage,
  now: Date.now,
  rng: Math.random,
  newId: () => Crypto.randomUUID(),
  fetchBatch,
  reportFlag: reportCard,
});

/** Writes pending progress now (backgrounding, page hide). */
export const flushProgress = (): Promise<void> => storage.flush();

export function useGame<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector);
}
