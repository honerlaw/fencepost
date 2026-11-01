# Replan log: readable-pseudocode-cards

## 2026-10-31 — Shorten the prompt rules and raise the batch limit after the eval showed slower batches

**Original plan**: Put the full dialect, an explicit banned list and a long context rule in the prompt. Criterion 1 required all three. Criterion 6 required at most 2 of 25 dropped and a clean hand read of a 5-batch Sonnet eval, plus 2 fallback batches. The proposal assumed the prompt rules were free: stated criterion 4 only ruled out an extra model call.

**What changed**: The first eval passed on readability but broke that assumption. Batch time is mostly the model reasoning before it writes: the first card arrives about 6 seconds before the batch ends.

| Sonnet run (same day) | Batches | Cards kept | Dropped by the gate | Failed at the limit | Avg batch | Slowest |
|---|---|---|---|---|---|---|
| Old prompt (origin/main), 90 s limit | 5 | 25 | 0 | 0 | 39.2 s | 56.4 s |
| Full rules, 90 s limit | 5 | 20 | 0 | 1 | 72.0 s | 90 s |
| Shorter rules, `why` must name a concrete input, 90 s limit | 5 | 20 | 0 | 1 | 65.8 s | 90 s |
| Shorter rules, flaw check in the trace sentence, 90 s limit | 10 | 50 | 0 | 0 | 50.1 s | 77.9 s |
| Final text, 90 s limit | 10 | 45 | 0 | 1 | 55.2 s | 90 s |
| Final text and gate, 120 s limit | 10 | 50 | 0 | 0 | 58.2 s | 80.7 s |

Each batch that failed at the limit delivered no cards, which is where the missing 5 cards in those rows went; none were dropped by the gate. In the last run no batch passed 90 s, so the 120 s limit was not actually exercised. Runs of the same prompt differ by more than 10 s (44.7 s and 55.5 s; 52.5 s and 57.9 s; 54.7 s and 61.8 s), and the old-prompt baseline is one 5-batch run.

A variant test on one flaw-heavy plan (3 batches per variant) averaged 63 s with all rules, 53 s without the concrete-input rule, 45 s without the new pseudocode rules, 46 s without the context rule, and 44 s with the old prompt. All three rules appear to cost time, but that is a judgment call within noise, not a measurement of each rule.

The hand read of the first eval found one wrong card, "Fine on the due day": its marked line was not a bug, because with `<` a return on the due day still gives a fine of 0. The model wrote it, and nothing in the old prompt's trace sentence guarded against it.

**New plan**: Keep candidate B, prompt rules plus the deterministic gate.
- The prompt uses a short dialect and a one-sentence context rule. It lists the allowed forms and operators, and no longer lists banned constructs. The gate alone enforces them; `model` and `order` cards and prose fields are not gated. Criterion 2's table test is what ties the gate to the dialect.
- The trace sentence in the quality rules adds "and that a flaw really gives a wrong result". That is the only control for wrong flaw cards besides reading them.
- The gate adds `range(`, which the independent read found on a generated card.
- `BATCH_TIMEOUT_MS` goes from 90 s to 120 s and `BATCH_DEADLINE_MS` from 100 s to 130 s, on the user's decision after the final text failed the zero-timeout bar. `CARD_MAX_OUTPUT_TOKENS` of 16,000 is about 115 s at the observed speed, so the limit sits just above the token cap.
- `cards:eval` uses `BATCH_TIMEOUT_MS` and counts an empty batch as failed; it used to report 0 failed batches for a timeout.

Criteria 1 and 6 in `proposal.md` change to match, and Approach item 1 no longer lists a banned list in the prompt. Criterion 6 keeps the 8% drop rate (at most 4 of 50). Its read of the cards is a smoke test, not proof of correctness.

Accepted costs, stated in `NOTES.md`:
- Average batch rises from about 39 s to about 58 s, and the slowest from 56 s to 81 s.
- First cards arrive as late as about 74 s, against a 33.8 s average on the old prompt.
- Timeouts at 120 s are unmeasured: 10 clean batches cannot rule out a rate of up to about 26%.
- The Opus fallback ran 2 batches at 53 s and 58 s, too few to conclude anything. An earlier prompt reached 77 s, and the 58.8 s in `NOTES.md` is from another day. It has no timing bar.
- A dropped card is not backfilled, and a model that emits a banned construct loses that card.
- Lines over the unenforced 34-character limit rose from 2 of 102 to 16 of 277, longest 46. The limit is a target, and code blocks scroll sideways.
- The independent read of 55 cards found 0 wrong answers but small problems on 11 cards; see the scratchpad.

Alternatives considered and not taken: capping model reasoning, because `NOTES.md` ranks correctness first; dropping the context rule or the dialect, the two things the user asked for.
