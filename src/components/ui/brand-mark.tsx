import Svg, { Path, Rect } from 'react-native-svg';
import { YStack, useTheme } from 'tamagui';

import { BRAND_MARK } from '@/theme/brand-mark';

const { bounds } = BRAND_MARK;
const side = Math.max(bounds.width, bounds.height);
// A square crop around the shapes, so the mark fills the box it is given.
const viewBox = `${bounds.x - (side - bounds.width) / 2} ${bounds.y - (side - bounds.height) / 2} ${side} ${side}`;

/** The Fencepost mark in the current theme's ink and blue. Decorative: pair it with the name. */
export function BrandMark({ size }: Readonly<{ size: number }>): React.ReactNode {
  const theme = useTheme();
  const ink = theme.ink.val;
  return (
    <YStack testID="brand-mark" width={size} height={size} aria-hidden>
      <Svg width={size} height={size} viewBox={viewBox}>
        <Rect {...rectProps(BRAND_MARK.topRail)} fill={ink} />
        <Rect {...rectProps(BRAND_MARK.accentRail)} fill={theme.blue.val} />
        <Path d={BRAND_MARK.picket} fill={ink} />
      </Svg>
    </YStack>
  );
}

function rectProps(rail: typeof BRAND_MARK.topRail | typeof BRAND_MARK.accentRail) {
  return { x: rail.x, y: rail.y, width: rail.width, height: rail.height, rx: rail.radius };
}
