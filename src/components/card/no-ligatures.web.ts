import type { TextStyle } from 'react-native';

// Tamagui joins a fontVariant array with commas on web, which CSS rejects, so set the
// ligature property directly.
export const noLigatures = { style: { fontVariantLigatures: 'none' } as TextStyle };
