// Drives a unit page: answers a question, enters presentation mode, steps through a section's parts,
// toggles the environment. Prints what it found. Run with the preview up: node scripts/check-unit.mjs [/unit/01/]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const route = process.argv[2] ?? '/unit/01/';
const base = (process.env.BASE ?? 'http://localhost:4321') + (process.env.SITE_BASE ?? '').replace(/\/+$/, '');
mkdirSync('screenshots', { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(base + route, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 2500));
  const out = {};
  // question: click the correct option of the first question, then a wrong option of the second
  out.cfu = await page.evaluate(() => {
    const qs = Array.from(document.querySelectorAll('.cfu-q'));
    const q0 = qs[0]; const right = Number(q0.dataset.answer); q0.querySelectorAll('.choice')[right].click();
    const q1 = qs[1]; const wrongIdx = (Number(q1.dataset.answer) + 1) % q1.querySelectorAll('.choice').length; q1.querySelectorAll('.choice')[wrongIdx].click();
    return { questions: qs.length, q0state: q0.querySelector('[data-feedback]').dataset.state, q0text: q0.querySelector('[data-feedback]').textContent.slice(0, 60), q1state: q1.querySelector('[data-feedback]').dataset.state, q0done: q0.dataset.done, stored: localStorage.getItem('ab:cfu') };
  });
  // presentation mode: P, then step into the first standard section and reveal its parts
  await page.keyboard.press('p');
  await new Promise((r) => setTimeout(r, 400));
  const visibleParts = () => page.evaluate(() => { const s = document.querySelector('[data-section].is-active'); return { id: s?.id, parts: Array.from(s?.querySelectorAll('[data-part]') ?? []).filter((p) => !p.classList.contains('is-unrevealed')).map((p) => p.dataset.part), counter: document.querySelector('[data-present-counter]')?.textContent }; });
  out.present0 = await visibleParts();
  await page.keyboard.press('ArrowRight'); await new Promise((r) => setTimeout(r, 300));
  out.present1 = await visibleParts();
  await page.screenshot({ path: 'screenshots/unit01-present-hook-1920x1080.png' });
  await page.keyboard.press('ArrowRight'); await new Promise((r) => setTimeout(r, 300));
  out.present2 = await visibleParts();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await new Promise((r) => setTimeout(r, 300));
  out.present5 = await visibleParts();
  await page.keyboard.press('ArrowRight'); await new Promise((r) => setTimeout(r, 300));
  out.present6 = await visibleParts(); // should have moved to the next section with only the hook shown
  await page.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 300));
  out.exited = await page.evaluate(() => !document.documentElement.classList.contains('presenting'));
  // environment toggle
  await page.click('[data-env-toggle]'); await new Promise((r) => setTimeout(r, 300));
  out.env = await page.evaluate(() => ({ dark: document.documentElement.hasAttribute('data-env'), stored: localStorage.getItem('ab:env') }));
  await page.screenshot({ path: 'screenshots/unit01-paper-1920x1080.png' });
  await page.click('[data-env-toggle]');
  console.log(JSON.stringify(out, null, 1));
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
} finally { await browser.close(); }
