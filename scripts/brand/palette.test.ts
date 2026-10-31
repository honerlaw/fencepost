import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { darkColors, lightColors } from '@/theme/colors';

const HEX = /#[0-9a-f]{6}\b/gi;
const palette = new Set([...Object.values(lightColors), ...Object.values(darkColors)]);

function read(file: string): string {
  return readFileSync(path.join(process.cwd(), file), 'utf8');
}

type Row = readonly [token: string, light: string, dark: string];

/** The rows of the README palette table: token, light, dark. */
function readmeTable(): Row[] {
  const section = read('README.md')
    .split('\n## ')
    .find((s) => s.startsWith('Theme and brand'));
  const rows: Row[] = [];
  for (const line of section?.split('\n') ?? []) {
    const [, token, light, dark] = /^\| `(\w+)` \| `(#[0-9a-f]{6})` \| `(#[0-9a-f]{6})` \|/.exec(line) ?? [];
    if (token != null && light != null && dark != null) rows.push([token, light, dark]);
  }
  return rows;
}

describe('the palette is the one source of brand colors', () => {
  it('app.json uses only palette colors', () => {
    const found = read('app.json').match(HEX) ?? [];
    expect(found.length).toBeGreaterThan(0);
    for (const hex of found) expect(palette).toContain(hex.toLowerCase());
  });

  it('the README palette table lists every token with its light and dark value', () => {
    const dark = new Map(Object.entries(darkColors));
    const expected: Row[] = Object.entries(lightColors).map(([token, light]) => [token, light, dark.get(token) ?? '']);
    expect(readmeTable()).toEqual(expected);
  });
});
