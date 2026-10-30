/**
 * JetBrains Mono draws `<=` as `≤` and `==` as one long bar (contextual alternates), but
 * puzzles need the literal characters. The new-architecture iOS text renderer ignores
 * the ligature fontVariant values, so on native an invisible word joiner (U+2060) goes
 * between neighbouring symbols, which stops the font from merging them. Accessibility
 * labels use the original text.
 */
const SYMBOL_PAIR = /([<>=!&|+\-*/:.~^%#?@$\\])(?=[<>=!&|+\-*/:.~^%#?@$\\])/g;

export function codeText(line: string): string {
  return line.replace(SYMBOL_PAIR, '$1⁠');
}

export const noLigatures = {};
