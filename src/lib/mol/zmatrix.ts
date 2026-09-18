/**
 * Builds Cartesian coordinates from internal coordinates (bond length, bond angle, dihedral), the way a
 * Z-matrix does. Standard bond lengths and angles give real molecular geometry without a data file.
 */
import { ELEMENTS } from './elements';
import type { Structure } from './viewer';

export type V3 = [number, number, number];
export interface ZAtom { el: string; to?: number; angleTo?: number; dihedralTo?: number; bond?: number; angle?: number; dihedral?: number; tag?: string; noBond?: boolean }
export interface ZMolecule { atoms: ZAtom[]; extraBonds?: Array<[number, number]> }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const deg = Math.PI / 180;

/** Place atom D bonded to C with angle B-C-D and dihedral A-B-C-D (natural extension reference frame). */
export function place(a: V3, b: V3, c: V3, bond: number, angle: number, dihedral: number): V3 {
  const bc = norm(sub(c, b));
  const n = norm(cross(sub(b, a), bc));
  const m = cross(n, bc);
  const th = angle * deg, ph = dihedral * deg;
  const d2: V3 = [-bond * Math.cos(th), bond * Math.sin(th) * Math.cos(ph), bond * Math.sin(th) * Math.sin(ph)];
  return [c[0] + d2[0] * bc[0] + d2[1] * m[0] + d2[2] * n[0], c[1] + d2[0] * bc[1] + d2[1] * m[1] + d2[2] * n[1], c[2] + d2[0] * bc[2] + d2[1] * m[2] + d2[2] * n[2]];
}

export function coordinates(mol: ZMolecule): V3[] {
  const out: V3[] = [];
  mol.atoms.forEach((z, i) => {
    if (i === 0) { out.push([0, 0, 0]); return; }
    if (i === 1) { out.push([z.bond ?? 1, 0, 0]); return; }
    const c = out[z.to!], b = out[z.angleTo!];
    if (i === 2) {
      // third atom in the xy plane
      const th = (z.angle ?? 109.5) * deg;
      const dir = norm(sub(b, c));
      const perp: V3 = [-dir[1], dir[0], 0];
      const bond = z.bond ?? 1;
      out.push([c[0] + bond * (Math.cos(th) * dir[0] + Math.sin(th) * perp[0]), c[1] + bond * (Math.cos(th) * dir[1] + Math.sin(th) * perp[1]), 0]);
      return;
    }
    const a = out[z.dihedralTo!];
    out.push(place(a, b, c, z.bond ?? 1, z.angle ?? 109.5, z.dihedral ?? 180));
  });
  return out;
}

export interface BuildOptions { id: string; name?: string; subtitle?: string; tilt?: V3; colorBy?: (i: number, el: string) => string; labelFor?: (i: number, el: string) => string; radiusScale?: number; center?: boolean; decorate?: Structure['decorate']; facts?: string[] }

/** Convert a Z-matrix molecule into a viewer structure. Bonds are the attachment bonds plus any ring closures. */
export function build(mol: ZMolecule, opts: BuildOptions): Structure {
  const pts = coordinates(mol);
  if (opts.center !== false) {
    const c: V3 = [0, 0, 0];
    for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; }
    for (const p of pts) { p[0] -= c[0]; p[1] -= c[1]; p[2] -= c[2]; }
  }
  const positions = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { positions[3 * i] = p[0]; positions[3 * i + 1] = p[1]; positions[3 * i + 2] = p[2]; });
  const bonds: Array<[number, number]> = [];
  mol.atoms.forEach((z, i) => { if (z.noBond) return; if (i > 0 && z.to !== undefined) bonds.push([Math.min(i, z.to), Math.max(i, z.to)]); else if (i === 1) bonds.push([0, 1]); });
  for (const b of mol.extraBonds ?? []) bonds.push(b);
  const scale = opts.radiusScale ?? 1;
  let radius = 0; for (const p of pts) radius = Math.max(radius, Math.hypot(...p));
  return {
    id: opts.id, name: opts.name, subtitle: opts.subtitle, positions, bonds,
    atomColors: mol.atoms.map((z, i) => opts.colorBy ? opts.colorBy(i, z.el) : ELEMENTS[z.el].color),
    atomRadii: mol.atoms.map((z) => ELEMENTS[z.el].radius * scale),
    labels: mol.atoms.map((z, i) => opts.labelFor ? opts.labelFor(i, z.el) : `${ELEMENTS[z.el].name}${z.tag ? ', ' + z.tag : ''}`),
    tilt: opts.tilt ?? [0.35, 0.5, 0], radius: radius + 0.6, decorate: opts.decorate, facts: opts.facts,
  };
}

/** Straight (anti) hydrocarbon chain of n carbons with hydrogens, optionally with one cis double bond after carbon `cisAt` (1-based). */
export function alkylChain(n: number, cisAt?: number): ZMolecule {
  const atoms: ZAtom[] = [];
  const cIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    const dbl = cisAt !== undefined && (i === cisAt - 1 || i === cisAt); // the two sp2 carbons
    const prevDbl = cisAt !== undefined && i - 1 === cisAt - 1 && i === cisAt;
    if (i === 0) atoms.push({ el: 'C' });
    else if (i === 1) atoms.push({ el: 'C', to: 0, bond: 1.53 });
    else if (i === 2) atoms.push({ el: 'C', to: cIdx[1], angleTo: cIdx[0], bond: 1.53, angle: 112 });
    else atoms.push({ el: 'C', to: cIdx[i - 1], angleTo: cIdx[i - 2], dihedralTo: cIdx[i - 3], bond: prevDbl ? 1.34 : 1.53, angle: dbl ? 121 : 112, dihedral: (cisAt !== undefined && i === cisAt + 1) ? 0 : 180 });
    cIdx.push(atoms.length - 1);
  }
  // hydrogens: two per interior carbon (one per sp2 carbon), three on the ends
  for (let i = 0; i < n; i++) {
    const c = cIdx[i];
    const nb = i === 0 ? cIdx[1] : cIdx[i - 1];
    const nb2 = i === 0 ? (n > 2 ? cIdx[2] : cIdx[1]) : i === 1 ? cIdx[0] : cIdx[i - 2];
    const sp2 = cisAt !== undefined && (i === cisAt - 1 || i === cisAt);
    const count = i === 0 || i === n - 1 ? 3 : sp2 ? 1 : 2;
    const dihedrals = count === 3 ? [60, 180, 300] : count === 2 ? [120, 240] : [180];
    for (const d of dihedrals) atoms.push({ el: 'H', to: c, angleTo: nb, dihedralTo: nb2, bond: 1.09, angle: sp2 ? 120 : 109.5, dihedral: d });
  }
  return { atoms };
}
