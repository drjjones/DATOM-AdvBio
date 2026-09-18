/** Control builders in the document vocabulary. Every target is at least 44px; every control has a visible label. */
let uid = 0;
const id = () => `ctl-${++uid}`;

export function slider(o: { label: string; min: number; max: number; step: number; value: number; format?: (v: number) => string; onInput: (v: number) => void }) {
  const wrap = document.createElement('div'); wrap.className = 'ctl ctl-slider';
  const lab = document.createElement('label'); lab.className = 'k'; const i = id(); lab.htmlFor = i; lab.textContent = o.label;
  const out = document.createElement('output'); out.className = 'ctl-value'; out.htmlFor = i;
  const input = document.createElement('input'); input.type = 'range'; input.id = i; input.min = String(o.min); input.max = String(o.max); input.step = String(o.step); input.value = String(o.value);
  const fmt = o.format ?? ((v: number) => String(v));
  out.textContent = fmt(o.value);
  input.addEventListener('input', () => { const v = Number(input.value); out.textContent = fmt(v); o.onInput(v); });
  const head = document.createElement('div'); head.className = 'ctl-head'; head.append(lab, out);
  wrap.append(head, input);
  return Object.assign(wrap, { set(v: number) { input.value = String(v); out.textContent = fmt(v); } });
}

export function segmented(o: { label: string; options: Array<{ value: string; label: string }>; value: string; onChange: (v: string) => void }) {
  const wrap = document.createElement('div'); wrap.className = 'ctl ctl-seg';
  const lab = document.createElement('span'); lab.className = 'k'; lab.textContent = o.label;
  const group = document.createElement('div'); group.className = 'seg'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', o.label);
  const buttons = o.options.map((opt) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec'; b.textContent = opt.label; b.dataset.value = opt.value;
    b.setAttribute('aria-pressed', String(opt.value === o.value));
    b.addEventListener('click', () => { buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); o.onChange(opt.value); });
    return b;
  });
  group.append(...buttons);
  wrap.append(lab, group);
  return Object.assign(wrap, { set(v: string) { buttons.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.value === v))); } });
}

export function toggle(o: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec'; b.textContent = o.label; b.setAttribute('aria-pressed', String(o.on));
  b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); o.onChange(on); });
  return Object.assign(b, { set(on: boolean) { b.setAttribute('aria-pressed', String(on)); } });
}

export function button(label: string, onClick: () => void, primary = false) {
  const b = document.createElement('button'); b.type = 'button'; b.className = primary ? 'btn' : 'btn sec'; b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

export function readout(label: string) {
  const line = document.createElement('div'); line.className = 'spec-line';
  const l = document.createElement('span'); l.className = 'sl-label'; l.textContent = label;
  const fill = document.createElement('span'); fill.className = 'sl-fill';
  const v = document.createElement('span'); v.className = 'sl-value'; v.textContent = '';
  line.append(l, fill, v);
  return Object.assign(line, { set(text: string) { v.textContent = text; } });
}

export function row(...children: HTMLElement[]) {
  const r = document.createElement('div'); r.className = 'ctl-row'; r.append(...children); return r;
}

export function note(text: string) {
  const p = document.createElement('p'); p.className = 'note ctl-note'; p.textContent = text; return p;
}

/** Play/pause with a label; honors reduced motion by starting paused when asked. */
export function playPause(o: { playing: boolean; onChange: (playing: boolean) => void }) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec';
  const paint = (p: boolean) => { b.setAttribute('aria-pressed', String(p)); b.textContent = p ? 'Pause' : 'Play'; };
  paint(o.playing);
  b.addEventListener('click', () => { const p = b.getAttribute('aria-pressed') !== 'true'; paint(p); o.onChange(p); });
  return Object.assign(b, { set: paint });
}

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Shown inside a 3D stage when the browser refuses a WebGL context. */
export function webglNotice() {
  const p = document.createElement('p'); p.className = 'notice stage-notice';
  p.textContent = 'Three-dimensional graphics are turned off in this browser (Lockdown Mode or a disabled graphics processor does this). The controls, readouts, and questions still work.';
  return p;
}
