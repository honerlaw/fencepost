# Batch limits are 120 s on the server and 130 s on the client

**Date**: 2026-10-31
**Type**: decision
**Theme**: card-pipeline
**Summary**: The server limit rose from 90 s to 120 s and the client deadline from 100 s to 130 s, so slow batches finish instead of failing.
**Context**: .minerva/work/2026-10-31-readable-pseudocode-cards (see git history if the worktree has been cleaned up)

## Context
The readable-card prompt failed 2 of 25 Sonnet batches at 90 s. A batch that fails shows Try again, and the retry takes longer than letting a slow batch finish would have. The user chose to raise the limit over accepting the failures.

## Finding
- `BATCH_TIMEOUT_MS` is 120 s and `BATCH_DEADLINE_MS` is 130 s. The 10 s gap between them is unchanged.
- `CARD_MAX_OUTPUT_TOKENS` of 16,000 is about 115 s at the observed speed, so the limit sits just above the token cap.
- An old client against the new server gives up at 100 s and shows Try again. That's no worse than before, when the server stopped at 90 s.

## Implications
- This corrects the 90 s and 100 s figures in [[2026-10-29-pattern-batch-lifecycle-invariants]], whose rules still stand.
- A truly hung batch takes 30 s longer to show Try again.
- The 120 s limit was never exercised: the slowest batch in the final eval took 81 s.
- A player on the loading card can wait up to 130 s. If a higher token cap is ever set, the limit has to move with it.

## Related
- [[2026-10-31-constraint-card-prompt-rules-cost-reasoning-time]] — why batches got slower
