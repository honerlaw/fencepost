# Feed batch lifecycle: every way a batch ends must leave the player a card or a button

**Date**: 2026-10-29
**Type**: pattern
**Theme**: card-pipeline
**Summary**: Batch outcomes always leave a card or Try again; 20 s pacing, 100 s deadline.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
The feed fetches generated cards in streamed batches (`src/game/engine.ts` + `src/store/game-store.ts`). The code review found four ways the feed could hang on "Shuffling the deck" with nothing in flight and no button:
- skipping every starter card;
- a background cancel while the loading card was showing;
- a batch whose cards were all unplayable on the client;
- a batch ending while the player waited.

It also found three more problems:
- A finished batch's late stream close could mark the next batch as failed.
- Normal play tripped the server's 1-batch-per-20-s device limit. A 429 never retries on its own, so the feed stopped.
- A hung stream kept the batch open forever.

## Finding
- **Skip starts the session.** Skipping sets `sessionStarted`, just as answering or "Deal me in" does.
- **Batch outcomes on the loading card.** Each way a batch can end is handled:
  - A batch with no playable cards (`fetch.received === 0`) fails, even if the server counted cards as sent.
  - A cancel that happens on the loading card shows the error card with Try again.
  - When a `done` event arrives, the store re-runs the fetch decision.
- **Stale batches.** Batch callbacks check `controller === own` (identity), not `signal.aborted`. A batch that ended normally is never aborted, so the old check let it act on the next batch.
- **Settled outcome.** After a `done` or `error` event the batch's outcome is fixed, so a later stream failure is ignored.
- **Pacing and deadline.** Batches start at least `MIN_FETCH_GAP_MS` (20 s) apart. The server's device bucket uses the same constant. Until the request goes out, the loading card shows and `inFlight` is true. A batch still open after `BATCH_DEADLINE_MS` (100 s) fails with Try again; the server ends every batch within 90 s.
- Each case has a store- or engine-level regression test. The stale-batch test fails against the old guard.

## Implications
- When adding a new slot kind or batch outcome, prove the waiting slot always gets out: either a fetch starts, or the error card appears.
- Store callbacks for async work must check that they still own the current request.
- If the server's device refill changes, it changes through the shared constant. A client faster than the server turns normal play into 429s.

## Related
- [[2026-10-29-bug-web-drag-on-tappable-line-answered-card]] — another feed-flow invariant
- [[2026-10-29-constraint-card-server-rate-limits-are-per-machine]] — the server limits the 20 s gap mirrors
