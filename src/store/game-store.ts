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
  setDomains as setSessionDomains,
  skip as skipCard,
  startSession,
  type BatchEvent,
  type Deps,
  type GameState,
} from '@/game/engine';
import type { FetchErrorCode } from '@/game/fetch-policy';
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
export type FetchBatch = (req: BatchRequest, onEvent: (ev: BatchEvent) => void, signal: AbortSignal) => Promise<BatchOutcome>;

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

/** How many recent titles go to the server. */
export const RECENT_SENT = 20;

export function createGameStore(deps: StoreDeps): StoreApi<GameStore> {
  let controller: AbortController | null = null;
  let toastId = 0;
  // Hydration can finish synchronously inside createStore, before `store` is assigned.
  let markHydrated = () => {};
  const d = (): Deps => ({ now: deps.now(), rng: deps.rng });

  return createStore<GameStore>()(
    persist(
      (set, get) => {
        markHydrated = () => set({ hydrated: true });
        /** Replaces the game state and mirrors its progress for persistence. */
        const commit = (game: GameState, extra: Partial<GameStore> = {}) => set({ game, progress: game.progress, ...extra });

        const runFetch = (decision: 'fetch' | 'auto-retry' | 'manual') => {
          const game = get().game;
          if (!game) return;
          commit(beginFetch(game, decision, d()));
          controller = new AbortController();
          const { signal } = controller;
          const { progress } = game;
          const req: BatchRequest = { deviceId: progress.deviceId, domains: progress.domains, recent: progress.recent.slice(-RECENT_SENT) };
          deps
            .fetchBatch(req, (ev) => {
              if (signal.aborted) return;
              const current = get().game;
              if (current) commit(applyBatchEvent(current, ev, d()));
            }, signal)
            .then((outcome) => {
              if (signal.aborted) return;
              const current = get().game;
              if (!current) return;
              if (!outcome.ok) commit(batchFailed(current, outcome.code, d()));
              else if (current.fetch.inFlight) {
                // The stream ended without `done`: treat it as cut off.
                commit(batchFailed(current, 'network', d()));
              }
            })
            .catch(() => {
              if (signal.aborted) return;
              const current = get().game;
              if (current) commit(batchFailed(current, 'network', d()));
            });
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
              }
            ),
          next: () => update((g) => (g.current.kind === 'card' && g.current.result ? advance(g, d()) : g)),
          skip: () => update((g) => skipCard(g, d())),
          flagWrong: () => {
            const before = get().game;
            update((g) => flagCard(g));
            const after = get().game;
            if (before !== after && after?.current.kind === 'card') deps.reportFlag(after.progress.deviceId, after.current.card);
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
            if (!controller || !game?.fetch.inFlight) return;
            controller.abort();
            controller = null;
            commit(batchCancelled(game));
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => deps.storage),
        partialize: (s) => ({ progress: s.progress }),
        onRehydrateStorage: () => () => markHydrated(),
      }
    )
  );
}
