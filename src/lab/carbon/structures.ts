/**
 * Six carbon allotropes generated from published crystallographic and molecular geometry.
 * Units are ångströms. Nothing is loaded from a data file: each model is built from its
 * lattice constants and symmetry, so it is exact to the bond-length level.
 *
 *   diamond      a = 3.567 Å, face-centered cubic with a two-atom basis, C to C 1.545 Å
 *   graphite     a = 2.461 Å, interlayer 3.354 Å, Bernal AB stacking, C to C 1.421 Å
 *   graphene     one graphite sheet
 *   C60          truncated icosahedron scaled to circumradius 3.55 Å (C to C 1.43 Å)
 *   (10,0) tube  graphene rolled along the chiral vector C_h = 10 a1; diameter 7.83 Å
 *   amorphous    a seeded random network relaxed toward C to C 1.52 Å with at most four
 *                bonds per atom. Amorphous carbon has no single measured structure, so
 *                this one is generated, and its caption says so.
 */
export const COLORS = {
  sp3: '#9b6be0', // four bonds
  sp2: '#5fb3b3', // three bonds
  low: '#e0b04f', // two or fewer
  coral: '#f2785c', // C60 pentagons
  bond: '#8b94a1',
  dash: '#9aa4b2',
} as const;

export interface Structure {
  id: string;
  name: string;
  subtitle: string;
  positions: Float32Array;
  bonds: Array<[number, number]>;
  degree: Uint8Array;
  /** Bulk bond count for a crystalline model. Edge atoms cut by the model boundary keep the bulk color. */
  bulkDegree?: number;
  atomColors: string[];
  bondColors?: string[];
  /** Ordered atom indices of faces to fill (the twelve C60 pentagons). */
  faces?: number[][];
  /** Atom pairs joined by a dashed line (graphite interlayer spacing). */
  dashed?: Array<[number, number]>;
  tilt: [number, number, number];
  radius: number;
  facts: string[];
}

type P3 = [number, number, number];

function toArray(pts: P3[]): Float32Array {
  const p = new Float32Array(pts.length * 3);
  pts.forEach((q, i) => { p[3 * i] = q[0]; p[3 * i + 1] = q[1]; p[3 * i + 2] = q[2]; });
  return p;
}
function dist(p: Float32Array, i: number, j: number) {
  return Math.hypot(p[3 * i] - p[3 * j], p[3 * i + 1] - p[3 * j + 1], p[3 * i + 2] - p[3 * j + 2]);
}
function bondsWithin(p: Float32Array, max: number, min = 0.5): Array<[number, number]> {
  const n = p.length / 3, out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = dist(p, i, j); if (d < max && d > min) out.push([i, j]); }
  return out;
}
function degrees(n: number, bonds: Array<[number, number]>) {
  const d = new Uint8Array(n);
  for (const [i, j] of bonds) { d[i]++; d[j]++; }
  return d;
}
function boundingRadius(p: Float32Array) {
  let r = 0;
  for (let i = 0; i < p.length; i += 3) r = Math.max(r, Math.hypot(p[i], p[i + 1], p[i + 2]));
  return r;
}
/** Drop atoms the spherical cut left with too few neighbors, repeating until stable. */
function prune(pts: P3[], maxBond: number, minDegree: number): P3[] {
  for (let pass = 0; pass < 4; pass++) {
    const p = toArray(pts);
    const deg = degrees(pts.length, bondsWithin(p, maxBond));
    const kept = pts.filter((_, i) => deg[i] >= minDegree);
    if (kept.length === pts.length) break;
    pts = kept;
  }
  return pts;
}
function colorByDegree(deg: Uint8Array): string[] {
  return Array.from(deg, (d) => (d >= 4 ? COLORS.sp3 : d === 3 ? COLORS.sp2 : COLORS.low));
}
function finish(base: Omit<Structure, 'positions' | 'bonds' | 'degree' | 'atomColors' | 'radius'> & { atomColors?: string[] }, pts: P3[], maxBond: number): Structure {
  const positions = toArray(pts);
  const bonds = bondsWithin(positions, maxBond);
  const degree = degrees(pts.length, bonds);
  const atomColors = base.atomColors ?? (base.bulkDegree ? pts.map(() => (base.bulkDegree === 4 ? COLORS.sp3 : COLORS.sp2)) : colorByDegree(degree));
  return { ...base, positions, bonds, degree, atomColors, radius: boundingRadius(positions) + 0.5 };
}

