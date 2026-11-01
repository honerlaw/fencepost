# Proposal: review-answered-cards

**Date**: 2026-10-31
**Status**: Draft

## Goal
A left-to-right swipe on the feed shows the most recent earlier answered card with its reveal and explanation, read-only. Repeating walks further back through the last 50 answered cards, which are saved with progress and so survive a restart. The player can return to the live slot with its card state intact (a half-placed order card stays half placed; scroll position resets to the top). Reviewing never changes scores and never re-opens a card.

## Why
Next card is easy to tap before reading the explanation, and the explanation is the point of the app. There is currently no way back: `current` is replaced on advance and the answered card is gone.

The request, verbatim: "when you swipe from left to right, if there is a previous answer / card that you answered, it should show you that card and the explanation again for it (you don't redo it, its still marked as done, etc, but it allows you to view your history easily, or if you accidentally tap next card before you read why you can go bakc)"

## Approach
One work unit, one PR, no phases. Touches the engine, game types, store tests, feed, card view, verdict panel, code block prop, unit tests, e2e tests.
Out of scope: a history list screen, re-answering, flagging from review, reviewing skipped cards, server changes.

Stated criteria: (1) satisfies both named use cases (history browsing, recovering from an accidental Next); (2) read-only by construction; (3) survives a restart; (4) small; (5) does not endanger saved progress.

### Candidates
- **A (picked). Capped history in persisted `Progress`, review position as local Feed state.**
- **B. Session-only history in `GameState`.** Fails criterion 3.
- **C. A separate history screen.** Not what was asked.
- **A2. Review position in `GameState` with engine actions.** Rejected: it adds actions that need guards, whereas local state leaves no path from a history entry to `answer()`.
- **A3. History under a separate persisted key.** Rejected: a second persist config and write path, with no gain over one additive field, since `Progress` has no reader outside the device.

### Approach in detail
1. **Data.** `Progress.history?: ReviewEntry[]`, oldest first, capped at `MAX_HISTORY = 50`, oldest dropped. `ReviewEntry = { card: PlayedCard; result: ReviewedResult }`, with `ReviewedResult = Pick<AnswerResult, 'correct' | 'picked' | 'score' | 'verdict' | 'flagged'>`; `toasts`, `haptic` and `undo` are not stored. Optional in the type because saved progress predates it. `import type` across `game/types.ts` and `engine/types.ts` is allowed by the `no-circular` rule, which excludes type-only edges. Persist `version` and the `v: 1` literal both stay as they are, so there is no migration: zustand discards state on a version mismatch with no `migrate`, which would wipe progress if an OTA rolled back. Older code carries the unknown field through `...state.progress` spreads. Cost, accepted: up to 50 cards add tens of KB to each debounced write, on the precedent of `missed` holding 30.
2. **Engine.** `answer` appends the entry. `flagWrong` sets `flagged` on the newest entry only when that entry's `card.id` matches the current card. Appending at answer time means an app killed before Next keeps the card, except for a kill inside the storage debounce window, which is accepted. Skipped cards are not recorded. A rematch can appear twice, so entries are never keyed by `card.id` alone; React keys use position. New pure helper `reviewEntries(game)` returns entries newest first, and drops the newest when `current` is a card with a non-null `result`, because `answer` appends synchronously and that entry is the card on screen. No id comparison is needed there.
3. **Gesture.** One pan in `feed.tsx`: `failOffsetX` removed, `activeOffsetX: [-20, 20]` added, `activeOffsetY` kept. Pure rule `swipeDirection(dx, dy)` in `src/game/rules`, evaluated in this order: if |dx| >= 60 and |dx| > 1.5|dy|, 'right' or 'left'; else if dy <= -60 and |dy| > 1.5|dx|, 'up'; else null. A diagonal such as (70, -62) is therefore null, not Next. Table tests cover diagonals. All swipes are ignored during the 200 ms leave animation.
4. **Review position.** `const [back, setBack] = useState(0)` in `Feed`; 0 is live. The rendered position is derived: `min(back, reviewEntries(game).length)`. Swipes set state from that derived value, so `back` cannot drift past the list. Right: position + 1, no-op with no earlier card, and ignored during scroll momentum. Left: position - 1, floor 0, ignored during scroll momentum. Horizontal swipes do not need `atEnd`, since they are not a scroll continuation. Swipe up on the live slot keeps today's behaviour through `canSwipeAdvance` and `goNext`. Swipe up while reviewing requires only that the card is not mid-scroll, sets `back` to 0, and never calls `goNext`, so it cannot advance or discard the live card. "Back to current card" also sets 0.
5. **Rendering.** While reviewing, the live `SlotBody` stays mounted but hidden (`display: none`), which is what keeps a half-placed order card. The review renders `CardView` with the stored `result`, already inert when `result` is set. `CardView` and `VerdictPanel` narrow their `result` prop to `ReviewedResult`, and `CardView` takes a `testID` prop. `VerdictPanel` gets a review mode: stored verdict, points and `card.why`; "Back to current card" instead of Next; no "Card was wrong"; the flagged note still shows. Review reads the stored entry only, never the live slot. Review rendering uses distinct testIDs, `review-card` and `review-verdict`, so the existing single-match `card` and `verdict` selectors are unaffected by the hidden live slot. `marker-circle` and `verdict-points` can match twice while reviewing, so review e2e scopes those selectors inside `review-card` and `review-verdict`. The animation key is `review:<back>` while reviewing, so a batch arriving behind the review does not re-animate it. The existing key effect resets scroll to the top, which is accepted and stated in the Goal.
6. **Discoverability and accessibility.** Swipes are not reachable by screen reader or keyboard, so the verdict panel gets a small "Previous card" Tap when an earlier card exists, and the review panel gets "Older card" when one exists. Both use `Tap`. The hint under Next gains "swipe right to look back".
7. **Code block.** `ScrollView horizontal` in `code-block.tsx` is an inner native scroller. `alwaysBounceHorizontal={false}` so code that fits does not swallow the swipe. A swipe starting on code that really overflows scrolls the code instead, which is accepted.

