import { getDomain } from '@/cards/domains';
import type { DomainId } from '@/game/types';
import type { PlanSlot } from './plan';

export const MAX_RECENT = 20;
export const RECENT_CHARS = 60;

/** The handoff §8.3 prompt, verbatim. Placeholders are filled by buildPrompt. */
export const PROMPT_TEMPLATE = `You write puzzle cards for Fencepost, a fast tap-to-answer game. The player is a senior software engineer (15+ years) who wants to stay sharp on the logic behind real-world systems: the kind of thing asked in low-level design interviews, like "write the logic for creating a restaurant reservation". Nothing is typed; every card is answered with one or a few taps on a phone.

Write {N} cards about this system: {DOMAIN_NAME} ({DOMAIN_BLURB}).
Write them in this order, with these types:
{PLAN}

Card types:
- flaw: pseudocode of 4 to 10 lines in which exactly ONE line is wrong. The player taps that line. The prompt says what the code is meant to do. The bug is a realistic logic flaw (wrong comparison, wrong boundary, missing state check, wrong variable, wrong order of operations), never a syntax error or typo, and fixing that one line fixes the code. Put the exact text of the wrong line in bad_line.
- break: pseudocode of 3 to 9 lines plus 4 short scenarios in options. Exactly one scenario makes the code do the wrong thing; the code handles the other three correctly as written.
- trace: pseudocode of 3 to 10 lines plus a concrete input. 4 possible outcomes in options; exactly one is what the code actually does with that input.
- model: a design decision for this system (data model, check, lock, index, state machine, algorithm, data structure) under a constraint stated in the prompt. 4 options; exactly one is clearly the best.
- order: 4 to 6 steps of a procedure in this system that has one correct order. List the steps in the CORRECT order; the game shuffles them.
For break, trace and model cards, put the exact text of the right option in correct.
BOSS cards are noticeably harder: subtler bugs (races, idempotency, partial failure, boundaries, time zones and daylight saving, rounding money) and up to 12 lines of code.

Pseudocode rules: Python-like and easy to read. Each line at most 34 characters, including indentation. Indent with 2 spaces. Realistic names. No comments that hint at the answer.
Quality rules: senior level, never trivia or definitions. Each card stands alone, so state any rule the answer depends on (for example "end times are exclusive" or "slots are 30 minutes") in the prompt. Exactly one defensible answer per card. Before writing each card, trace the code yourself to confirm the answer.
Vary the ideas across cards: inclusive vs exclusive ranges, off-by-one, check-then-act races, double submits and idempotency, capacity math, state transitions, cancellations, retries, ordering, empty and missing values, expiry, time zones, rounding.
Scenario flavor for this batch: {FLAVOR}.
Do not repeat these recent cards: {RECENT}.

Field rules: title is 2 to 5 words naming the situation, like "Overlapping bookings". prompt is one sentence of at most 25 words. Each option and step is at most 12 words. bad_line matches one code line exactly and appears only once in the code. why is one or two plain sentences, at most 35 words, explaining the answer. Set fields a card type doesn't use to null.`;

/** At most 20 titles, newlines stripped, each trimmed to 60 characters, blanks dropped. */
export function cleanRecent(recent: readonly string[]): string[] {
  return (
    recent
      .slice(-MAX_RECENT)
      // Titles sit inside "…" in the prompt, so a double quote can't close the quoting early.
      .map((t) =>
        t
          .replaceAll(/[\r\n]+/g, ' ')
          .replaceAll('"', "'")
          .replaceAll(/\s+/g, ' ')
          .trim()
          .slice(0, RECENT_CHARS)
          .trim(),
      )
      .filter((t) => t.length > 0)
  );
}

export function formatPlan(plan: readonly PlanSlot[]): string {
  return plan.map((slot, i) => `${i + 1}. ${slot.type}${slot.boss ? ' (BOSS: harder)' : ''}`).join('\n');
}

export interface PromptInput {
  domain: DomainId;
  plan: readonly PlanSlot[];
  flavor: string;
  recent: readonly string[];
}

export function buildPrompt({ domain, plan, flavor, recent }: PromptInput): string {
  const { name, blurb } = getDomain(domain);
  const titles = cleanRecent(recent);
  let text = PROMPT_TEMPLATE;
  if (titles.length === 0) text = text.replace('Do not repeat these recent cards: {RECENT}.\n', '');
  // Function replacers so `$` in titles is never treated as a replacement pattern.
  return text
    .replace('{N}', () => String(plan.length))
    .replace('{DOMAIN_NAME}', () => name)
    .replace('{DOMAIN_BLURB}', () => blurb)
    .replace('{PLAN}', () => formatPlan(plan))
    .replace('{FLAVOR}', () => flavor)
    .replace('{RECENT}', () => titles.map((t) => `"${t}"`).join(', '));
}