export function diamond(): Structure {
  const a = 3.567, R = 5.2;
  const fcc = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
  const pts: P3[] = [];
  for (let i = -2; i <= 1; i++) for (let j = -2; j <= 1; j++) for (let k = -2; k <= 1; k++)
    for (const b of fcc) for (const s of [0, 0.25]) {
      const x = (i + b[0] + s) * a, y = (j + b[1] + s) * a, z = (k + b[2] + s) * a;
      if (Math.hypot(x, y, z) <= R) pts.push([x, y, z]);
    }
  return finish({
    id: 'diamond', name: 'Diamond', subtitle: 'Four bonds per carbon, sp3', bulkDegree: 4, tilt: [0.5, 0.65, 0],
    facts: ['Every carbon bonds to four neighbors in a rigid three-dimensional network', 'Bond length 0.154 nm', 'Hardest natural material and an electrical insulator', 'Atoms at the model boundary are cut, not real surface chemistry'],
  }, prune(pts, 1.7, 2), 1.7);
}

function honeycomb(R: number, shift: [number, number], y: number, out: P3[]) {
  const a = 2.461;
  const a1 = [a, 0], a2 = [a / 2, (a * Math.sqrt(3)) / 2];
  const B = [(a1[0] + a2[0]) / 3, (a1[1] + a2[1]) / 3]; // second basis atom, 1.421 Å from the first
  for (let n1 = -9; n1 <= 9; n1++) for (let n2 = -9; n2 <= 9; n2++) for (const b of [[0, 0], B]) {
    const x = n1 * a1[0] + n2 * a2[0] + b[0] + shift[0];
    const z = n1 * a1[1] + n2 * a2[1] + b[1] + shift[1];
    if (Math.hypot(x, z) <= R) out.push([x, y, z]);
  }
}

export function graphite(): Structure {
  const c2 = 3.354, R = 7.4;
  const a = 2.461, B: [number, number] = [a / 2, a / (2 * Math.sqrt(3))];
  const pts: P3[] = [];
  honeycomb(R, [0, 0], -c2, pts);
  honeycomb(R, B, 0, pts);
  honeycomb(R, [0, 0], c2, pts);
  const kept = prune(pts, 1.6, 2);
  // Dashed interlayer lines between atoms that sit directly above one another (every third such pair).
  const dashed: Array<[number, number]> = [];
  let count = 0;
  for (let i = 0; i < kept.length; i++) for (let j = 0; j < kept.length; j++) {
    if (Math.abs(kept[j][1] - kept[i][1] - c2) > 0.01) continue;
    if (Math.abs(kept[i][0] - kept[j][0]) < 0.05 && Math.abs(kept[i][2] - kept[j][2]) < 0.05 && Math.hypot(kept[i][0], kept[i][2]) < R - 1.5) {
      if (count++ % 3 === 0) dashed.push([i, j]);
    }
  }
  return { ...finish({
    id: 'graphite', name: 'Graphite', subtitle: 'Three sheets, weakly stacked', bulkDegree: 3, tilt: [0.42, 0.5, 0],
    facts: ['Three bonds per carbon within each flat sheet', 'Sheets 0.335 nm apart, held only by weak forces (dashed lines)', 'Sheets slide over one another: pencil marks and dry lubricant', 'Bond length within a sheet 0.142 nm'],
  }, kept, 1.6), dashed };
}

export function graphene(): Structure {
  const pts: P3[] = [];
  honeycomb(9.0, [0, 0], 0, pts);
  return finish({
    id: 'graphene', name: 'Graphene', subtitle: 'A single sheet, one atom thick', bulkDegree: 3, tilt: [0.75, 0.35, 0],
    facts: ['One sheet of graphite, one atom thick', 'Bond length 0.142 nm', 'The fourth valence electron on each carbon is delocalized across the sheet', 'Conducts electricity and heat exceptionally well'],
  }, prune(pts, 1.6, 2), 1.6);
}