## Success criteria
Criteria 1 to 7 are verified on web, by unit tests and Playwright. Native is not verifiable in this environment and is tracked in Open Questions, not claimed here.
1. With at least one earlier answered card, a left-to-right swipe on a live slot (unanswered card, answered card, welcome, loading, error) shows the newest earlier answered card with its reveal, stored verdict word, points and explanation.
2. Repeated right swipes walk to older cards; right-to-left walks newer and finally back to the live slot; swipe up while reviewing and "Back to current card" return directly, and neither advances the live card; with no earlier card a right swipe does nothing.
3. While reviewing, `xp`, `answered`, `correct`, `combo`, `streak`, `missed`, `recent`, `lastAnsweredId`, `answers` and `history` do not change, no toast fires, and no control to answer, skip or flag is exposed. The e2e assertion uses roles, which exclude hidden elements.
4. History survives a reload (the e2e waits out the storage debounce before reloading). Progress saved before this change, with no `history` field, loads and plays. The list never exceeds 50. A rematch answered twice gives two entries, and flagging marks only the matching newest entry, leaving a non-matching newest entry alone (unit test).
5. A half-placed order card is unchanged after going back and returning (e2e).
6. Swipe up still advances. A horizontal drag over a tappable line or option does not answer the card. Vertical scrolling does not trigger a review. A diagonal swipe does neither.
7. "Previous card" and "Older card" walk the same history as the swipes (e2e, by role).
8. `npm run guard` and the Playwright e2e suite pass.

## Open Questions
- **Native is unverified, and needs a person.** This machine's Xcode 26.2 is below SDK 58's 26.4 requirement, so nothing here exercises native gestures. Done for this unit means web verified, with this list reported as still open. Manual Expo Go checks: swipe right and left on a card; swipe starting on code that fits and on code that overflows; swipe up still advances; vertical scroll on a long card does not trigger a review; on Android with gesture navigation, a swipe from the left edge is the system back gesture, so start mid-screen. The "Previous card" button is the fallback if the swipe misbehaves on a device.
