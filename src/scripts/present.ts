/**
 * Presentation mode. Toggle with the P key or any [data-present-toggle] button.
 * Hides .chrome, raises the base font size (CSS), and shows one [data-section] at a time.
 * Arrow keys, page keys, space, swipe, and the HUD buttons move between sections.
 * A visible [data-present-capture] element (the carbon walkthrough, for example) takes over
 * the next/previous steps by receiving a `present:step` event with detail +1 or -1.
 */
const html = document.documentElement;
let active = false;
let index = 0;

const sections = () => Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
const capture = () => document.querySelector<HTMLElement>('[data-present-capture]:not([hidden])');
/** The capture element only takes the keys while the section that contains it is on screen. */
const activeCapture = () => {
  const c = capture();
  if (!c) return null;
  if (!sections().length) return c;
  return c.closest('[data-section].is-active') ? c : null;
};
const counter = document.querySelector<HTMLElement>('[data-present-counter]');

function show(i: number) {
  const list = sections();
  if (!list.length) return;
  index = Math.max(0, Math.min(list.length - 1, i));
  list.forEach((el, k) => el.classList.toggle('is-active', k === index));
  if (counter) counter.textContent = `${index + 1} / ${list.length}`;
  const id = list[index].id;
  if (id) history.replaceState(null, '', `#${id}`);
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event('resize'));
}

export function enter(startId?: string) {
  active = true;
  html.classList.add('presenting');
  const list = sections();
  let start = startId ? list.findIndex((el) => el.id === startId) : -1;
  if (start < 0 && location.hash) start = list.findIndex((el) => `#${el.id}` === location.hash);
  if (start < 0) { const host = capture()?.closest<HTMLElement>('[data-section]'); if (host) start = list.indexOf(host); }
  show(start >= 0 ? start : 0);
  document.querySelectorAll('[data-present-toggle]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
  html.requestFullscreen?.().catch(() => { /* fullscreen is a nicety; the mode works without it */ });
}

export function exit() {
  active = false;
  html.classList.remove('presenting');
  sections().forEach((el) => el.classList.remove('is-active'));
  document.querySelectorAll('[data-present-toggle]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  window.dispatchEvent(new Event('resize'));
}

function step(dir: 1 | -1) {
  const c = activeCapture();
  if (c) { c.dispatchEvent(new CustomEvent('present:step', { detail: dir, bubbles: true })); return; }
  show(index + dir);
}

document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); active ? exit() : enter(); return; }
  if (!active) return;
  if (e.key === 'Escape') { exit(); return; }
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); step(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
});

let sx = 0, sy = 0, st = 0;
document.addEventListener('pointerdown', (e) => { if (!active || e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; st = performance.now(); }, { passive: true });
document.addEventListener('pointerup', (e) => {
  if (!active || e.pointerType === 'mouse') return;
  if ((e.target as HTMLElement).closest('[data-no-swipe]')) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (performance.now() - st < 800 && Math.abs(dx) > 70 && Math.abs(dy) < 60) step(dx < 0 ? 1 : -1);
}, { passive: true });

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-present-toggle],[data-present-section],[data-present-next],[data-present-prev],[data-present-exit]');
  if (!t) return;
  if (t.hasAttribute('data-present-toggle')) active ? exit() : enter();
  else if (t.dataset.presentSection !== undefined) enter(t.dataset.presentSection);
  else if (t.hasAttribute('data-present-next')) step(1);
  else if (t.hasAttribute('data-present-prev')) step(-1);
  else exit();
});

if (new URLSearchParams(location.search).has('present')) enter();
