# Every card prompt rule costs reasoning time, so check prompt changes for speed as well as quality

**Date**: 2026-10-31
**Type**: constraint
**Theme**: card-pipeline
**Summary**: A batch is mostly reasoning before the first card; new prompt rules took Sonnet from about 39 s to 58 s and caused timeouts at 90 s.
**Context**: .minerva/work/2026-10-31-readable-pseudocode-cards (see git history if the worktree has been cleaned up)

## Context
The first version of the pseudocode rules passed on readability but averaged 72 s per batch against 39 s, and one batch hit the 90 s limit with no cards. Readability alone would have shipped that.

## Finding
- **A batch is almost all thinking.** The first card arrives about 6 seconds before the batch ends, because the model plans every card and then writes them quickly. Output tokens track batch time, at roughly 140 tokens per second on Sonnet.
- **A timed-out batch delivers nothing,** and that spend is lost.
- **A rule that asks the model to prove something is expensive.** Requiring `why` to name a concrete failing input cost time and was removed. A short clause in the trace sentence replaced it. A 3-batch test suggested all three new rules cost time, but that was within noise.
- **The eval is noisy.** Runs of one prompt differ by more than 10 s, and 3 to 5 batches can't rank rules or rule out timeouts. Compare against the old prompt on the same day.

## Implications
- Run `npm run cards:eval` before and after any prompt change, and compare average and slowest batch as well as drops.
- `cards:eval` uses `BATCH_TIMEOUT_MS`, and counts any batch that reaches it as failed.
- The new prompt's average is 58 s, and its slowest batch in the final run was 81 s. Timeouts at 120 s are unmeasured.
- The model still writes wrong or ambiguous cards. One flaw card had no real bug. Have someone who didn't write the prompt read the cards.

## Related
- [[2026-10-31-decision-card-code-is-language-neutral-pseudocode]] — the rules that were shortened
- [[2026-10-31-decision-batch-limits-are-120-and-130-seconds]] — the limit raised in response
