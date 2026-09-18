// Renders a static image of each carbon model for browsers without WebGL (and for first paint).
// Opens the built page in fallback-render mode (?render=<model>), which pauses rotation, hides the
// chrome, makes the page transparent, and expands one model; then screenshots that tile's view.
// Run with `npm run preview` up:  node scripts/render-fallbacks.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const base = (process.env.BASE ?? 'http://localhost:4321') + (process.env.SITE_BASE ?? '').replace(/\/+$/, '');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const models = ['diamond', 'graphite', 'graphene', 'c60', 'nanotube', 'amorphous'];
mkdirSync('public/lab/carbon', { recursive: true });

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 1 });
  for (const id of models) {
    await page.goto('about:blank');
    await page.goto(`${base}/lab/carbon-allotropes/?render=${id}`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 2500));
    const view = await page.$(`.tile[data-model="${id}"] .tile-view`);
    if (!view) throw new Error(`no tile view for ${id}`);
    const file = `public/lab/carbon/${id}.webp`;
    await view.screenshot({ path: file, type: 'webp', quality: 88, omitBackground: true });
    console.log(file);
  }
} finally {
  await browser.close();
}
