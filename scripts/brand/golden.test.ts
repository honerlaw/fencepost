import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { iconComposerTargets } from './icon-composer';
import { vectorTargets } from './targets';
import { targetText } from './text';

// The committed vectors and the icon bundle are what `npm run brand:render` writes today. A
// change to the mark, the palette or the builders without a re-render fails here, so the
// assets cannot drift from their source. Rasters need Chromium, so they are checked by hand.
describe('the committed vectors and icon bundle match the renderer', () => {
  it.each([...vectorTargets(), ...iconComposerTargets()])('$file', async (target) => {
    const committed = readFileSync(path.join(process.cwd(), target.file), 'utf8');
    expect(committed).toBe(await targetText(target, process.cwd()));
  });
});
