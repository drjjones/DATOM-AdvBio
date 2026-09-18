/**
 * B1.1 Bond explorer. Pick a bond; see both atoms' shells, the electronegativity difference on a live
 * scale, and the molecule in 3D colored by element or by partial charge, with its dipole when it has one.
 */
import { ELEMENTS, chargeColor } from '../../lib/mol/elements';
import { build, type ZMolecule } from '../../lib/mol/zmatrix';
import { arrow, type MultiViewer, type Tile } from '../../lib/mol/viewer';
import { segmented, toggle, readout, row, note, webglNotice } from '../../lib/ui';

interface BondOption { value: string; label: string; a: string; b: string; molecule: string; mol: ZMolecule; dipole?: [number, number, number]; comment: string; tilt?: [number, number, number] }

const BONDS: BondOption[] = [
  { value: 'HH', label: 'H to H', a: 'H', b: 'H', molecule: 'hydrogen gas, H2', comment: 'Identical atoms pull equally. The electrons sit in the middle.',
    mol: { atoms: [{ el: 'H' }, { el: 'H', to: 0, bond: 0.741 }] } },
  { value: 'CH', label: 'C to H', a: 'C', b: 'H', molecule: 'methane, CH4', comment: 'A difference of 0.35: nonpolar. Hydrocarbons avoid water because of this.',
    mol: { atoms: [{ el: 'C' }, { el: 'H', to: 0, bond: 1.087 }, { el: 'H', to: 0, angleTo: 1, bond: 1.087, angle: 109.5 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.087, angle: 109.5, dihedral: 120 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.087, angle: 109.5, dihedral: 240 }] } },
  { value: 'CC', label: 'C to C', a: 'C', b: 'C', molecule: 'ethane, C2H6', comment: 'Carbon bonds to carbon without any polarity at all, which is how skeletons form.',
    mol: { atoms: [{ el: 'C' }, { el: 'C', to: 0, bond: 1.535 }, { el: 'H', to: 0, angleTo: 1, bond: 1.09, angle: 111 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 120 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 240 }, { el: 'H', to: 1, angleTo: 0, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 60 }, { el: 'H', to: 1, angleTo: 0, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 180 }, { el: 'H', to: 1, angleTo: 0, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 300 }] } },
  { value: 'NH', label: 'N to H', a: 'N', b: 'H', molecule: 'ammonia, NH3', comment: 'A difference of 0.84: polar. Nitrogen carries the partial negative charge.',
    mol: { atoms: [{ el: 'N' }, { el: 'H', to: 0, bond: 1.012 }, { el: 'H', to: 0, angleTo: 1, bond: 1.012, angle: 106.7 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.012, angle: 106.7, dihedral: 112 }] }, dipole: [0, 0, 0] },
  { value: 'OH', label: 'O to H', a: 'O', b: 'H', molecule: 'water, H2O', comment: 'A difference of 1.24: strongly polar. Bent at 104.5 degrees, so the molecule has two ends.',
    mol: { atoms: [{ el: 'O' }, { el: 'H', to: 0, bond: 0.9584 }, { el: 'H', to: 0, angleTo: 1, bond: 0.9584, angle: 104.45 }] }, dipole: [0, 0, 0], tilt: [0.15, 0.2, 0] },
  { value: 'CO', label: 'C to O', a: 'C', b: 'O', molecule: 'carbon dioxide, CO2', comment: 'Each bond is polar (0.89), but the molecule is straight, so the two pulls cancel. Polar bonds, nonpolar molecule.',
    mol: { atoms: [{ el: 'C' }, { el: 'O', to: 0, bond: 1.16 }, { el: 'O', to: 0, angleTo: 1, bond: 1.16, angle: 180 }] } },
  { value: 'HCl', label: 'H to Cl', a: 'H', b: 'Cl', molecule: 'hydrogen chloride, HCl', comment: 'A difference of 0.96: polar covalent. In water it comes apart completely into ions, a strong acid.',
    mol: { atoms: [{ el: 'H' }, { el: 'Cl', to: 0, bond: 1.275 }] }, dipole: [0, 0, 0] },
  { value: 'NaCl', label: 'Na to Cl', a: 'Na', b: 'Cl', molecule: 'sodium chloride, NaCl', comment: 'A difference of 2.23: ionic. Chlorine takes the electron; the ions are held by charge.',
    mol: { atoms: [{ el: 'Na' }, { el: 'Cl', to: 0, bond: 2.36 }] } },
  { value: 'HB', label: 'Water to water', a: 'O', b: 'H', molecule: 'two water molecules, hydrogen bonded', comment: 'Not a covalent bond at all: the positive hydrogen of one molecule is drawn to the negative oxygen of the next, about a twentieth as strong.',
    mol: { atoms: [{ el: 'O' }, { el: 'H', to: 0, bond: 0.9584 }, { el: 'H', to: 0, angleTo: 1, bond: 0.9584, angle: 104.45 }, { el: 'O', to: 1, angleTo: 0, dihedralTo: 2, bond: 1.85, angle: 175, dihedral: 180, tag: 'second molecule', noBond: true }, { el: 'H', to: 3, angleTo: 1, dihedralTo: 0, bond: 0.9584, angle: 110, dihedral: 60, tag: 'second molecule' }, { el: 'H', to: 3, angleTo: 1, dihedralTo: 0, bond: 0.9584, angle: 110, dihedral: 180, tag: 'second molecule' }] }, tilt: [0.3, 0.6, 0] },
];

