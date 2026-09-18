/**
 * B1.3 pH and buffers. Left: how many hydrogen ions a solution holds relative to neutral water, so each pH
 * step is visibly ten times the last. Right: drops of acid or base into pure water and into the bicarbonate
 * buffer, with both pH traces on one chart and the blood band marked. Below: a strong and a weak acid at the
 * same concentration, and how much of each has come apart.
 */
import { slider, segmented, button, readout, row, note } from '../../lib/ui';
import { LineChart } from '../../lib/sim/chart';

const PKA = 6.1;          // carbonic acid / bicarbonate at body conditions
const DROP = 0.5;         // mmol per drop into one liter
const KA_WEAK = 1.8e-5;   // acetic acid

export function init(root: HTMLElement, controls: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  stage.innerHTML = `<div class="stage-split"><div class="ph-left"><canvas class="sim" aria-label="Hydrogen ions drawn as dots: ten times more for each pH step down"></canvas><p class="stage-note" data-left-note></p></div><div class="ph-right"><canvas class="sim" aria-label="Two beakers: pure water and a bicarbonate buffer, with the current pH of each"></canvas><p class="stage-note" data-right-note></p></div></div>`;
  const left = stage.querySelector<HTMLCanvasElement>('.ph-left canvas')!, right = stage.querySelector<HTMLCanvasElement>('.ph-right canvas')!;
  const leftNote = stage.querySelector<HTMLElement>('[data-left-note]')!, rightNote = stage.querySelector<HTMLElement>('[data-right-note]')!;
  const token = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // ---- left: the log scale ----
  let pH = 7;
  function drawLeft() {
    const g = left.getContext('2d')!, dpr = Math.min(window.devicePixelRatio || 1, 2), w = left.clientWidth, h = left.clientHeight;
    if (!w || !h) return;
    if (left.width !== w * dpr || left.height !== h * dpr) { left.width = w * dpr; left.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const ink = token('--ink'), faint = token('--faint'), line = token('--line-2');
    // beaker
    const bx = w * 0.15, by = h * 0.12, bw = w * 0.7, bh = h * 0.7;
    g.strokeStyle = line; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
    const hPlus = Math.pow(10, 7 - pH); // relative to neutral
    const ohMinus = Math.pow(10, pH - 7);
    const dots = (count: number, color: string, label: string) => {
      const capped = Math.min(count, 1000);
      const cols = Math.ceil(Math.sqrt(capped * (bw / bh))), rows = Math.ceil(capped / cols);
      const cw = bw / Math.max(cols, 1), chh = bh / Math.max(rows, 1), r = Math.max(1.5, Math.min(cw, chh) * 0.32);
      g.fillStyle = color;
      for (let i = 0; i < capped; i++) { const c = i % cols, rr = Math.floor(i / cols); g.beginPath(); g.arc(bx + cw * (c + 0.5), by + bh - chh * (rr + 0.5), r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = faint; g.font = `11px ${token('--font-data')}`; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(count > 1000 ? `${label}: ${count.toExponential(0).replace('e+', ' × 10^')} (1000 drawn)` : `${label}: ${count.toLocaleString()}`, bx, by + bh + 8);
    };
    if (pH <= 7) dots(Math.round(hPlus), '#E0483F', 'H+ relative to neutral'); else dots(Math.round(ohMinus), '#3B6FE0', 'OH- relative to neutral');
    g.fillStyle = ink; g.font = `500 22px ${token('--font-display')}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(`pH ${pH.toFixed(1)}`, bx, 8);
    g.fillStyle = faint; g.font = `11px ${token('--font-data')}`; g.fillText(`[H+] = 10^${(-pH).toFixed(1)} mol/L`, bx + 90, 14);
  }
  leftNote.textContent = 'Each dot is one ion for every one in neutral water. Slide the pH and count.';

  // ---- right: drops into two beakers ----
  let acidMmol = 0, baseMmol = 0;       // pure water
  let hco3 = 24, h2co3 = 1.2;           // buffer, mmol per liter
  let drops = 0;
  const history: Array<'acid' | 'base'> = [];
  let acidType: 'strong' | 'weak' = 'strong';
  const waterTrace: Array<[number, number]> = [[0, 7]], bufferTrace: Array<[number, number]> = [[0, buffPH()]];
  function buffPH() { return h2co3 <= 0 ? 10 : hco3 <= 0 ? 4 : PKA + Math.log10(hco3 / h2co3); }
  function waterPH() {
    const net = (acidMmol - baseMmol) / 1000; // mol per liter
    if (Math.abs(net) < 1e-9) return 7;
    if (net > 0) {
      if (acidType === 'strong') return -Math.log10(net + 1e-7);
      // weak acid: solve Ka = h^2 / (C - h)
      const C = net; const h = (-KA_WEAK + Math.sqrt(KA_WEAK * KA_WEAK + 4 * KA_WEAK * C)) / 2; return -Math.log10(h + 1e-7);
    }
    return 14 + Math.log10(-net + 1e-7);
  }
  function applyDrop(kind: 'acid' | 'base') {
    drops++;
    if (kind === 'acid') { acidMmol += DROP; const moved = Math.min(DROP, hco3); hco3 -= moved; h2co3 += moved; }
    else { baseMmol += DROP; const moved = Math.min(DROP, h2co3); h2co3 -= moved; hco3 += moved; }
    waterTrace.push([drops, waterPH()]); bufferTrace.push([drops, buffPH()]);
  }
  function addDrop(kind: 'acid' | 'base') {
    history.push(kind); applyDrop(kind);
    if (drops > chart.opts.xMax) chart.opts = { ...chart.opts, xMax: chart.opts.xMax + 10 };
    paint();
  }
  function replay() {
    acidMmol = 0; baseMmol = 0; hco3 = 24; h2co3 = 1.2; drops = 0; waterTrace.length = 1; bufferTrace.length = 1; bufferTrace[0] = [0, buffPH()];
    for (const k of history) applyDrop(k);
  }
  function resetDrops() { history.length = 0; replay(); chart.opts = { ...chart.opts, xMax: 10 }; paint(); }

  function drawRight() {
    const g = right.getContext('2d')!, dpr = Math.min(window.devicePixelRatio || 1, 2), w = right.clientWidth, h = right.clientHeight;
    if (!w || !h) return;
    if (right.width !== w * dpr || right.height !== h * dpr) { right.width = w * dpr; right.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const ink = token('--ink'), faint = token('--faint'), line = token('--line-2'), signal = token('--signal'), contra = token('--verdict-contra');
    const beaker = (bx: number, ph: number, title: string, sub: string) => {
      const by = h * 0.16, bw = w * 0.34, bh = h * 0.6;
      g.strokeStyle = line; g.strokeRect(bx, by, bw, bh);
      // liquid tint: neutral gray, acidic warm, basic cool
      const t = Math.max(-1, Math.min(1, (7 - ph) / 7));
      g.fillStyle = t > 0 ? `rgba(224,72,63,${0.08 + 0.35 * t})` : `rgba(59,111,224,${0.08 - 0.35 * t})`;
      g.fillRect(bx + 1, by + bh * 0.25, bw - 2, bh * 0.75 - 1);
      g.fillStyle = ink; g.font = `500 20px ${token('--font-display')}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`pH ${ph.toFixed(2)}`, bx + bw / 2, by + bh * 0.55);
      g.fillStyle = Math.abs(ph - 7.4) <= 0.05 ? signal : ph < 7.35 || ph > 7.45 ? contra : signal;
      g.font = `11px ${token('--font-data')}`; g.textBaseline = 'top'; g.fillText(title.toUpperCase(), bx + bw / 2, by - 30);
      g.fillStyle = faint; g.fillText(sub, bx + bw / 2, by - 16);
    };
    beaker(w * 0.1, waterPH(), 'Pure water', acidType === 'strong' ? 'hydrochloric acid drops' : 'acetic acid drops');
    beaker(w * 0.56, buffPH(), 'Bicarbonate buffer', `HCO3- ${hco3.toFixed(1)} · H2CO3 ${h2co3.toFixed(1)} mmol`);
    g.fillStyle = faint; g.font = `11px ${token('--font-data')}`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(`${drops} drop${drops === 1 ? '' : 's'} · each drop 0.5 mmol into 1 L`, w / 2, h - 6);
  }
  rightNote.hidden = true;

  // ---- dissociation strip ----
  const stripWrap = document.createElement('div'); stripWrap.className = 'chart-wrap';
  const strip = document.createElement('canvas'); strip.className = 'chart strip'; strip.setAttribute('aria-label', 'One hundred acid molecules: how many have released a hydrogen ion');
  stripWrap.append(strip);
  function drawStrip() {
    const g = strip.getContext('2d')!, dpr = Math.min(window.devicePixelRatio || 1, 2), w = strip.clientWidth, h = strip.clientHeight;
    if (!w || !h) return;
    if (strip.width !== w * dpr || strip.height !== h * dpr) { strip.width = w * dpr; strip.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const faint = token('--faint'), ink = token('--ink'), line = token('--line-2');
    const C = 0.1; // mol per liter, the standard comparison
    const rows: Array<{ name: string; frac: number; ph: number }> = [
      { name: 'strong acid (HCl), 0.1 M', frac: 1, ph: 1 },
      { name: 'weak acid (acetic), 0.1 M', frac: (-KA_WEAK + Math.sqrt(KA_WEAK * KA_WEAK + 4 * KA_WEAK * C)) / 2 / C, ph: -Math.log10((-KA_WEAK + Math.sqrt(KA_WEAK * KA_WEAK + 4 * KA_WEAK * C)) / 2) },
    ];
    rows.forEach((r, k) => {
      const y0 = 26 + k * ((h - 30) / 2), cols = 50, cw = (w - 20) / cols, size = Math.min(cw * 0.8, ((h - 30) / 2 - 24) / 2 * 0.8);
      g.fillStyle = ink; g.font = `11px ${token('--font-data')}`; g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillText(`${r.name.toUpperCase()} · ${Math.round(r.frac * 100)} in 100 dissociated · pH ${r.ph.toFixed(1)}`, 10, y0 - 4);
      const n = Math.round(r.frac * 100);
      for (let i = 0; i < 100; i++) {
        const c = i % cols, rr = Math.floor(i / cols);
        const px = 10 + c * cw + cw / 2, py = y0 + rr * (size + 6) + size / 2 + 2;
        if (i < n) { g.fillStyle = '#E0483F'; g.beginPath(); g.arc(px - size * 0.28, py, size * 0.28, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3B6FE0'; g.beginPath(); g.arc(px + size * 0.3, py, size * 0.36, 0, Math.PI * 2); g.fill(); }
        else { g.fillStyle = faint; g.beginPath(); g.arc(px, py, size * 0.42, 0, Math.PI * 2); g.fill(); }
      }
      g.strokeStyle = line; g.beginPath(); g.moveTo(10, y0 + 2 * (size + 6) + 8); g.lineTo(w - 10, y0 + 2 * (size + 6) + 8); g.stroke();
    });
  }

  // ---- chart ----
  const chartWrap = document.createElement('div'); chartWrap.className = 'chart-wrap';
  const chartCanvas = document.createElement('canvas'); chartCanvas.className = 'chart'; chartWrap.append(chartCanvas);
  const chart = new LineChart(chartCanvas, { xLabel: 'drops added', yLabel: 'pH', xMin: 0, xMax: 10, yMin: 0, yMax: 14, xTicks: 5, yTicks: 7, band: { y0: 7.35, y1: 7.45, label: 'blood 7.35 to 7.45' }, yFormat: (v) => String(Math.round(v)) });
  chart.series = [{ name: 'pure water', color: '--verdict-contra', points: waterTrace }, { name: 'buffer', color: '--signal', points: bufferTrace }];

  // ---- controls ----
  const rH = readout('[H+]'), rRel = readout('Compared with neutral water');
  const phCtl = slider({ label: 'pH of the left beaker', min: 0, max: 14, step: 0.5, value: pH, format: (v) => `pH ${v.toFixed(1)}`, onInput: (v) => { pH = v; paint(); } });
  const acidCtl = segmented({ label: 'Acid dropped into pure water', options: [{ value: 'strong', label: 'Strong (HCl)' }, { value: 'weak', label: 'Weak (acetic)' }], value: acidType, onChange: (v) => { acidType = v as 'strong' | 'weak'; replay(); paint(); } });
  const readoutsBox = document.createElement('div'); readoutsBox.className = 'readouts'; readoutsBox.append(rH, rRel);
  controls.append(
    phCtl, readoutsBox,
    row(button('Add a drop of acid', () => addDrop('acid'), true), button('Add a drop of base', () => addDrop('base'), true), button('Reset the beakers', resetDrops), acidCtl),
    chartWrap,
    note('The buffer bends the curve until its bicarbonate runs out, about 48 drops in. Blood has far more, and the lungs and kidneys refill it.'),
    stripWrap,
    note('At the same concentration, the strong acid releases every hydrogen ion it has; the weak acid releases about one in a hundred and keeps the rest in reserve. That reserve is what a buffer uses.'),
  );

  function paint() {
    drawLeft(); drawRight(); drawStrip(); chart.draw();
    const conc = Math.pow(10, -pH);
    rH.set(`${conc.toExponential(1).replace('e', ' × 10^')} mol/L`);
    const rel = Math.pow(10, 7 - pH);
    rRel.set(rel >= 1 ? `${rel >= 1000 ? rel.toExponential(0).replace('e+', ' × 10^') : rel.toLocaleString()} times more H+` : `${(1 / rel) >= 1000 ? (1 / rel).toExponential(0).replace('e+', ' × 10^') : (1 / rel).toLocaleString()} times less H+`);
  }
  new ResizeObserver(() => paint()).observe(stage);
  document.addEventListener('env:change', () => paint());
  paint();
}
