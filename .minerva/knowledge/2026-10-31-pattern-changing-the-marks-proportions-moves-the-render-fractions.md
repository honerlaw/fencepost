# Changing the mark's proportions moves the render fractions too

**Date**: 2026-10-31
**Type**: pattern
**Theme**: expo-platform
**Summary**: Rasters normalise the mark's height, so taller geometry needs higher fractions; the bundle doesn't.
**Context**: .minerva/work/2026-10-31-narrow-picket-f (see git history if the worktree has been cleaned up)

## Context
The Picket F was narrowed to 396 by 600 units from 440 by 568. Editing `src/theme/brand-mark.ts` and running `npm run brand:render` is the documented path, but that alone would have left the mark no taller on any raster.

## Finding
- `centeredMark` scales the mark's box to a fixed fraction of canvas height, so a taller box renders at the old height and every other dimension shrinks. Keeping the scale means raising `TILE_FRACTION`, `SPLASH_FRACTION` and `FOREGROUND_FRACTION` in proportion to the new height.
- The Icon Composer layers bypass `centeredMark` and use raw 1024-unit coordinates, so the bundle picks up the new size from the geometry alone.
- `BrandMark` crops to a square fitted to the height, so at a fixed `size` a taller mark gets narrower in-app, not taller.
- A shape's rounded end that touches the picket's outer edge bleeds through its antialiased pixels, even though the picket is drawn on top. The accent rail shares that edge's position only if it starts at the post's left side, so it now starts under the post at the stem's center. The fringe appeared on `icon.png` once the new offsets put the edge partway through a pixel, and only a pixel-level check found it.
- `xcrun actool` compiles the bundle in a scratch directory holding a copy of `assets/fencepost.icon` and an `Images.xcassets` with only a `Contents.json`. No prebuild is needed.

## Implications
- `scripts/brand/svg.test.ts` checks the Android safe zone against the current fractions, so raising `FOREGROUND_FRACTION` is safe only while it passes. The margin is now 3.1 px at 512.
- The golden test pins vectors, not how they look. A proportion change still needs the PNGs viewed and the compiled icon viewed.
- If the fractions ever need changing often, a constant scale in `svg.ts` would remove this step. That was rejected here as a refactor for a one-off.

## Related
- [[2026-10-31-decision-brand-assets-render-from-one-geometry-module]] — the renderer and geometry module this applies to
- [[2026-10-31-constraint-icon-composer-layers-are-listed-front-to-back]] — the compiled-PNG check, here run without a prebuild
