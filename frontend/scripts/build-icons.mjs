// Reproduce launcher assets from the existing Confluence mark. No network fetch.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const mark = 'M7 7v9c0 7 5 12 12 12h14M17 7v8c0 3 2 5 5 5h11M7 33h26';
const svg = await readFile(new URL('public/icon.svg', root), 'utf8');
assert.ok(svg.includes(mark), 'Launcher must use the actual Confluence pipe-line mark');
assert.ok((await readFile(new URL('src/AppChrome.tsx', root), 'utf8')).includes(mark), 'App and launcher marks must agree');
const browser = await chromium.launch();
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.goto('data:image/svg+xml,' + encodeURIComponent(svg));
    const pixels = await page.screenshot({ omitBackground: true });
    const output = new URL(`public/icon-${size}.png`, root);
    if (process.argv.includes('--check')) assert.deepEqual(await readFile(output), pixels, `Stale launcher image: ${fileURLToPath(output)}`);
    else await writeFile(output, pixels);
    await page.close();
  }
  console.log('Authentic Confluence SVG and both raster launcher assets verified.');
} finally { await browser.close(); }
