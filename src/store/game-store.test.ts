import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { StateStorage } from 'zustand/middleware';

import { newProgress, reviewEntries } from '@/game/engine';
import { BATCH_DEADLINE_MS, MIN_FETCH_GAP_MS } from '@/game/fetch-policy';
import type { Card } from '@/game/types';
import { debounceStorage } from './debounced-storage';
import { createGameStore, STORAGE_KEY, type FetchBatch } from './game-store';

const PersistedAnswers = z.object({ state: z.object({ progress: z.object({ answered: z.number() }) }) });
const PersistedState = z.object({
  state: z.object({ progress: z.object({ history: z.array(z.unknown()).optional() }).loose() }),
  version: z.number(),
});

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 29, 12, 0).getTime();

function memoryStorage(): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (name) => Promise.resolve(data.get(name) ?? null),
    setItem: (name, value) => {
      data.set(name, value);
      return Promise.resolve();
    },
    removeItem: (name) => {
      data.delete(name);
      return Promise.resolve();
    },
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
  return card.type === 'order' ? card.steps.map((_, i) => i) : card.answer;
}

function wrongAnswer(card: Card): number | number[] {
  const wrongOption = 'answer' in card && card.answer === 0 ? 1 : 0;
  return card.type === 'order' ? card.steps.map((_, i) => i).toReversed() : wrongOption;
}

function currentCard(store: ReturnType<typeof makeStore>['store']): Card {
  const slot = store.getState().game?.current;
  if (slot?.kind !== 'card') throw new Error(`expected a card, got ${slot?.kind}`);
  return slot.card;
}

const START = { now: T0 };

const generatedCard = (n: number) => ({
  id: `g${n}`,
  type: 'model',
  domain: 'cache',
  title: `Gen ${n}`,
  prompt: 'p',
  why: 'w',
  boss: false,
  options: ['a', 'b', 'c'],
  answer: 0,
});

/** A fetchBatch the test drives by hand: each call is recorded with its event sink and a resolver. */
function manualBatches() {
  const calls: {
    req: Parameters<FetchBatch>[0];
    emit: Parameters<FetchBatch>[1];
    finish: () => void;
    signal: AbortSignal;
  }[] = [];
  const fetchBatch: FetchBatch = (req, onEvent, signal) =>
    new Promise((resolve) => calls.push({ req, emit: onEvent, finish: () => resolve({ ok: true }), signal }));
  return { calls, fetchBatch };
}

async function firstTimer(
  fetchBatch: FetchBatch,
  clock: { now: number } = START,
  reportFlag: (deviceId: string, card: Card) => void = () => {},
) {
  const storage = debounceStorage(memoryStorage(), 1000);
  const store = createGameStore({
    storage,
    now: () => clock.now,
    rng: () => 0.5,
    newId: () => 'device-x',
    fetchBatch,
    reportFlag,
  });
  await hydrated(store);
  store.getState().begin();
  return store;
}

