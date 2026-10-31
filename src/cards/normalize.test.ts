import { describe, expect, it } from 'vitest';

import { seededRng } from '@/game/rng';
import type { BreakCard, FlawCard, ModelCard, OrderCard, TraceCard } from '@/game/types';
import { LIMITS, normalize } from './normalize';
import { loadStarterDeck } from './starter';

let n = 0;
const opts = (seed = 1) => ({
  domain: 'payments' as const,
  boss: false,
  rng: seededRng(seed),
  newId: () => `id-${++n}`,
});

const raw = (over: Record<string, unknown>) => ({
  type: 'flaw',
  title: 'A title',
  prompt: 'A prompt.',
  code: null,
  input: null,
  options: null,
  correct: null,
  bad_line: null,
  steps: null,
  why: 'Because.',
  ...over,
});

const flaw = (over: Record<string, unknown> = {}) =>
  raw({ code: ['def f(x):', '  if x > 1:', '    return x', '  return 0'], bad_line: 'if x > 1:', ...over });

const model = (over: Record<string, unknown> = {}) =>
  raw({ type: 'model', options: ['Alpha', 'Beta', 'Gamma', 'Delta'], correct: 'Gamma', ...over });

describe('normalize', () => {
  it('converts a flaw card, finding the bad line by text', () => {
    const card = normalize(flaw(), opts()) as FlawCard;
    expect(card.type).toBe('flaw');
    expect(card.answer).toBe(1);
    expect(card.domain).toBe('payments');
    expect(card.boss).toBe(false);
    expect(card.id).toMatch(/^id-/);
  });

  it('matches bad_line with whitespace collapsed', () => {
    const card = normalize(flaw({ bad_line: '   if   x > 1:  ' }), opts()) as FlawCard;
    expect(card.answer).toBe(1);
  });

  it('drops a flaw card whose bad_line matches no line or two lines', () => {
    expect(normalize(flaw({ bad_line: 'nope' }), opts())).toBeNull();
    expect(normalize(flaw({ code: ['x = 1', 'x = 1', 'y = 2'], bad_line: 'x = 1' }), opts())).toBeNull();
    expect(normalize(flaw({ bad_line: null }), opts())).toBeNull();
  });

  it('converts tabs to two spaces, strips trailing spaces, keeps indentation', () => {
    const card = normalize(
      flaw({ code: ['def f(x):   ', '\tif x > 1:', '\t\treturn x', '\treturn 0'] }),
      opts(),
    ) as FlawCard;
    expect(card.code).toEqual(['def f(x):', '  if x > 1:', '    return x', '  return 0']);
  });

  it('needs 2 to 16 non-blank code lines', () => {
    expect(normalize(flaw({ code: ['if x > 1:', ' '.repeat(3)], bad_line: 'if x > 1:' }), opts())).toBeNull();
    const long = Array.from({ length: 17 }, (_, i) => `x${i} = ${i}`);
    expect(normalize(flaw({ code: long, bad_line: 'x3 = 3' }), opts())).toBeNull();
  });

  it('drops cards missing title, prompt or why', () => {
    expect(normalize(model({ title: ' '.repeat(3) }), opts())).toBeNull();
    expect(normalize(model({ prompt: '' }), opts())).toBeNull();
    expect(normalize(model({ why: '\n' }), opts())).toBeNull();
  });

  it('truncates over-long text fields to the limits', () => {
    const card = normalize(model({ title: 'T'.repeat(200), prompt: 'P '.repeat(400), why: 'W'.repeat(900) }), opts())!;
    expect(card.title.length).toBeLessThanOrEqual(LIMITS.title);
    expect(card.prompt.length).toBeLessThanOrEqual(LIMITS.prompt);
    expect(card.why.length).toBeLessThanOrEqual(LIMITS.why);
    expect(card.title.endsWith('…')).toBe(true);
  });

  it('drops a card whose correct text matches no option', () => {
    expect(normalize(model({ correct: null }), opts())).toBeNull();
    expect(normalize(model({ correct: 'Epsilon' }), opts())).toBeNull();
  });

  it('drops duplicate options after cleaning', () => {
    expect(normalize(model({ options: ['Alpha', 'Alpha ', 'Gamma', 'Delta'] }), opts())).toBeNull();
  });

  it('needs 3 to 5 options', () => {
    expect(normalize(model({ options: ['Gamma', 'Beta'] }), opts())).toBeNull();
    expect(normalize(model({ options: ['A', 'B', 'C', 'D', 'E', 'Gamma'] }), opts())).toBeNull();
  });

  it('shuffles options and keeps the right answer for every seed', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const card = normalize(model(), opts(seed)) as ModelCard;
      expect(card.options[card.answer]).toBe('Gamma');
      orders.add(card.options.join('|'));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('converts break and trace cards, keeping a trace input', () => {
    const code = ['def f(n):', '  return n // 2'];
    const br = normalize(
      raw({ type: 'break', code, options: ['a', 'b', 'c', 'd'], correct: 'c' }),
      opts(),
    ) as BreakCard;
    expect(br.options[br.answer]).toBe('c');
    const tr = normalize(
      raw({ type: 'trace', code, input: 'n = 5', options: ['1', '2', '3'], correct: '2' }),
      opts(),
    ) as TraceCard;
    expect(tr.input).toBe('n = 5');
    expect(tr.options[tr.answer]).toBe('2');
    expect(normalize(raw({ type: 'break', code: null, options: ['a', 'b', 'c'], correct: 'a' }), opts())).toBeNull();
  });

  it('keeps order steps in the correct order and needs 3–7 distinct steps', () => {
    const card = normalize(raw({ type: 'order', steps: ['one', 'two', 'three'] }), opts()) as OrderCard;
    expect(card.steps).toEqual(['one', 'two', 'three']);
    expect(normalize(raw({ type: 'order', steps: ['one', 'two'] }), opts())).toBeNull();
    expect(normalize(raw({ type: 'order', steps: ['one', 'one', 'two'] }), opts())).toBeNull();
  });

  it('rejects input that is not a raw card', () => {
    expect(normalize({ type: 'riddle' }, opts())).toBeNull();
    expect(normalize(null, opts())).toBeNull();
  });

  it('uses a fixed id when given', () => {
    expect(normalize(model(), { ...opts(), id: 'starter-9' })!.id).toBe('starter-9');
  });
});

describe('starter deck', () => {
  it('normalizes all 6 cards with stable ids, and card 3 is 2x', () => {
    const a = loadStarterDeck(seededRng(1));
    const b = loadStarterDeck(seededRng(99));
    expect(a).toHaveLength(6);
    expect(a.map((c) => c.id)).toEqual(['starter-1', 'starter-2', 'starter-3', 'starter-4', 'starter-5', 'starter-6']);
    expect(b.map((c) => c.id)).toEqual(a.map((c) => c.id));
    expect(a.every((c) => c.starter)).toBe(true);
    expect(a.filter((c) => c.double).map((c) => c.id)).toEqual(['starter-3']);
    expect(a.map((c) => c.type)).toEqual(['flaw', 'model', 'break', 'trace', 'order', 'flaw']);
  });

  it('keeps every starter answer right whatever the shuffle', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const [overlap, hosts, bill, trace, , billing] = loadStarterDeck(seededRng(seed));
      expect((overlap as FlawCard).code[(overlap as FlawCard).answer]).toContain('r.start <= s and e <= r.end');
      expect((hosts as ModelCard).options[(hosts as ModelCard).answer]).toBe('A unique constraint on (table_id, slot)');
      expect((bill as BreakCard).options[(bill as BreakCard).answer]).toBe('$100.00 split 3 ways');
      expect((trace as TraceCard).options[(trace as TraceCard).answer]).toBe('Allowed, as the 4th call in a minute');
      expect((billing as FlawCard).code[(billing as FlawCard).answer]).toBe('  hours = mins // 60');
    }
  });
});
