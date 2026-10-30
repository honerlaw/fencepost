import { describe, expect, it } from 'vitest';

import { loadStarterDeck } from '@/cards/starter';
import {
  advance,
  answer,
  applyBatchEvent,
  batchFailed,
  beginFetch,
  dealIn,
  flagWrong,
  MAX_MISSED,
  newProgress,
  nextFetch,
  skip,
  startSession,
  type GameState,
} from './engine';
import { seededRng } from './rng';
import type { Card, FlawCard, ModelCard, PlayedCard, Progress } from './types';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 29, 12, 0).getTime();
// A fixed 0.5 never rolls 2x (12%), so scores are predictable; tests about randomness pass a seed.
const deps = (now = T0, seed?: number) => ({ now, rng: seed == null ? () => 0.5 : seededRng(seed) });

let counter = 0;
function modelCard(over: Partial<ModelCard> = {}): ModelCard {
  counter++;
  return {
    id: `gen-${counter}`,
    type: 'model',
    domain: 'cache',
    title: `Card ${counter}`,
    prompt: 'Pick one.',
    why: 'Because.',
    boss: false,
    options: ['a', 'b', 'c', 'd'],
    answer: 2,
    ...over,
  };
}

/** A returning player (starter done) who has dealt in with `queue` waiting. */
function playing(queue: PlayedCard[], progress: Partial<Progress> = {}): GameState {
  const base = startSession({ ...newProgress('dev-1'), starterDone: true, ...progress }, [], deps());
  return advance({ ...base, sessionStarted: true, queue }, deps());
}

function current(state: GameState): PlayedCard {
  if (state.current.kind !== 'card') throw new Error(`expected a card, got ${state.current.kind}`);
  return state.current.card;
}

const right = (s: GameState) => answer(s, (current(s) as ModelCard).answer, deps());
const wrong = (s: GameState) => answer(s, ((current(s) as ModelCard).answer + 1) % 4, deps());

describe('session start', () => {
  it('serves the starter deck in order to first-time players', () => {
    const s = startSession(newProgress('d'), loadStarterDeck(seededRng(1)), deps());
    expect(current(s).id).toBe('starter-1');
    expect(s.sessionStarted).toBe(false);
  });

  it('greets returning players with a welcome card, then deals in', () => {
    const s = startSession({ ...newProgress('d'), starterDone: true }, loadStarterDeck(seededRng(1)), deps());
    expect(s.current.kind).toBe('welcome');
    const dealt = dealIn({ ...s, queue: [modelCard()] }, deps());
    expect(dealt.sessionStarted).toBe(true);
    expect(current(dealt).type).toBe('model');
  });

  it('marks starterDone after the last starter card', () => {
    let s = startSession(newProgress('d'), loadStarterDeck(seededRng(1)), deps());
    for (let i = 0; i < 6; i++) {
      expect(s.progress.starterDone).toBe(false);
      s = skip(s, deps());
    }
    expect(s.progress.starterDone).toBe(true);
    expect(s.current.kind).toBe('loading');
  });
});

