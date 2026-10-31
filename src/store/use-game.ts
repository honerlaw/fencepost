import { useStore } from 'zustand';

import type { GameStore } from './game-store';
import { gameStore } from './instance';

export function useGame<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector);
}
