// Render index.html to entry.png (1024x1024) at 2x, plus a 300px copy.
// Puppeteer lives in ~/workspace/shot-tools/node_modules, so it is required
// from there explicitly (module resolution follows this file, not the cwd).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', 'shot-tools', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = 'file://' + join(here, 'index.html');
const outPng = join(here, 'entry.png');
const outSmall = join(here, '..', 'slot3-final-small.png');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 2 });
  await page.goto(pageUrl, { waitUntil: 'networkidle0' });
  const shot = await page.screenshot({ type: 'png' }); // 2048x2048

  // Downscale 2048 -> 1024 in a scratch page via canvas.
  const scratch = await browser.newPage();
  const dataUrl = 'data:image/png;base64,' + Buffer.from(shot).toString('base64');
  const final1024 = await scratch.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, 1024, 1024);
    return c.toDataURL('image/png');
  }, dataUrl);
  writeFileSync(outPng, Buffer.from(final1024.split(',')[1], 'base64'));

  const small300 = await scratch.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const c = document.createElement('canvas');
    c.width = 300; c.height = 300;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, 300, 300);
    return c.toDataURL('image/png');
  }, final1024);
  writeFileSync(outSmall, Buffer.from(small300.split(',')[1], 'base64'));
  console.log('wrote', outPng, 'and', outSmall);
} finally {
  await browser.close();
}
