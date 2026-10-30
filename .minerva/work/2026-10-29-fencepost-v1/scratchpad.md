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
- [panel — 3/3 accept, 3 with fixes] divergence: criterion 10 (iOS dev build) cannot be met — Xcode 26.2 vs SDK 58's 26.4+ requirement → replan (floor: divergence = panel, quorum 2/3)
    - fix: say plainly criterion 10 is weakened and why; 26.4 is the docs' fix but untested here
    - fix: dev-build compile/run joins Not-done; NOTES.md user-run item with Xcode 26.4+, the exact error, and the EAS alternative
    - fix: standing re-open trigger for non-Expo-Go native modules or config plugins; gate recorded as web + Expo Go, compiler on; cite screenshots; Tamagui 2.7.7 knowledge entry at promote
- [panel — 3/3 accept, 3 with fixes] new-plan acceptance: replan "iOS is verified in Expo Go because a local dev build needs Xcode 26.4+" (floor: new-plan acceptance = panel, quorum 3/3)
    - fix (arbiter/proponent): criterion 10 replacement text on its own labelled line
    - fix (arbiter/skeptic): list every proposal.md edit — criterion 10, Approach gate (b), Not-done dev-build item, stale pod-install clause removed
    - fix (arbiter/proponent): Xcode 26.4 is expected but unproven; the dev-build item stays in Not-done until a dev build succeeds; a later dev build or replan can retire the weakening
    - fix (arbiter/skeptic): Expo Go proves JS + Tamagui only, not config-plugin effects, the custom binary or app.json native settings
    - fix (skeptic): eas.json does not exist — NOTES.md states the prerequisites (build:configure / `ios.simulator: true` profile, expo-dev-client if developmentClient, Expo login)
    - fix (skeptic): screenshots copied to the work unit's evidence/ and cited there instead of /private/tmp
    - fix (skeptic): existing plugins (expo-router, expo-splash-screen, expo-sqlite) are covered by Not-done and do not trip the trigger; trigger carries across units and becomes knowledge at promote
    - fix (skeptic, optional): cited `npx expo install --check` ("Dependencies are up to date"); compiler-equivalence labelled as reasoned

## Work notes
- **Tamagui pinned to 2.7.7, not 3.x.** npm latest was tamagui 3.1.7 (published 2026-10-28). On Expo SDK 58 web export it put atomic class names on elements but never injected their CSS — with the metro compiler on, with `disableExtraction`, and with client-only rendering alike — so cards rendered unstyled. 3.x also drops the `$` token prefix (`bg="board"`) and v6 config moves `bg` to `background`. 2.7.7 (what the user's seekless repo runs in production with Expo Router SSR) works first try with `withTamagui` + compiler on. 2.7.7 has no `@tamagui/config/v6`; using `v5` (shorthands-only, `$` tokens). Routine version choice within approach A, not a replan.
- **Web renders the app after mount.** The server render can't know the color scheme (SSR rendered light; React hydration doesn't patch mismatched inline styles, so dark mode kept the light board) or the saved progress. `_layout.tsx` renders a plain board `View` until mounted on web.
- JetBrains Mono ligatures render `<=` as `≤` — code blocks must disable ligatures (bad for puzzles about comparisons).
- **Save layer:** `src/store/game-store.ts` is a vanilla zustand store over the pure engine with injected storage/clock/rng/id/fetchBatch; `hydrated` is set via a captured `set` because sync hydration can finish inside `createStore`. `debounceStorage` coalesces writes (1 s) and exposes `flush()` for backgrounding/page-hide.
- **Lint set up by `npx expo lint`** (it installs eslint 9 + eslint-config-expo and writes `eslint.config.js`). React Compiler lint rules apply: Reanimated shared values use `.get()`/`.set()`, no `Date.now()` in render (`useNow` hook), no setState in effects (web mount check uses `useSyncExternalStore` with a false server snapshot).
- **Web ligatures:** Tamagui joins a `fontVariant` array with commas on web, which CSS drops, so `no-ligatures.web.ts` sets `fontVariantLigatures: 'none'` via style instead.
- **Drags aren't taps:** on web a mouse drag that started on a tappable code line answered the card (found by the swipe e2e). `Tap` ignores presses that travel more than 10px.
- Card UI, feed, toasts, top bar, status cards, Topics sheet and the NDJSON client were built together (milestones 3, 4, and the client halves of 6 and 7) because the feed needs all of them to run; the server comes next.
