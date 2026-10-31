import { describe, expect, it } from 'vitest';

import { BRAND_MARK } from '@/theme/brand-mark';

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