const classify = (d: number) => (d < 0.4 ? 'nonpolar covalent' : d < 1.7 ? 'polar covalent' : 'ionic');

function partialCharges(opt: BondOption): number[] {
  // Simple, honest scheme: each atom's charge is the sum over its bonds of the electronegativity difference, scaled.
  const q = new Array(opt.mol.atoms.length).fill(0);
  const bonds: Array<[number, number]> = opt.mol.atoms.map((z, i) => (i > 0 && z.to !== undefined ? [i, z.to] : i === 1 ? [1, 0] : null)).filter(Boolean) as Array<[number, number]>;
  for (const [i, j] of bonds) {
    const d = ELEMENTS[opt.mol.atoms[i].el].en - ELEMENTS[opt.mol.atoms[j].el].en;
    q[i] -= d / 2.5; q[j] += d / 2.5;
  }
  return q.map((v) => Math.max(-1, Math.min(1, v)));
}

function shellSvg(sym: string): string {
  const e = ELEMENTS[sym];
  const size = 150, cx = size / 2, cy = size / 2;
  let out = `<svg class="shell" viewBox="0 0 ${size} ${size}" role="img" aria-label="${e.name}: ${e.shells.join(', ')} electrons by shell">`;
  out += `<circle cx="${cx}" cy="${cy}" r="12" fill="var(--ink)"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--paper)">${sym}</text>`;
  e.shells.forEach((n, s) => {
    const r = 26 + s * 18;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="1"/>`;
    const cap = s === 0 ? 2 : 8;
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / cap - Math.PI / 2;
      const outer = s === e.shells.length - 1;
      out += `<circle cx="${cx + r * Math.cos(a)}" cy="${cy + r * Math.sin(a)}" r="4" fill="${outer ? 'var(--signal)' : 'var(--faint)'}"/>`;
    }
  });
  out += '</svg>';
  return out;
}

export function init(root: HTMLElement, controls: HTMLElement, viewer: MultiViewer | null) {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  stage.innerHTML = `<div class="stage-split"><div class="shells" data-shells></div><div class="mol"><div class="tile-view" data-view role="img" aria-label="Three-dimensional model of the selected molecule. Drag to rotate; tap an atom for its name and charge."></div><div class="atom-label" data-atom-label hidden></div><p class="stage-note" data-stage-note></p></div></div>`;
  const shells = stage.querySelector<HTMLElement>('[data-shells]')!;
  const stageNote = stage.querySelector<HTMLElement>('[data-stage-note]')!;
  const molHost = stage.querySelector<HTMLElement>('.mol')!;

  let current = BONDS.find((b) => b.value === 'OH')!;
  let byCharge = true;
  let tile: Tile | null = null;

  const scale = document.createElement('div'); scale.className = 'en-scale'; scale.setAttribute('role', 'img');
  scale.innerHTML = `<div class="en-track"><span class="en-zone" style="left:0;width:${(0.4 / 3.4) * 100}%">nonpolar</span><span class="en-zone" style="left:${(0.4 / 3.4) * 100}%;width:${(1.3 / 3.4) * 100}%">polar covalent</span><span class="en-zone" style="left:${(1.7 / 3.4) * 100}%;width:${(1.7 / 3.4) * 100}%">ionic</span><span class="en-marker" data-marker></span></div>`;
  const marker = scale.querySelector<HTMLElement>('[data-marker]')!;

  const rEn = readout('Electronegativity'), rDiff = readout('Difference'), rType = readout('Bond type'), rMol = readout('Shown as');
  const comment = note('');

  function structure(opt: BondOption) {
    const q = partialCharges(opt);
    const isHB = opt.value === 'HB';
    const s = build(opt.mol, {
      id: opt.value, tilt: opt.tilt ?? [0.35, 0.5, 0], radiusScale: 1.35,
      colorBy: (i, el) => (byCharge ? chargeColor(q[i]) : ELEMENTS[el].color),
      labelFor: (i, el) => `${ELEMENTS[el].name}${q[i] > 0.08 ? ', partial positive' : q[i] < -0.08 ? ', partial negative' : ''}${opt.mol.atoms[i].tag ? ', ' + opt.mol.atoms[i].tag : ''}`,
      decorate: (group, s) => {
        if (opt.dipole && byCharge) {
          // dipole arrow from the positive centroid to the negative centroid
          let px = 0, py = 0, pz = 0, pw = 0, nx = 0, ny = 0, nz = 0, nw = 0;
          q.forEach((c, i) => { const w = Math.abs(c); if (c > 0) { px += s.positions[3 * i] * w; py += s.positions[3 * i + 1] * w; pz += s.positions[3 * i + 2] * w; pw += w; } else if (c < 0) { nx += s.positions[3 * i] * w; ny += s.positions[3 * i + 1] * w; nz += s.positions[3 * i + 2] * w; nw += w; } });
          if (pw && nw) group.add(arrow([px / pw, py / pw, pz / pw], [nx / nw, ny / nw, nz / nw], '#F5A524', 0.05));
        }
      },
    });
    if (isHB) { s.dashed = [[1, 3]]; s.dashedColor = '#F5A524'; }
    return s;
  }

  function paint() {
    const A = ELEMENTS[current.a], B = ELEMENTS[current.b];
    const d = Math.abs(A.en - B.en);
    const type = current.value === 'HB' ? 'hydrogen bond (between molecules)' : classify(d);
    shells.innerHTML = `<div class="shell-pair">${shellSvg(current.a)}${shellSvg(current.b)}</div><p class="k shell-caption">${A.name}: ${A.valence} outer, forms ${A.bonds} bond${A.bonds === 1 ? '' : 's'} · ${B.name}: ${B.valence} outer, forms ${B.bonds} bond${B.bonds === 1 ? '' : 's'}</p>`;
    marker.style.left = `${Math.min(100, (d / 3.4) * 100)}%`;
    marker.textContent = d.toFixed(2);
    rEn.set(`${A.symbol} ${A.en.toFixed(2)} · ${B.symbol} ${B.en.toFixed(2)}`);
    rDiff.set(d.toFixed(2));
    rType.set(type);
    rMol.set(current.molecule);
    comment.textContent = current.comment;
    stageNote.textContent = byCharge ? 'Colored by partial charge: blue negative, red positive. Arrow shows the dipole.' : 'Colored by element.';
    if (viewer) {
      const s = structure(current);
      if (tile) viewer.replace(tile, s, false); else tile = viewer.addTile(molHost, s, { spinSpeed: 0.4 });
    } else if (!molHost.querySelector('.stage-notice')) {
      molHost.append(webglNotice());
    }
  }

  controls.append(
    segmented({ label: 'Bond', options: BONDS.map((b) => ({ value: b.value, label: b.label })), value: current.value, onChange: (v) => { current = BONDS.find((b) => b.value === v)!; paint(); } }),
    scale,
    row(toggle({ label: 'Color by partial charge', on: byCharge, onChange: (on) => { byCharge = on; paint(); } })),
    Object.assign(document.createElement('div'), { className: 'readouts' }),
    comment,
  );
  controls.querySelector('.readouts')!.append(rEn, rDiff, rType, rMol);
  paint();
}