describe('answering', () => {
  it('scores, counts and builds the combo on right answers', () => {
    let s = playing([modelCard(), modelCard(), modelCard()]);
    s = right(s);
    expect(s.progress).toMatchObject({ xp: 100, answered: 1, correct: 1, bestCombo: 1 });
    s = right(advance(s, deps()));
    s = right(advance(s, deps()));
    expect(s.combo).toBe(3);
    expect(s.current.kind === 'card' && s.current.result?.score.points).toBe(150);
    expect(s.progress.xp).toBe(350);
  });

  it('resets the combo and saves the card for a rematch on a wrong answer', () => {
    let s = right(playing([modelCard(), modelCard()]));
    s = wrong(advance(s, deps()));
    expect(s.combo).toBe(0);
    expect(s.progress.bestCombo).toBe(1);
    expect(s.progress.missed.map((c) => c.id)).toEqual([current(s).id]);
    expect(s.current.kind === 'card' && s.current.result?.score.points).toBe(0);
  });

  it('grades flaw cards by line and order cards by the whole sequence', () => {
    const flaw: FlawCard = { id: 'f', type: 'flaw', domain: 'cache', title: 'F', prompt: 'p', why: 'w', boss: false, code: ['a', 'b', 'c'], answer: 1 };
    expect(answer(playing([flaw]), 1, deps()).current).toMatchObject({ result: { correct: true } });
    const order: Card = { id: 'o', type: 'order', domain: 'cache', title: 'O', prompt: 'p', why: 'w', boss: false, steps: ['x', 'y', 'z'] };
    expect(answer(playing([order]), [0, 1, 2], deps()).current).toMatchObject({ result: { correct: true } });
    expect(answer(playing([order]), [0, 2, 1], deps()).current).toMatchObject({ result: { correct: false } });
  });

  it('keeps titles in recent, most recent last, capped at 30', () => {
    let s = playing(Array.from({ length: 35 }, () => modelCard()));
    for (let i = 0; i < 35; i++) s = advance(right(s), deps());
    expect(s.progress.recent).toHaveLength(30);
    expect(s.progress.recent.at(-1)).toMatch(/^Card /);
  });

  it('increments the streak on the next calendar day', () => {
    let s = right(playing([modelCard(), modelCard()]));
    expect(s.progress.streak).toBe(1);
    s = advance(s, deps());
    s = answer(s, (current(s) as ModelCard).answer, deps(T0 + DAY));
    expect(s.progress.streak).toBe(2);
    expect(s.current.kind === 'card' && s.current.result?.toasts).toContain('2-day streak');
  });
});

describe('rematches', () => {
  it('serves the oldest missed card after 5 non-rematch cards', () => {
    const missedCard = modelCard({ title: 'Missed' });
    let s = playing(Array.from({ length: 8 }, () => modelCard()), { missed: [missedCard] });
    for (let i = 0; i < 5; i++) {
      expect(current(s).rematch).toBeFalsy();
      s = advance(right(s), deps());
    }
    expect(current(s)).toMatchObject({ id: missedCard.id, rematch: true });
  });

  it('never serves the card just answered as the next rematch', () => {
    let s = playing([modelCard()]);
    s = wrong(s);
    const missedId = current(s).id;
    s = advance(s, deps());
    // Queue empty and the only missed card was just answered: wait instead.
    expect(s.current.kind).toBe('loading');
    expect(s.progress.missed.map((c) => c.id)).toEqual([missedId]);
  });

  it('serves missed cards while the generated queue is empty', () => {
    const missedCard = modelCard();
    const s = playing([], { missed: [missedCard] });
    expect(current(s)).toMatchObject({ id: missedCard.id, rematch: true });
  });

  it('removes a rematch answered right and moves one answered wrong to the back', () => {
    const [a, b] = [modelCard(), modelCard()];
    let s = playing([], { missed: [a, b] });
    s = wrong(s);
    expect(s.progress.missed.map((c) => c.id)).toEqual([b.id, a.id]);
    s = right(advance(s, deps()));
    expect(s.progress.missed.map((c) => c.id)).toEqual([a.id]);
  });

  it('keeps at most 30 missed cards, dropping the oldest', () => {
    const old = Array.from({ length: MAX_MISSED }, () => modelCard());
    const fresh = modelCard();
    const s = wrong(playing([fresh], { missed: old }));
    expect(s.progress.missed).toHaveLength(MAX_MISSED);
    expect(s.progress.missed[0].id).toBe(old[1].id);
    expect(s.progress.missed.at(-1)!.id).toBe(fresh.id);
  });

  it('never marks rematches or starter cards 2x', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = startSession({ ...newProgress('d'), starterDone: true, missed: [modelCard()] }, [], deps(T0, seed));
      const dealt = dealIn(s, deps(T0, seed));
      expect(current(dealt).double).toBeFalsy();
    }
    expect(loadStarterDeck(seededRng(1)).filter((c) => c.double).map((c) => c.id)).toEqual(['starter-3']);
  });
});

