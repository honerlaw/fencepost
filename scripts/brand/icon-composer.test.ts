import { describe, expect, it } from 'vitest';

import { iconComposerTargets, srgb } from './icon-composer';

describe('srgb', () => {
  it('writes a hex color the way Icon Composer does', () => {
    expect(srgb('#16211d')).toBe('srgb:0.08627,0.12941,0.11373,1.00000');
    expect(srgb('#ffffff')).toBe('srgb:1.00000,1.00000,1.00000,1.00000');
  });

  it('refuses anything but a six-digit hex color', () => {
    expect(() => srgb('#fff')).toThrow('#fff');
    expect(() => srgb('red')).toThrow('red');
  });
});

describe('the icon bundle', () => {
  it('lists the picket first, so it is drawn in front of the accent rail', () => {
    const json = iconComposerTargets().find((t) => t.file.endsWith('icon.json'));
    const names = /"image-name": "([^"]+)"[\s\S]*"image-name": "([^"]+)"/.exec(json?.content ?? '');
    expect(names?.slice(1)).toEqual(['picket-f.svg', 'accent-rail.svg']);
  });
});
