# Reviewed cards are read-only by construction

**Date**: 2026-10-31
**Type**: decision
**Theme**: expo-platform
**Summary**: Answered cards persist in `Progress.history`; the review position is local Feed state that never reaches the store.
**Context**: .minerva/work/2026-10-31-review-answered-cards (see git history if the worktree has been cleaned up)

## Context
Swiping right shows earlier answered cards. A reviewed card must never be re-graded, and history had to survive a restart, because an app killed before Next would otherwise lose an explanation the player never read.

## Finding
- `answer` appends `{ card, result }` to `Progress.history`, oldest first, capped at 50. It records at answer time, not at Next. Skipped cards are not recorded.
- `reviewEntries(game)` leaves out the newest entry while an answered card is on screen, because that entry is that card.
- `useReview` holds the position in `useState`, not in the store. A history entry has no route to `answer`, `skip` or `flagWrong`, so no guard is needed. `CardView` is already inert once it has a result.
- The live slot stays mounted under `display: none` during a review, which keeps a half-placed order card.
- Entries are never keyed by `card.id` alone: a rematch appears twice.

## Implications
- Any new action reachable from a review would break this guarantee, so keep review state out of the store.
- `getByTestId` matches the hidden live slot during a review. Review renders use `review-card` and `review-verdict`, and e2e reaches controls by role, which excludes hidden elements.
- `toasts` is always rendered, so test its text, not its presence. Use `{ timeout: 0 }`, or a toast fired by mistake expires and a retried check passes.

## Related
- [[2026-10-29-bug-web-drag-on-tappable-line-answered-card]] — review buttons use `Tap` for the same reason
- [[2026-10-31-constraint-a-persist-version-bump-without-migrate-wipes-progress]] — why adding `history` needed no migration
- [[2026-10-31-pattern-feed-swipes-read-the-finished-drag]] — how the swipe reaches the review
