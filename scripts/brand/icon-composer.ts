// The iOS app icon as an Icon Composer bundle: a directory with icon.json and one SVG per
// layer. Apple does not publish the format; this shape is the one Expo's template ships and
// the one Xcode 26.2's actool compiled during the brand-assets work unit.
import { BRAND_MARK } from '@/theme/brand-mark';
import { darkColors } from '@/theme/colors';

import { markShapes, svgDocument } from './svg';
import { CHALK, type Target } from './targets';

export const ICON_BUNDLE = 'assets/fencepost.icon';

/** `#rrggbb` as Icon Composer's `srgb:r,g,b,a` with five decimals. */
export function srgb(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`srgb: expected #rrggbb, got ${hex}`);
  const channels = [1, 3, 5].map((i) => (Number.parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(5));
  return `srgb:${channels.join(',')},1.00000`;
}

function layer(name: string): {
  'image-name': string;
  name: string;
  position: { scale: number; 'translation-in-points': number[] };
} {
  return { 'image-name': `${name}.svg`, name, position: { scale: 1, 'translation-in-points': [0, 0] } };
}

/** The bundle's files: icon.json plus one SVG per layer. Icon Composer lists layers front to back. */
export function iconComposerTargets(): readonly Target[] {
  const { size } = BRAND_MARK;
  const inkOnly = markShapes({ ink: CHALK.ink, accent: 'none' });
  const accentOnly = markShapes({ ink: 'none', accent: CHALK.accent });
  const json = {
    fill: { solid: srgb(darkColors.board) },
    groups: [
      {
        layers: [layer('picket-f'), layer('accent-rail')],
        shadow: { kind: 'neutral', opacity: 0.5 },
        translucency: { enabled: false, value: 0.5 },
      },
    ],
    'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
  };
  return [
    { file: `${ICON_BUNDLE}/icon.json`, size, content: `${JSON.stringify(json, null, 2)}\n` },
    { file: `${ICON_BUNDLE}/Assets/picket-f.svg`, size, content: svgDocument(size, inkOnly) },
    { file: `${ICON_BUNDLE}/Assets/accent-rail.svg`, size, content: svgDocument(size, accentOnly) },
  ];
}
