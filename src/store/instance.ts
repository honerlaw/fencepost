import * as Crypto from 'expo-crypto';

import { fetchBatch, reportCard } from '@/lib/cards-client';
import { debounceStorage } from './debounced-storage';
import { createGameStore } from './game-store';
import { platformStorage } from './storage';

export const storage = debounceStorage(platformStorage, 1000);

export const gameStore = createGameStore({
  storage,
  now: Date.now,
  rng: Math.random,
  newId: () => Crypto.randomUUID(),
  fetchBatch,
  reportFlag: reportCard,
});
