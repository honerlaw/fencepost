// SVG builders for the Fencepost mark. Every vector the renderer writes and every raster it
// screenshots comes from these, and the shapes themselves come from src/theme/brand-mark.
import { BRAND_MARK } from '@/theme/brand-mark';

export interface Inks {
  readonly ink: string;
  readonly accent: string;
}

type Rail = typeof BRAND_MARK.topRail | typeof BRAND_MARK.accentRail;

/** Fixed decimals keep the output byte-identical between runs. */
function num(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function rail(r: Rail, fill: string): string {
  return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.radius}" fill="${fill}"/>`;
}

/** The three shapes in mark units: both rails, then the picket on top. */
export function markShapes({ ink, accent }: Inks): string {
  const { picket, topRail, accentRail } = BRAND_MARK;
  return rail(topRail, ink) + rail(accentRail, accent) + `<path d="${picket}" fill="${ink}"/>`;
}

/** A square SVG document, `size` units and pixels on a side. */
export function svgDocument(size: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${body}</svg>`;
}

/** Pixels per mark unit when the mark's box is `fraction` of a `size` canvas tall. */
export function markScale(size: number, fraction: number): number {
  return (size * fraction) / BRAND_MARK.bounds.height;
}

/** The mark centered on a `size` canvas with its box scaled to `fraction` of the height. */
export function centeredMark(size: number, fraction: number, inks: Inks): string {
  const { bounds } = BRAND_MARK;
  const scale = markScale(size, fraction);
  const tx = (size - bounds.width * scale) / 2 - bounds.x * scale;
  const ty = (size - bounds.height * scale) / 2 - bounds.y * scale;
  return `<g transform="translate(${num(tx)} ${num(ty)}) scale(${num(scale)})">${markShapes(inks)}</g>`;
}

/** How much of the tile the mark's box takes up; the rest is board. */
export const TILE_FRACTION = 0.56;

/** A solid board with the mark on it: the app icon and the favicon. */
export function tile(size: number, board: string, inks: Inks, cornerRadius: number): string {
  const corner = cornerRadius > 0 ? ` rx="${num(cornerRadius)}"` : '';
  return `<rect width="${size}" height="${size}"${corner} fill="${board}"/>` + centeredMark(size, TILE_FRACTION, inks);
}
