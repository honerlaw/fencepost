import { defaultConfig } from '@tamagui/config/v5';
import { createFont, createTamagui } from 'tamagui';

import { darkColors, lightColors } from './src/theme/colors';

// Font families are the names registered by @expo-google-fonts/* via expo-font.
// On native each weight is its own family, so `face` maps weights to families.
const sizes = { 1: 11, 2: 12, 3: 13, 4: 14, 5: 16, 6: 18, 7: 20, 8: 24, 9: 30, 10: 40 };
const lineHeights = { 1: 15, 2: 16, 3: 18, 4: 20, 5: 23, 6: 25, 7: 27, 8: 30, 9: 36, 10: 46 };

const displayFont = createFont({
  family: 'BricolageGrotesque_800ExtraBold',
  size: sizes,
  lineHeight: lineHeights,
  weight: { 4: '700', 5: '800' },
  face: {
    700: { normal: 'BricolageGrotesque_700Bold' },
    800: { normal: 'BricolageGrotesque_800ExtraBold' },
  },
});

const bodyFont = createFont({
  family: 'AtkinsonHyperlegible_400Regular',
  size: sizes,
  lineHeight: lineHeights,
  weight: { 4: '400', 5: '700' },
  face: {
    400: { normal: 'AtkinsonHyperlegible_400Regular' },
    700: { normal: 'AtkinsonHyperlegible_700Bold' },
  },
});

const monoFont = createFont({
  family: 'JetBrainsMono_400Regular',
  size: { ...sizes, 3: 12.5 },
  lineHeight: lineHeights,
  weight: { 4: '400', 5: '700' },
  face: {
    400: { normal: 'JetBrainsMono_400Regular' },
    700: { normal: 'JetBrainsMono_700Bold' },
  },
});

const markerFont = createFont({
  family: 'Kalam_700Bold',
  size: sizes,
  lineHeight: lineHeights,
  weight: { 4: '700' },
  face: { 700: { normal: 'Kalam_700Bold' } },
});

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  fonts: {
    ...defaultConfig.fonts,
    heading: displayFont,
    body: bodyFont,
    display: displayFont,
    mono: monoFont,
    marker: markerFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      ...lightColors,
      background: lightColors.board,
      color: lightColors.ink,
      borderColor: lightColors.rule,
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...darkColors,
      background: darkColors.board,
      color: darkColors.ink,
      borderColor: darkColors.rule,
    },
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation: Tamagui reads its config type from this interface.
  interface TamaguiCustomConfig extends Conf {}
}
