import { MultiViewer, type Tile } from './viewer';
import { diamond, graphite, graphene, c60, nanotube, amorphous, type Structure } from './structures';
import { Walkthrough, STEPS } from './walkthrough';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gallery = document.getElementById('gallery')!;
const tileEls = Array.from(gallery.querySelectorAll<HTMLElement>('.tile'));
const structures: Record<string, Structure> = {
  diamond: diamond(), graphite: graphite(), graphene: graphene(), c60: c60(), nanotube: nanotube(10, 0, 4), amorphous: amorphous(),
};

const viewer = new MultiViewer(canvas);
const tiles = new Map<string, Tile>();
for (const el of tileEls) {
  const id = el.dataset.model!;
  const s = structures[id];
  tiles.set(id, viewer.addTile(el, s, id === 'nanotube' ? 0.6 : 0.35));
  const facts = el.querySelector<HTMLElement>('[data-facts]');
  if (facts) facts.replaceChildren(...s.facts.map((f) => { const li = document.createElement('li'); li.textContent = f; return li; }));
  const count = el.querySelector<HTMLElement>('[data-count]');
  if (count) count.textContent = `${s.positions.length / 3} atoms, ${s.bonds.length} bonds`;
}

// Play and pause. Reduced-motion users start paused; the button still lets them play.
const playBtn = document.querySelector<HTMLButtonElement>('[data-play]')!;
function paintPlay() {
  playBtn.setAttribute('aria-pressed', String(viewer.playing));
  playBtn.querySelector<HTMLElement>('[data-label]')!.textContent = viewer.playing ? 'Pause rotation' : 'Play rotation';
  playBtn.querySelector<SVGElement>('[data-icon="pause"]')!.hidden = !viewer.playing;
  playBtn.querySelector<SVGElement>('[data-icon="play"]')!.hidden = viewer.playing;
}
playBtn.addEventListener('click', () => { viewer.setPlaying(!viewer.playing); paintPlay(); });
paintPlay();

// Expand one model to a full-width stage, or return to the grid.
function focusTile(id: string | null) {
  gallery.classList.toggle('is-focused', !!id);
  for (const el of tileEls) el.classList.toggle('is-focus', el.dataset.model === id);
  viewer.focus(id ? tiles.get(id)! : null);
  if (id && !/^#walkthrough/.test(location.hash)) history.replaceState(null, '', `#model-${id}`);
  if (!id && /^#model-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
}
gallery.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const expand = target.closest<HTMLElement>('[data-expand]');
  if (expand) { focusTile(expand.closest<HTMLElement>('.tile')!.dataset.model!); return; }
  if (target.closest('[data-close]')) { walkthrough.stop(); focusTile(null); return; }
  const zoom = target.closest<HTMLElement>('[data-zoom]');
  if (zoom) { const tile = tiles.get(zoom.closest<HTMLElement>('.tile')!.dataset.model!)!; viewer.zoom(tile, zoom.dataset.zoom === 'in' ? 0.8 : 1.25); }
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

// Deep links: #walkthrough-3 opens step three; #model-c60 expands one model.
const wt = /^#walkthrough-(\d)$/.exec(location.hash);
const model = /^#model-([a-z0-9]+)$/.exec(location.hash);
if (wt && Number(wt[1]) >= 1 && Number(wt[1]) <= STEPS.length) { walkthrough.start(Number(wt[1]) - 1); requestAnimationFrame(() => gallery.scrollIntoView({ block: 'start' })); }
else if (model && tiles.has(model[1])) focusTile(model[1]);

// Arrow keys step the walkthrough outside presentation mode; inside it, present.ts forwards the keys.
document.addEventListener('keydown', (e) => {
  if (!walkthrough.active || document.documentElement.classList.contains('presenting')) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); walkthrough.next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); walkthrough.prev(); }
  else if (e.key === 'Escape') walkthrough.stop();
});
