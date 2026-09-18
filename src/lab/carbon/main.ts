import { MultiViewer, type Tile } from '../../lib/mol/viewer';
import { diamond, graphite, graphene, c60, nanotube, amorphous, type Structure } from './structures';
import { Walkthrough, STEPS } from './walkthrough';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gallery = document.getElementById('gallery')!;
const tileEls = Array.from(gallery.querySelectorAll<HTMLElement>('.tile'));
const notice = document.querySelector<HTMLElement>('[data-webgl-notice]');
const params = new URLSearchParams(location.search);
const renderId = params.get('render'); // fallback-render mode, used by scripts/render-fallbacks.mjs
if (renderId) document.documentElement.classList.add('render-mode');

const structures: Record<string, Structure> = {
  diamond: diamond(), graphite: graphite(), graphene: graphene(), c60: c60(), nanotube: nanotube(10, 0, 4), amorphous: amorphous(),
};

// Every tile carries a still image first. The live renderer replaces it the moment a WebGL
// context exists; if the browser refuses one, the stills stay and the page says why.
let viewer: MultiViewer | null = null;
try {
  viewer = new MultiViewer(canvas);
  gallery.dataset.webgl = 'on';
} catch (err) {
  gallery.dataset.webgl = 'off';
  if (notice) notice.hidden = false;
  console.error('WebGL is unavailable in this browser; the carbon models are shown as still images.', err);
}

const tiles = new Map<string, Tile>();
for (const el of tileEls) {
  const id = el.dataset.model!;
  const s = structures[id];
  if (viewer) tiles.set(id, viewer.addTile(el, s, id === 'nanotube' ? 0.6 : 0.35));
  const facts = el.querySelector<HTMLElement>('[data-facts]');
  if (facts) facts.replaceChildren(...s.facts.map((f) => { const li = document.createElement('li'); li.textContent = f; return li; }));
  const count = el.querySelector<HTMLElement>('[data-count]');
  if (count) count.textContent = `${s.positions.length / 3} atoms · ${s.bonds.length} bonds`;
}

// Play and pause. Reduced-motion users start paused; the button still lets them play.
const playBtn = document.querySelector<HTMLButtonElement>('[data-play]')!;
function paintPlay() {
  const playing = !!viewer?.playing;
  playBtn.setAttribute('aria-pressed', String(playing));
  playBtn.querySelector<HTMLElement>('[data-label]')!.textContent = playing ? 'Pause rotation' : 'Play rotation';
  playBtn.querySelector<SVGElement>('[data-icon="pause"]')!.hidden = !playing;
  playBtn.querySelector<SVGElement>('[data-icon="play"]')!.hidden = playing;
}
playBtn.disabled = !viewer;
playBtn.addEventListener('click', () => { if (!viewer) return; viewer.setPlaying(!viewer.playing); paintPlay(); });
paintPlay();

// Expand one model to a full-width stage, or return to the grid.
function focusTile(id: string | null) {
  gallery.classList.toggle('is-focused', !!id);
  for (const el of tileEls) el.classList.toggle('is-focus', el.dataset.model === id);
  viewer?.focus(id ? tiles.get(id) ?? null : null);
  if (renderId) return;
  if (id && !/^#walkthrough/.test(location.hash)) history.replaceState(null, '', `#model-${id}`);
  if (!id && /^#model-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
}
gallery.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const expand = target.closest<HTMLElement>('[data-expand]');
  if (expand) { focusTile(expand.closest<HTMLElement>('.tile')!.dataset.model!); return; }
  if (target.closest('[data-close]')) { walkthrough.stop(); focusTile(null); return; }
  const zoom = target.closest<HTMLElement>('[data-zoom]');
  if (zoom && viewer) {
    const tile = tiles.get(zoom.closest<HTMLElement>('.tile')!.dataset.model!);
    if (tile) viewer.zoom(tile, zoom.dataset.zoom === 'in' ? 0.8 : 1.25);
  }
});

const walkthrough = new Walkthrough(document.getElementById('walkthrough')!, {
  onStep: (step) => focusTile(step.id),
  onStop: () => focusTile(null),
});
document.querySelector('[data-start-walkthrough]')!.addEventListener('click', () => {
  walkthrough.start(0);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.documentElement.classList.contains('presenting')) gallery.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
});

if (renderId && structures[renderId]) {
  viewer?.setPlaying(false);
  paintPlay();
  focusTile(renderId);
} else {
  // Deep links: #walkthrough-3 opens step three; #model-c60 expands one model.
  const wt = /^#walkthrough-(\d)$/.exec(location.hash);
  const model = /^#model-([a-z0-9]+)$/.exec(location.hash);
  if (wt && Number(wt[1]) >= 1 && Number(wt[1]) <= STEPS.length) { walkthrough.start(Number(wt[1]) - 1); requestAnimationFrame(() => gallery.scrollIntoView({ block: 'start' })); }
  else if (model && structures[model[1]]) focusTile(model[1]);
}

// Arrow keys step the walkthrough outside presentation mode; inside it, present.ts forwards the keys.
document.addEventListener('keydown', (e) => {
  if (!walkthrough.active || document.documentElement.classList.contains('presenting')) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); walkthrough.next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); walkthrough.prev(); }
  else if (e.key === 'Escape') walkthrough.stop();
});
