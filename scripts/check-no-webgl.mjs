// Loads the carbon page with Chrome's 3D APIs disabled to prove the still-image fallback path. Run with the preview up.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--disable-3d-apis', '--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4321/lab/carbon-allotropes/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 2000));
  const state = await page.evaluate(() => ({ webgl: document.getElementById('gallery').dataset.webgl, noticeVisible: !document.querySelector('[data-webgl-notice]').hidden, fallbackVisible: getComputedStyle(document.querySelector('.tile-fallback')).display !== 'none', playDisabled: document.querySelector('[data-play]').disabled }));
  console.log('no-webgl state:', JSON.stringify(state));
  console.log('console errors:', errors.length ? errors.join(' | ') : 'none');
  await page.screenshot({ path: 'screenshots/carbon-no-webgl-1024x768.png' });
  // expand a tile with WebGL off: the still should fill the stage
  await page.click('.tile[data-model="c60"] [data-expand]');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: 'screenshots/carbon-no-webgl-expanded-1024x768.png' });
  console.log('saved screenshots/carbon-no-webgl-*.png');
} finally { await browser.close(); }
