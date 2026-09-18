/**
 * B1.5 Macromolecules: four families, one 3D stage. Carbohydrate: a glucose ring, with alpha and beta chain
 * shapes beside it. Lipid: a saturated or a cis-unsaturated fatty acid, three chains side by side to show
 * packing. Protein: an ideal alpha helix that unfolds on a slider. Nucleic acid: ten base pairs of B-DNA
 * built from the fiber parameters, with tappable bases.
 */
import { ELEMENTS } from '../../lib/mol/elements';
import { build, coordinates, type ZAtom, type ZMolecule } from '../../lib/mol/zmatrix';
import { arrow, type MultiViewer, type Structure, type Tile } from '../../lib/mol/viewer';
import { segmented, slider, toggle, readout, row, note, webglNotice } from '../../lib/ui';

type Family = 'carb' | 'lipid' | 'protein' | 'dna';

// ---------- carbohydrate ----------
function glucose(): Structure {
  // chair ring: C1 C2 C3 C4 C5 O5, hydroxyls and the CH2OH on C5; hydrogens on carbon omitted for clarity
  const atoms: ZAtom[] = [
    { el: 'C', tag: 'C1' }, { el: 'C', to: 0, bond: 1.52, tag: 'C2' }, { el: 'C', to: 1, angleTo: 0, bond: 1.52, angle: 110, tag: 'C3' },
    { el: 'C', to: 2, angleTo: 1, dihedralTo: 0, bond: 1.52, angle: 110, dihedral: 55, tag: 'C4' },
    { el: 'C', to: 3, angleTo: 2, dihedralTo: 1, bond: 1.52, angle: 110, dihedral: -55, tag: 'C5' },
    { el: 'O', to: 4, angleTo: 3, dihedralTo: 2, bond: 1.43, angle: 110, dihedral: 55, tag: 'ring oxygen' },
    { el: 'O', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.42, angle: 109, dihedral: 175, tag: 'hydroxyl on C1, the linkage point' },
    { el: 'O', to: 1, angleTo: 0, dihedralTo: 5, bond: 1.42, angle: 109, dihedral: -65, tag: 'hydroxyl' },
    { el: 'O', to: 2, angleTo: 1, dihedralTo: 0, bond: 1.42, angle: 109, dihedral: -65, tag: 'hydroxyl' },
    { el: 'O', to: 3, angleTo: 2, dihedralTo: 1, bond: 1.42, angle: 109, dihedral: 65, tag: 'hydroxyl on C4, the other linkage point' },
    { el: 'C', to: 4, angleTo: 3, dihedralTo: 2, bond: 1.52, angle: 110, dihedral: -65, tag: 'C6' },
    { el: 'O', to: 10, angleTo: 4, dihedralTo: 3, bond: 1.42, angle: 109, dihedral: 180, tag: 'hydroxyl on C6' },
  ];
  [6, 7, 8, 9, 11].forEach((o) => atoms.push({ el: 'H', to: o, angleTo: atoms[o].to!, dihedralTo: atoms[o].angleTo!, bond: 0.96, angle: 108, dihedral: 180 }));
  const s = build({ atoms, extraBonds: [[5, 0]] }, { id: 'glucose', radiusScale: 1.25, tilt: [0.5, 0.4, 0], labelFor: (i, el) => `${ELEMENTS[el].name}${atoms[i].tag ? ', ' + atoms[i].tag : ''}` });
  s.radius += 0.8;
  return s;
}
function chainSvg(beta: boolean) {
  // six glucose units: alpha keeps every unit facing the same way (the chain curves); beta flips every other unit (the chain runs straight)
  const hex = (cx: number, cy: number, flip: boolean, r = 22) => { const pts = []; for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k + (flip ? Math.PI / 6 + Math.PI : Math.PI / 6); pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); } return `<polygon points="${pts.join(' ')}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`; };
  let out = `<svg class="fig" viewBox="0 0 640 220" role="img" aria-label="${beta ? 'Beta linkages: alternating units make a straight chain; two chains hydrogen bond into a sheet' : 'Alpha linkages: units face the same way and the chain curves into a coil'}">`;
  if (!beta) {
    const centers: Array<[number, number]> = [];
    for (let i = 0; i < 7; i++) { const a = -0.66 + i * 0.22; centers.push([320 + 300 * Math.sin(a), 400 - 300 * Math.cos(a)]); }
    centers.forEach(([cx, cy], i) => {
      out += hex(cx, cy, false);
      if (i < 6) { const [nx, ny] = centers[i + 1]; const dx = nx - cx, dy = ny - cy, L = Math.hypot(dx, dy); out += `<line x1="${(cx + (dx / L) * 22).toFixed(1)}" y1="${(cy + (dy / L) * 22).toFixed(1)}" x2="${(nx - (dx / L) * 22).toFixed(1)}" y2="${(ny - (dy / L) * 22).toFixed(1)}" stroke="#E0483F" stroke-width="2.5"/>`; }
    });
    out += `<text x="320" y="192" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">ALPHA 1,4 LINKAGE · UNITS FACE THE SAME WAY</text><text x="320" y="210" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">THE CHAIN COILS: STARCH, GLYCOGEN</text>`;
  } else {
    for (const y of [70, 140]) for (let i = 0; i < 7; i++) { const cx = 80 + i * 80; out += hex(cx, y, i % 2 === 1); if (i < 6) out += `<line x1="${cx + 20}" y1="${y}" x2="${cx + 60}" y2="${y}" stroke="#E0483F" stroke-width="2"/>`; }
    for (let i = 0; i < 7; i++) { const cx = 80 + i * 80; out += `<line x1="${cx}" y1="92" x2="${cx}" y2="118" stroke="#F5A524" stroke-width="1.5" stroke-dasharray="3 3"/>`; }
    out += `<text x="320" y="192" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">BETA 1,4 LINKAGE · EVERY OTHER UNIT FLIPPED</text><text x="320" y="210" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">STRAIGHT CHAINS HYDROGEN BOND INTO SHEETS: CELLULOSE</text>`;
  }
  return out + '</svg>';
}

