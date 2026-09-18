/** A small line chart on a canvas: hairline axes, mono ticks, colors read from the design tokens at draw time
 *  so it follows the paper or dark environment. */
export interface Series { name: string; color: string; points: Array<[number, number]> }
export interface ChartOptions { xLabel: string; yLabel: string; xMin: number; xMax: number; yMin: number; yMax: number; band?: { y0: number; y1: number; label: string }; xTicks?: number; yTicks?: number; xFormat?: (v: number) => string; yFormat?: (v: number) => string }

export class LineChart {
  private ctx: CanvasRenderingContext2D;
  series: Series[] = [];
  constructor(private canvas: HTMLCanvasElement, public opts: ChartOptions) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.draw()).observe(canvas);
    document.addEventListener('env:change', () => this.draw());
  }
  private token(name: string) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  draw() {
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const g = this.ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const o = this.opts;
    const padL = 52, padR = 12, padT = 10, padB = 34;
    const x = (v: number) => padL + ((v - o.xMin) / (o.xMax - o.xMin)) * (W - padL - padR);
    const y = (v: number) => H - padB - ((v - o.yMin) / (o.yMax - o.yMin)) * (H - padT - padB);
    const line = this.token('--line-2') || '#9FB0C4', faint = this.token('--faint') || '#526880', ink = this.token('--ink') || '#13253A';
    const mono = `11px ${this.token('--font-data') || 'monospace'}`;
    if (o.band) {
      g.fillStyle = this.token('--nest') || '#E7ECF1'; g.fillRect(padL, y(o.band.y1), W - padL - padR, y(o.band.y0) - y(o.band.y1));
      g.fillStyle = faint; g.font = mono; g.textAlign = 'right'; g.fillText(o.band.label, W - padR - 4, y(o.band.y1) - 4);
    }
    g.strokeStyle = line; g.lineWidth = 1;
    g.beginPath(); g.moveTo(padL, padT); g.lineTo(padL, H - padB); g.lineTo(W - padR, H - padB); g.stroke();
    g.fillStyle = faint; g.font = mono;
    const xt = o.xTicks ?? 5, yt = o.yTicks ?? 4;
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let i = 0; i <= xt; i++) { const v = o.xMin + ((o.xMax - o.xMin) * i) / xt; g.fillText((o.xFormat ?? ((n) => String(Math.round(n * 10) / 10)))(v), x(v), H - padB + 6); g.fillRect(x(v), H - padB, 1, 4); }
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let i = 0; i <= yt; i++) { const v = o.yMin + ((o.yMax - o.yMin) * i) / yt; g.fillText((o.yFormat ?? ((n) => String(Math.round(n * 10) / 10)))(v), padL - 8, y(v)); g.fillRect(padL - 4, y(v), 4, 1); }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = faint;
    g.fillText(o.xLabel.toUpperCase(), padL + (W - padL - padR) / 2, H - 4);
    g.save(); g.translate(12, padT + (H - padT - padB) / 2); g.rotate(-Math.PI / 2); g.fillText(o.yLabel.toUpperCase(), 0, 0); g.restore();
    for (const s of this.series) {
      if (!s.points.length) continue;
      g.strokeStyle = s.color.startsWith('--') ? this.token(s.color) : s.color; g.lineWidth = 2; g.lineJoin = 'round';
      g.beginPath();
      s.points.forEach(([px, py], i) => { const X = x(px), Y = Math.max(padT, Math.min(H - padB, y(py))); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); });
      g.stroke();
      const last = s.points[s.points.length - 1];
      g.fillStyle = g.strokeStyle; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = mono;
      g.fillText(s.name, Math.min(x(last[0]) + 6, W - padR - 60), Math.max(padT + 6, Math.min(H - padB - 6, y(last[1]))));
    }
    g.fillStyle = ink;
  }
}
