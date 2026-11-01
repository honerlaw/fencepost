# Proposal: readable-pseudocode-cards

**Date**: 2026-10-31
**Status**: Shipped (2026-10-31)

## Goal
Every code card dealt after this change, starter or generated, can be understood by a senior engineer who knows no particular programming language. The card itself gives enough context to answer, and its code is plain, language-neutral pseudocode. Cards already saved on a device are not rewritten.

## Why
The user hit the starter card "Three per minute" and could not tell what `[t for t in log[user] if t > now - 60]` meant or what `log[user]` was. Their request, verbatim: "in general can we improve these? I want to make sure 1. we give enough content 2. the psuedocode is very human readable without the need to understand any language specific syntax".

Findings so far:
- The generation prompt says "Python-like and easy to read" (`src/server/prompt/constants.ts`), so generated cards are real Python.
- Starter cards rely on `//` floor division (two cards, and both answers depend on it; it reads as a comment outside Python), a list comprehension, `[share] * n`, `len()`, `.append()`, `def`, `True`/`False`, and a `#` comment.
- `prompt` is capped at "one sentence of at most 25 words", which leaves little room to explain data. `input` exists only on trace cards.
- Nothing mechanical enforces readability. The prompt is the only control.

## Approach
What shipped, candidate B of five: prompt rules plus a deterministic gate. `replan.md` records why the plan changed, and the Stated criteria below still apply.

Stated criteria: (1) the common syntax of Python and C-family languages cannot reach a player in code, and the prompt plus a read of eval cards cover what a denylist cannot; (2) each card carries what it needs to be answered; (3) answers stay correct; (4) small, with no extra model call on a normal batch; (5) follows the existing rule "bad cards are dropped, never patched".

Rejected: prompt rules alone (nothing catches the model's Python habit); a new `context` field (schema, persistence and UI change for no shown need); translating Python afterwards (breaks `bad_line`, and the never-patched rule); a second LLM pass (latency and cost); over-generating to backfill drops (cost on every batch).

1. **Prompt.** A short dialect that lists allowed forms and operators, a one-sentence context rule, and "that a flaw really gives a wrong result" added to the trace sentence. `prompt` allows two sentences and 40 words, `input` 40 words, and `LIMITS.prompt` and `LIMITS.input` are 320.
2. **Gate.** `findLanguageSyntax` in `src/cards/normalize/language-syntax.ts` strips double-quoted strings and names the first banned construct on a line. `cleanCode` rejects any line that matches, so flaw, break and trace cards drop through the existing path. `model` and `order` cards and prose fields are deliberately not gated.
3. **Drop visibility.** `LiveSourceOptions.onDrop` reports each dropped element. `cards:eval` prints the construct and totals by card type, uses `BATCH_TIMEOUT_MS`, and counts a batch that reaches it as failed.
4. **Starter deck.** All four code cards rewritten with the same titles, types, options and concepts. "Billing by the hour" takes `mins` directly and its `bad_line` became `hours = round_down(mins / 60)`.
5. **Fixtures.** `scripts/stub-cards.json`, `e2e/generated.ts` and `src/cards/normalize.test.ts` moved to the dialect.
6. **Batch limits.** `BATCH_TIMEOUT_MS` 120 s and `BATCH_DEADLINE_MS` 130 s, on the user's decision after the final prompt timed out at 90 s.

Accepted costs are listed in `replan.md` and `NOTES.md`.

## Success criteria
1. `PROMPT_TEMPLATE` contains the dialect and context rule, does not contain "Python", and allows two sentences and 40 words in `prompt`. The prompt snapshot is updated, and `LIMITS.prompt` and `LIMITS.input` are 320. The gate alone enforces the banned list.
2. A table-driven unit test shows `findLanguageSyntax` names every banned construct, returns null for every allowed dialect form, ignores banned text inside quoted strings, and returns null for near misses: `default_rate`, `strlen(x)`, `x >= -1`, `a != b`, `a[x] == b[y]`, `calls[user]`, `function name(args):`, `else if x > 1:`.
3. `normalize` returns null for a `flaw`, `break` or `trace` card containing banned syntax, covered by unit tests. A server test shows gate drops count in `dropped`, call `onDrop`, and that a batch where every card is dropped takes the existing fallback path.
4. A unit test runs the deck through the real `loadStarterDeck` without throwing, and asserts no starter code line trips the gate.
5. Each rewritten starter card is traced by hand, with its answer recorded in the PR description, and every name in its code is either defined in the code or explained on the card.
6. On a 10-batch Sonnet eval (50 cards) of the final prompt, gate and 120 s limit, at most 4 cards are dropped with each drop's construct printed, and no batch fails. An independent reader finds no wrong answer in an eval of the final prompt; other findings are recorded. That read is a smoke test. The fallback's 2-batch result is recorded. Timing and accepted costs go in `NOTES.md`.
7. `npm run guard` passes and the Playwright suite passes.

## Open Questions
- If the eval drops more than 4 of 50 cards, resolve it from the constructs the eval prints: tighten the prompt for a real violation, and fix the gate for a false positive. Do not loosen the gate blindly.
