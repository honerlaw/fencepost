# Brand assets render from one geometry module and the palette

**Date**: 2026-10-31
**Type**: decision
**Theme**: expo-platform
**Summary**: Brand rasters render from `src/theme/brand-mark.ts` with Chromium; committed files are the record.
**Context**: .minerva/work/2026-10-31-brand-assets (see git history if the worktree has been cleaned up)

## Context
The app shipped with the `create-expo-app` icons, splash and favicon. The request was the "Picket F" mark on the chalkboard everywhere, with the theme as the documented source of the brand. The palette already lived in `src/theme/colors.ts`; the renderer had to use it without a new dependency or a guarded-path edit.

## Finding
- `src/theme/brand-mark.ts` is the single master: three shapes and a 1024 viewBox, no React. `src/components/ui/brand-mark.tsx` draws it in-app with react-native-svg from theme tokens, and `scripts/brand/` derives every asset from it plus `lightColors`/`darkColors`.
- `npm run brand:render` writes `assets/brand/*.svg`, the `assets/fencepost.icon` bundle, and six PNGs by screenshotting SVG documents in Chromium from `@playwright/test` (fixed viewport, `deviceScaleFactor: 1`, explicit clip, no text). JSON goes through Prettier's API so `prettier --check` and a re-render agree.
- Determinism is local: two runs on one machine are byte-identical, but Chromium output can differ across machines, so nothing in CI regenerates assets and the committed files are the source of record. `scripts/brand/golden.test.ts` pins the vectors and the icon bundle to the renderer; the PNGs are reviewed as image diffs.
- The splash follows the system scheme (whiteboard in light, chalkboard in dark) because `userInterfaceStyle` is automatic and a chalkboard splash would flash into a white board. The app icon and the Android adaptive background are always the chalkboard.
- react-native-svg does not forward `testID` on web, so the component wraps its `Svg` in a Tamagui `YStack` that carries the testID and `aria-hidden`.
- Rejected: `@resvg/resvg-js` or `sharp` (cross-machine determinism, but a new native devDependency); hand-exported PNGs (the palette and rasters drift silently); a config plugin rendering at prebuild (the repo never shows the icon).

## Implications
- To change the mark or a brand color: edit the module or `colors.ts`, run `npm run brand:render`, review the image diff. Forgetting the render fails the golden test and `scripts/brand/palette.test.ts`.
- Any asset or bundle change, and the bare `brand:render` script itself, moves the iOS fingerprint, so such a merge builds for TestFlight.
- The script stays a bare `package.json` entry so knip infers it; `knip.json` is a guarded path.
- If cross-machine drift ever matters, the resvg route is the upgrade; swap the screenshot step only.

## Related
- [[2026-10-31-constraint-icon-composer-layers-are-listed-front-to-back]] — how the iOS bundle this writes is verified
- [[2026-10-31-reference-ios-fingerprint-inputs]] — why a brand change takes the build path
- [[2026-10-29-decision-tamagui-pinned-to-2-7-7]] — the theme tokens the in-app mark reads come from this Tamagui setup
