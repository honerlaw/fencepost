# Proposal: readable-pseudocode-cards

**Date**: 2026-10-31
**Status**: Draft

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
Stated criteria: (1) the common syntax of Python and C-family languages cannot reach a player in code, and the prompt plus a hand read of eval cards cover what a denylist cannot; (2) each card carries what it needs to be answered; (3) answers stay correct; (4) small, with no extra model call on a normal batch; (5) follows the existing rule "bad cards are dropped, never patched".

### Candidates
- **A. Prompt rules and a starter rewrite only.** Cheap, but nothing catches the model's Python habit. Weaker on criterion 1.
- **B (picked). A, plus a deterministic language-syntax gate in `normalize`.** Violating code cards are dropped like any other invalid card. A denylist cannot prove readability, so it is a backstop and the prompt stays the main control.
- **C. B, plus a new `context` field rendered on all code cards.** Schema, Card type, persisted cards and UI all change, and the in-flight unit `2026-10-31-review-answered-cards` persists played cards. Not needed unless two-sentence prompts prove too short.
- **D. Translate Python to pseudocode after generation.** Breaks exact `bad_line` matching and the "never patched" rule.
- **E. A second LLM pass that judges readability.** Adds latency to a 40-second first card, and cost. Fails criterion 4.
- **F. Over-generate or retry to backfill drops.** Adds cost to every batch to cover a case the eval may show is rare. Fails criterion 4.

### In detail
1. **Prompt (`src/server/prompt/constants.ts`).** Replace "Python-like" with a named dialect:
   - Structure: `function name(args):`, `for each item in items:`, `while condition:`, `if` / `else if` / `else`, `return`, `continue`, `break`.
   - Values: `true`, `false`, `none`, lowercase, and double-quoted strings.
   - Operators: `and`, `or`, `not`; `=` to assign, `x = x + 1` to update; `==`, `!=`, `<`, `<=`, `>`, `>=` to compare; `+ - * /` for arithmetic.
   - Data: `order.total` for a field, `calls[user]` for a lookup, with the data explained on the card.
   - Everything else is said in words or with a plainly named helper: `add x to items`, `remove x from items`, `count(items)`, `round_down(a / b)`, `round_up(a / b)`, `remainder(a, b)`, `return n copies of share`.
   - One statement per line, never wrapped. No comments at all. The 34-character line limit stays; code blocks already scroll sideways.
   - The prompt lists allowed forms only; the gate enforces the banned list (see `replan.md`).
   Add a context rule: the player sees only the prompt, input and code, so any data or helper the code uses but does not create must be explained, by a name that says what it holds or does and, for data, in the prompt or input, including units and what each entry is. One-letter names are explained too. Trace inputs state the starting value of every piece of data the code reads. In `prompt`, `input`, `options` and `why`, describe logic in words and the same dialect.
   Field limits: `prompt` becomes one or two sentences, at most 40 words (from one sentence, 25 words). `input` gets an explicit limit of at most 40 words. `LIMITS.prompt` and `LIMITS.input` rise from 280 to 320 characters so 40 words is not silently truncated. Update the snapshot, the "handoff verbatim" comment and the test name.
2. **Gate (`src/cards/normalize/language-syntax.ts`, new).** `findLanguageSyntax(line)` strips double-quoted strings, then returns the name of the first construct it finds, or null. It matches with word boundaries and is case-sensitive:
   - Words: `def`, `elif`, `lambda`, `None`, `True`, `False`, `null`, `nil`, `const`, `let`, `var`, `print(`.
   - Calls: `len(`, `.append(`, `.push(`, `.length`.
   - Symbols: `//`, `%`, `**`, `&&`, `||`, `!` used as not (not `!=`), `===`, `!==`, `=>`, `->`, `:=`, `++`, `--`, `+=`, `-=`, `*=`, `/=`, `?.`, `??`, ternary `?`, braces, a trailing `;`, a `#` comment.
   - Shapes: a comprehension (`[` followed by ` for ` on the line), a slice (`:` inside `[...]`), a negative index (`[-1]`), an inline conditional (` if ` and ` else ` after other code), an f-string, list repetition (`] * `).
   `cleanCode` returns null when any line matches, so `flaw`, `break` and `trace` cards drop through the existing path and count in `dropped`. `model` and `order` cards and prose fields have no code lines and are not gated, deliberately, because symbols like `%` are normal in prose. The prompt and hand read cover them.
