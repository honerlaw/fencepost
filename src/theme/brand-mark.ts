// The Fencepost mark: a capital F built from one pointed picket and two rails. It is the
// fencepost error drawn as a letter (count the posts, get the rails wrong by one), and the
// lower rail carries the accent color. Shapes are in a 1024-unit box. Plain data, so the
// asset renderer (scripts/brand) and the in-app component share one source.
export const BRAND_MARK = {
  /** The drawing box the shapes are placed in. */
  size: 1024,
  /** The box the three shapes actually occupy, for centering and cropping. */
  bounds: { x: 322, y: 212, width: 396, height: 600 },
  /** The picket: a post with a pointed cap and a rounded foot, in ink. */
  picket: 'M322 288 L380 212 L438 288 V772 a40 40 0 0 1 -40 40 H362 a40 40 0 0 1 -40 -40 Z',
  /** The upper rail, in ink. */
  topRail: { x: 322, y: 347, width: 396, height: 88, radius: 44 },
  /** The lower rail, in the accent color. It starts under the picket so no blue edges the post. */
  accentRail: { x: 380, y: 550, width: 266, height: 88, radius: 44 },
} as const;
