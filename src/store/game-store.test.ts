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
    reportFlag: () => {},
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

  it('a failed write never rejects and is retried on the next flush', async () => {
    const backing = memoryStorage();
    let failNext = true;
    const flaky: StateStorage = {
      ...backing,
      setItem: async (name, value) => {
        if (failNext) {
          failNext = false;
          throw new Error('disk full');
        }
        await backing.setItem(name, value);
      },
    };
    const storage = debounceStorage(flaky, 1000);
    storage.setItem('k', 'v1');
    await expect(storage.flush()).resolves.toBeUndefined();
    expect(backing.data.has('k')).toBe(false);
    await storage.flush();
    expect(backing.data.get('k')).toBe('v1');
  });

  it('cancelling a batch keeps the cards that already arrived', async () => {
    const card = (n: number) => ({ id: `g${n}`, type: 'model', domain: 'cache', title: `Gen ${n}`, prompt: 'p', why: 'w', boss: false, options: ['a', 'b', 'c'], answer: 0 });
    let aborted = false;
    const partial: FetchBatch = (_req, onEvent, signal) => {
      onEvent({ event: 'start', domain: 'cache', count: 5 });
      onEvent({ event: 'card', card: card(1) });
      onEvent({ event: 'card', card: card(2) });
      signal.addEventListener('abort', () => (aborted = true));
      return new Promise(() => {});
    };
    const storage = debounceStorage(memoryStorage(), 1000);
    const store = createGameStore({ storage, now: () => T0, rng: () => 0.5, newId: () => 'device-x', fetchBatch: partial, reportFlag: () => {} });
    await hydrated(store);
    store.getState().begin();
    store.getState().answer(rightAnswer(currentCard(store)));
    expect(store.getState().game?.fetch.inFlight).toBe(true);
    store.getState().cancelFetch();
    expect(aborted).toBe(true);
    expect(store.getState().game?.fetch.inFlight).toBe(false);
    expect(store.getState().game?.queue.map((c) => c.id)).toEqual(['g1', 'g2']);
  });
});

describe('game store batches', () => {
  const card = (n: number) => ({ id: `g${n}`, type: 'model', domain: 'cache', title: `Gen ${n}`, prompt: 'p', why: 'w', boss: false, options: ['a', 'b', 'c'], answer: 0 });

  /** A fetchBatch the test drives by hand: each call is recorded with its event sink and a resolver. */
  function manualBatches() {
    const calls: { emit: Parameters<FetchBatch>[1]; finish: () => void; signal: AbortSignal }[] = [];
    const fetchBatch: FetchBatch = (_req, onEvent, signal) =>
      new Promise((resolve) => calls.push({ emit: onEvent, finish: () => resolve({ ok: true }), signal }));
    return { calls, fetchBatch };
  }

  async function firstTimer(fetchBatch: FetchBatch) {
    const storage = debounceStorage(memoryStorage(), 1000);
    const store = createGameStore({ storage, now: () => T0, rng: () => 0.5, newId: () => 'device-x', fetchBatch, reportFlag: () => {} });
    await hydrated(store);
    store.getState().begin();
    return store;
  }

  const skipToLoading = (store: Awaited<ReturnType<typeof firstTimer>>) => {
    while (store.getState().game?.current.kind === 'card') store.getState().skip();
  };

  it('skipping the whole starter deck fetches a batch instead of waiting forever', async () => {
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    skipToLoading(store);
    expect(store.getState().game?.current.kind).toBe('loading');
    expect(calls).toHaveLength(1);
    calls[0].emit({ event: 'card', card: card(1) });
    expect(currentCard(store).id).toBe('g1');
  });

  it('cancelling on the loading card shows the error card with Try again', async () => {
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    skipToLoading(store);
    store.getState().cancelFetch();
    expect(calls[0].signal.aborted).toBe(true);
    expect(store.getState().game?.current).toEqual({ kind: 'error', code: 'network' });
    store.getState().retry();
    expect(calls).toHaveLength(2);
    expect(store.getState().game?.current.kind).toBe('loading');
  });

  it('a batch that ends while the player waits starts the next one, and its late completion leaves that one alone', async () => {
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    skipToLoading(store);
    const a = calls[0];
    a.emit({ event: 'start', domain: 'cache', count: 5 });
    a.emit({ event: 'card', card: card(1) });
    store.getState().answer(0);
    store.getState().next();
    expect(store.getState().game?.current.kind).toBe('loading');

    a.emit({ event: 'done', sent: 1 });
    expect(calls).toHaveLength(2);
    expect(store.getState().game?.fetch.inFlight).toBe(true);

    // A's stream closes after B has started: A must not mark B as failed.
    a.finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getState().game?.fetch).toMatchObject({ inFlight: true, error: null });
    expect(store.getState().game?.current.kind).toBe('loading');
    calls[1].emit({ event: 'card', card: card(2) });
    expect(currentCard(store).id).toBe('g2');
  });
});
