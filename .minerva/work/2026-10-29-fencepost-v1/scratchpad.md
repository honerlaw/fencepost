# Scratchpad: fencepost-v1

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-29
- [reviewed — folded] scope check: one unit, one PR (unphased); folded the 503 degrade path + "generated-card correctness unverified" + guessed-origin note + stop-per-milestone deviation into the proposal; dismissed commit-per-milestone-as-criterion (process, not load-bearing) and adding CI (not requested) (tier: reviewer — not provably small; no panel clause: greenfield template, no existing interface, empty knowledge; parallel wave)
- [rechecked — residual folded] scope check: items 1 (commit convention) and 4 (origin) partially addressed — folded "each milestone commit leaves tsc+tests green", NOTES.md names the single place to change origin, README must not claim production-ready
- [reviewed — folded] approach: option A (handoff stack: Tamagui, zustand, AI SDK+OpenRouter, expo-server Express, Vitest); rejected B (RN StyleSheet, lower dep risk but overrides the user's stated stack) and C (Jest — test runner is an independent axis, Vitest fits pure-TS core); folded a concrete milestone-1 Tamagui gate (web export + iOS dev build) with an in-milestone fallback to B that relaxes criterion 6 (tier: reviewer — enumerated 3, A dominant on fidelity to spec but not provably small; parallel wave)
- [rechecked — residual folded] approach: items 3 (handlers importable in Node) and 5 (streaming through the Express adapter unverified) partially addressed — folded handlers.ts as plain functions + OPENROUTER_BASE_URL stub streaming check; new concerns folded: gate must fail with compiler on AND off before replan; case-insensitive leak grep
- [reviewed — clean] whole-proposal (first wave): verdict revise, discarded as stale — scope and approach folds rewrote ## Success criteria (restart condition)
- [reviewed — folded] whole-proposal (restart): re-reviewed against the merged draft; folded fake-upstream end-to-end streaming, web localStorage adapter, native export + leak grep, Playwright swipe check, abort semantics, prompt snapshot, seeded-RNG probability tests, background policy tests, relaxed criterion 6, lint/a11y selector precision, expo-crypto device id (tier: reviewer; parallel wave restart)
- [rechecked — residual folded] whole-proposal: items 2 (debounce before reload), 6 (unstubbed e2e 429 timing), 9 (network) partially addressed and new concern 1 (Hermes bytecode makes `grep -I` vacuous) — folded `grep -a`, flush-before-reload, second server.js instance for full-stack e2e, network note; judged not load-bearing (one-flag fixes, decision unchanged)

## Work notes
