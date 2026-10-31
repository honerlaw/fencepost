// The Fencepost mark: a capital F built from one pointed picket and two rails. It is the
// fencepost error drawn as a letter (count the posts, get the rails wrong by one), and the
// lower rail carries the accent color. Shapes are in a 1024-unit box. Plain data, so the
// asset renderer (scripts/brand) and the in-app component share one source.
export const BRAND_MARK = {
  /** The drawing box the shapes are placed in. */
  size: 1024,
  /** The box the three shapes actually occupy, for centering and cropping. */
  bounds: { x: 300, y: 228, width: 440, height: 568 },
  /** The picket: a post with a pointed cap and a rounded foot, in ink. */
  picket: 'M300 312 L364 228 L428 312 V752 a44 44 0 0 1 -44 44 H344 a44 44 0 0 1 -44 -44 Z',
  /** The upper rail, in ink. */
  topRail: { x: 300, y: 356, width: 440, height: 96, radius: 48 },
  /** The lower rail, in the accent color. */
  accentRail: { x: 300, y: 548, width: 360, height: 96, radius: 48 },
} as const;
