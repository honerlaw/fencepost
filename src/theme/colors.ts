// Whiteboard (light) and chalkboard (dark) color tokens from the design spec.
// Kept framework-free so SVG drawing code and the Tamagui config share one source.

export const lightColors = {
  board: '#eef1ef',
  dot: '#d2d9d5',
  card: '#ffffff',
  ink: '#17202a',
  muted: '#5b6570',
  rule: '#d4dad7',
  wash: '#e7ecea',
  blue: '#1c56c4',
  blueWash: '#e3eafa',
  red: '#cc3224',
  redWash: '#fbe6e3',
  green: '#157a45',
  greenWash: '#e0f2e7',
  gold: '#c08a12',
  goldInk: '#7d5506',
  goldWash: '#fbf0d2',
} as const;

export type ColorName = keyof typeof lightColors;
export type Palette = Record<ColorName, string>;

export const darkColors: Palette = {
  board: '#16211d',
  dot: '#26352f',
  card: '#1d2b26',
  ink: '#eaf0ec',
  muted: '#9caea6',
  rule: '#33453e',
  wash: '#26362f',
  blue: '#8ab6ff',
  blueWash: '#213248',
  red: '#ff8a7c',
  redWash: '#3e2522',
  green: '#72d9a0',
  greenWash: '#1d3a2b',
  gold: '#e9bb4f',
  goldInk: '#f2cb6c',
  goldWash: '#373020',
};

export const palettes = { light: lightColors as Palette, dark: darkColors } as const;
