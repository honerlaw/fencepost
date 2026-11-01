# Feed swipes read the finished drag

**Date**: 2026-10-31
**Type**: pattern
**Theme**: expo-platform
**Summary**: One pan classifies drags on release; diagonals are ignored, and cancelled drags must be checked.
**Context**: .minerva/work/2026-10-31-review-answered-cards (see git history if the worktree has been cleaned up)

## Context
The feed had one pan for swipe up, using `failOffsetX` to reject sideways drags. Adding sideways swipes meant the pan must activate on both axes, and a right swipe with upward drift would then have read as swipe up and tapped Next, the accident this feature exists to undo.

## Finding
- The pan uses `activeOffsetX` and `activeOffsetY`, and `swipeDirection(dx, dy)` classifies the finished drag.
- A swipe must travel 60 points and run 1.5 times further along its axis than across it. Anything else is `null`, not a nearest guess.
- RNGH 3 calls `onDeactivate` for cancelled and failed gestures too. Check `e.canceled`, or a drag the system took over counts as a swipe.
- Swipe up from a review only returns to the live slot. It never calls `goNext`.

## Implications
- Add new swipes to `swipeDirection` and its table test, not to the gesture config.
- Native gesture behaviour is unverified: this machine cannot build SDK 58. A swipe starting on overflowing code scrolls the code, and an Android left-edge swipe is the system back gesture. `Previous card` is the non-swipe path on every slot.

## Related
- [[2026-10-29-bug-web-drag-on-tappable-line-answered-card]] — why a drag can't answer a card
- [[2026-10-29-constraint-sdk-58-ios-dev-build-needs-xcode-26-4]] — why native was not exercised
