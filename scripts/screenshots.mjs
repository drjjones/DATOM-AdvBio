// Saves screenshots of the built site at the two target sizes. Run with `npm run preview` up.
// Usage: node scripts/screenshots.mjs  (writes to screenshots/)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const base = (process.env.BASE ?? 'http://localhost:4321') + (process.env.SITE_BASE ?? '').replace(/\/+$/, '');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sizes = { tablet: { width: 1024, height: 768 }, laptop: { width: 1920, height: 1080 } };
const shots = [
  ['home', '/'],
  ['carbon', '/lab/carbon-allotropes/'],
  ['carbon-walkthrough-4', '/lab/carbon-allotropes/#walkthrough-4'],
  ['unit01', '/unit/01/'],
  ['standard-b1-1', '/unit/01/standard/1/'],
  ['standard-b1-2', '/unit/01/standard/2/'],
  ['standard-b1-3', '/unit/01/standard/3/'],
  ['standard-b1-4', '/unit/01/standard/4/'],
  ['standard-b1-5', '/unit/01/standard/5/'],
  ['lab', '/lab/'],
];
mkdirSync('screenshots', { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'] });
try {
  for (const [sizeName, size] of Object.entries(sizes)) {
    const page = await browser.newPage();
    await page.setViewport({ ...size, deviceScaleFactor: 1 });
    for (const [name, path] of shots) {
      await page.goto('about:blank');
      await page.goto(base + path, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 2500)); // let the WebGL scenes draw and cameras settle
      const file = `screenshots/${name}-${sizeName}-${size.width}x${size.height}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
