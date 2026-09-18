/** Ring buffer of snapshots plus a scrubber. A simulation pushes one snapshot per recorded step; the scrubber
 *  pauses the simulation and replays any recorded moment. "Live" returns to the running state. */
export class Timeline<T> {
  private buf: T[] = [];
  private head = 0;
  scrub: number | null = null;
  constructor(public capacity: number) {}
  push(s: T) { if (this.buf.length < this.capacity) this.buf.push(s); else { this.buf[this.head] = s; this.head = (this.head + 1) % this.capacity; } }
  get length() { return this.buf.length; }
  at(i: number): T { return this.buf[(this.head + i) % this.buf.length]; }
  latest(): T | undefined { return this.buf.length ? this.at(this.buf.length - 1) : undefined; }
  clear() { this.buf = []; this.head = 0; this.scrub = null; }
}

export function scrubber<T>(tl: Timeline<T>, o: { label?: string; onScrub: (snapshot: T, index: number) => void; onLive: () => void; seconds?: (index: number) => string }) {
  const wrap = document.createElement('div'); wrap.className = 'ctl ctl-slider ctl-timeline';
  const head = document.createElement('div'); head.className = 'ctl-head';
  const lab = document.createElement('label'); lab.className = 'k'; lab.textContent = o.label ?? 'Timeline';
  const out = document.createElement('output'); out.className = 'ctl-value'; out.textContent = 'live';
  const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '0'; input.step = '1'; input.value = '0'; lab.htmlFor = input.id = `tl-${Math.random().toString(36).slice(2, 7)}`;
  const live = document.createElement('button'); live.type = 'button'; live.className = 'btn sec'; live.textContent = 'Live'; live.hidden = true;
  head.append(lab, out);
  wrap.append(head, input, live);
  input.addEventListener('input', () => {
    if (!tl.length) return;
    const i = Math.min(tl.length - 1, Number(input.value));
    tl.scrub = i; live.hidden = false;
    out.textContent = o.seconds ? o.seconds(i) : `${i + 1} / ${tl.length}`;
    o.onScrub(tl.at(i), i);
  });
  live.addEventListener('click', () => { tl.scrub = null; live.hidden = true; out.textContent = 'live'; o.onLive(); });
  return Object.assign(wrap, {
    /** Call once per recorded step while live so the slider tracks the buffer. */
    sync() { if (tl.scrub === null) { input.max = String(Math.max(0, tl.length - 1)); input.value = input.max; } },
  });
}