const skipToLoading = (store: Awaited<ReturnType<typeof firstTimer>>) => {
  while (store.getState().game?.current.kind === 'card') store.getState().skip();
};

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
    for (const field of [
      'xp',
      'answered',
      'correct',
      'bestCombo',
      'streak',
      'lastDay',
      'missed',
      'recent',
      'domains',
      'starterDone',
      'deviceId',
    ] as const) {
      expect(restored[field], field).toEqual(saved[field]);
    }

    second.store.getState().begin();
    expect(second.store.getState().game?.current.kind).toBe('welcome');
    second.store.getState().dealIn();
    // Nothing generated yet, so the missed card comes back as a rematch.
    const rematch = currentCard(second.store);
    expect(rematch.id).toBe(saved.missed[0]!.id);
    second.store.getState().answer(rightAnswer(rematch));
    expect(second.store.getState().progress).toMatchObject({ streak: 2, answered: 7, deviceId: saved.deviceId });
  });

  it('resumes the starter deck from saved progress after a restart', async () => {
    const backing = memoryStorage();
    const clock = { now: T0 };

    const first = makeStore(backing, clock);
    await hydrated(first.store);
    first.store.getState().begin();
    const titles = [currentCard(first.store).title, ...first.store.getState().game!.starter.map((c) => c.title)];
    first.store.getState().answer(rightAnswer(currentCard(first.store)));
    first.store.getState().next();
    first.store.getState().skip();
    await first.storage.flush();
    const saved = first.store.getState().progress!;

    const second = makeStore(backing, clock);
    await hydrated(second.store);
    second.store.getState().begin();
    expect(currentCard(second.store).title).toBe(titles[2]);
    expect(second.store.getState().game?.starter).toHaveLength(3);
    expect(second.store.getState().progress).toMatchObject({ xp: saved.xp, answered: 1, starterDone: false });
  });

  it('keeps answered cards across a restart, and loads progress saved before history existed', async () => {
    const backing = memoryStorage();
    const clock = { now: T0 };
    const first = makeStore(backing, clock);
    await hydrated(first.store);
    first.store.getState().begin();
    const title = currentCard(first.store).title;
    first.store.getState().answer(rightAnswer(currentCard(first.store)));
    await first.storage.flush();

    const second = makeStore(backing, clock);
    await hydrated(second.store);
    second.store.getState().begin();
    expect(reviewEntries(second.store.getState().game!).map((entry) => entry.card.title)).toEqual([title]);

    const saved = PersistedState.parse(JSON.parse(backing.data.get(STORAGE_KEY)!));
    expect(saved.state.progress.history).toHaveLength(1);
    delete saved.state.progress.history;
    backing.data.set(STORAGE_KEY, JSON.stringify(saved));
    const third = makeStore(backing, clock);
    await hydrated(third.store);
    third.store.getState().begin();
    expect(third.store.getState().progress?.answered).toBe(1);
    expect(reviewEntries(third.store.getState().game!)).toEqual([]);
    third.store.getState().answer(rightAnswer(currentCard(third.store)));
    expect(third.store.getState().progress?.history).toHaveLength(1);
  });

  it('coalesces writes until the debounce fires or a flush', async () => {
    const backing = memoryStorage();
    const { store, storage } = makeStore(backing, { now: T0 });
    await hydrated(store);
    store.getState().begin();
    store.getState().answer(rightAnswer(currentCard(store)));
    expect(backing.data.has(STORAGE_KEY)).toBe(false);
    await storage.flush();
    const persisted = PersistedAnswers.parse(JSON.parse(backing.data.get(STORAGE_KEY)!));
    expect(persisted.state.progress.answered).toBe(1);
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
    let aborted = false;
    const partial: FetchBatch = (_req, onEvent, signal) => {
      onEvent({ event: 'start', domain: 'cache', count: 5 });
      onEvent({ event: 'card', card: generatedCard(1) });
      onEvent({ event: 'card', card: generatedCard(2) });
      signal.addEventListener('abort', () => (aborted = true));
      return new Promise(() => {});
    };
    const storage = debounceStorage(memoryStorage(), 1000);
    const store = createGameStore({
      storage,
      now: () => T0,
      rng: () => 0.5,
      newId: () => 'device-x',
      fetchBatch: partial,
      reportFlag: () => {},
    });
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
  afterEach(() => {
    vi.useRealTimers();
  });

  it('skipping the whole starter deck fetches a batch instead of waiting forever', async () => {
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    skipToLoading(store);
    expect(store.getState().game?.current.kind).toBe('loading');
    expect(calls).toHaveLength(1);
    calls[0]!.emit({ event: 'card', card: generatedCard(1) });
    expect(currentCard(store).id).toBe('g1');
  });

  it('cancelling on the loading card shows the error card with Try again', async () => {
    const { calls, fetchBatch } = manualBatches();
    const clock = { now: T0 };
    const store = await firstTimer(fetchBatch, clock);
    skipToLoading(store);
    store.getState().cancelFetch();
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(store.getState().game?.current).toEqual({ kind: 'error', code: 'network' });
    clock.now += MIN_FETCH_GAP_MS;
    store.getState().retry();
    expect(calls).toHaveLength(2);
    expect(store.getState().game?.current.kind).toBe('loading');
  });

  it('a batch that ends while the player waits starts the next one, and its late completion leaves that one alone', async () => {
    const { calls, fetchBatch } = manualBatches();
    const clock = { now: T0 };
    const store = await firstTimer(fetchBatch, clock);
    skipToLoading(store);
    const a = calls[0]!;
    clock.now += MIN_FETCH_GAP_MS;
    a.emit({ event: 'start', domain: 'cache', count: 5 });
    a.emit({ event: 'card', card: generatedCard(1) });
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
    calls[1]!.emit({ event: 'card', card: generatedCard(2) });
    expect(currentCard(store).id).toBe('g2');
  });

  it('waits out the server gap before the next batch instead of tripping the rate limit', async () => {
    vi.useFakeTimers();
    const { calls, fetchBatch } = manualBatches();
    const clock = { now: T0 };
    const store = await firstTimer(fetchBatch, clock);
    skipToLoading(store);
    calls[0]!.emit({ event: 'error', code: 'upstream_error' });
    calls[0]!.finish();
    expect(store.getState().game?.current).toEqual({ kind: 'error', code: 'upstream_error' });

    clock.now += 5000;
    store.getState().retry();
    // Try again shows the loading card at once but sends nothing until 20 s after the last batch.
    expect(store.getState().game?.current.kind).toBe('loading');
    expect(calls).toHaveLength(1);
    vi.advanceTimersByTime(MIN_FETCH_GAP_MS - 5000 - 1);
    expect(calls).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(calls).toHaveLength(2);
  });

  it('gives up on a batch that never ends and offers Try again', async () => {
    vi.useFakeTimers();
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    skipToLoading(store);
    vi.advanceTimersByTime(BATCH_DEADLINE_MS);
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(store.getState().game?.current).toEqual({ kind: 'error', code: 'network' });
    expect(store.getState().game?.fetch.inFlight).toBe(false);
  });

  it('a stream failure after done does not undo the finished batch', async () => {
    const failing: { reject?: () => void; emit?: Parameters<FetchBatch>[1] } = {};
    const fetchBatch: FetchBatch = (_req, onEvent) =>
      new Promise((_resolve, reject) => {
        failing.emit = onEvent;
        failing.reject = () => reject(new Error('connection reset'));
      });
    const store = await firstTimer(fetchBatch);
    skipToLoading(store);
    for (let n = 1; n <= 4; n++) failing.emit!({ event: 'card', card: generatedCard(n) });
    failing.emit!({ event: 'done', sent: 4 });
    failing.reject!();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getState().game?.fetch).toMatchObject({ inFlight: false, error: null });
  });

  it('tells the server about the card on screen and the starter cards still to come', async () => {
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    const titles = [currentCard(store).title, ...store.getState().game!.starter.map((c) => c.title)];
    store.getState().answer(rightAnswer(currentCard(store)));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.req.recent).toEqual(titles);
  });

  it('keeps queued titles in a full request', async () => {
    const backing = memoryStorage();
    const progress = {
      ...newProgress('device-x'),
      starterDone: true,
      recent: Array.from({ length: 30 }, (_, i) => `Played ${i}`),
    };
    backing.data.set(STORAGE_KEY, JSON.stringify({ state: { progress }, version: 1 }));
    const { calls, fetchBatch } = manualBatches();
    const store = createGameStore({
      storage: debounceStorage(backing, 1000),
      now: () => T0,
      rng: () => 0.5,
      newId: () => 'device-x',
      fetchBatch,
      reportFlag: () => {},
    });
    await hydrated(store);
    store.getState().begin();
    store.getState().dealIn();
    expect(calls).toHaveLength(1);
    calls[0]!.emit({ event: 'card', card: generatedCard(1) });
    calls[0]!.emit({ event: 'card', card: generatedCard(2) });
    vi.useFakeTimers();
    calls[0]!.emit({ event: 'done', sent: 2 });
    vi.advanceTimersByTime(MIN_FETCH_GAP_MS);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.req.recent).toHaveLength(20);
    expect(calls[1]!.req.recent.slice(-2)).toEqual(['Gen 1', 'Gen 2']);
  });

  it('drops a repeat from the stream, and ends on Try again if nothing fresh arrived', async () => {
    const { calls, fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch);
    const repeat = store.getState().game!.starter[0]!.title;
    skipToLoading(store);
    expect(calls).toHaveLength(1);
    calls[0]!.emit({ event: 'card', card: { ...generatedCard(1), title: repeat } });
    calls[0]!.emit({ event: 'done', sent: 1 });
    expect(store.getState().game?.current).toEqual({ kind: 'error', code: 'upstream_error' });
    expect(store.getState().game?.fetch.inFlight).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('reports a card flagged as wrong', async () => {
    const reported: [string, string][] = [];
    const { fetchBatch } = manualBatches();
    const store = await firstTimer(fetchBatch, { now: T0 }, (deviceId, c) => reported.push([deviceId, c.id]));
    store.getState().answer(wrongAnswer(currentCard(store)));
    store.getState().flagWrong();
    expect(reported).toEqual([['device-x', 'starter-1']]);
    store.getState().flagWrong();
    expect(reported).toHaveLength(1);
  });
});
