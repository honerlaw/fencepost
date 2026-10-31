# The client enforces no-repeat cards, by title

**Date**: 2026-10-31
**Type**: decision
**Theme**: card-pipeline
**Summary**: The client drops repeated titles and resumes the starter deck from `recent`; the prompt line alone enforced nothing.
**Context**: .minerva/work/2026-10-31-stop-duplicate-cards (see git history if the worktree has been cleaned up)

## Context
Prevention was one prompt line, "Do not repeat these recent cards", with nothing checking the result. Pending cards were never sent, because `recent` is only written when a card is played. Separately, quitting partway through the starter deck dealt all six cards again.

## Finding
- **Enforcement lives in the engine.** `applyBatchEvent` drops a card whose `titleKey` matches `recent`, the card on screen, unplayed starters, the queue or `missed`. The client is the only side that knows all of those. The server sees 20 titles at most.
- **A dropped card isn't counted in `received`,** so a batch of nothing but repeats takes the existing failure path and can't refetch in a loop.
- **`recentForRequest` puts pending titles last,** so the cap of 20 only cuts history. At most 8 are pending at fetch time.
- **`recent` now also resumes the starter deck.** `startSession` deals only starter cards whose title isn't in `recent`. While `starterDone` is false only starters can be played, so `recent` can't evict them.

## Implications
- **Titles are identity.** Retitling a starter card makes it a new card for a player partway through the deck, who plays it again and earns its XP again. There's no id in `recent` to match on.
- **Reworded repeats get through,** and nothing has measured how often the model rewords against how often it repeats a title exactly.
- **Drops are invisible.** The server's `sent` count and batch log include dropped cards, and the client reports nothing. So nothing will show that raising the 30-title history, or telling the model more titles, is worthwhile. Measuring it needs a harness with a rolling history, because `scripts/cards-eval.ts` sends `recent: []`.
- **An all-duplicate batch shows misleading copy,** "The card writer had a problem with that batch."
- The history stayed at 30 on purpose. A longer one would drop more cards the model was never told about.

## Related
- [[2026-10-29-pattern-batch-lifecycle-invariants]] — the failure path an all-duplicate batch reuses
- [[2026-10-29-constraint-card-server-rate-limits-are-per-machine]] — short batches spend more of the daily limit
