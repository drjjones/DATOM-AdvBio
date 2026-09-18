import { MultiViewer } from '../../lib/mol/viewer';
import { webglNotice } from '../../lib/ui';
import * as b11 from './b11-bonding';
import * as b12 from './b12-water';
import * as b13 from './b13-ph';
import * as b14 from './b14-carbon';
import * as b15 from './b15-macro';

type Init = (root: HTMLElement, controls: HTMLElement, viewer: MultiViewer | null) => void;
const inits: Record<string, Init> = { 'b11-bonding': b11.init, 'b12-water': b12.init, 'b13-ph': b13.init, 'b14-carbon': b14.init, 'b15-macro': b15.init };
const needs3D = new Set(['b11-bonding', 'b14-carbon', 'b15-macro']);

const models = Array.from(document.querySelectorAll<HTMLElement>('[data-model]'));
const canvas = document.getElementById('gl') as HTMLCanvasElement | null;
let viewer: MultiViewer | null = null;
if (canvas && models.some((m) => needs3D.has(m.dataset.model!))) {
  try { viewer = new MultiViewer(canvas); }
  catch (err) { console.error('WebGL is unavailable in this browser; the 3D models are replaced by a notice.', err); }
}
for (const m of models) {
  const id = m.dataset.model!;
  const controls = document.querySelector<HTMLElement>(`[data-controls-for="${id}"]`) ?? document.createElement('div');
  const init = inits[id];
  if (init) init(m, controls, viewer);
  else if (needs3D.has(id) && !viewer) m.querySelector('[data-stage]')?.append(webglNotice());
}

// The models mount after the browser's own fragment scroll and push the page down, so land on the
// deep-linked section again once everything is in place. Presentation mode manages its own position.
if (location.hash && !document.documentElement.classList.contains('presenting') && !new URLSearchParams(location.search).has('present')) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'auto' }));
}