// ---------- lipid ----------
function fattyAcid(nC: number, cisAt?: number): ZMolecule {
  const atoms: ZAtom[] = [];
  const c: number[] = [];
  for (let i = 0; i < nC; i++) {
    const sp2 = cisAt !== undefined && (i === cisAt - 1 || i === cisAt);
    const afterDouble = cisAt !== undefined && i === cisAt;
    if (i === 0) atoms.push({ el: 'C', tag: 'carboxyl carbon' });
    else if (i === 1) atoms.push({ el: 'C', to: 0, bond: 1.52 });
    else if (i === 2) atoms.push({ el: 'C', to: c[1], angleTo: c[0], bond: 1.53, angle: 112 });
    else atoms.push({ el: 'C', to: c[i - 1], angleTo: c[i - 2], dihedralTo: c[i - 3], bond: afterDouble ? 1.34 : 1.53, angle: sp2 ? 122 : 112, dihedral: cisAt !== undefined && i === cisAt + 1 ? 0 : 180, tag: sp2 ? 'double bond carbon' : undefined });
    c.push(atoms.length - 1);
  }
  // carboxyl head on C0
  atoms.push({ el: 'O', to: c[0], angleTo: c[1], dihedralTo: c[2], bond: 1.21, angle: 123, dihedral: 0, tag: 'carboxyl oxygen' });
  atoms.push({ el: 'O', to: c[0], angleTo: c[1], dihedralTo: c[2], bond: 1.31, angle: 114, dihedral: 180, tag: 'carboxyl oxygen, negative at pH 7' });
  // hydrogens
  for (let i = 1; i < nC; i++) {
    const sp2 = cisAt !== undefined && (i === cisAt - 1 || i === cisAt);
    const count = i === nC - 1 ? 3 : sp2 ? 1 : 2;
    const dih = count === 3 ? [60, 180, 300] : count === 2 ? [120, 240] : [180];
    for (const d of dih) atoms.push({ el: 'H', to: c[i], angleTo: c[i - 1], dihedralTo: i >= 2 ? c[i - 2] : c[i + 1], bond: 1.09, angle: sp2 ? 118 : 109.5, dihedral: d });
  }
  return { atoms };
}
function threeChains(mol: ZMolecule, id: string, gap: number): Structure {
  const one = build(mol, { id, radiusScale: 1.15, tilt: [0.2, 0.15, 0], labelFor: (i, el) => `${ELEMENTS[el].name}${mol.atoms[i].tag ? ', ' + mol.atoms[i].tag : ''}` });
  // align the chain along y: rotate so the first and last carbon span the y axis
  const n = one.positions.length / 3;
  const pts = Array.from({ length: n }, (_, i) => [one.positions[3 * i], one.positions[3 * i + 1], one.positions[3 * i + 2]]);
  let lastC = 0; mol.atoms.forEach((z, i) => { if (z.el === 'C') lastC = i; });
  const a = pts[0], b = pts[lastC];
  const axis = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(...axis); const u = axis.map((v) => v / L);
  const yv = [0, 1, 0]; const vAx = [u[1] * yv[2] - u[2] * yv[1], u[2] * yv[0] - u[0] * yv[2], u[0] * yv[1] - u[1] * yv[0]]; const s = Math.hypot(...vAx); const cth = u[1];
  const rot = (p: number[]) => { if (s < 1e-6) return p; const k = vAx.map((v) => v / s); const th = Math.atan2(s, cth); const c = Math.cos(th), si = Math.sin(th); const dot = k[0] * p[0] + k[1] * p[1] + k[2] * p[2]; const cr = [k[1] * p[2] - k[2] * p[1], k[2] * p[0] - k[0] * p[2], k[0] * p[1] - k[1] * p[0]]; return [p[0] * c + cr[0] * si + k[0] * dot * (1 - c), p[1] * c + cr[1] * si + k[1] * dot * (1 - c), p[2] * c + cr[2] * si + k[2] * dot * (1 - c)]; };
  const rotated = pts.map(rot);
  const positions = new Float32Array(n * 3 * 3); const colors: string[] = [], radii: number[] = [], labels: string[] = []; const bonds: Array<[number, number]> = [];
  for (let k = 0; k < 3; k++) {
    rotated.forEach((p, i) => { positions[3 * (k * n + i)] = p[0] + (k - 1) * gap; positions[3 * (k * n + i) + 1] = p[1]; positions[3 * (k * n + i) + 2] = p[2]; });
    colors.push(...one.atomColors); radii.push(...(one.atomRadii ?? [])); labels.push(...(one.labels ?? []));
    for (const [i, j] of one.bonds) bonds.push([i + k * n, j + k * n]);
  }
  let radius = 0; for (let i = 0; i < positions.length; i += 3) radius = Math.max(radius, Math.hypot(positions[i], positions[i + 1], positions[i + 2]));
  return { id, positions, bonds, atomColors: colors, atomRadii: radii, labels, tilt: [0.25, 0.35, 0], radius: radius + 0.6 };
}

