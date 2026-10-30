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
- [verified — revise] completion verification: Verifier marked criteria 9 (e2e evidence predates final commit 31fbe1d) and 12 (fly.toml cannot enforce "single machine"; NOTES says plain `fly deploy`) as unsure → success-criteria divergence → Phase 2.5 replan (tier: reviewer floor — Verifier; no interface change beyond what the proposal approved). Code review ran alongside: 11 findings (1 high, 4 medium, 6 low), provisional.
- [panel — 3/3 accept, 3 with fixes] new-plan acceptance: replan "Completion verification: single machine made true for Fly, and e2e evidence must come from the final tree" (floor: new-plan acceptance = panel, quorum 3/3)
    - fix (skeptic/arbiter): "final" means app/server/test/build-config inputs are final; doc- and comment-only edits (NOTES, README, fly.toml comments, .minerva/) don't force an e2e re-run; later code changes do
    - fix (all): evidence record named — scratchpad line with SHA, 13 passed/0 failed and timestamp, plus evidence/e2e-<sha>.txt
    - fix (all): "fresh expo export" reworded to `npm run e2e` (the script exports first); README settled as no change; `--no-deploy` creates no machines; NOTES notes later deploys keep the count and cross-refs the Rate-limit row; rationale moved out of criterion 12's text
- [solo] resume implementation after replan: also fixing the provisional code-review bugs now (1 skip-all-starters stuck loading, 2 cancel on loading slot / done with nothing playable, 3 stale batch completion, 4–7 server hardening, 9–11 lows), because the replan resume changes the diff outside .minerva/work/ anyway, so both finding sets are regenerated against the final diff at the second completion check (evidence: phases.md Phase 2 step 4 "discard both … Phase 3 generates them again")
- [solo] criterion 9 evidence (per replan): `npm run e2e` on a648e75 — 13 passed, 0 failed, 2026-10-29 23:30, tree clean → evidence/e2e-a648e75.txt. Criterion 8 unconfigured sequence re-run on a648e75 (200 / 400 / 503 / 429 retry-after 20 / flag 200 / 413 chunked) → evidence/server-unconfigured-a648e75.txt (tier: solo — mechanical evidence capture, no judgment)
- [verified — accept] completion verification (second pass, after replan entry 2): Verifier reproduced all 14 criteria on HEAD 3809d43; a648e75 evidence counts because only .minerva/ changed since (tier: reviewer floor — Verifier; no interface change beyond what the proposal approved). Optional, non-blocking: re-export dist-native and re-grep; save a docker log; the "tree clean: 1 changes" header in e2e-a648e75.txt counts the evidence file itself, which was untracked while being written
- [solo] review triage (second code review, HEAD 3809d43; the minerva audit re-run inline was clean, with no knowledge entries yet and spec fidelity OK). 8 FIX, 1 SUGGEST, 0 IGNORE.
    - FIX:
        - #1 high: expo/fetch is given relative URLs. Only the global fetch is origin-wrapped (verified in node_modules/@expo/metro-runtime/src/location/install.native.ts and expo/src/winter/fetch/fetch.ts), so every native /api call fails.
        - #2: normal play hits the device bucket's 1-per-20 s limit. Causes are the chained fetch after a fast `done` and Try again soon after a fast failure.
        - #3: there is no client deadline, so a hung stream leaves inFlight set forever.
        - #4: Fly-Client-IP is trusted when not running on Fly.
        - #5: a late failed outcome after `done` overwrites the success.
        - #6: a primary model whose cards are all dropped never falls back.
        - #7: quotes in recent titles.
        - #8: a body stream error in readBody becomes a 500.
        - Coverage: the flagWrong→reportFlag call is never asserted.
    - SUGGEST: useAppLifecycle wiring tests. This is a standing gap; the pure createLifecycle is tested.
    - No item has two defensible dispositions. Each has a writable failure scenario and is absorbable, so each is FIX by the deferral bar.
    - Replan-vs-FIX: not triggered. #1 corrects the client so the planned origin-based native fetch works; the approach is unchanged.
- [solo] review FIX items applied in cbd1e7b and 0b27a6f. The criterion-9 evidence was re-captured per replan entry 2 because code changed: `npm run e2e` on 0b27a6f gave 13 passed, 0 failed (2026-10-29 23:45, tree clean) → evidence/e2e-0b27a6f.txt. Criterion 8 was re-run on 0b27a6f → evidence/server-unconfigured-0b27a6f.txt. The a648e75 evidence files were removed as superseded. The first e2e run on cbd1e7b failed the 503 test: the new 20 s batch gap means the auto-retry and Try again now wait instead of firing at once, which is intended. The test now asserts the loading card, then the delayed request, then the error card. (tier: solo — mechanical evidence capture)