describe('skip and card was wrong', () => {
  it('skip scores nothing and leaves the combo alone', () => {
    let s = right(playing([modelCard(), modelCard(), modelCard()]));
    s = skip(advance(s, deps()), deps());
    expect(s.combo).toBe(1);
    expect(s.progress).toMatchObject({ xp: 100, answered: 1 });
  });

  it('a skipped rematch moves to the back of the queue', () => {
    const [a, b] = [modelCard(), modelCard()];
    const s = skip(playing([], { missed: [a, b] }), deps());
    expect(s.progress.missed.map((c) => c.id)).toEqual([b.id, a.id]);
  });

  it('card was wrong restores the combo, takes one off answered and clears the rematch', () => {
    let s = right(playing([modelCard(), modelCard(), modelCard()]));
    s = right(advance(s, deps()));
    s = wrong(advance(s, deps()));
    const card = current(s);
    expect(s.progress.missed.map((c) => c.id)).toContain(card.id);
    s = flagWrong(s);
    expect(s.combo).toBe(2);
    expect(s.progress.answered).toBe(2);
    expect(s.progress.missed.map((c) => c.id)).not.toContain(card.id);
    expect(s.progress.recent).toContain(card.title);
    expect(s.current.kind === 'card' && s.current.result?.flagged).toBe(true);
  });

  it('card was wrong does nothing after a right answer', () => {
    const s = right(playing([modelCard()]));
    expect(flagWrong(s)).toBe(s);
  });
});

describe('batches', () => {
  it('waits for the first answer before fetching', () => {
    const s = startSession(newProgress('d'), loadStarterDeck(seededRng(1)), deps());
    expect(nextFetch(s)).toBe('wait');
    expect(nextFetch(answer(s, 0, deps()))).toBe('fetch');
  });

  it('swaps the loading card for the first card as it streams in', () => {
    let s = playing([]);
    s = beginFetch(s, nextFetch(s), deps());
    expect(s.current.kind).toBe('loading');
    s = applyBatchEvent(s, { event: 'start', domain: 'cache', count: 5 }, deps());
    expect(s.fetch.domain).toBe('cache');
    const card = modelCard();
    s = applyBatchEvent(s, { event: 'card', card }, deps());
    expect(current(s).id).toBe(card.id);
    expect(s.fetch.inFlight).toBe(true);
    s = applyBatchEvent(s, { event: 'card', card: modelCard() }, deps());
    expect(s.queue).toHaveLength(1);
    s = applyBatchEvent(s, { event: 'done', sent: 2 }, deps());
    expect(s.fetch.inFlight).toBe(false);
  });

  it('ignores malformed cards from the stream', () => {
    const s = applyBatchEvent(playing([]), { event: 'card', card: { id: 'x', type: 'flaw' } }, deps());
    expect(s.queue).toHaveLength(0);
    expect(s.current.kind).toBe('loading');
  });

  it('shows the error card when a batch fails with nothing to play', () => {
    let s = beginFetch(playing([]), 'fetch', deps());
    s = batchFailed(s, 'unavailable', deps());
    expect(s.current).toEqual({ kind: 'error', code: 'unavailable' });
  });

  it('treats an empty batch as a failure so it cannot refetch in a loop', () => {
    let s = beginFetch(playing([]), 'fetch', deps());
    s = applyBatchEvent(s, { event: 'done', sent: 0 }, deps());
    expect(s.current.kind).toBe('error');
  });

  it('keeps rematches playable when the server fails', () => {
    let s = playing([], { missed: [modelCard(), modelCard()] });
    s = beginFetch(advance(right(s), deps()), 'fetch', deps());
    s = batchFailed(s, 'unavailable', deps());
    expect(current(s).rematch).toBe(true);
  });
});