3. **Drop visibility.** `LiveSourceOptions` gains an optional `onDrop(raw)`, called for each dropped element. Production passes nothing. `scripts/cards-eval.ts` prints each dropped card with the construct `findLanguageSyntax` names, or "other validation", and totals by card type.
4. **Starter deck.** Rewrite all four code cards, keeping titles, types, options, and the concept each tests. Full card text:
   - **Overlapping bookings.** Prompt: "can_book(table, s, e) should reject a new booking from time s to time e that overlaps any live reservation on that table. Tap the line that lets double bookings through." Code: `function can_book(table, s, e):` / `for each r in table.reservations:` / `if r.status == "cancelled":` / `continue` / `if r.start <= s and e <= r.end:` / `return false` / `return true`. `bad_line` and `why` are unchanged.
   - **Splitting the bill.** Prompt: "split_bill divides a bill of cents among n people, and the shares should add up to the total. Which bill breaks it?" Code: `function split_bill(cents, n):` / `share = round_down(cents / n)` / `return n copies of share`. Why: "$100.00 is 10000 cents. Divided by 3 and rounded down, that is 3333, so the shares add up to 9999 and a cent disappears. Hand the remainder to the first shares."
   - **Three per minute.** Prompt unchanged. Code: `LIMIT = 3` / `function allow(user, now):` / `n = calls_since(user, now - 60)` / `if n > LIMIT:` / `return false` / `save_call(user, now)` / `return true`. Input: "calls_since counts the user's saved calls later than the given time, and save_call saves one. No calls are saved yet. The user calls at t = 0, 10, 20 and 30 seconds." Why: "At t=30, calls_since returns 3, and 3 > 3 is false, so a 4th call gets through. The check should be n >= LIMIT."
   - **Billing by the hour.** Prompt: "The garage bills every started hour in full after a 15-minute grace period, and mins is the time parked in minutes. Tap the wrong line." Code: `CENTS_PER_HOUR = 400` / `function fee(mins):` / `if mins <= 15:` / `return 0` / `hours = round_down(mins / 60)` / `return hours * CENTS_PER_HOUR`. `bad_line` becomes `hours = round_down(mins / 60)`. Why: "Rounding down bills 61 minutes as one hour and 50 minutes as nothing. A started hour counts, so use round_up(mins / 60)."
5. **Fixtures and consumers.** `scripts/stub-cards.json` (served through the real server in e2e, so it must pass the gate), `e2e/generated.ts`, and `src/cards/normalize.test.ts` move to the dialect, including its starter assertion on `hours = mins // 60`. `e2e/starter.spec.ts` matches the Overlapping bad line, which is unchanged, so it needs no edit. `src/components/card/no-ligatures.test.ts` only feeds strings to `codeText` and stays. `loadStarterDeck` throws on a card that fails `normalize`, so criterion 4 goes through it.
6. **Verification.** `npm run cards:eval -- --model anthropic/claude-sonnet-5.5 --batches 5` (25 cards) against the recorded baseline of 25 kept and 0 dropped in `NOTES.md`, plus 2 batches of the fallback, `anthropic/claude-opus-5.5`, then a hand read of every kept card.

Accepted costs: a dropped card is not backfilled, so a batch shrinks by one and a dropped boss slot loses its boss. An all-dropped batch takes the existing fallback path, a second generation. Both are existing behaviour; the eval measures how often they happen.

Out of scope: UI changes, a new card field, rewriting `model` and `order` cards in the deck, and the handoff document (a historical record).

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