// ---------- protein ----------
const RES = 14;
function helixPositions(): { pos: Float32Array; bonds: Array<[number, number]>; hb: Array<[number, number]>; colors: string[]; radii: number[]; labels: string[] } {
  // ideal alpha helix: 100 degrees and 1.5 angstrom per residue; N, CA, C, O per residue on their own radii and phases
  const pos: number[] = [], colors: string[] = [], radii: number[] = [], labels: string[] = [], bonds: Array<[number, number]> = [], hb: Array<[number, number]> = [];
  const cyl = (r: number, phiDeg: number, z: number) => { const a = (phiDeg * Math.PI) / 180; return [r * Math.cos(a), z, r * Math.sin(a)]; };
  for (let i = 0; i < RES; i++) {
    const phi = 100 * i, z = 1.5 * i - (1.5 * RES) / 2;
    const N = cyl(1.55, phi - 28, z - 0.9), CA = cyl(2.3, phi, z), C = cyl(1.6, phi + 27, z + 1.0), O = cyl(2.05, phi + 50, z + 1.5);
    for (const [p, el, lab] of [[N, 'N', 'backbone nitrogen'], [CA, 'C', 'alpha carbon, where the side chain attaches'], [C, 'C', 'backbone carbon'], [O, 'O', 'backbone oxygen, hydrogen bonds four residues along']] as Array<[number[], string, string]>) {
      pos.push(...p); colors.push(ELEMENTS[el].color); radii.push(ELEMENTS[el].radius * 1.1); labels.push(`${ELEMENTS[el].name}, ${lab} (residue ${i + 1})`);
    }
    const b = 4 * i; bonds.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3]); if (i > 0) bonds.push([b - 2, b]);
    if (i + 4 < RES) hb.push([b + 3, 4 * (i + 4)]);
  }
  return { pos: new Float32Array(pos), bonds, hb, colors, radii, labels };
}
function coilPositions(): Float32Array {
  // an unfolded chain: a smooth random walk with the same atom order
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pos: number[] = []; let x = -RES * 1.4, y = 0, z = 0, dir = [1, 0, 0];
  for (let i = 0; i < RES; i++) {
    const turn = [(rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.9]; dir = [dir[0] + turn[0], dir[1] + turn[1], dir[2] + turn[2]]; const L = Math.hypot(...dir); dir = dir.map((v) => v / L);
    const N = [x, y, z]; const CA = [x + dir[0] * 1.46, y + dir[1] * 1.46, z + dir[2] * 1.46]; const C = [CA[0] + dir[0] * 1.52 + 0.4, CA[1] + dir[1] * 1.52, CA[2] + dir[2] * 1.52 - 0.4]; const O = [C[0] + 0.3, C[1] + 1.1, C[2] + 0.3];
    pos.push(...N, ...CA, ...C, ...O); x = C[0] + dir[0] * 1.33; y = C[1] + dir[1] * 1.33; z = C[2] + dir[2] * 1.33;
  }
  const arr = new Float32Array(pos); let cx = 0, cy = 0, cz = 0; for (let i = 0; i < arr.length; i += 3) { cx += arr[i] / RES / 4; cy += arr[i + 1] / RES / 4; cz += arr[i + 2] / RES / 4; }
  for (let i = 0; i < arr.length; i += 3) { arr[i] -= cx; arr[i + 1] -= cy; arr[i + 2] -= cz; }
  return arr;
}

// ---------- DNA ----------
const BASES = ['A', 'T', 'G', 'C'] as const;
const BASE_COLOR: Record<string, string> = { A: '#F5A524', T: '#2FC8DF', G: '#9B6BE0', C: '#3F9A4B' };
const BASE_NAME: Record<string, string> = { A: 'adenine', T: 'thymine', G: 'guanine', C: 'cytosine' };
const PAIR: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
function dna(): Structure {
  const BP = 10, RISE = 3.38, TWIST = 36, RP = 8.9, RS = 6.6;
  let seed = 3; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const seq = Array.from({ length: BP }, () => BASES[Math.floor(rnd() * 4)]);
  const pos: number[] = [], colors: string[] = [], radii: number[] = [], labels: string[] = [], bonds: Array<[number, number]> = [];
  const add = (p: number[], color: string, r: number, label: string) => { pos.push(...p); colors.push(color); radii.push(r); labels.push(label); return pos.length / 3 - 1; };
  const cyl = (r: number, phiDeg: number, z: number) => { const a = (phiDeg * Math.PI) / 180; return [r * Math.cos(a), z, r * Math.sin(a)]; };
  let prevP1 = -1, prevP2 = -1;
  for (let k = 0; k < BP; k++) {
    const phi = TWIST * k, z = RISE * k - (RISE * (BP - 1)) / 2;
    const b1 = seq[k], b2 = PAIR[b1];
    const p1 = add(cyl(RP, phi, z), ELEMENTS.P.color, 0.5, `phosphate, strand 1 (runs 5' to 3' upward)`);
    const s1 = add(cyl(RS, phi + 6, z), ELEMENTS.C.color, 0.42, 'deoxyribose sugar, strand 1');
    const p2 = add(cyl(RP, phi + 150, z), ELEMENTS.P.color, 0.5, `phosphate, strand 2 (runs 5' to 3' downward)`);
    const s2 = add(cyl(RS, phi + 144, z), ELEMENTS.C.color, 0.42, 'deoxyribose sugar, strand 2');
    bonds.push([p1, s1], [p2, s2]);
    if (prevP1 >= 0) { bonds.push([prevP1 + 1, p1]); bonds.push([prevP2 + 1, p2]); }
    prevP1 = p1; prevP2 = p2;
    // the base pair: two bases meeting in the middle, three beads each
    const c1 = cyl(RS, phi + 6, z), c2 = cyl(RS, phi + 144, z);
    const mid = [(c1[0] + c2[0]) / 2, z, (c1[2] + c2[2]) / 2];
    const beads1 = [0.3, 0.6, 0.85].map((t) => add([c1[0] + (mid[0] - c1[0]) * t, z, c1[2] + (mid[2] - c1[2]) * t], BASE_COLOR[b1], 0.45, `${BASE_NAME[b1]} (${b1}), pairs with ${BASE_NAME[b2]} by ${b1 === 'A' || b1 === 'T' ? 'two' : 'three'} hydrogen bonds`));
    const beads2 = [0.3, 0.6, 0.85].map((t) => add([c2[0] + (mid[0] - c2[0]) * t, z, c2[2] + (mid[2] - c2[2]) * t], BASE_COLOR[b2], 0.45, `${BASE_NAME[b2]} (${b2}), pairs with ${BASE_NAME[b1]} by ${b2 === 'A' || b2 === 'T' ? 'two' : 'three'} hydrogen bonds`));
    bonds.push([s1, beads1[0]], [beads1[0], beads1[1]], [beads1[1], beads1[2]], [s2, beads2[0]], [beads2[0], beads2[1]], [beads2[1], beads2[2]]);
  }
  const positions = new Float32Array(pos);
  const dashed: Array<[number, number]> = [];
  for (let k = 0; k < BP; k++) { const base = 10 * k; dashed.push([base + 6, base + 9]); }
  const zTop = (RISE * (BP - 1)) / 2 + 2;
  return {
    id: 'dna', positions, bonds, atomColors: colors, atomRadii: radii, labels, dashed, dashedColor: '#F5A524', tilt: [0.25, 0.3, 0], radius: Math.hypot(RP + 3.2, zTop) + 0.5,
    decorate: (group) => { const ra = RP + 3.2; group.add(arrow([ra, -zTop + 1, 0], [ra, zTop - 1, 0], '#8B94A1', 0.08)); const a = (150 * Math.PI) / 180; group.add(arrow([ra * Math.cos(a), zTop - 1, ra * Math.sin(a)], [ra * Math.cos(a), -zTop + 1, ra * Math.sin(a)], '#8B94A1', 0.08)); },
  };
}
function dnaLadderSvg() {
  return `<svg class="fig" viewBox="0 0 640 220" role="img" aria-label="Base pairing: adenine with thymine by two hydrogen bonds, guanine with cytosine by three">
    <g font-family="var(--font-data)" font-size="11" letter-spacing="1.2" fill="var(--faint)"><text x="20" y="24">PAIRING RULES</text><text x="20" y="200">A + T: TWO HYDROGEN BONDS · G + C: THREE · STRANDS RUN OPPOSITE WAYS</text></g>
    ${[['A', 'T', 70], ['G', 'C', 130]].map(([a, b, y]) => `<rect x="120" y="${(y as number) - 18}" width="150" height="36" fill="${BASE_COLOR[a as string]}"/><text x="195" y="${(y as number) + 5}" text-anchor="middle" font-family="var(--font-data)" font-size="14" fill="#13253A">${BASE_NAME[a as string]}</text><rect x="370" y="${(y as number) - 18}" width="150" height="36" fill="${BASE_COLOR[b as string]}"/><text x="445" y="${(y as number) + 5}" text-anchor="middle" font-family="var(--font-data)" font-size="14" fill="#13253A">${BASE_NAME[b as string]}</text>${(a === 'A' ? [-8, 8] : [-12, 0, 12]).map((dy) => `<line x1="272" y1="${(y as number) + dy}" x2="368" y2="${(y as number) + dy}" stroke="#F5A524" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('')}`).join('')}
  </svg>`;
}

function bilayerSvg(unsat: boolean) {
  const gap = unsat ? 34 : 26, kink = unsat ? 'q -8 18 6 34' : 'v 34';
  let out = `<svg class="fig" viewBox="0 0 640 220" role="img" aria-label="A phospholipid bilayer: charged heads face the water, tails face inward; ${unsat ? 'kinked tails leave gaps and the membrane is fluid' : 'straight tails pack tightly'}">`;
  for (let i = 0; i < Math.floor(600 / gap); i++) { const x = 30 + i * gap; out += `<circle cx="${x}" cy="40" r="9" fill="#3B6FE0"/><path d="M${x - 4} 49 ${kink}" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M${x + 4} 49 ${kink}" fill="none" stroke="var(--ink)" stroke-width="2"/>`; out += `<circle cx="${x}" cy="180" r="9" fill="#3B6FE0"/><path d="M${x - 4} 171 ${kink.replace(/18|34/g, (m) => m === '34' ? '-34' : '-18')}" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M${x + 4} 171 ${kink.replace(/18|34/g, (m) => m === '34' ? '-34' : '-18')}" fill="none" stroke="var(--ink)" stroke-width="2"/>`; }
  out += `<text x="320" y="16" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">WATER · CHARGED HEADS OUT · TAILS IN · WATER</text><text x="320" y="208" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">${unsat ? 'KINKED TAILS CANNOT PACK · MORE FLUID' : 'STRAIGHT TAILS PACK TIGHTLY · LESS FLUID'}</text></svg>`;
  return out;
}
function foldSvg(k: number) {
  const pts: string[] = []; for (let i = 0; i <= 60; i++) { const t = i / 60; const hx = 120 + t * 400, hy = 110 + Math.sin(t * Math.PI * 6) * 30; const cx = 120 + t * 400, cy = 110 + Math.sin(t * 7.3) * 50 * Math.sin(t * 3.1); pts.push(`${(hx + (cx - hx) * k).toFixed(1)},${(hy + (cy - hy) * k).toFixed(1)}`); }
  return `<svg class="fig" viewBox="0 0 640 220" role="img" aria-label="A folded chain with a pocket, unfolding as it is heated"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><g opacity="${(1 - k).toFixed(2)}"><rect x="290" y="70" width="60" height="30" fill="none" stroke="var(--signal)" stroke-width="1.5" stroke-dasharray="4 3"/><text x="320" y="60" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--signal)" letter-spacing="1.2">ACTIVE SITE</text></g><text x="320" y="205" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1.2">${k < 0.3 ? 'FOLDED · THE POCKET FITS ITS SUBSTRATE' : k < 0.7 ? 'UNFOLDING · THE POCKET IS LOSING ITS SHAPE' : 'DENATURED · SAME SEQUENCE, NO WORKING SHAPE'}</text></svg>`;
}

export function init(root: HTMLElement, controls: HTMLElement, viewer: MultiViewer | null) {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  stage.innerHTML = `<div class="stage-split"><div class="mol"><div class="tile-view" data-view role="img" aria-label="Three-dimensional model of the selected macromolecule. Drag to rotate; tap a part for its name."></div><div class="atom-label" data-atom-label hidden></div><p class="stage-note" data-note></p></div><div class="fig-side" data-fig></div></div>`;
  const molHost = stage.querySelector<HTMLElement>('.mol')!, figHost = stage.querySelector<HTMLElement>('[data-fig]')!, noteEl = stage.querySelector<HTMLElement>('[data-note]')!;
  let family: Family = 'carb';
  let beta = false, unsat = false, denature = 0;
  let tile: Tile | null = null;
  const helix = helixPositions(); const coil = coilPositions();
  const helixStructure: Structure = { id: 'helix', positions: helix.pos.slice(), bonds: helix.bonds, atomColors: helix.colors, atomRadii: helix.radii, labels: helix.labels, dashed: helix.hb, dashedColor: '#F5A524', tilt: [0.2, 0.4, 0.15], radius: (1.5 * RES) / 2 + 3 };
  const structures: Record<Family, () => Structure> = {
    carb: glucose,
    lipid: () => (unsat ? threeChains(fattyAcid(18, 9), 'oleic', 6.4) : threeChains(fattyAcid(16), 'palmitic', 4.6)),
    protein: () => ({ ...helixStructure, positions: helixStructure.positions.slice() }),
    dna,
  };
  const spins: Record<Family, number> = { carb: 0.4, lipid: 0.25, protein: 0.35, dna: 0.3 };

  const rA = readout('Monomer'), rB = readout('Bond or feature'), rC = readout('Shape'), rD = readout('Job');
  const FACTS: Record<Family, () => string[]> = {
    carb: () => ['glucose, C6H12O6', beta ? 'beta 1,4 linkage' : 'alpha 1,4 linkage', beta ? 'straight chains, hydrogen bonded into sheets' : 'coiled, branched chains', beta ? 'cellulose: cell walls; we cannot digest it' : 'starch and glycogen: energy stores we digest easily'],
    lipid: () => [unsat ? 'oleic acid, 18 carbons, one cis double bond' : 'palmitic acid, 16 carbons, no double bonds', unsat ? 'cis double bond at carbon 9' : 'all single bonds', unsat ? 'kinked; chains cannot pack (melts at 13 °C)' : 'straight; chains pack tightly (melts at 63 °C)', unsat ? 'fluid membranes, liquid oils' : 'solid fats, stiffer membranes'],
    protein: () => ['amino acids (side chains omitted here)', `alpha helix, hydrogen bonds every fourth residue${denature > 0.05 ? ', breaking' : ''}`, denature < 0.3 ? 'folded: a working surface forms' : denature < 0.7 ? 'unfolding' : 'denatured: same sequence, no shape', denature < 0.3 ? 'enzyme, structure, signal, transport' : 'function lost'],
    dna: () => ['nucleotides: phosphate, sugar, base', 'A with T (two hydrogen bonds), G with C (three)', 'double helix, 3.4 nm per turn, strands antiparallel', 'each strand is a template for the other'],
  };
  const NOTES: Record<Family, string> = {
    carb: 'Glucose ring in the chair form; carbon hydrogens omitted. Tap an atom.',
    lipid: 'Three fatty acid chains side by side. Tap an atom.',
    protein: 'Backbone only: N blue, C gray, O red. Dashed: hydrogen bonds along the helix.',
    dna: 'Phosphates orange, sugars gray, bases colored by identity. Arrows show the two directions. Tap a base.',
  };

  function paintFig() {
    figHost.innerHTML = family === 'carb' ? chainSvg(beta) : family === 'lipid' ? bilayerSvg(unsat) : family === 'protein' ? foldSvg(denature) : dnaLadderSvg();
  }
  function paint() {
    const s = structures[family]();
    if (viewer) {
      if (tile) viewer.replace(tile, s, false); else tile = viewer.addTile(molHost, s, { spinSpeed: spins[family] });
      tile.spinSpeed = spins[family];
      if (family === 'protein') viewer.morph(tile, coil, denature);
    } else if (!molHost.querySelector('.stage-notice')) molHost.append(webglNotice());
    noteEl.textContent = NOTES[family];
    paintFig();
    const f = FACTS[family](); rA.set(f[0]); rB.set(f[1]); rC.set(f[2]); rD.set(f[3]);
    linkCtl.hidden = family !== 'carb'; satCtl.hidden = family !== 'lipid'; denCtl.hidden = family !== 'protein';
  }
  const famCtl = segmented({ label: 'Family', options: [{ value: 'carb', label: 'Carbohydrate' }, { value: 'lipid', label: 'Lipid' }, { value: 'protein', label: 'Protein' }, { value: 'dna', label: 'Nucleic acid' }], value: family, onChange: (v) => { family = v as Family; paint(); } });
  const linkCtl = segmented({ label: 'Linkage between glucose units', options: [{ value: 'alpha', label: 'Alpha (starch)' }, { value: 'beta', label: 'Beta (cellulose)' }], value: 'alpha', onChange: (v) => { beta = v === 'beta'; paint(); } });
  const satCtl = segmented({ label: 'Fatty acid', options: [{ value: 'sat', label: 'Saturated (palmitic)' }, { value: 'unsat', label: 'Unsaturated (oleic, cis)' }], value: 'sat', onChange: (v) => { unsat = v === 'unsat'; paint(); } });
  const denCtl = slider({ label: 'Heat', min: 0, max: 1, step: 0.01, value: 0, format: (v) => (v < 0.05 ? 'folded' : v > 0.95 ? 'denatured' : `${Math.round(v * 100)}% unfolded`), onInput: (v) => { denature = v; if (viewer && tile && family === 'protein') viewer.morph(tile, coil, denature); paintFig(); const f = FACTS.protein(); rB.set(f[1]); rC.set(f[2]); rD.set(f[3]); } });
  const readouts = document.createElement('div'); readouts.className = 'readouts'; readouts.append(rA, rB, rC, rD);
  controls.append(famCtl, row(linkCtl, satCtl, denCtl), readouts, note('Same monomer, different bond; same chain, different fold. In every family the shape is what does the work.'));
  paint();
}
