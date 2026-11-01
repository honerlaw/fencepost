# A persist version bump without `migrate` wipes saved progress

**Date**: 2026-10-31
**Type**: constraint
**Theme**: expo-platform
**Summary**: Zustand drops saved state on a version mismatch without `migrate`; add optional fields instead.
**Context**: .minerva/work/2026-10-31-review-answered-cards (see git history if the worktree has been cleaned up)

## Context
`Progress` is saved through zustand `persist` at `version: 1` with no `migrate`, and nothing validates it on load. Adding `history` raised the question of whether to bump the version.

## Finding
On a version mismatch with no `migrate`, zustand logs an error and hydrates nothing, so the player's progress is gone. That also applies in reverse: a rolled-back OTA running older code would discard data written at a newer version. An added optional field needs no bump. Older code carries unknown fields through `...state.progress` spreads.

`createJSONStorage` stringifies before calling `setItem`, so the 1-second debounce saves the write and not the serialization. Every store `set`, including each batch event and toast dismissal, stringifies all of `progress` synchronously.

## Implications
- Add `Progress` fields as optional, and leave the version and the `v: 1` literal alone. A real shape change must ship a `migrate`.
- The size of `progress` is a per-state-change cost on the JS thread. History adds up to 50 cards, tens of KB, and that is accepted; anything larger needs its own storage key.

## Related
- [[2026-10-29-pattern-batch-lifecycle-invariants]] — batch events are the most frequent `set`
