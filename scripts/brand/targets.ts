// What the renderer writes, and from which palette tokens.
import { darkColors, lightColors } from '@/theme/colors';

import { centeredMark, svgDocument, tile, type Inks } from './svg';

export interface Target {
  /** Relative to the repo root. */
  readonly file: string;
  /** Pixels on a side for a raster; the viewBox for a vector or an icon-bundle layer. */
  readonly size: number;
  /** An SVG document, or JSON for `.json` files. */
  readonly content: string;
}

/** Chalk on the chalkboard: the icon, the favicon and the dark splash. */
export const CHALK: Inks = { ink: darkColors.ink, accent: darkColors.blue };
/** Marker on the whiteboard: the light splash and the in-app mark in light mode. */
export const MARKER: Inks = { ink: lightColors.ink, accent: lightColors.blue };
/** Android's themed-icon layer is a single white shape that the launcher tints. */
const MONO: Inks = { ink: '#ffffff', accent: '#ffffff' };

/**
 * Android masks the adaptive icon's center 66 dp of 108; a launcher may use a circle. The
 * mark's box is 440 by 568 units, so its corners sit 359 units from its center. Scaled so
 * that circle is 60% of the layer, every corner stays inside the mask. The test checks this.
 */
export const FOREGROUND_FRACTION = 0.47;

const SPLASH_FRACTION = 0.8;

/** The app icon: the mark on the chalkboard, as both a raster and a vector. */
const ICON_TILE = svgDocument(1024, tile(1024, darkColors.board, CHALK, 0));

/** Rasters, in the order they are written. */
export function rasterTargets(): readonly Target[] {
  const board = darkColors.board;
  return [
    { file: 'assets/images/icon.png', size: 1024, content: ICON_TILE },
    { file: 'assets/images/favicon.png', size: 96, content: svgDocument(96, tile(96, board, CHALK, 96 * 0.2)) },
    {
      file: 'assets/images/android-icon-foreground.png',
      size: 512,
      content: svgDocument(512, centeredMark(512, FOREGROUND_FRACTION, CHALK)),
    },
    {
      file: 'assets/images/android-icon-monochrome.png',
      size: 512,
      content: svgDocument(512, centeredMark(512, FOREGROUND_FRACTION, MONO)),
    },
    {
      file: 'assets/images/splash-icon.png',
      size: 512,
      content: svgDocument(512, centeredMark(512, SPLASH_FRACTION, MARKER)),
    },
    {
      file: 'assets/images/splash-icon-dark.png',
      size: 512,
      content: svgDocument(512, centeredMark(512, SPLASH_FRACTION, CHALK)),
    },
  ];
}

/** Vectors, for designers and the README; they are outputs, not masters. */
export function vectorTargets(): readonly Target[] {
  return [
    {
      file: 'assets/brand/mark-light.svg',
      size: 1024,
      content: svgDocument(1024, centeredMark(1024, SPLASH_FRACTION, MARKER)),
    },
    {
      file: 'assets/brand/mark-dark.svg',
      size: 1024,
      content: svgDocument(1024, centeredMark(1024, SPLASH_FRACTION, CHALK)),
    },
    { file: 'assets/brand/icon.svg', size: 1024, content: ICON_TILE },
  ];
}
