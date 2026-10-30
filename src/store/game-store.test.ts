import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import type { Card } from '@/game/types';
import { debounceStorage } from './debounced-storage';
import { createGameStore, STORAGE_KEY, type FetchBatch } from './game-store';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 29, 12, 0).getTime();

function memoryStorage(): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (name) => data.get(name) ?? null,
    setItem: async (name, value) => void data.set(name, value),
    removeItem: async (name) => void data.delete(name),
  };
}

// The server never answers here: these tests only cover local progress.
const neverFetch: FetchBatch = () => new Promise(() => {});

function makeStore(backing: StateStorage, clock: { now: number }) {
  const storage = debounceStorage(backing, 1000);
  let id = 0;
  const store = createGameStore({
    storage,
    now: () => clock.now,
    rng: () => 0.5,
    newId: () => `device-${++id}`,
    fetchBatch: neverFetch,
  });
  return { store, storage };
}

async function hydrated(store: ReturnType<typeof makeStore>['store']) {
  await expect.poll(() => store.getState().hydrated).toBe(true);
}

function rightAnswer(card: Card): number | number[] {
  if (card.type === 'order') return card.steps.map((_, i) => i);
  return card.answer;
}

function wrongAnswer(card: Card): number | number[] {
  if (card.type === 'order') return card.steps.map((_, i) => i).reverse();
  return card.answer === 0 ? 1 : 0;
}

function currentCard(store: ReturnType<typeof makeStore>['store']): Card {
  const slot = store.getState().game?.current;
  if (slot?.kind !== 'card') throw new Error(`expected a card, got ${slot?.kind}`);
  return slot.card;
}

describe('game store persistence', () => {
  it('rehydrates every progress field in a fresh store and continues the streak the next day', async () => {
    const backing = memoryStorage();
    const clock = { now: T0 };

    const first = makeStore(backing, clock);
    await hydrated(first.store);
    first.store.getState().begin();
    for (let i = 0; i < 6; i++) {
      const card = currentCard(first.store);
      first.store.getState().answer(i === 2 ? wrongAnswer(card) : rightAnswer(card));
      first.store.getState().next();
    }
    first.store.getState().setDomains(['cache', 'jobs']);
    await first.storage.flush();

    const saved = first.store.getState().progress!;
    expect(saved).toMatchObject({ answered: 6, correct: 5, streak: 1, starterDone: true, domains: ['cache', 'jobs'] });
    expect(saved.missed).toHaveLength(1);
    expect(saved.recent).toHaveLength(6);
    expect(backing.data.has(STORAGE_KEY)).toBe(true);

    clock.now = T0 + DAY;
    const second = makeStore(backing, clock);
    await hydrated(second.store);
    const restored = second.store.getState().progress!;
    for (const field of ['xp', 'answered', 'correct', 'bestCombo', 'streak', 'lastDay', 'missed', 'recent', 'domains', 'starterDone', 'deviceId'] as const) {
      expect(restored[field], field).toEqual(saved[field]);
    }

    second.store.getState().begin();
    expect(second.store.getState().game?.current.kind).toBe('welcome');
    second.store.getState().dealIn();
    // Nothing generated yet, so the missed card comes back as a rematch.
    const rematch = currentCard(second.store);
    expect(rematch.id).toBe(saved.missed[0].id);
    second.store.getState().answer(rightAnswer(rematch));
    expect(second.store.getState().progress).toMatchObject({ streak: 2, answered: 7, deviceId: saved.deviceId });
  });

  it('coalesces writes until the debounce fires or a flush', async () => {
    const backing = memoryStorage();
    const { store, storage } = makeStore(backing, { now: T0 });
    await hydrated(store);
    store.getState().begin();
    store.getState().answer(rightAnswer(currentCard(store)));
    expect(backing.data.has(STORAGE_KEY)).toBe(false);
    await storage.flush();
    expect(JSON.parse(backing.data.get(STORAGE_KEY)!).state.progress.answered).toBe(1);
  });
});
