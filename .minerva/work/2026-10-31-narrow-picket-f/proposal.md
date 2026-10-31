# Proposal: narrow-picket-f

**Date**: 2026-10-31
**Status**: Draft

## Goal
Narrow the Fencepost "Picket F" mark: slightly taller and skinnier, using candidate A the user picked from a preview. Every surface that shows the mark (iOS Icon Composer bundle, `icon.png`, favicon, Android adaptive foreground and monochrome, both splashes, the brand SVGs, the in-app `BrandMark`) carries the new proportions.

## Why
The request, verbatim: "Can you narrow the F in the logo? basically just make it lsightly taller and skinnier? show me a preview before committing to it". A preview page showed the current mark and candidates A, B and C at every shipped size. The user's answer: "Yea lets do A".

Facts verified at intake:
- `src/theme/brand-mark.ts` is the single geometry source. `scripts/brand/` derives every asset from it, and the in-app component reads it (`2026-10-31-decision-brand-assets-render-from-one-geometry-module`).
- Rasters and brand SVGs go through `centeredMark`, which scales the mark's box to a fixed fraction of canvas height. A taller box alone would be scaled back to the old height there. The Icon Composer layers are written in raw 1024-unit coordinates, so the bundle picks up the new size from the geometry alone.
- The mark's half-diagonal stays about 359 units, so the Android safe-zone margin is unchanged.
- Memory says to ask before pushing. The user invoked the auto orchestrator, whose ship phase pushes and opens a PR. That invocation is the authorization for this run.

## Approach
1. In `src/theme/brand-mark.ts`, replace the geometry with candidate A:
   - `bounds`: `{ x: 322, y: 212, width: 396, height: 600 }` (was 300, 228, 440, 568)
   - `picket`: `M322 288 L380 212 L438 288 V772 a40 40 0 0 1 -40 40 H362 a40 40 0 0 1 -40 -40 Z` (stem 116, was 128; cap slope kept; foot radius 40, was 44)
   - `topRail`: `{ x: 322, y: 347, width: 396, height: 88, radius: 44 }`
   - `accentRail`: `{ x: 322, y: 550, width: 324, height: 88, radius: 44 }`
   The box keeps its center at (520, 512).
2. Raise the fractions so the scale stays about the same and the extra height shows: `TILE_FRACTION` 0.56 to 0.59 (`scripts/brand/svg.ts`), `SPLASH_FRACTION` 0.8 to 0.845 and `FOREGROUND_FRACTION` 0.47 to 0.5 (`scripts/brand/targets.ts`). Update "440 by 568 units" in the comment above `FOREGROUND_FRACTION`. Its "359 units" stays true.
3. Run `npm run brand:render` and commit every regenerated asset. The Icon Composer layers use no fraction, so their mark goes from 55.5% to 58.6% of the canvas, in line with `icon.png` at 0.59.
4. `BrandMark` stays at `size={28}`. Its square crop fits the height, so in-app the mark gets narrower, not taller. This is deliberate.
5. Verify the iOS bundle per `2026-10-31-constraint-icon-composer-layers-are-listed-front-to-back`: throwaway prebuild, `xcrun actool`, view the compiled PNG, delete the generated output.

### Candidates considered
- **A (picked). Edit the constants and round the fractions.** Smallest change; uses the documented path for changing the mark.
- **B. Replace the fractions with a constant scale in `svg.ts`.** Avoids re-tuning later, but refactors renderer code for a one-off change.
- **C. Change the geometry only.** Fails "taller" on every raster.

### Out of scope
Colors, `BrandMark`'s size, `app.json`, new tests, the 8-unit offset of the bundle layers from true center (already there), any guarded path.

## Success criteria
1. `src/theme/brand-mark.ts` holds exactly the values in Approach 1, and each shape stays inside `bounds`.
2. The three fractions hold the values in Approach 2, `scripts/brand/svg.test.ts` passes, and the comment above `FOREGROUND_FRACTION` says 396 by 600 units. A grep for `440` and `568` outside `.minerva/` finds no stale reference to the mark's size.
3. `npm run brand:render` has been run, a second run leaves `git status --porcelain` empty, and `scripts/brand/golden.test.ts` passes.
4. Each of the six PNGs was viewed after rendering and shows the new mark uncropped. `sips -g hasAlpha assets/images/icon.png` reports no.
5. `xcrun actool` compiles the bundle with zero errors and warnings, and the compiled `fencepost60x60@2x.png` was viewed, showing the picket in front of the rails and the new proportions. Nothing generated is committed.
6. `npm run e2e` passes (brand mark visible in the topics sheet).
7. `npm run guard` exits 0, and `git diff --name-only main...HEAD` contains no path from `.github/guardrail-paths.txt`.

## Open Questions
None. This merge takes the TestFlight build path, which a new icon needs.
