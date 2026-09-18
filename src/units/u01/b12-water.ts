/**
 * B1.2 Hydrogen bond simulation. Sixty-odd water molecules in two dimensions: each is a dipole that repels at
 * short range and forms a transient hydrogen bond with a neighbor at the right distance. Temperature sets the
 * thermal kicks, so bonds break faster as it rises. Six modes show six emergent properties. The timeline
 * records every step so any moment can be scrubbed back to.
 */
import { slider, segmented, readout, row, note, playPause, reduceMotion } from '../../lib/ui';
import { Timeline, scrubber } from '../../lib/sim/timeline';
import { LineChart } from '../../lib/sim/chart';

type Mode = 'cohesion' | 'adhesion' | 'heat' | 'evap' | 'solvent' | 'ice';
const MODES: Array<{ value: Mode; label: string; note: string }> = [
  { value: 'cohesion', label: 'Cohesion', note: 'Molecules at the surface have fewer neighbors to bond with, so the surface pulls inward and resists breaking. Surface molecules are outlined.' },
  { value: 'adhesion', label: 'Adhesion', note: 'The tube walls are polar. Water bonds to them and to itself, so it climbs. Narrow the tube and the column rises higher.' },
  { value: 'heat', label: 'Specific heat', note: 'The heater adds energy at a steady rate. Water warms slowly because the energy first breaks hydrogen bonds. The gray line is a liquid without them.' },
  { value: 'evap', label: 'Evaporative cooling', note: 'The top is open. The fastest molecules escape and take their energy with them, so the temperature of what remains falls.' },
  { value: 'solvent', label: 'Solvent', note: 'A salt crystal sits in the water. Water dipoles surround each ion, negative ends to the positive ion and positive ends to the negative one, and pull the crystal apart. Nonpolar blobs are pushed together instead.' },
  { value: 'ice', label: 'Ice', note: 'Below zero, each molecule locks to four neighbors at a fixed distance in an open lattice. The same molecules take more room, so ice is less dense than the liquid and floats.' },
];

const N = 84;
const W = 60, H = 32; // simulation units; one unit is roughly an ångström
const R_REP = 2.7, R_BOND = 3.6, R_ATTR = 4.6, D0 = 3.1;

interface Ion { x: number; y: number; vx: number; vy: number; q: number; nonpolar?: boolean }
interface Snapshot { x: Float32Array; y: Float32Array; th: Float32Array; alive: Uint8Array; ions: Ion[]; T: number; bonds: Array<[number, number]>; time: number; readouts: string[] }

