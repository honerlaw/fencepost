import { shuffle } from '@/game/rng';
import type { Card, DomainId, Rng } from '@/game/types';
import { RawCard } from './schema';

export const LIMITS = { title: 70, prompt: 280, why: 420, input: 280 } as const;
const MAX_CODE_LINES = 16;

export interface NormalizeOptions {
  domain: DomainId;
  boss: boolean;
  rng: Rng;
  /** Creates ids for generated cards. */
  newId: () => string;
  /** Fixed id (starter cards), overriding `newId`. */
  id?: string;
}

/** Collapses runs of whitespace and trims. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function cleanText(text: unknown, max: number): string | null {
  if (typeof text !== 'string') return null;
  const cleaned = collapse(text);
  return cleaned ? truncate(cleaned, max) : null;
}

/** Tabs → 2 spaces, trailing spaces stripped, leading indentation kept, blank lines dropped. */
function cleanCode(code: string[] | null): string[] | null {
  if (!code) return null;
  const lines = code
    .flatMap((line) => String(line).split('\n'))
    .map((line) => line.replace(/\t/g, '  ').replace(/\s+$/, ''))
    .filter((line) => line.trim() !== '');
  if (lines.length < 2 || lines.length > MAX_CODE_LINES) return null;
  return lines;
}

/** 3–5 (options) or 3–7 (steps) distinct, non-empty entries after cleaning. */
function cleanList(items: string[] | null, min: number, max: number): string[] | null {
  if (!items) return null;
  const cleaned = items.map((item) => collapse(String(item)));
  if (cleaned.some((item) => !item)) return null;
  if (cleaned.length < min || cleaned.length > max) return null;
  if (new Set(cleaned).size !== cleaned.length) return null;
  return cleaned;
}

/** Shuffles options and returns the new index of `correct`, or null when it matches none. */
function placeAnswer(options: string[], correct: string | null, rng: Rng) {
  if (correct == null) return null;
  const right = collapse(correct);
  if (!options.includes(right)) return null;
  const shuffled = shuffle(options, rng);
  return { options: shuffled, answer: shuffled.indexOf(right) };
}

/**
 * Validates a raw model card and converts it to a playable Card, or returns null.
 * Bad cards are dropped, never patched; only over-long text is truncated.
 */
export function normalize(input: unknown, opts: NormalizeOptions): Card | null {
  const parsed = RawCard.safeParse(input);
  if (!parsed.success) return null;
  const raw = parsed.data;

  const title = cleanText(raw.title, LIMITS.title);
  const prompt = cleanText(raw.prompt, LIMITS.prompt);
  const why = cleanText(raw.why, LIMITS.why);
  if (!title || !prompt || !why) return null;

  const base = { id: opts.id ?? opts.newId(), domain: opts.domain, boss: opts.boss, title, prompt, why };

  switch (raw.type) {
    case 'flaw': {
      const code = cleanCode(raw.code);
      if (!code || raw.bad_line == null) return null;
      const target = collapse(raw.bad_line);
      const matches = code.flatMap((line, i) => (collapse(line) === target ? [i] : []));
      if (matches.length !== 1) return null;
      return { ...base, type: 'flaw', code, answer: matches[0] };
    }
    case 'break':
    case 'trace': {
      const code = cleanCode(raw.code);
      const options = cleanList(raw.options, 3, 5);
      if (!code || !options) return null;
      const placed = placeAnswer(options, raw.correct, opts.rng);
      if (!placed) return null;
      if (raw.type === 'break') return { ...base, type: 'break', code, ...placed };
      const traceInput = cleanText(raw.input, LIMITS.input);
      return { ...base, type: 'trace', code, ...placed, ...(traceInput ? { input: traceInput } : {}) };
    }
    case 'model': {
      const options = cleanList(raw.options, 3, 5);
      if (!options) return null;
      const placed = placeAnswer(options, raw.correct, opts.rng);
      if (!placed) return null;
      return { ...base, type: 'model', ...placed };
    }
    case 'order': {
      const steps = cleanList(raw.steps, 3, 7);
      if (!steps) return null;
      return { ...base, type: 'order', steps };
    }
  }
}
