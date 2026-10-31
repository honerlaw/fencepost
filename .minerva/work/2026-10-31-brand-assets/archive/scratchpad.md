# Scratchpad: brand-assets

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [reviewed — clean] scope check: one unit, one PR, unphased (tier: reviewer — multi-surface, so the solo predicate's single-surface clause failed; no panel clause; parallel wave. Skeptic accepted; noted: knip must infer the bare `tsx` script, determinism is local, masters vs geometry must be one source — all carried into the approach fold)
- [reviewed — folded] approach: option A, geometry module + Chromium renderer from `@playwright/test` (tier: reviewer — A not strictly dominant over B on tooling surface; no panel clause; parallel wave. Folded: import from `@playwright/test`; `src/theme/brand-mark.ts` is the single master and `assets/brand/*.svg` are outputs; determinism restated as same-machine idempotence with the resvg/sharp alternative weighed as A'; solid-fill `icon.json` verified with Xcode 26.2 actool at intake and a PNG fallback named; sync test placed in `src/theme/colors.test.ts`; actool runs on the real prebuild catalog with zero warnings and the emitted 60x60@2x viewed; bare npm script for knip with a stop-and-report branch. Rejected alternatives: B hand export, C config plugin, A' resvg/sharp)
- [rechecked — residual folded] approach: fold-audit accepted 9/10; item 8 partial (Xcode 26.2 local vs 27.1 on EAS) folded as a named residual risk with the remove-`ios.icon` recovery in NOTES.md; new concerns folded: the title keeps its "Fencepost" accessible name with the mark decorative, and the README table test is scoped to the palette table rows
- [reviewed — clean] whole-proposal (restart): first-wave review discarded because the approach fold rewrote `## Success criteria` and `## Goal`; re-reviewed draft v3 (tier: reviewer — no panel clause; parallel wave restart). Accepted; noted for work: measure the Android foreground against the 66% safe-zone circle instead of asserting it, name the Chromium binary prerequisite in README, confirm react-native-svg forwards `testID` on web
- [reviewed — clean] completion verification: Verifier reproduced criteria 1, 2, 3, 6 and the guardrail half of 7, judged 4, 5 and the guard half of 7 consistent but unreproduced (prebuild, e2e and guard are too slow for it); accept (tier: reviewer floor — no panel clause: no interface beyond what the proposal approved)
- [solo] review triage: all 8 findings FIX, none deferred (tier: solo — every item has one defensible disposition: the layer-order blocker is a correctness bug against criterion 4, `android.package` is out of scope by the proposal's own list, and the five cleanups are reversible and local; no finding was load-bearing on the approach, so no replan-vs-FIX panel)
- [solo] promote partition: PROMOTE 4 (Icon Composer layer order + actool check; prebuild writes android.package; node:fs tests under scripts/; the render-from-one-module decision with the splash-scheme choice and rejected alternatives), MERGE INTO PROPOSAL the shipped shape of scripts/brand and the review fixes, DISCARD pre-flight, spike and result lines, TODO none (tier: solo — no entry had two defensible buckets; the renderer decision is documented as "how" in README and promoted for the "why" and rejected alternatives)
- [solo] TODO disposition: no forward-looking items; the Xcode 26.2 vs 27.1 residual is recorded in NOTES.md and the proposal, not deferred (tier: solo — empty bucket)

## Work notes 2026-10-31
- Pre-flight: no in-flight units, no open PRs or issues. The primary checkout is on `feat/deploy-server-on-merge` (another session's server-deploy work, clean tree): adjacent, not a collision. This unit branches from `main` in its own worktree.
- Intake spikes (scratchpad, not committed): actool compiles the Expo `.icon` bundle and a hand-written solid-fill bundle; two Chromium renders of the 1024 icon are byte-identical; the opaque tile has no alpha channel.
- The palette test lives at `scripts/brand/palette.test.ts`, not `src/theme/colors.test.ts` as proposed: the app tsconfig has no Node types (TS 6 default), so `node:fs` doesn't typecheck under `src/`, and a `/// <reference types="node" />` workaround is an unresolvable `node` dependency to dependency-cruiser (the guard's architecture step failed on it). Routine choice; the proposal's path was updated in place. The `sonarjs/unused-named-groups` rule does not see named groups read through destructuring, so the table regex uses positional groups.
- react-native-svg does not forward `testID` on web, so `BrandMark` wraps its `Svg` in a Tamagui `YStack` that carries `testID="brand-mark"` and `aria-hidden`.
- Renderer facts: two runs rewrite identical bytes (shasum over every output); `icon.png` has no alpha channel (`sips -g hasAlpha: no`, Chromium drops alpha when every pixel is opaque); the transparent layers keep theirs.
- Throwaway prebuilds (gitignored `ios/`, `android/`): `ios/fencepost/fencepost.icon` is copied in and `ASSETCATALOG_COMPILER_APPICON_NAME` points at it; `xcrun actool` (Xcode 26.2) compiled the real catalog with the bundle with zero errors and zero warnings, and the emitted `fencepost60x60@2x.png` shows the chalk F with the blue rail on the chalkboard. Android got `iconBackground #16211d`, `splashscreen_background #eef1ef` / night `#16211d`, and `ic_launcher_{foreground,monochrome,round}.webp` in every mipmap.
- Android safe zone is measured, not asserted: `scripts/brand/svg.test.ts` checks the mark's corner radius at `FOREGROUND_FRACTION` against the 66/108 circle.
- Gotcha: `npx expo prebuild --platform android` writes `android.package` into `app.json` when it is unset (it printed "Updated package.json | no changes" and said nothing about app.json). The throwaway prebuild for criterion 4 added `com.derek.honerlaw.fencepost`, which is out of scope here and the deploy unit left unset on purpose. Found by the minerva audit; removed at review triage.

## Minerva audit 2026-10-31
1. medium app.json — `android.package` added by the throwaway Android prebuild; out of scope (proposal "Out of scope": Android package id) → FIX: remove the key.
Spec fidelity otherwise: every Approach step has its diff; the palette test moved to `scripts/brand/palette.test.ts` (proposal updated, routine). Knowledge compliance: no entry violated; fingerprint and deployment-limits entries are reflected in NOTES.md.
- Recorded results, 2026-10-31: `npm run guard` → `GUARD EXIT 0`, "guard: all checks passed" (17 test files, 185 tests; web and native exports; bundle secrets 74 files clean). `npm run e2e` → 14 passed (42.5 s), including "the topics sheet shows the mark beside the name". actool command: `xcrun actool ios/fencepost/Images.xcassets ios/fencepost/fencepost.icon --compile <tmp> --platform iphoneos --minimum-deployment-target 16.0 --target-device iphone --target-device ipad --app-icon fencepost --include-all-app-icons --output-partial-info-plist <tmp>/partial.plist` on Xcode 26.2 (17C52).

## Code review 2026-10-31
Independent fresh-context diff reviewer (sonnet), 7 findings:
1. high `scripts/brand/icon-composer.ts` — Icon Composer lists layers front to back, so `[accent-rail, picket-f]` drew the blue rail over the picket stem in the compiled iOS icon; every other surface draws the picket in front.
2. medium `app.json` — `android.package` added by the throwaway prebuild (same as audit 1).
3. medium — no test pins the committed vectors and icon bundle to the renderer's output, so the layer-order bug had nothing to catch it.
4. low `scripts/brand/targets.ts` — the icon tile literal was built twice (icon.png and icon.svg).
5. low `Target.size` has no meaning for the icon.json target.
6. low `srgb()` accepted any string and produced NaN channels silently.
7. low the `srgb` test lived in `svg.test.ts` instead of beside `icon-composer.ts`.

## Review triage 2026-10-31
- [FIXED] audit 1 / review 2 — `android.package` removed from app.json.
- [FIXED] review 1 — layers now `[picket-f, accent-rail]`, doc comment says "front to back"; re-rendered; actool on the prebuild catalog compiled with zero errors/warnings and the emitted 60x60@2x shows the picket in front of the rail.
- [FIXED] review 3 — `scripts/brand/golden.test.ts` asserts every vector and icon-bundle target equals the committed file, through the same prettier step the renderer uses (`scripts/brand/text.ts`, shared so jscpd stays at 0). Rasters stay hand-checked (Chromium).
- [FIXED] review 4 — `ICON_TILE` constant in targets.ts.
- [FIXED] review 5 — `size` comment widened to "the viewBox for a vector or an icon-bundle layer"; the field stays required so every target stays uniform.
- [FIXED] review 6 — `srgb` throws on anything but `#rrggbb`.
- [FIXED] review 7 — `srgb` tests moved to `scripts/brand/icon-composer.test.ts`, with a layer-order test.
