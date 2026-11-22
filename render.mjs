// Render index.html to entry.png (1024x1024) at 4x, plus a 300px copy.
// The 4096x4096 capture is downscaled with Pillow's Lanczos filter via
// downscale.py (sharper than the browser-canvas downscale used before).
// Puppeteer lives in ~/workspace/shot-tools/node_modules, so it is required
// from there explicitly (module resolution follows this file, not the cwd).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', 'shot-tools', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = 'file://' + join(here, 'index.html');
const outPng = join(here, 'entry.png');
const outSmall = join(here, '..', 'slot3-final-small.png');
const tmp4x = join(here, '.render-4x.png');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 4 });
  await page.goto(pageUrl, { waitUntil: 'networkidle0' });
  const shot = await page.screenshot({ type: 'png' }); // 4096x4096
  writeFileSync(tmp4x, shot);
} finally {
  await browser.close();
}

try {
  execFileSync('python3', [join(here, 'downscale.py'), tmp4x, outPng, outSmall], { stdio: 'inherit' });
} finally {
  unlinkSync(tmp4x);
}
console.log('wrote', outPng, 'and', outSmall);
