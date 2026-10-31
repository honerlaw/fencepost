import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';

import { loadStarterDeck } from '@/cards/starter';
import {
  advance,
  answer as answerCard,
  applyBatchEvent,
  batchCancelled,
  batchFailed,
  beginFetch,
  dealIn as dealInSession,
  flagWrong as flagCard,
  newProgress,
  nextFetch,
  recentForRequest,
  setDomains as setSessionDomains,
  skip as skipCard,
  startSession,
  type BatchEvent,
  type Deps,
  type GameState,
} from '@/game/engine';
import { BATCH_DEADLINE_MS, MIN_FETCH_GAP_MS, type FetchErrorCode } from '@/game/fetch-policy';
import type { Card, DomainId, Progress, Rng } from '@/game/types';
import type { DebouncedStorage } from './debounced-storage';

export const STORAGE_KEY = 'fencepost-progress';

export interface BatchRequest {
  deviceId: string;
  domains: DomainId[];
  recent: string[];
}

export type BatchOutcome = { ok: true } | { ok: false; code: FetchErrorCode };

/** Streams one batch, calling onEvent per NDJSON event. Resolves when the stream ends. */
export type FetchBatch = (
  req: BatchRequest,
  onEvent: (ev: BatchEvent) => void,
  signal: AbortSignal,
) => Promise<BatchOutcome>;

export interface StoreDeps {
  storage: DebouncedStorage;
  now: () => number;
  rng: Rng;
  newId: () => string;
  fetchBatch: FetchBatch;
  /** Sends a card the player flagged as wrong to the server (best effort). */
  reportFlag: (deviceId: string, card: Card) => void;
}

export interface GameStore {
  hydrated: boolean;
  progress: Progress | null;
  game: GameState | null;
  /** Toasts from the latest answer, shown by the feed. */
  toasts: { id: number; text: string }[];
  /** Starts the session once progress has loaded. */
  begin: () => void;
  answer: (picked: number | number[]) => void;
  next: () => void;
  skip: () => void;
  flagWrong: () => void;
  dealIn: () => void;
  retry: () => void;
  setDomains: (domains: DomainId[]) => void;
  dismissToast: (id: number) => void;
  /** Cancels an in-flight batch (backgrounded too long); cards already queued stay. */
  cancelFetch: () => void;
}

const beforeHydration = () => {
  // Replaced as soon as the store exists; see createGameStore.
};

export function createGameStore(deps: StoreDeps): StoreApi<GameStore> {
  let controller: AbortController | null = null;
  let lastStart = -Infinity;
  let toastId = 0;
  // Hydration can finish synchronously inside createStore, before `store` is assigned.
  let markHydrated = beforeHydration;
  const onHydrated = () => markHydrated();
  const d = (): Deps => ({ now: deps.now(), rng: deps.rng });

  return createStore<GameStore>()(
    persist(
      (set, get) => {
        markHydrated = () => set({ hydrated: true });
        /** Replaces the game state and mirrors its progress for persistence. */
        const commit = (game: GameState, extra: Partial<GameStore> = {}) =>
          set({ game, progress: game.progress, ...extra });

        /**
         * Starts a batch: the loading state shows now, and the request goes out once the gap since the
         * previous batch has passed. Every way the batch can end leaves a card or the error card.
         */
        const runFetch = (decision: 'fetch' | 'auto-retry' | 'manual') => {
          const game = get().game;
          if (!game) return;
          commit(beginFetch(game, decision, d()));
          const own = new AbortController();
          controller = own;
          const { signal } = own;
          // A batch that ended (or was cancelled) must not touch the state of the one after it.
          const stale = () => controller !== own;
          // Set by a `done` or `error` event: the batch's outcome is decided, whatever the stream does next.
          let ended = false;
          const { progress } = game;
          const req: BatchRequest = {
            deviceId: progress.deviceId,
            domains: progress.domains,
            recent: recentForRequest(game),
          };
          const fail = (code: FetchErrorCode) => {
            if (stale() || ended) return;
            ended = true;
            const current = get().game;
            if (current) commit(batchFailed(current, code, d()));
          };

          const now = deps.now();
          const delay = Math.max(0, lastStart + MIN_FETCH_GAP_MS - now);
          lastStart = now + delay;
          let deadline: ReturnType<typeof setTimeout> | undefined;
          const start = () => {
            if (stale()) return;
            // A stream that hangs (a dropped connection nobody closed) would otherwise keep the batch open forever.
            deadline = setTimeout(() => {
              fail('network');
              if (controller === own) controller = null;
              own.abort();
            }, BATCH_DEADLINE_MS);
            deps
              .fetchBatch(
                req,
                (ev) => {
                  if (stale() || ended) return;
                  const current = get().game;
                  if (!current) return;
                  if (ev.event === 'done' || ev.event === 'error') ended = true;
                  commit(applyBatchEvent(current, ev, d()));
                  // The player may have played through the batch already; fetch the next one now.
                  if (ev.event === 'done') maybeFetch();
                },
                signal,
              )
              // A stream that closes without `done` was cut off.
              .then((outcome) => fail(outcome.ok ? 'network' : outcome.code))
              .finally(() => clearTimeout(deadline))
              .catch(() => fail('network'));
          };
          if (delay > 0) setTimeout(start, delay);
          else start();
        };

        const maybeFetch = () => {
          const game = get().game;
          if (!game) return;
          const decision = nextFetch(game);
          if (decision !== 'wait') runFetch(decision);
        };

        const update = (fn: (game: GameState) => GameState, after?: () => void) => {
          const game = get().game;
          if (!game) return;
          commit(fn(game));
          after?.();
          maybeFetch();
        };

        return {
          hydrated: false,
          progress: null,
          game: null,
          toasts: [],
          begin: () => {
            if (get().game) return;
            const progress = get().progress ?? newProgress(deps.newId());
            commit(startSession(progress, loadStarterDeck(deps.rng), d()));
          },
          answer: (picked) =>
            update(
              (g) => answerCard(g, picked, d()),
              () => {
                const slot = get().game?.current;
                if (slot?.kind === 'card' && slot.result) {
                  set({ toasts: slot.result.toasts.map((text) => ({ id: ++toastId, text })) });
                }
              },
            ),
          next: () => update((g) => (g.current.kind === 'card' && g.current.result ? advance(g, d()) : g)),
          skip: () => update((g) => skipCard(g, d())),
          flagWrong: () => {
            const before = get().game;
            update((g) => flagCard(g));
            const after = get().game;
            if (before !== after && after?.current.kind === 'card')
              deps.reportFlag(after.progress.deviceId, after.current.card);
          },
          dealIn: () => update((g) => dealInSession(g, d())),
          retry: () => {
            const game = get().game;
            if (game && !game.fetch.inFlight) runFetch('manual');
          },
          setDomains: (domains) => update((g) => setSessionDomains(g, domains)),
          dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
          cancelFetch: () => {
            const game = get().game;
            if (!controller || game?.fetch.inFlight !== true) return;
            controller.abort();
            controller = null;
            commit(batchCancelled(game, d()));
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => deps.storage),
        partialize: (s) => ({ progress: s.progress }),
        onRehydrateStorage: () => onHydrated,
      },
    ),
  );
}
