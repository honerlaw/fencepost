# On web, a drag that started on a tappable code line answered the card

**Date**: 2026-10-29
**Type**: bug
**Theme**: expo-platform
**Summary**: The Tap component ignores presses that move more than 10px, so swipes aren't answers.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
Cards advance with a swipe-up pan (RNGH v3 `usePanGesture`) once answered, and code lines and options are tappable. In the Playwright swipe test, a mouse drag over an unanswered flaw card fired the line's press on release and answered the card.

## Finding
`src/components/card/tap.tsx` records where the press started and ignores the press if the pointer moved more than 10px. Swipe-to-advance is separately gated by `canSwipeAdvance` (answered, and not mid-scroll).

## Implications
New tappable elements inside a card must use `Tap`, not a bare `Pressable`, or swipes can answer cards on web.

## Related
- [[2026-10-29-pattern-batch-lifecycle-invariants]] — the other feed-flow invariants
