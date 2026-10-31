// Writes every brand asset from the palette (src/theme/colors) and the mark (src/theme/brand-mark):
//
//   npm run brand:render        (from the repo root; needs Playwright's Chromium, as e2e does)
//
// Rasters are Chromium screenshots of the SVGs at 1x, with no text, so a second run on the same
// machine and Playwright version rewrites identical bytes. Other machines can differ by a few
// pixels, so review the image diff and commit; nothing in CI regenerates these.
import { chromium, type Browser } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';

import { iconComposerTargets } from './icon-composer';
import { rasterTargets, vectorTargets, type Target } from './targets';

const ROOT = process.cwd();

function write(file: string, data: string | Buffer): void {
  const target = path.join(ROOT, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, data);
  console.log(`wrote ${file}`);
}

async function rasterize(browser: Browser, { size, content }: Target): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${content}</body></html>`,
  );
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: true,
    type: 'png',
  });
  await page.close();
  return png;
}

/** JSON goes through the repo's Prettier config, so `prettier --check` and a re-render agree. */
async function text({ file, content }: Target): Promise<string> {
  if (!file.endsWith('.json')) return content;
  const options = (await resolveConfig(path.join(ROOT, file))) ?? {};
  return format(content, { ...options, parser: 'json' });
}

async function main(): Promise<void> {
  for (const target of [...vectorTargets(), ...iconComposerTargets()]) write(target.file, await text(target));
  const browser = await chromium.launch();
  try {
    for (const target of rasterTargets()) write(target.file, await rasterize(browser, target));
  } finally {
    await browser.close();
  }
}

// tsx runs this as CommonJS, so there is no top-level await.
function start(): void {
  main().catch((error: unknown) => {
    console.error(`brand:render: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

start();
