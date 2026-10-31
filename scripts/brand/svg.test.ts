import { describe, expect, it } from 'vitest';

import { BRAND_MARK } from '@/theme/brand-mark';

import { srgb } from './icon-composer';
import { markScale } from './svg';
import { FOREGROUND_FRACTION } from './targets';

describe('the Android foreground layer', () => {
  it('keeps every corner of the mark inside the 66% safe zone', () => {
    const { width, height } = BRAND_MARK.bounds;
    const cornerRadius = Math.hypot(width / 2, height / 2) * markScale(512, FOREGROUND_FRACTION);
    const safeRadius = (512 * (66 / 108)) / 2;
    expect(cornerRadius).toBeLessThan(safeRadius);
  });
});

describe('srgb', () => {
  it('writes a hex color the way Icon Composer does', () => {
    expect(srgb('#16211d')).toBe('srgb:0.08627,0.12941,0.11373,1.00000');
    expect(srgb('#ffffff')).toBe('srgb:1.00000,1.00000,1.00000,1.00000');
  });
});
