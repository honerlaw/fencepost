# Scratchpad: review-answered-cards

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [reviewed — clean] scope check: one unit, one PR, no phases (tier: reviewer — spans engine, feed and tests, so not provably small; parallel wave)
- [reviewed — folded] approach: option A kept; folded swipe precedence (a right swipe with upward drift would have fired Next), `flagWrong` match, trimmed entry shape, derived review position, A3 named (tier: reviewer — interface-clause doubt on the persisted `Progress` shape and pan config passed to the Skeptic, which answered no outside consumer, confirmed from zustand source; parallel wave)
- [rechecked — residual folded] approach: item 7 partially addressed (swipes now set state from the derived position); new low concerns folded (narrowed prop types, `flagWrong` non-match test)
- [reviewed — folded] whole-proposal: criteria scoped to web with a manual native list, swipe-up-in-review rule pinned, distinct review testIDs, Goal states card state kept and scroll reset, persistence in Goal, button criterion added (tier: reviewer; parallel wave)
- [rechecked — residual folded] whole-proposal: item 5 partially addressed (reload e2e waits out the debounce); new low concerns folded (`CardView` testID prop, scoped selectors)
- [solo] whole-proposal restart check: not stale; pick unchanged, no phases added, approach fold left Goal and criteria alone, no pending clause (tier: restart check)
- [reviewed — clean] completion verification: Verifier reproduced all 8 criteria, reran guard and 26/26 e2e (tier: reviewer floor; interface clause adjudicated at propose, diff adds nothing beyond it; code review ran alongside)
- [solo] review triage: 9 FIX / 1 SUGGEST / 2 IGNORE (tier: default-solo row — each finding had one clear disposition under the deferral bar)
- [solo] promote partition: 4 PROMOTE / 3 MERGE / rest DISCARD / 0 TODO (tier: default-solo row — no entry had two defensible buckets; the SUGGEST finding became part of the persist constraint entry)
- Pre-flight: no collision. `2026-10-31-narrow-picket-f` and `honerlawd/docs-card-model` have merged PRs. Peer session `fencepost-0d` not messaged (no authorization), so its state is unknown. No open issues.
- Base: `origin/main` 4fb5af8; local `main` is 2 commits behind.
- Ship: memory `no-fly-deploys` says to stop at a local commit and ask before any push. Ask at Phase 6.

## Work notes
- Pre-existing hook gap: the first commit in a fresh worktree printed "Can't find lefthook in PATH" and passed unchecked, because the worktree had no `node_modules` yet. It only held docs. After `npm ci` hooks should run; confirm on the next commit.
- The `one-export-per-file` lint rule forced `VerdictBody` to take its buttons as data, with `VerdictPanel` and `ReviewVerdict` as thin files. Better than a mode flag anyway.
- `ReviewedResult` moved to `game/types.ts`, with `AnswerResult extends ReviewedResult`, so `game/types` does not import from the engine.
- The toast container is always rendered; assert its text is empty, not that it is absent.
- reload e2e needs no explicit wait: pagehide flushes the debounced save, as the existing specs rely on.

## Review triage 2026-10-31
Local-diff mode: no PR exists, so an independent subagent reviewed the diff. Inline audit found no spec or knowledge drift.
- FIX: `onDeactivate` ignored `e.canceled`, so a cancelled drag could fire a swipe.
- FIX: a keyboard or screen-reader user had no way back from an unanswered card. `Previous card` moved from the verdict panel to the feed, on every live slot; `Newer card` added.
- FIX: the review hint named older cards on the oldest card.
- FIX: `toReversed` was the only such method in client code, ran on every render, and could not be tested on Hermes here; the list now stays oldest first.
- FIX: tests for stored points, a non-retried toast check, a batch landing mid-review, the long-card scroll gate, order and flagged cards in review.
- IGNORE: no test for swipes in the 200 ms leave window. Both paths are one-line guards, and a timing test would be flaky. → accepted
- IGNORE: e2e does not sample `combo`, `streak` and similar during review. `useReview` never reaches the store. → accepted
- SUGGEST: persisting history means every store `set` stringifies up to 50 cards synchronously, not once a second, because `createJSONStorage` stringifies before the debounce.