## Work notes
- **Tamagui pinned to 2.7.7, not 3.x.** npm latest was tamagui 3.1.7 (published 2026-10-28). On Expo SDK 58 web export it put atomic class names on elements but never injected their CSS — with the metro compiler on, with `disableExtraction`, and with client-only rendering alike — so cards rendered unstyled. 3.x also drops the `$` token prefix (`bg="board"`) and v6 config moves `bg` to `background`. 2.7.7 (what the user's seekless repo runs in production with Expo Router SSR) works first try with `withTamagui` + compiler on. 2.7.7 has no `@tamagui/config/v6`; using `v5` (shorthands-only, `$` tokens). Routine version choice within approach A, not a replan.
- **Web renders the app after mount.** The server render can't know the color scheme (SSR rendered light; React hydration doesn't patch mismatched inline styles, so dark mode kept the light board) or the saved progress. `_layout.tsx` renders a plain board `View` until mounted on web.
- JetBrains Mono ligatures render `<=` as `≤` — code blocks must disable ligatures (bad for puzzles about comparisons).
- **Save layer:** `src/store/game-store.ts` is a vanilla zustand store over the pure engine with injected storage/clock/rng/id/fetchBatch; `hydrated` is set via a captured `set` because sync hydration can finish inside `createStore`. `debounceStorage` coalesces writes (1 s) and exposes `flush()` for backgrounding/page-hide.
- **Lint set up by `npx expo lint`** (it installs eslint 9 + eslint-config-expo and writes `eslint.config.js`). React Compiler lint rules apply: Reanimated shared values use `.get()`/`.set()`, no `Date.now()` in render (`useNow` hook), no setState in effects (web mount check uses `useSyncExternalStore` with a false server snapshot).
- **Web ligatures:** Tamagui joins a `fontVariant` array with commas on web, which CSS drops, so `no-ligatures.web.ts` sets `fontVariantLigatures: 'none'` via style instead.
- **Drags aren't taps:** on web a mouse drag that started on a tappable code line answered the card (found by the swipe e2e). `Tap` ignores presses that travel more than 10px.
- Card UI, feed, toasts, top bar, status cards, Topics sheet and the NDJSON client were built together (milestones 3, 4, and the client halves of 6 and 7) because the feed needs all of them to run; the server comes next.
- **elementStream drops schema-invalid elements silently**, which would misalign plan slots (boss) and hide drop counts. The server sends the strict RawCard JSON schema to the model but validates with a pass-through `jsonSchema(..., { validate })`, leaving validation to `normalize` so every element is counted. Model errors don't throw from `elementStream`; they arrive via `onError` and are rethrown after the loop (as `ModelFailedError` if no card was sent, which triggers the fallback model).
- Each `+api.ts` is bundled separately (about 1.8 MB each), so `getHandlers()` state (rate limits, last domain per device) is per route bundle. That's fine because the cards and flag limits are independent.
- `scripts/stub-openrouter.mjs` is a fake OpenAI-compatible SSE endpoint used by the curl streaming check (evidence/curl-stream.txt) and by the full-stack Playwright scenario. `cards:eval` runs under `tsx` so the `@/` aliases resolve.
- User (mid-run, 2026-10-29): "dont actually deploy or do anything in fly.io please, just focus on local development". This matches the plan (Fly steps were already user-run); Dockerfile/fly.toml stay as files, verified with a local docker build only.
- **iOS ligatures:** the new-architecture iOS text renderer (`RCTFontUtils.mm`) only maps the caps/number `fontVariant` values, so `no-contextual` is silently ignored and Expo Go showed `≤`/`═`. Native `codeText()` puts U+2060 (word joiner) between neighbouring symbols, which breaks the JetBrains Mono `calt` match; web keeps the CSS `font-variant-ligatures: none`. Verified in Expo Go (evidence/ios-expo-go-*.png).
- Expo Go's first `openurl` after a terminate sometimes lands on the home screen. That is not a crash: reopening the `exp://` URL (with `__expo_disable_fab=1` so the dev gear doesn't cover the top bar) loads it.
- Docker image builds and serves locally (health OK, page 200, cards 503 without a key). The image is about 1.26 GB because Expo/RN are runtime `dependencies`; slimming it is a follow-up, not v1.
- 2026-10-29 23:30: the first criterion-8 curl run, started right after `npm run e2e`, got 404 on every route, including /api/health. The readiness loop used `curl -s` without `-f`, so it accepted the 404. Four later cold starts on the same dist/ all returned 200 from the first answered request, with or without NODE_ENV. Not reproduced, cause unknown. The evidence file is from the clean re-run.
- Code-review findings fixed during the post-replan resume (a648e75). Each has a regression test, and the batch-stale test was mutation-checked against the old `signal.aborted` guard, which it fails.
  - #1 skip-all-starters
  - #2 cancel on loading / done with nothing playable / done while waiting
  - #3 stale batch completion
  - #4 rate limit check-then-take, IP first, LRU cap
  - #5 chunked body cap
  - #6 pre-aborted client
  - #7 last XFF hop; dropped the no-op trust proxy
  - #9 flush never rejects, retries
  - #10 ndjson handler errors surface
  - #11 dead `wasMissed` removed
  - Not changed: #8 (`recent` titles reach the prompt by design of handoff §8.3; a modified client only affects its own batch, and output still passes normalize). The flagWrong `pushRecent` is kept because criterion 2 names it; its test now clears recent first, so it discriminates.
- 2026-10-29 23:35: re-exported dist-native (iOS + Android) on 3809d43 code. The `grep -rail` leak patterns find nothing (exit 1), and the "Overlapping bookings" sanity string is present in both .hbc bundles.
- **Native fetch (review #1, verified).** `expo/fetch` resolves no relative URLs on native; only the global `fetch` is wrapped (`@expo/metro-runtime/src/location/install.native.ts`). `src/lib/api-url.ts` resolves them against `window.location`. Check: a temporary probe module, now deleted, ran in Expo Go on iOS against `npx expo start` + the stub. A raw relative `expo/fetch('/api/health')` gave 404, while `fetchBatch` streamed 5 cards incrementally → evidence/ios-expo-go-native-stream.txt. NOTES.md item 8 is narrowed to Android, release builds and a real network.