export function c60(): Structure {
  const phi = (1 + Math.sqrt(5)) / 2;
  const scale = 3.55 / Math.sqrt(1 + 9 * phi * phi); // circumradius 3.55 Å
  const raw: P3[] = [];
  const evenPerms = (v: P3): P3[] => [[v[0], v[1], v[2]], [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
  const signs = (v: P3) => {
    const out: P3[] = [];
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      const q: P3 = [v[0] * sx, v[1] * sy, v[2] * sz];
      if (!out.some((o) => o[0] === q[0] && o[1] === q[1] && o[2] === q[2])) out.push(q);
    }
    return out;
  };
  for (const base of [[0, 1, 3 * phi], [1, 2 + phi, 2 * phi], [phi, 2, 2 * phi + 1]] as P3[])
    for (const s of signs(base)) for (const p of evenPerms(s)) raw.push([p[0] * scale, p[1] * scale, p[2] * scale]);
  const positions = toArray(raw);
  const bonds = bondsWithin(positions, 1.55);
  // The twelve pentagons sit where the icosahedron's vertices were truncated.
  const faces: number[][] = [];
  for (const v of [[0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi]] as P3[]) for (const u of evenPerms(v)) {
    const len = Math.hypot(...u); const ux = u[0] / len, uy = u[1] / len, uz = u[2] / len;
    const ranked = raw.map((p, i) => ({ i, d: (p[0] * ux + p[1] * uy + p[2] * uz) / Math.hypot(...p) })).sort((a, b) => b.d - a.d).slice(0, 5);
    // order the five atoms around the face normal
    const e1: P3 = Math.abs(ux) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const t1x = e1[1] * uz - e1[2] * uy, t1y = e1[2] * ux - e1[0] * uz, t1z = e1[0] * uy - e1[1] * ux;
    const t2x = uy * t1z - uz * t1y, t2y = uz * t1x - ux * t1z, t2z = ux * t1y - uy * t1x;
    ranked.sort((a, b) => Math.atan2(raw[a.i][0] * t2x + raw[a.i][1] * t2y + raw[a.i][2] * t2z, raw[a.i][0] * t1x + raw[a.i][1] * t1y + raw[a.i][2] * t1z)
      - Math.atan2(raw[b.i][0] * t2x + raw[b.i][1] * t2y + raw[b.i][2] * t2z, raw[b.i][0] * t1x + raw[b.i][1] * t1y + raw[b.i][2] * t1z));
    faces.push(ranked.map((r) => r.i));
  }
  const pentEdge = new Set<string>();
  for (const f of faces) for (let k = 0; k < 5; k++) { const a = f[k], b = f[(k + 1) % 5]; pentEdge.add(a < b ? `${a}-${b}` : `${b}-${a}`); }
  const bondColors = bonds.map(([i, j]) => (pentEdge.has(`${i}-${j}`) ? COLORS.coral : COLORS.bond));
  const degree = degrees(raw.length, bonds);
  return {
    id: 'c60', name: 'C60 fullerene', subtitle: 'Sixty carbons, twelve pentagons', positions, bonds, degree,
    atomColors: raw.map(() => COLORS.sp2), bondColors, faces, tilt: [0.3, 0.2, 0], radius: 3.55 + 0.5,
    facts: ['60 carbons: 12 pentagons and 20 hexagons closed into a ball', 'Diameter 0.71 nm', 'Every closed cage of hexagons and pentagons has exactly twelve pentagons', 'In the real molecule the 60 pentagon edges (coral) are longer, 0.146 nm, than the 30 hexagon-to-hexagon bonds, 0.140 nm; this model draws them equal'],
  };
}

export function nanotube(n = 10, m = 0, cells = 4): Structure {
  const a = 2.461, s3 = Math.sqrt(3);
  const a1 = [(s3 / 2) * a, a / 2], a2 = [(s3 / 2) * a, -a / 2];
  const B = [(a1[0] + a2[0]) / 3, (a1[1] + a2[1]) / 3];
  const Ch = [n * a1[0] + m * a2[0], n * a1[1] + m * a2[1]];
  const L = Math.hypot(Ch[0], Ch[1]);
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : Math.abs(x));
  const dR = gcd(2 * n + m, 2 * m + n);
  const t1 = (2 * m + n) / dR, t2 = -(2 * n + m) / dR;
  const T = [t1 * a1[0] + t2 * a2[0], t1 * a1[1] + t2 * a2[1]];
  const TL = Math.hypot(T[0], T[1]);
  const R = L / (2 * Math.PI);
  const pts: P3[] = [];
  const seen = new Set<string>();
  for (let n1 = -40; n1 <= 40; n1++) for (let n2 = -40; n2 <= 40; n2++) for (const b of [[0, 0], B]) {
    const x = n1 * a1[0] + n2 * a2[0] + b[0], y = n1 * a1[1] + n2 * a2[1] + b[1];
    const u = (x * Ch[0] + y * Ch[1]) / (L * L), v = (x * T[0] + y * T[1]) / (TL * TL);
    if (u < -1e-6 || u >= 1 - 1e-6 || v < -1e-6 || v >= cells - 1e-6) continue;
    const th = 2 * Math.PI * u;
    const key = `${Math.round(th * 1e3)}:${Math.round(v * TL * 1e3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pts.push([R * Math.cos(th), v * TL - (cells * TL) / 2, R * Math.sin(th)]);
  }
  const d = (2 * R) / 10;
  const kept = prune(pts, 1.6, 2); // the cell boundary leaves end atoms hanging by one bond; cut back to a clean zigzag edge
  return finish({
    id: 'nanotube', name: `(${n},${m}) carbon nanotube`, subtitle: 'Graphene rolled into a tube, joined edge to edge', bulkDegree: 3, tilt: [0.55, 0, 0.35],
    facts: [`A single graphene sheet rolled along its chiral vector; (${n},${m}) is a zigzag tube`, `Diameter ${d.toFixed(2)} nm, ${kept.length} atoms shown`, (n - m) % 3 === 0 ? 'n minus m is a multiple of three, so this tube is metallic' : 'n minus m is not a multiple of three, so this tube is a semiconductor', 'Spins about its own axis'],
  }, kept, 1.6);
}

export function amorphous(seed = 7, count = 120): Structure {
  // mulberry32, so the network is the same on every device
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const Rs = 6.0;
  const pts: P3[] = [];
  let tries = 0;
  while (pts.length < count && tries++ < 40000) {
    const r = Rs * Math.cbrt(rnd()), th = Math.acos(2 * rnd() - 1), ph = 2 * Math.PI * rnd();
    const p: P3 = [r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)];
    if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) >= 1.3)) pts.push(p);
  }
  // Relax: neighbors within 2.1 Å are pulled toward 1.52 Å, anything closer than 1.35 Å is pushed apart.
  for (let it = 0; it < 90; it++) {
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1], dz = pts[j][2] - pts[i][2];
      const d = Math.hypot(dx, dy, dz);
      if (d > 2.1 || d < 1e-6) continue;
      const k = d < 1.35 ? 0.35 : 0.12;
      const f = ((d - 1.52) * k) / 2 / d;
      pts[i][0] += dx * f; pts[i][1] += dy * f; pts[i][2] += dz * f;
      pts[j][0] -= dx * f; pts[j][1] -= dy * f; pts[j][2] -= dz * f;
    }
    for (const p of pts) { const r = Math.hypot(...p); if (r > Rs) { const k = Rs / r; p[0] *= k; p[1] *= k; p[2] *= k; } }
  }
  const positions = toArray(pts);
  // Bonds: shortest first, never more than four per atom.
  const cand = bondsWithin(positions, 1.85).map(([i, j]) => ({ i, j, d: dist(positions, i, j) })).sort((a, b) => a.d - b.d);
  const deg = new Uint8Array(pts.length);
  const bonds: Array<[number, number]> = [];
  for (const c of cand) if (deg[c.i] < 4 && deg[c.j] < 4) { bonds.push([c.i, c.j]); deg[c.i]++; deg[c.j]++; }
  let pts2 = pts, bonds2 = bonds, degree = deg;
  for (let pass = 0; pass < 5; pass++) {
    const kept: number[] = [];
    pts2.forEach((_, i) => { if (degree[i] >= 2) kept.push(i); });
    if (kept.length === pts2.length) break;
    const remap = new Map(kept.map((old, idx) => [old, idx]));
    pts2 = kept.map((i) => pts2[i]);
    bonds2 = bonds2.filter(([i, j]) => remap.has(i) && remap.has(j)).map(([i, j]) => [remap.get(i)!, remap.get(j)!] as [number, number]);
    degree = degrees(pts2.length, bonds2);
  }
  const positions2 = toArray(pts2);
  const n4 = degree.filter((d) => d >= 4).length, n3 = degree.filter((d) => d === 3).length;
  return {
    id: 'amorphous', name: 'Amorphous carbon', subtitle: 'No repeating pattern, colored by bond count', positions: positions2, bonds: bonds2, degree,
    atomColors: colorByDegree(degree), tilt: [0.3, 0.4, 0], radius: boundingRadius(positions2) + 0.5,
    facts: ['No unit cell and no long-range order', `${n4} four-bonded (purple), ${n3} three-bonded (teal), ${pts2.length - n4 - n3} with two (amber)`, 'Properties depend on the sp2 to sp3 ratio: soot, glassy carbon, diamond-like films', 'A generated random network, not a measured structure'],
  };
}
