import { normalizeGenerated } from './incoming';
import { celebrationsFor, hapticFor, localDay, rollDouble, scoreAnswer, updateStreak, verdictWord, type HapticPattern, type Score } from './rules';
import { decideFetch, fetchFailed, fetchStarted, fetchSucceeded, initialFetchState, type FetchDecision, type FetchErrorCode, type FetchState } from './fetch-policy';
import type { Card, DomainId, PlayedCard, Progress, Rng } from './types';

export const MAX_MISSED = 30;
export const MAX_RECENT = 30;
/** Non-rematch cards served before a rematch becomes due. */
export const REMATCH_EVERY = 5;

export interface AnswerResult {
  correct: boolean;
  /** Tapped line / option index, or the order the player placed the steps in. */
  picked: number | number[];
  score: Score;
  verdict: string;
  toasts: string[];
  haptic: HapticPattern;
  /** Undo data for "card was wrong". */
  undo: { combo: number; wasMissed: boolean };
  flagged: boolean;
}

export type Slot =
  | { kind: 'card'; card: PlayedCard; result: AnswerResult | null }
  | { kind: 'welcome' }
  | { kind: 'loading'; since: number }
  | { kind: 'error'; code: FetchErrorCode };

export interface GameState {
  progress: Progress;
  combo: number;
  current: Slot;
  /** Generated cards waiting to be served. */
  queue: PlayedCard[];
  /** Starter cards still to play this session (empty once the deck is done). */
  starter: PlayedCard[];
  sinceRematch: number;
  lastAnsweredId: string | null;
  answers: number;
  /** True after the first answer or "Deal me in"; nothing is fetched before. */
  sessionStarted: boolean;
  fetch: FetchState;
}

export interface Deps {
  now: number;
  rng: Rng;
}

export function newProgress(deviceId: string): Progress {
  return {
    v: 1,
    xp: 0,
    answered: 0,
    correct: 0,
    bestCombo: 0,
    streak: 0,
    lastDay: '',
    missed: [],
    recent: [],
    domains: [],
    starterDone: false,
    deviceId,
  };
}

/** Starts a session: first-timers get the starter deck, returning players a welcome card. */
export function startSession(progress: Progress, starterDeck: PlayedCard[], deps: Deps): GameState {
  const base: GameState = {
    progress,
    combo: 0,
    current: { kind: 'loading', since: deps.now },
    queue: [],
    starter: progress.starterDone ? [] : starterDeck,
    sinceRematch: 0,
    lastAnsweredId: null,
    answers: 0,
    sessionStarted: false,
    fetch: initialFetchState,
  };
  if (progress.starterDone) return { ...base, current: { kind: 'welcome' } };
  return advance(base, deps);
}

export function dealIn(state: GameState, deps: Deps): GameState {
  return advance({ ...state, sessionStarted: true }, deps);
}

function pushRecent(recent: string[], title: string): string[] {
  return [...recent.filter((t) => t !== title), title].slice(-MAX_RECENT);
}

function withoutCard(missed: Card[], id: string): Card[] {
  return missed.filter((c) => c.id !== id);
}

/** Strips serve-time flags so the rematch queue stores plain cards. */
function plainCard(card: PlayedCard): Card {
  const { double: _double, rematch: _rematch, starter: _starter, ...rest } = card;
  return rest as Card;
}

/** Moves a card to the back of the rematch queue, dropping the oldest past the cap. */
function toBack(missed: Card[], card: PlayedCard): Card[] {
  return [...withoutCard(missed, card.id), plainCard(card)].slice(-MAX_MISSED);
}

export function isCorrect(card: Card, picked: number | number[]): boolean {
  if (card.type === 'order') {
    return Array.isArray(picked) && picked.length === card.steps.length && picked.every((step, i) => step === i);
  }
  return picked === card.answer;
}

/**
 * Grades the current card. For order cards `picked` lists step indexes (into the
 * correct order) in the sequence the player placed them.
 */
export function answer(state: GameState, picked: number | number[], deps: Deps): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || slot.result) return state;
  const card = slot.card;
  const correct = isCorrect(card, picked);
  const combo = correct ? state.combo + 1 : 0;
  const score = scoreAnswer({ correct, boss: card.boss, double: !!card.double, combo });
  const streak = updateStreak(state.progress, localDay(new Date(deps.now)));
  const wasMissed = state.progress.missed.some((c) => c.id === card.id);

  let missed = state.progress.missed;
  if (!correct) missed = toBack(missed, card);
  else if (wasMissed) missed = withoutCard(missed, card.id);

  const lastStarter = !!card.starter && state.starter.length === 0;
  const progress: Progress = {
    ...state.progress,
    xp: state.progress.xp + score.points,
    answered: state.progress.answered + 1,
    correct: state.progress.correct + (correct ? 1 : 0),
    bestCombo: Math.max(state.progress.bestCombo, combo),
    streak: streak.streak,
    lastDay: streak.lastDay,
    missed,
    recent: pushRecent(state.progress.recent, card.title),
    starterDone: state.progress.starterDone || lastStarter,
  };

  const result: AnswerResult = {
    correct,
    picked,
    score,
    verdict: verdictWord(correct, card.boss, deps.rng),
    toasts: celebrationsFor({ xpBefore: state.progress.xp, xpAfter: progress.xp, combo, streak }),
    haptic: hapticFor(correct),
    undo: { combo: state.combo, wasMissed },
    flagged: false,
  };

  return {
    ...state,
    progress,
    combo,
    current: { kind: 'card', card, result },
    lastAnsweredId: card.id,
    answers: state.answers + 1,
    sessionStarted: true,
  };
}

