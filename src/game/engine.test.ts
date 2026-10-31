import { describe, expect, it } from 'vitest';

import { loadStarterDeck } from '@/cards/starter';
import {
  advance,
  answer,
  applyBatchEvent,
  batchCancelled,
  batchFailed,
  beginFetch,
  dealIn,
  flagWrong,
  MAX_MISSED,
  newProgress,
  nextFetch,
  recentForRequest,
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
    const flaw: FlawCard = {
      id: 'f',
      type: 'flaw',
      domain: 'cache',
      title: 'F',
      prompt: 'p',
      why: 'w',
      boss: false,
      code: ['a', 'b', 'c'],
      answer: 1,
    };
    expect(answer(playing([flaw]), 1, deps()).current).toMatchObject({ result: { correct: true } });
    const order: Card = {
      id: 'o',
      type: 'order',
      domain: 'cache',
      title: 'O',
      prompt: 'p',
      why: 'w',
      boss: false,
      steps: ['x', 'y', 'z'],
    };
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
    let s = playing(
      Array.from({ length: 8 }, () => modelCard()),
      { missed: [missedCard] },
    );
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
    expect(s.progress.missed[0]!.id).toBe(old[1]!.id);
    expect(s.progress.missed.at(-1)!.id).toBe(fresh.id);
  });

  it('never marks rematches or starter cards 2x', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = startSession({ ...newProgress('d'), starterDone: true, missed: [modelCard()] }, [], deps(T0, seed));
      const dealt = dealIn(s, deps(T0, seed));
      expect(current(dealt).double).toBeFalsy();
    }
    expect(
      loadStarterDeck(seededRng(1))
        .filter((c) => c.double === true)
        .map((c) => c.id),
    ).toEqual(['starter-3']);
  });

  it('never rolls 2x on the starter path, even with an RNG that always rolls', () => {
    const always = { now: T0, rng: () => 0 };
    let s = startSession(newProgress('d'), loadStarterDeck(seededRng(1)), always);
    const served: PlayedCard[] = [];
    while (s.current.kind === 'card') {
      served.push(current(s));
      s = skip(s, always);
    }
    expect(served.map((c) => c.id)).toEqual([
      'starter-1',
      'starter-2',
      'starter-3',
      'starter-4',
      'starter-5',
      'starter-6',
    ]);
    expect(served.filter((c) => c.double === true).map((c) => c.id)).toEqual(['starter-3']);
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
    // Clear recent so the assertion below sees flagWrong's own write, not answer's.
    s = flagWrong({ ...s, progress: { ...s.progress, recent: [] } });
    expect(s.combo).toBe(2);
    expect(s.progress.answered).toBe(2);
    expect(s.progress.missed.map((c) => c.id)).not.toContain(card.id);
    expect(s.progress.recent).toEqual([card.title]);
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

  it('starts the session on a skip, so skipping the whole starter deck still fetches', () => {
    let s = startSession(newProgress('d'), loadStarterDeck(seededRng(1)), deps());
    expect(nextFetch(skip(s, deps()))).toBe('fetch');
    while (s.current.kind === 'card') s = skip(s, deps());
    expect(s.current.kind).toBe('loading');
    expect(s.progress.starterDone).toBe(true);
    expect(nextFetch(s)).toBe('fetch');
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

  it('Try again reaches a rematch that was the last card played, when the fetch fails again', () => {
    const only = modelCard();
    const failed = batchFailed(playing([], { missed: [only] }), 'upstream_error', deps());
    expect(current(failed)).toMatchObject({ id: only.id, rematch: true });
    const stuck = skip(failed, deps());
    expect(stuck.current).toEqual({ kind: 'error', code: 'upstream_error' });
    const retrying = beginFetch(stuck, 'manual', deps());
    expect(retrying.current.kind).toBe('loading');
    expect(current(batchFailed(retrying, 'upstream_error', deps()))).toMatchObject({ id: only.id, rematch: true });
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

  it('fails a batch whose cards were all unplayable, even when the server counted them sent', () => {
    let s = beginFetch(playing([]), 'fetch', deps());
    s = applyBatchEvent(s, { event: 'card', card: { id: 'x', type: 'flaw' } }, deps());
    s = applyBatchEvent(s, { event: 'done', sent: 1 }, deps());
    expect(s.current).toEqual({ kind: 'error', code: 'upstream_error' });
  });

  it('counts playable cards per batch', () => {
    let s = beginFetch(playing([]), 'fetch', deps());
    s = applyBatchEvent(s, { event: 'card', card: modelCard() }, deps());
    expect(s.fetch.received).toBe(1);
    s = applyBatchEvent(s, { event: 'done', sent: 1 }, deps());
    expect(beginFetch(s, 'fetch', deps()).fetch.received).toBe(0);
  });

  it('a cancelled batch turns the loading card into the error card, and keeps a card in play', () => {
    let s = beginFetch(playing([]), 'fetch', deps());
    expect(s.current.kind).toBe('loading');
    s = batchCancelled(s, deps());
    expect(s.current).toEqual({ kind: 'error', code: 'network' });
    expect(s.fetch.inFlight).toBe(false);

    let t = beginFetch(playing([modelCard()]), 'fetch', deps());
    const before = t.current;
    t = batchCancelled(t, deps());
    expect(t.current).toBe(before);
    expect(t.fetch).toMatchObject({ inFlight: false, error: null });
  });

  it('keeps rematches playable when the server fails', () => {
    let s = playing([], { missed: [modelCard(), modelCard()] });
    s = beginFetch(advance(right(s), deps()), 'fetch', deps());
    s = batchFailed(s, 'unavailable', deps());
    expect(current(s).rematch).toBe(true);
  });
});

const titled = (title: string) => modelCard({ title });
const fetching = (s: GameState) => beginFetch(s, 'fetch', deps());
const queued = (s: GameState) => s.queue.map((c) => c.title);
const deck = () => loadStarterDeck(seededRng(1));
const startFresh = () => startSession(newProgress('d'), deck(), deps());
/** A first-timer with the starter deck, one card in. */
const firstRun = () => answer(startFresh(), 0, deps());
const restart = (s: GameState) => startSession(s.progress, deck(), deps());

function batch(start: GameState, ...cards: Card[]): GameState {
  let s = start;
  for (const card of cards) s = applyBatchEvent(s, { event: 'card', card }, deps());
  return s;
}

describe('duplicate cards', () => {
  it('drops a card matching a title in recent history', () => {
    const s = batch(playing([titled('Kept')], { recent: ['Double booking'] }), titled('Double booking'));
    expect(s.queue).toHaveLength(0);
  });

  it('drops a card matching the card on screen', () => {
    const s = playing([titled('On screen')]);
    expect(batch(s, titled('On screen')).queue).toHaveLength(0);
  });

  it('drops a card matching one in the queue', () => {
    const s = playing([titled('On screen'), titled('Waiting')]);
    expect(queued(batch(s, titled('Waiting')))).toEqual(['Waiting']);
  });

  it('drops a card matching an unplayed starter card', () => {
    const s = firstRun();
    const later = s.starter[0]!;
    expect(batch(s, titled(later.title)).queue).toHaveLength(0);
  });

  it('drops a card matching the rematch list, and that card still comes back', () => {
    const missed = titled('Missed once');
    let s = playing([titled('On screen')], { missed: [missed] });
    s = batch(s, titled('Missed once'));
    expect(s.queue).toHaveLength(0);
    s = advance(right(s), deps());
    expect(current(s)).toMatchObject({ id: missed.id, rematch: true });
  });

  it('keeps only the first of two matching cards in a batch', () => {
    const s = batch(playing([titled('On screen')]), titled('Same title'), titled('Same title'));
    expect(queued(s)).toEqual(['Same title']);
  });

  it('matches across case, punctuation and spacing', () => {
    const s = batch(playing([titled('On screen')], { recent: ['double booking'] }), titled('  Double-Booking! '));
    expect(s.queue).toHaveLength(0);
  });

  it('never treats a title with no letters or digits as a repeat', () => {
    const s = batch(playing([titled('On screen')], { recent: ['???'] }), titled('!!!'), titled('...'));
    expect(queued(s)).toEqual(['!!!', '...']);
  });

  it('counts only fresh cards, and a batch with some still succeeds', () => {
    let s = fetching(playing([titled('On screen')], { recent: ['Repeat'] }));
    s = batch(s, titled('Repeat'), titled('Fresh'));
    expect(s.fetch.received).toBe(1);
    s = applyBatchEvent(s, { event: 'done', sent: 2 }, deps());
    expect(s.fetch.error).toBeNull();
    expect(queued(s)).toEqual(['Fresh']);
  });

  it('shows the error card when a batch of repeats ends while the player waits', () => {
    let s = fetching(playing([], { recent: ['Repeat'] }));
    s = batch(s, titled('Repeat'));
    s = applyBatchEvent(s, { event: 'done', sent: 1 }, deps());
    expect(s.current).toEqual({ kind: 'error', code: 'upstream_error' });
    expect(s.fetch.inFlight).toBe(false);
    expect(nextFetch(s)).toBe('wait');
  });

  it('leaves the card on screen alone when a batch of repeats ends', () => {
    let s = fetching(playing([titled('On screen')]));
    const before = current(s);
    s = batch(s, titled('On screen'));
    s = applyBatchEvent(s, { event: 'done', sent: 1 }, deps());
    expect(current(s)).toBe(before);
    expect(s.fetch.error?.code).toBe('upstream_error');
  });

  describe('the titles sent to the server', () => {
    it('adds the card on screen, then the queue, after history', () => {
      const s = playing([titled('On screen'), titled('Waiting')], { recent: ['Played'] });
      expect(recentForRequest(s)).toEqual(['Played', 'On screen', 'Waiting']);
    });

    it('adds unplayed starter cards', () => {
      const s = firstRun();
      expect(recentForRequest(s)).toEqual(deck().map((c) => c.title));
    });

    it('lists a title once, at its latest position', () => {
      const s = playing([titled('double booking')], { recent: ['Double-booking', 'Other'] });
      expect(recentForRequest(s)).toEqual(['Other', 'double booking']);
    });

    it('keeps every title with no letters or digits', () => {
      const s = playing([titled('???')], { recent: ['!!!'] });
      expect(recentForRequest(s)).toEqual(['!!!', '???']);
    });

    it('caps at 20 by cutting history, never a pending title', () => {
      const history = Array.from({ length: 30 }, (_, i) => `Played ${i}`);
      const s = playing([titled('On screen'), titled('Waiting 1'), titled('Waiting 2')], { recent: history });
      const sent = recentForRequest(s);
      expect(sent).toHaveLength(20);
      expect(sent.slice(-3)).toEqual(['On screen', 'Waiting 1', 'Waiting 2']);
      expect(sent[0]).toBe('Played 13');
    });
  });

  describe('restarting partway through the starter deck', () => {
    it('skips cards already answered, and no XP is awarded twice', () => {
      let s = startFresh();
      for (let i = 0; i < 2; i++) s = advance(answer(s, (current(s) as ModelCard).answer, deps()), deps());
      const { xp, answered } = s.progress;
      s = restart(s);
      expect(current(s).id).toBe(deck()[2]!.id);
      expect(s.starter).toHaveLength(3);
      expect(s.progress).toMatchObject({ xp, answered, starterDone: false });
    });

    it('skips cards already skipped', () => {
      const s = restart(skip(startFresh(), deps()));
      expect(current(s).id).toBe(deck()[1]!.id);
    });

    it('skips cards flagged as wrong', () => {
      const first = startFresh();
      const wrongPick = ((first.current as { card: ModelCard }).card.answer + 1) % 4;
      const s = restart(flagWrong(answer(first, wrongPick, deps())));
      expect(current(s).id).toBe(deck()[1]!.id);
      expect(s.progress.missed).toHaveLength(0);
    });

    it('sets starterDone when the remaining cards are finished', () => {
      let s = restart(skip(startFresh(), deps()));
      while (s.current.kind === 'card') s = skip(s, deps());
      expect(s.progress.starterDone).toBe(true);
    });

    it('still brings a missed starter card back as a rematch', () => {
      let s = startFresh();
      const missed = current(s);
      s = answer(s, ((s.current as { card: ModelCard }).card.answer + 1) % 4, deps());
      s = restart(s);
      expect(s.progress.missed.map((c) => c.id)).toEqual([missed.id]);
      while (s.current.kind === 'card' && current(s).starter === true) s = skip(s, deps());
      expect(current(s)).toMatchObject({ id: missed.id, rematch: true });
    });

    it('shows the welcome card when every starter title is already in recent', () => {
      const recent = deck().map((c) => c.title);
      const s = startSession({ ...newProgress('d'), recent }, deck(), deps());
      expect(s.current.kind).toBe('welcome');
      expect(s.progress.starterDone).toBe(true);
    });
  });
});