export function init(root: HTMLElement, controls: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  stage.innerHTML = `<canvas class="sim" aria-label="Two-dimensional simulation of water molecules forming and breaking hydrogen bonds"></canvas><p class="stage-note top" data-note></p>`;
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const noteEl = stage.querySelector<HTMLElement>('[data-note]')!;

  // state
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), th = new Float32Array(N), om = new Float32Array(N), alive = new Uint8Array(N).fill(1);
  let ions: Ion[] = [];
  let mode: Mode = 'cohesion';
  let T = 20;          // degrees C, set by the slider
  let Tmeasured = 20;  // in evaporation mode, the temperature of what remains
  let heaterT = 20;    // in heat mode, rises over time
  let tubeWidth = 8;
  let time = 0;
  let playing = !reduceMotion();
  let evaporated = 0;
  let liquidDensity = 0;
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const tl = new Timeline<Snapshot>(900);
  let bondsNow: Array<[number, number]> = [];

  function reset() {
    alive.fill(1); evaporated = 0; time = 0; tl.clear(); heaterT = T; Tmeasured = T; heatSeries.length = 0; refSeries.length = 0; evapSeries.length = 0;
    // pooled liquid: a block in the lower half, with jitter
    const cols = 17, rows = Math.ceil(N / cols);
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      x[i] = (W - cols * 3.1) / 2 + c * 3.1 + 1.5 + (rnd() - 0.5) * 0.6;
      y[i] = 3 + r * 3.0 + (rnd() - 0.5) * 0.6 + (rows > 0 ? 0 : 0);
      vx[i] = 0; vy[i] = 0; th[i] = rnd() * Math.PI * 2; om[i] = 0;
    }
    ions = [];
    if (mode === 'solvent') {
      const cx = W / 2, cy = 16;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ions.push({ x: cx + (i - 1) * 2.9, y: cy + (j - 0.5) * 2.9, vx: 0, vy: 0, q: (i + j) % 2 === 0 ? 1 : -1 });
      // push water out of the crystal's footprint
      for (let i = 0; i < N; i++) if (Math.abs(x[i] - cx) < 5 && Math.abs(y[i] - cy) < 4) y[i] += 8;
    }
    if (mode === 'ice') T = Math.min(T, -5);
    liquidDensity = 0;
  }

  // ---- physics ----
  function kick(i: number, scale: number) {
    vx[i] += gauss() * scale; vy[i] += gauss() * scale; om[i] += gauss() * scale * 0.6;
  }
  function step(dt: number) {
    const Tnow = mode === 'heat' ? heaterT : mode === 'evap' ? Tmeasured : T;
    const kT = Math.max(0, Tnow + 273) / 293;
    const bondStrength = Math.max(0.05, 1.15 - Tnow / 110); // bonds weaken as the liquid warms
    const fx = new Float32Array(N), fy = new Float32Array(N), tq = new Float32Array(N);
    bondsNow = [];
    const bondCount = new Uint8Array(N);
    const frozen = mode === 'ice' && Tnow < 0;
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      for (let j = i + 1; j < N; j++) {
        if (!alive[j]) continue;
        const dx = x[j] - x[i], dy = y[j] - y[i];
        const d2 = dx * dx + dy * dy;
        if (d2 > R_ATTR * R_ATTR) continue;
        const d = Math.sqrt(d2) || 1e-6;
        let f = 0;
        if (d < R_REP) f = -(R_REP - d) * 6;                         // repulsion
        else if (d < R_ATTR) f = (d - D0) * 0.9 * bondStrength;      // hydrogen bond spring toward D0
        if (d < R_BOND && (!frozen || bondCount[i] < 4)) { bondsNow.push([i, j]); bondCount[i]++; bondCount[j]++; }
        const ux = dx / d, uy = dy / d;
        fx[i] += f * ux; fy[i] += f * uy; fx[j] -= f * ux; fy[j] -= f * uy;
        // orientation: an H of i points at O of j when bonded
        if (d < R_BOND) {
          const target = Math.atan2(dy, dx);
          tq[i] += Math.sin(target - th[i]) * 0.4 * bondStrength;
          tq[j] += Math.sin(target + Math.PI - th[j]) * 0.4 * bondStrength;
        }
      }
      // ions and nonpolar blobs
      for (const ion of ions) {
        const dx = ion.x - x[i], dy = ion.y - y[i];
        const d = Math.hypot(dx, dy) || 1e-6;
        if (d > 7) continue;
        const ux = dx / d, uy = dy / d;
        if (ion.nonpolar) { if (d < 3.4) { fx[i] -= (3.4 - d) * 6 * ux; fy[i] -= (3.4 - d) * 6 * uy; } continue; }
        let f = d < 2.6 ? -(2.6 - d) * 6 : (d - 3.0) * 1.4; // hydration: strong attraction to a shell at 3.0
        fx[i] += f * ux; fy[i] += f * uy; ion.vx -= f * ux * 0.3; ion.vy -= f * uy * 0.3;
        // dipole turns: O (angle th + pi) toward a positive ion, H side toward a negative ion
        const target = Math.atan2(dy, dx) + (ion.q > 0 ? Math.PI : 0);
        tq[i] += Math.sin(target - th[i]) * 1.2;
      }
    }
    // ion to ion: the crystal holds itself, and water competes with that
    for (let a = 0; a < ions.length; a++) for (let b = a + 1; b < ions.length; b++) {
      const A = ions[a], B = ions[b]; const dx = B.x - A.x, dy = B.y - A.y; const d = Math.hypot(dx, dy) || 1e-6;
      if (A.nonpolar || B.nonpolar) { if (!A.nonpolar || !B.nonpolar) continue; const f = d < 3.2 ? -(3.2 - d) * 6 : d < 8 ? (d - 3.4) * 0.6 : 0; A.vx += f * dx / d * 0.4; A.vy += f * dy / d * 0.4; B.vx -= f * dx / d * 0.4; B.vy -= f * dy / d * 0.4; continue; }
      const f = d < 2.6 ? -(2.6 - d) * 8 : A.q * B.q < 0 && d < 5 ? (d - 2.9) * 1.1 : d < 6 ? -0.3 : 0;
      A.vx += f * dx / d * 0.5; A.vy += f * dy / d * 0.5; B.vx -= f * dx / d * 0.5; B.vy -= f * dy / d * 0.5;
    }
    // integrate
    const noise = 0.09 * Math.sqrt(kT);
    const g = 0.18;
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      if (frozen) {
        // pull toward the nearest open-lattice site
        const site = latticeSite(i);
        fx[i] += (site[0] - x[i]) * 1.6; fy[i] += (site[1] - y[i]) * 1.6;
      } else fy[i] -= g;
      if (mode === 'adhesion') {
        const inTube = Math.abs(x[i] - W / 2) < tubeWidth / 2 + 0.8;
        if (inTube) { fy[i] += g + 1.9 / tubeWidth; const side = x[i] < W / 2 ? W / 2 - tubeWidth / 2 : W / 2 + tubeWidth / 2; fx[i] += (side - x[i]) * 0.05; }
        // tube walls are solid
        const left = W / 2 - tubeWidth / 2, right = W / 2 + tubeWidth / 2;
        if (y[i] > 6) { if (x[i] < left && x[i] > left - 2.2) fx[i] -= (x[i] - (left - 2.2)) * 6; if (x[i] > right && x[i] < right + 2.2) fx[i] += ((right + 2.2) - x[i]) * 6; }
      }
      vx[i] = (vx[i] + fx[i] * dt) * 0.96; vy[i] = (vy[i] + fy[i] * dt) * 0.96;
      kick(i, noise * (frozen ? 0.25 : 1));
      om[i] = (om[i] + tq[i] * dt) * 0.9;
      x[i] += vx[i] * dt * 8; y[i] += vy[i] * dt * 8; th[i] += om[i] * dt * 8;
      // box
      if (x[i] < 1.2) { x[i] = 1.2; vx[i] = Math.abs(vx[i]) * 0.5; }
      if (x[i] > W - 1.2) { x[i] = W - 1.2; vx[i] = -Math.abs(vx[i]) * 0.5; }
      if (y[i] < 1.2) { y[i] = 1.2; vy[i] = Math.abs(vy[i]) * 0.5; }
      if (y[i] > H - 1.2) {
        if (mode === 'evap' && Math.hypot(vx[i], vy[i]) > 0.55) { alive[i] = 0; evaporated++; continue; }
        y[i] = H - 1.2; vy[i] = -Math.abs(vy[i]) * 0.5;
      }
    }
    for (const ion of ions) { ion.vx *= 0.9; ion.vy *= 0.9; ion.vy -= g * 0.3 * dt; ion.x += ion.vx * dt * 8; ion.y += ion.vy * dt * 8; ion.x = Math.min(W - 1.5, Math.max(1.5, ion.x)); ion.y = Math.min(H - 1.5, Math.max(1.5, ion.y)); }
    // mode bookkeeping
    if (mode === 'heat') { heaterT = Math.min(100, heaterT + 4.5 * dt); const t = time; heatSeries.push([t, heaterT]); refSeries.push([t, Math.min(140, T + (heaterT - T) * 1.85)]); }
    if (mode === 'evap') {
      // temperature of what remains, from the mean kinetic energy of the survivors
      let ke = 0, n = 0; for (let i = 0; i < N; i++) if (alive[i]) { ke += vx[i] * vx[i] + vy[i] * vy[i]; n++; }
      const meanKe = n ? ke / n : 0;
      const Tke = meanKe / 0.0162 * 293 - 273; // calibrated so 20 C corresponds to the steady state at 20 C
      Tmeasured = Tmeasured + (Math.max(-10, Math.min(120, Tke)) - Tmeasured) * 0.03;
      evapSeries.push([time, Tmeasured]);
    }
    time += dt;
  }
  function latticeSite(i: number): [number, number] {
    // open hexagonal lattice, honeycomb with spacing a; each molecule has three in-plane neighbors (the fourth is out of plane)
    const a = 3.05; const cols = 12;
    const c = i % cols, r = Math.floor(i / cols);
    const xx = W / 2 - (cols * a * 0.87) / 2 + c * a * 0.87 + (r % 2 ? a * 0.43 : 0) + 1;
    const yy = 4 + r * a * 0.78 + ((c % 2) ? a * 0.15 : 0);
    return [xx, yy];
  }

  // ---- rendering ----
  const token = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function draw(s?: Snapshot) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) { canvas.width = cw * dpr; canvas.height = ch * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
    const scale = Math.min(cw / W, ch / H); const ox = (cw - W * scale) / 2, oy = (ch - H * scale) / 2;
    const X = (v: number) => ox + v * scale, Y = (v: number) => oy + (H - v) * scale;
    const px = s ? s.x : x, py = s ? s.y : y, pth = s ? s.th : th, pal = s ? s.alive : alive, pions = s ? s.ions : ions, pb = s ? s.bonds : bondsNow;
    const line = token('--line-2'), ink = token('--ink'), faint = token('--faint'), nest = token('--nest'), signal = token('--signal'), amber = token('--verdict-mixed');
    // box and fixtures
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(X(0), Y(H), W * scale, H * scale);
    if (mode === 'adhesion') {
      const left = W / 2 - tubeWidth / 2, right = W / 2 + tubeWidth / 2;
      ctx.fillStyle = nest; ctx.fillRect(X(left - 2.2), Y(H), 2.2 * scale, (H - 6) * scale); ctx.fillRect(X(right), Y(H), 2.2 * scale, (H - 6) * scale);
      ctx.strokeStyle = signal; ctx.strokeRect(X(left - 2.2), Y(H), 2.2 * scale, (H - 6) * scale); ctx.strokeRect(X(right), Y(H), 2.2 * scale, (H - 6) * scale);
    }
    if (mode === 'heat') { ctx.fillStyle = amber; ctx.fillRect(X(W * 0.25), Y(0) - 3, W * 0.5 * scale, 3); }
    if (mode === 'evap') { ctx.setLineDash([4, 4]); ctx.strokeStyle = faint; ctx.beginPath(); ctx.moveTo(X(0), Y(H)); ctx.lineTo(X(W), Y(H)); ctx.stroke(); ctx.setLineDash([]); }
    // bonds
    ctx.strokeStyle = amber; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    for (const [i, j] of pb) { ctx.beginPath(); ctx.moveTo(X(px[i]), Y(py[i])); ctx.lineTo(X(px[j]), Y(py[j])); ctx.stroke(); }
    ctx.setLineDash([]);
    // surface molecules (cohesion): those with few neighbors
    const surface = new Uint8Array(N);
    if (mode === 'cohesion') { const count = new Uint8Array(N); for (const [i, j] of pb) { count[i]++; count[j]++; } for (let i = 0; i < N; i++) surface[i] = count[i] <= 2 ? 1 : 0; }
    // molecules
    for (let i = 0; i < N; i++) {
      if (!pal[i]) continue;
      const cx = X(px[i]), cy = Y(py[i]), r = 0.95 * scale;
      for (const off of [-0.91, 0.91]) { // H at +-52 degrees, 0.96 units from O
        const a = pth[i] + off; const hx = cx + Math.cos(a) * 0.96 * scale, hy = cy - Math.sin(a) * 0.96 * scale;
        ctx.fillStyle = '#E0483F'; ctx.beginPath(); ctx.arc(hx, hy, 0.5 * scale, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#3B6FE0'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      if (surface[i]) { ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const ion of pions) {
      const cx = X(ion.x), cy = Y(ion.y);
      if (ion.nonpolar) { ctx.fillStyle = faint; ctx.beginPath(); ctx.arc(cx, cy, 1.7 * scale, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.fillStyle = ion.q > 0 ? '#9B6BE0' : '#3F9A4B'; ctx.beginPath(); ctx.arc(cx, cy, 1.25 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = token('--paper'); ctx.font = `${Math.max(9, 0.9 * scale)}px ${token('--font-data')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ion.q > 0 ? 'Na+' : 'Cl-', cx, cy);
    }
    // evaporated tally
    if (mode === 'evap') { ctx.fillStyle = faint; ctx.font = `11px ${token('--font-data')}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(`${s ? s.readouts[2] ?? '' : `${evaporated} escaped`}`, X(W) - 6, Y(H) + 6); }
  }

  // ---- readouts and chart ----
  const rT = readout('Temperature'), rBonds = readout('Hydrogen bonds per molecule'), rMode = readout('');
  const heatSeries: Array<[number, number]> = [], refSeries: Array<[number, number]> = [], evapSeries: Array<[number, number]> = [];
  const chartWrap = document.createElement('div'); chartWrap.className = 'chart-wrap'; chartWrap.hidden = true;
  const chartCanvas = document.createElement('canvas'); chartCanvas.className = 'chart'; chartWrap.append(chartCanvas);
  const chart = new LineChart(chartCanvas, { xLabel: 'time, s', yLabel: 'temperature, °C', xMin: 0, xMax: 30, yMin: 0, yMax: 120, xTicks: 6, yTicks: 4 });

  function readouts(): string[] {
    const Tnow = mode === 'heat' ? heaterT : mode === 'evap' ? Tmeasured : T;
    let n = 0; for (let i = 0; i < N; i++) if (alive[i]) n++;
    const perMol = n ? (2 * bondsNow.length) / n : 0;
    let third = '';
    if (mode === 'cohesion') {
      const count = new Uint8Array(N); for (const [i, j] of bondsNow) { count[i]++; count[j]++; }
      let sB = 0, sN = 0, iB = 0, iN = 0; for (let i = 0; i < N; i++) if (alive[i]) { if (count[i] <= 2) { sB += count[i]; sN++; } else { iB += count[i]; iN++; } }
      third = `surface ${sN ? (sB / sN).toFixed(1) : '0'} · interior ${iN ? (iB / iN).toFixed(1) : '0'}`;
    } else if (mode === 'adhesion') {
      let top = 0; for (let i = 0; i < N; i++) if (alive[i] && Math.abs(x[i] - W / 2) < tubeWidth / 2) top = Math.max(top, y[i]);
      third = `column height ${top.toFixed(1)} units in a ${tubeWidth} unit tube`;
    } else if (mode === 'heat') third = `heater on for ${time.toFixed(0)} s`;
    else if (mode === 'evap') third = `${evaporated} escaped`;
    else if (mode === 'solvent') {
      let apart = 0; for (let a = 0; a < ions.length; a++) { let near = false; for (let b = 0; b < ions.length; b++) if (a !== b && !ions[b].nonpolar && Math.hypot(ions[a].x - ions[b].x, ions[a].y - ions[b].y) < 3.4) near = true; if (!near) apart++; }
      third = ions.some((i) => i.nonpolar) ? `nonpolar blobs pushed together` : `${apart} of ${ions.length} ions free of the crystal`;
    } else if (mode === 'ice') {
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; for (let i = 0; i < N; i++) if (alive[i]) { minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]); minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]); }
      const dens = N / Math.max(1, (maxX - minX + 3) * (maxY - minY + 3));
      if (!liquidDensity) liquidDensity = dens;
      third = T < 0 ? `density ${(dens / liquidDensity).toFixed(2)} of the liquid (real ice: 0.92)` : 'liquid: lower the temperature below 0';
    }
    return [`${Tnow.toFixed(0)} °C`, perMol.toFixed(2), third];
  }
  function paintReadouts(vals: string[]) {
    rT.set(vals[0]); rBonds.set(vals[1]); rMode.set(vals[2]);
    const label = rMode.querySelector('.sl-label')!;
    label.textContent = mode === 'cohesion' ? 'Bonds, surface vs interior' : mode === 'adhesion' ? 'Capillary rise' : mode === 'heat' ? 'Heater' : mode === 'evap' ? 'Escaped' : mode === 'solvent' ? 'Dissolving' : 'Density';
  }

  // ---- controls ----
  const modeCtl = segmented({ label: 'Property', options: MODES.map((m) => ({ value: m.value, label: m.label })), value: mode, onChange: (v) => { mode = v as Mode; if (mode === 'ice' && T >= 0) tempCtl.set(T = -5); applyMode(); reset(); } });
  const tempCtl = slider({ label: 'Temperature', min: -20, max: 120, step: 1, value: T, format: (v) => `${v} °C`, onInput: (v) => { T = v; if (mode === 'heat') heaterT = v; if (mode === 'evap') Tmeasured = v; } });
  const tubeCtl = slider({ label: 'Tube width', min: 4, max: 14, step: 1, value: tubeWidth, format: (v) => `${v} units`, onInput: (v) => { tubeWidth = v; } });
  const solventCtl = segmented({ label: 'Add', options: [{ value: 'salt', label: 'Salt crystal' }, { value: 'oil', label: 'Nonpolar blobs' }], value: 'salt', onChange: (v) => { reset(); if (v === 'oil') { ions = [0, 1, 2].map((k) => ({ x: W / 2 + (k - 1) * 9, y: 26 + (k % 2) * 4, vx: 0, vy: 0, q: 0, nonpolar: true })); } } });
  const play = playPause({ playing, onChange: (p) => { playing = p; } });
  const scrub = scrubber(tl, { onScrub: (s) => { draw(s); paintReadouts(s.readouts); }, onLive: () => { draw(); paintReadouts(readouts()); }, seconds: (i) => `${tl.at(i).time.toFixed(1)} s` });
  const noteEl2 = note('');
  const readoutsBox = document.createElement('div'); readoutsBox.className = 'readouts'; readoutsBox.append(rT, rBonds, rMode);
  controls.append(modeCtl, row(tempCtl, tubeCtl, solventCtl), row(play, scrub), readoutsBox, chartWrap, noteEl2);

  function applyMode() {
    const m = MODES.find((m) => m.value === mode)!;
    noteEl.textContent = 'Blue: partial negative oxygen. Red: partial positive hydrogen. Dashed: hydrogen bond.';
    noteEl2.textContent = m.note;
    tubeCtl.hidden = mode !== 'adhesion';
    solventCtl.hidden = mode !== 'solvent';
    chartWrap.hidden = !(mode === 'heat' || mode === 'evap');
    if (mode === 'heat') { chart.opts = { ...chart.opts, yMin: 0, yMax: 140 }; chart.series = [{ name: 'water', color: '--signal', points: heatSeries }, { name: 'no hydrogen bonds', color: '--faint', points: refSeries }]; }
    if (mode === 'evap') { chart.opts = { ...chart.opts, yMin: -10, yMax: 60 }; chart.series = [{ name: 'remaining water', color: '--signal', points: evapSeries }]; }
  }
  applyMode(); reset();

  // ---- loop ----
  let frame = 0, last = performance.now();
  function loop(now: number) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!playing || tl.scrub !== null) return;
    if (root.offsetParent === null) return;
    for (let k = 0; k < 2; k++) step(dt * 0.5);
    frame++;
    if (frame % 3 === 0) {
      const vals = readouts();
      tl.push({ x: x.slice(), y: y.slice(), th: th.slice(), alive: alive.slice(), ions: ions.map((i) => ({ ...i })), T, bonds: bondsNow.slice(), time, readouts: vals });
      scrub.sync();
      paintReadouts(vals);
      if (!chartWrap.hidden) { if (time > chart.opts.xMax) chart.opts = { ...chart.opts, xMax: chart.opts.xMax * 2 }; chart.draw(); }
    }
    draw();
  }
  requestAnimationFrame(loop);
  document.addEventListener('env:change', () => draw());
  draw();
}