/** "Card was wrong", offered only after a wrong answer: undo its effect on the run. */
export function flagWrong(state: GameState): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || !slot.result || slot.result.correct || slot.result.flagged) return state;
  const progress: Progress = {
    ...state.progress,
    answered: Math.max(0, state.progress.answered - 1),
    missed: withoutCard(state.progress.missed, slot.card.id),
    recent: pushRecent(state.progress.recent, slot.card.title),
  };
  return {
    ...state,
    progress,
    combo: slot.result.undo.combo,
    current: { ...slot, result: { ...slot.result, flagged: true } },
  };
}

/** Skip: no points, no combo change. A skipped rematch goes to the back of the queue. */
export function skip(state: GameState, deps: Deps): GameState {
  const slot = state.current;
  if (slot.kind !== 'card' || slot.result) return state;
  const card = slot.card;
  const progress: Progress = {
    ...state.progress,
    missed: card.rematch ? toBack(state.progress.missed, card) : state.progress.missed,
    recent: pushRecent(state.progress.recent, card.title),
    starterDone: state.progress.starterDone || (!!card.starter && state.starter.length === 0),
  };
  return advance({ ...state, progress, lastAnsweredId: card.id }, deps);
}

function dueRematch(state: GameState): Card | undefined {
  return state.progress.missed.find((c) => c.id !== state.lastAnsweredId);
}

function serve(state: GameState, card: PlayedCard, isRematch: boolean): GameState {
  return {
    ...state,
    current: { kind: 'card', card, result: null },
    sinceRematch: isRematch ? 0 : state.sinceRematch + 1,
  };
}

/**
 * Serve order: starter cards (until done) → a rematch if due → the generated
 * queue → a rematch while waiting → a status card.
 */
export function advance(state: GameState, deps: Deps): GameState {
  if (!state.progress.starterDone && state.starter.length > 0) {
    const [card, ...rest] = state.starter;
    return serve({ ...state, starter: rest }, card, false);
  }
  const rematch = dueRematch(state);
  if (rematch && state.sinceRematch >= REMATCH_EVERY) {
    return serve(state, { ...rematch, rematch: true }, true);
  }
  if (state.queue.length > 0) {
    const [card, ...rest] = state.queue;
    const served = rollDouble(card, deps.rng) ? { ...card, double: true } : card;
    return serve({ ...state, queue: rest }, served, false);
  }
  if (rematch) return serve(state, { ...rematch, rematch: true }, true);
  if (state.fetch.error && !state.fetch.inFlight) return { ...state, current: { kind: 'error', code: state.fetch.error.code } };
  return { ...state, current: { kind: 'loading', since: deps.now } };
}

/** True when the current slot is a status card waiting for something playable. */
export function isWaiting(state: GameState): boolean {
  return state.current.kind === 'loading' || state.current.kind === 'error';
}

// ---- Fetch lifecycle ----

export function nextFetch(state: GameState): FetchDecision {
  return decideFetch(state.fetch, { queued: state.queue.length, sessionStarted: state.sessionStarted, answers: state.answers });
}

export function beginFetch(state: GameState, decision: FetchDecision | 'manual', deps: Deps): GameState {
  const next = { ...state, fetch: fetchStarted(state.fetch, decision) };
  // A Try again from the error card shows the loading card straight away.
  return next.current.kind === 'error' ? { ...next, current: { kind: 'loading', since: deps.now } } : next;
}

/** One event from the /api/cards NDJSON stream. */
export type BatchEvent =
  | { event: 'start'; domain: string; count: number }
  | { event: 'card'; card: unknown }
  | { event: 'ping' }
  | { event: 'done'; sent: number }
  | { event: 'error'; code: string };

export function applyBatchEvent(state: GameState, ev: BatchEvent, deps: Deps): GameState {
  switch (ev.event) {
    case 'start':
      return { ...state, fetch: { ...state.fetch, domain: ev.domain } };
    case 'card': {
      const card = normalizeGenerated(ev.card);
      if (!card) return state;
      const next = { ...state, queue: [...state.queue, card] };
      // The loading card is swapped for the first card the moment it arrives.
      return isWaiting(next) ? advance(next, deps) : next;
    }
    case 'done': {
      // A batch that produced nothing counts as a failure, so it can't refetch in a loop.
      if (ev.sent === 0) return batchFailed(state, 'upstream_error', deps);
      const next = { ...state, fetch: fetchSucceeded(state.fetch) };
      return isWaiting(next) ? advance(next, deps) : next;
    }
    case 'error':
      return batchFailed(state, 'upstream_error', deps);
    case 'ping':
      return state;
  }
}

export function batchFailed(state: GameState, code: FetchErrorCode, deps: Deps): GameState {
  const next = { ...state, fetch: fetchFailed(state.fetch, code, state.answers) };
  return isWaiting(next) ? advance(next, deps) : next;
}

/** Called when a batch request is cancelled (backgrounded); cards already queued stay. */
export function batchCancelled(state: GameState): GameState {
  return { ...state, fetch: { ...state.fetch, inFlight: false } };
}

export function setDomains(state: GameState, domains: DomainId[]): GameState {
  return { ...state, progress: { ...state.progress, domains } };
}
