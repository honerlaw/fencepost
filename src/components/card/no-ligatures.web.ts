import type { TextStyle } from 'react-native';

// Browsers honour the CSS property, so the text stays untouched (and copyable) on web.
// Tamagui joins a fontVariant array with commas, which CSS rejects, hence the style.
export function codeText(line: string): string {
  return line;
}

export const noLigatures = { style: { fontVariantLigatures: 'none' } as TextStyle };
