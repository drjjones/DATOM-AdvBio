/**
 * B1.4 Carbon chemistry. A two-carbon skeleton with one position that takes any of the seven functional
 * groups, shown in 3D with the group in color and the skeleton in gray; a dehydration synthesis and
 * hydrolysis step-through; and the Miller and Urey apparatus, step by step.
 */
import { ELEMENTS } from '../../lib/mol/elements';
import { build, type ZMolecule } from '../../lib/mol/zmatrix';
import type { MultiViewer, Tile } from '../../lib/mol/viewer';
import { segmented, slider, button, readout, row, note, webglNotice, reduceMotion } from '../../lib/ui';

interface Group { value: string; label: string; molecule: string; formula: string; polarity: string; charge: string; water: string; found: string; mol: ZMolecule; groupAtoms: number[] }

// Skeleton: C0 (carries the group) and C1 (methyl). Atoms 0 and 1 are the two carbons; 2, 3, 4 are the hydrogens on C1.
const skeleton = (): ZMolecule['atoms'] => [
  { el: 'C' }, { el: 'C', to: 0, bond: 1.535 },
  { el: 'H', to: 1, angleTo: 0, bond: 1.09, angle: 111 }, { el: 'H', to: 1, angleTo: 0, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 120 }, { el: 'H', to: 1, angleTo: 0, dihedralTo: 2, bond: 1.09, angle: 111, dihedral: 240 },
];
const twoH = (): ZMolecule['atoms'] => [{ el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.09, angle: 109.5, dihedral: 120 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.09, angle: 109.5, dihedral: 240 }];

const GROUPS: Group[] = [
  { value: 'methyl', label: 'Methyl', molecule: 'propane', formula: 'CH3', polarity: 'nonpolar', charge: 'none', water: 'hydrophobic, barely dissolves', found: 'hydrocarbon tails; a tag on DNA that silences genes',
    mol: { atoms: [...skeleton(), ...twoH(), { el: 'C', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.53, angle: 111, dihedral: 0 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.09, angle: 109.5, dihedral: 60 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.09, angle: 109.5, dihedral: 180 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.09, angle: 109.5, dihedral: 300 }] }, groupAtoms: [7, 8, 9, 10] },
  { value: 'hydroxyl', label: 'Hydroxyl', molecule: 'ethanol', formula: 'OH', polarity: 'polar', charge: 'none', water: 'hydrophilic, hydrogen bonds with water', found: 'sugars, alcohols; the linkage points of polymers',
    mol: { atoms: [...skeleton(), ...twoH(), { el: 'O', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.43, angle: 109, dihedral: 0 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 0.96, angle: 108.5, dihedral: 180 }] }, groupAtoms: [7, 8] },
  { value: 'carbonyl', label: 'Carbonyl', molecule: 'acetaldehyde', formula: 'C=O', polarity: 'polar', charge: 'none', water: 'hydrophilic', found: 'sugars (aldehydes and ketones), the bond that links amino acids',
    mol: { atoms: [...skeleton(), { el: 'O', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.21, angle: 124, dihedral: 0 }, { el: 'H', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.11, angle: 115, dihedral: 180 }] }, groupAtoms: [0, 5] },
  { value: 'carboxyl', label: 'Carboxyl', molecule: 'acetic acid', formula: 'COOH', polarity: 'polar', charge: 'negative at pH 7 (the H leaves as H+)', water: 'hydrophilic; an acid', found: 'amino acids, fatty acids, vinegar',
    mol: { atoms: [...skeleton(), { el: 'O', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.21, angle: 126, dihedral: 0 }, { el: 'O', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.34, angle: 112, dihedral: 180 }, { el: 'H', to: 6, angleTo: 0, dihedralTo: 1, bond: 0.97, angle: 107, dihedral: 180 }] }, groupAtoms: [0, 5, 6, 7] },
  { value: 'amino', label: 'Amino', molecule: 'ethylamine', formula: 'NH2', polarity: 'polar', charge: 'positive at pH 7 (it picks up an H+)', water: 'hydrophilic; a base', found: 'amino acids, the bases of DNA and RNA',
    mol: { atoms: [...skeleton(), ...twoH(), { el: 'N', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.47, angle: 110, dihedral: 0 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.01, angle: 109, dihedral: 60 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.01, angle: 109, dihedral: 300 }] }, groupAtoms: [7, 8, 9] },
  { value: 'phosphate', label: 'Phosphate', molecule: 'ethyl phosphate', formula: 'OPO3', polarity: 'polar', charge: 'negative (two charges at pH 7)', water: 'hydrophilic; stores and transfers energy', found: 'ATP, DNA and RNA backbones, phospholipids',
    mol: { atoms: [...skeleton(), ...twoH(), { el: 'O', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.43, angle: 109, dihedral: 0 }, { el: 'P', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.60, angle: 120, dihedral: 180 }, { el: 'O', to: 8, angleTo: 7, dihedralTo: 0, bond: 1.50, angle: 109.5, dihedral: 60, tag: 'negative' }, { el: 'O', to: 8, angleTo: 7, dihedralTo: 0, bond: 1.50, angle: 109.5, dihedral: 180, tag: 'negative' }, { el: 'O', to: 8, angleTo: 7, dihedralTo: 0, bond: 1.50, angle: 109.5, dihedral: 300 }] }, groupAtoms: [7, 8, 9, 10, 11] },
  { value: 'sulfhydryl', label: 'Sulfhydryl', molecule: 'ethanethiol', formula: 'SH', polarity: 'slightly polar', charge: 'none', water: 'weakly hydrophilic', found: 'the amino acid cysteine; two of them link to hold a protein in shape',
    mol: { atoms: [...skeleton(), ...twoH(), { el: 'S', to: 0, angleTo: 1, dihedralTo: 2, bond: 1.82, angle: 109, dihedral: 0 }, { el: 'H', to: 7, angleTo: 0, dihedralTo: 1, bond: 1.34, angle: 96, dihedral: 180 }] }, groupAtoms: [7, 8] },
];

export function init(root: HTMLElement, controls: HTMLElement, viewer: MultiViewer | null) {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  stage.innerHTML = `<div class="tile-view" data-view role="img" aria-label="Three-dimensional model of a two-carbon skeleton carrying the selected functional group. Drag to rotate; tap an atom for its name."></div><div class="atom-label" data-atom-label hidden></div><p class="stage-note" data-note></p>`;
  const stageNote = stage.querySelector<HTMLElement>('[data-note]')!;
  let current = GROUPS[0];
  let tile: Tile | null = null;
  const muted = '#7C8FA6';

  const rMol = readout('Molecule'), rPol = readout('Polarity'), rCharge = readout('Charge in the cell'), rWater = readout('In water'), rFound = readout('Found in');
  function paint() {
    const g = current;
    const set = new Set(g.groupAtoms);
    const s = build(g.mol, {
      id: g.value, radiusScale: 1.3, tilt: [0.3, 0.6, 0],
      colorBy: (i, el) => (set.has(i) ? ELEMENTS[el].color : muted),
      labelFor: (i, el) => `${ELEMENTS[el].name}${set.has(i) ? `, ${g.label.toLowerCase()} group` : ', skeleton'}${g.mol.atoms[i].tag ? ', ' + g.mol.atoms[i].tag : ''}`,
    });
    if (viewer) { if (tile) viewer.replace(tile, s, true); else tile = viewer.addTile(stage, s, { spinSpeed: 0.4 }); }
    else if (!stage.querySelector('.stage-notice')) stage.append(webglNotice());
    stageNote.textContent = `${g.label} group in color, carbon skeleton in gray. ${g.molecule}.`;
    rMol.set(`${g.molecule} (skeleton + ${g.formula})`); rPol.set(g.polarity); rCharge.set(g.charge); rWater.set(g.water); rFound.set(g.found);
  }
  const readouts = document.createElement('div'); readouts.className = 'readouts'; readouts.append(rMol, rPol, rCharge, rWater, rFound);
  controls.append(segmented({ label: 'Functional group on the skeleton', options: GROUPS.map((g) => ({ value: g.value, label: g.label })), value: current.value, onChange: (v) => { current = GROUPS.find((g) => g.value === v)!; paint(); } }), readouts);
  paint();

  // ---- polymer step-through ----
  controls.append(polymerFigure());
  // ---- Miller and Urey ----
  controls.append(millerUreyFigure());
}

function polymerFigure() {
  const wrap = document.createElement('div'); wrap.className = 'fig-block';
  const head = document.createElement('p'); head.className = 'k k-c'; head.textContent = 'Building and breaking polymers';
  const svgWrap = document.createElement('div'); svgWrap.className = 'fig-wrap';
  svgWrap.innerHTML = `<svg class="fig" viewBox="0 0 640 220" role="img" aria-label="Two monomers joined by dehydration synthesis as a water molecule leaves; hydrolysis reverses it">
    <g font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1">
      <text x="24" y="20">MONOMER</text><text x="470" y="20" data-l2>MONOMER</text>
      <text x="270" y="210" text-anchor="middle" data-caption>separate</text>
    </g>
    <g id="m1"><polygon points="60,60 130,60 165,120 130,180 60,180 25,120" fill="none" stroke="var(--ink)" stroke-width="1.5"/><text x="95" y="126" text-anchor="middle" font-family="var(--font-data)" font-size="13" fill="var(--ink)">C6</text></g>
    <g id="oh1"><line x1="165" y1="120" x2="205" y2="120" stroke="var(--ink)" stroke-width="1.5"/><circle cx="215" cy="120" r="12" fill="#E0483F"/><text x="215" y="124" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="#fff">O</text><circle data-h1 cx="240" cy="120" r="8" fill="#C9D3DD"/><text data-h1t x="240" y="124" text-anchor="middle" font-family="var(--font-data)" font-size="10" fill="#13253A">H</text></g>
    <g id="m2" data-m2><polygon points="480,60 550,60 585,120 550,180 480,180 445,120" fill="none" stroke="var(--ink)" stroke-width="1.5"/><text x="515" y="126" text-anchor="middle" font-family="var(--font-data)" font-size="13" fill="var(--ink)">C6</text>
      <line x1="445" y1="120" x2="405" y2="120" stroke="var(--ink)" stroke-width="1.5"/><circle data-h2 cx="395" cy="120" r="8" fill="#C9D3DD"/><text data-h2t x="395" y="124" text-anchor="middle" font-family="var(--font-data)" font-size="10" fill="#13253A">H</text></g>
    <g data-water opacity="0"><circle cx="330" cy="50" r="12" fill="#E0483F"/><circle cx="316" cy="36" r="7" fill="#C9D3DD"/><circle cx="344" cy="36" r="7" fill="#C9D3DD"/><text x="330" y="80" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--faint)" letter-spacing="1">H2O</text></g>
    <text data-bondlabel x="270" y="100" text-anchor="middle" font-family="var(--font-data)" font-size="11" fill="var(--signal)" letter-spacing="1" opacity="0">COVALENT BOND</text>
  </svg>`;
  const svg = svgWrap.querySelector('svg')!;
  const m2 = svg.querySelector<SVGGElement>('[data-m2]')!, water = svg.querySelector<SVGGElement>('[data-water]')!, h1 = svg.querySelector<SVGCircleElement>('[data-h1]')!, h1t = svg.querySelector<SVGTextElement>('[data-h1t]')!, h2 = svg.querySelector<SVGCircleElement>('[data-h2]')!, h2t = svg.querySelector<SVGTextElement>('[data-h2t]')!, cap = svg.querySelector<SVGTextElement>('[data-caption]')!, bondLabel = svg.querySelector<SVGTextElement>('[data-bondlabel]')!, l2 = svg.querySelector<SVGTextElement>('[data-l2]')!;
  let p = 0;
  function render(v: number) {
    p = v;
    // the second monomer slides in; its H and the first monomer's OH hydrogen lift off as water
    const shift = -150 * v;
    m2.setAttribute('transform', `translate(${shift} 0)`);
    l2.setAttribute('x', String(470 + shift));
    const lift = Math.min(1, v * 1.6);
    h1.setAttribute('cy', String(120 - 70 * lift)); h1t.setAttribute('y', String(124 - 70 * lift)); h1.setAttribute('opacity', String(1 - lift)); h1t.setAttribute('opacity', String(1 - lift));
    h2.setAttribute('cy', String(120 - 70 * lift)); h2t.setAttribute('y', String(124 - 70 * lift)); h2.setAttribute('opacity', String(1 - lift)); h2t.setAttribute('opacity', String(1 - lift));
    water.setAttribute('opacity', String(Math.max(0, (v - 0.4) / 0.6)));
    water.setAttribute('transform', `translate(0 ${-30 * Math.max(0, v - 0.6)})`);
    bondLabel.setAttribute('opacity', String(v > 0.9 ? 1 : 0));
    cap.textContent = v < 0.05 ? 'two monomers, each with an OH and an H to give' : v < 0.95 ? 'an OH from one and an H from the other leave together as water' : 'joined: the oxygen now bridges the two monomers';
  }
  let anim = 0;
  function animateTo(target: number) {
    cancelAnimationFrame(anim);
    if (reduceMotion()) { render(target); slide.set(target); return; }
    const from = p, start = performance.now(), dur = 1400;
    const tick = (now: number) => { const k = Math.min(1, (now - start) / dur); const v = from + (target - from) * (1 - Math.cos(k * Math.PI)) / 2; render(v); slide.set(v); if (k < 1) anim = requestAnimationFrame(tick); };
    anim = requestAnimationFrame(tick);
  }
  const slide = slider({ label: 'Reaction progress', min: 0, max: 1, step: 0.01, value: 0, format: (v) => (v < 0.05 ? 'apart' : v > 0.95 ? 'joined' : `${Math.round(v * 100)}%`), onInput: (v) => { cancelAnimationFrame(anim); render(v); } });
  wrap.append(head, svgWrap, row(button('Dehydration synthesis', () => animateTo(1), true), button('Hydrolysis', () => animateTo(0)), slide),
    note('Dehydration synthesis removes a water molecule and forms the bond; hydrolysis adds water back and breaks it. Starch, proteins, and nucleic acids are all built and taken apart this way.'));
  render(0);
  return wrap;
}

function millerUreyFigure() {
  const wrap = document.createElement('div'); wrap.className = 'fig-block';
  const head = document.createElement('p'); head.className = 'k k-c'; head.textContent = 'Miller and Urey, 1953';
  const svgWrap = document.createElement('div'); svgWrap.className = 'fig-wrap';
  svgWrap.innerHTML = `<svg class="fig" viewBox="0 0 640 260" role="img" aria-label="The Miller and Urey apparatus: a heated flask of water, a flask of gases with electrodes, a condenser, and a trap">
    <g fill="none" stroke="var(--ink)" stroke-width="1.5">
      <path d="M120 230 a45 45 0 1 1 90 0 z" data-ocean/><rect x="155" y="150" width="20" height="36"/>
      <path d="M165 150 V 60 H 420" /><circle cx="470" cy="80" r="50" data-atm/>
      <path d="M470 130 V 200 H 400 V 230" /><path d="M395 230 a12 12 0 1 0 24 0" />
      <path d="M400 200 H 215" data-return/>
      <line x1="440" y1="60" x2="455" y2="75"/><line x1="500" y1="60" x2="485" y2="75"/>
    </g>
    <g data-spark opacity="0" stroke="#F5A524" stroke-width="2" fill="none"><path d="M456 76 l6 -6 l-3 8 l7 -5 l-4 9 l8 -6"/></g>
    <g data-heat opacity="0.35"><path d="M150 245 q5 -8 0 -16 q-5 -8 0 -16" fill="none" stroke="#F5A524" stroke-width="1.5"/><path d="M165 245 q5 -8 0 -16 q-5 -8 0 -16" fill="none" stroke="#F5A524" stroke-width="1.5"/><path d="M180 245 q5 -8 0 -16 q-5 -8 0 -16" fill="none" stroke="#F5A524" stroke-width="1.5"/></g>
    <g data-gases opacity="0" font-family="var(--font-data)" font-size="10" fill="var(--muted)" letter-spacing="1"><text x="434" y="102">CH4</text><text x="484" y="120">NH3</text><text x="446" y="120">H2</text><text x="482" y="102">H2O</text></g>
    <g data-drops opacity="0" fill="#3B6FE0"><circle cx="470" cy="150" r="3"/><circle cx="470" cy="170" r="3"/><circle cx="470" cy="190" r="3"/></g>
    <g data-products opacity="0"><circle cx="407" cy="236" r="5" fill="#E0483F"/><circle cx="398" cy="232" r="4" fill="#3B6FE0"/><circle cx="412" cy="228" r="3" fill="#5B6B7C"/></g>
    <g font-family="var(--font-data)" font-size="10" fill="var(--faint)" letter-spacing="1.2">
      <text x="120" y="252" text-anchor="middle">"OCEAN", HEATED</text><text x="470" y="20" text-anchor="middle">"ATMOSPHERE"</text><text x="590" y="80" text-anchor="middle">SPARKS</text><text x="520" y="180" text-anchor="middle">CONDENSER</text><text x="407" y="258" text-anchor="middle">TRAP</text>
    </g>
  </svg>`;
  const cap = document.createElement('p'); cap.className = 'note'; cap.dataset.cap = '';
  const svg = svgWrap.querySelector('svg')!;
  const q = (sel: string) => svg.querySelector<SVGElement>(sel)!;
  const steps = [
    { label: '1 Fill', cap: 'Water below, heated; methane, ammonia, hydrogen, and water vapor above. No oxygen, no life.', gases: 1, spark: 0, drops: 0, products: 0 },
    { label: '2 Spark', cap: 'Electric sparks stand in for lightning. Bonds in the gases break and re-form into new molecules.', gases: 1, spark: 1, drops: 0, products: 0 },
    { label: '3 Condense', cap: 'The vapor cools in the condenser and rains back down, carrying whatever formed.', gases: 0.6, spark: 1, drops: 1, products: 0 },
    { label: '4 Collect', cap: 'After a week the trap holds amino acids and other organic molecules, made with no living thing involved.', gases: 0.6, spark: 0, drops: 1, products: 1 },
  ];
  function show(i: number) {
    const s = steps[i];
    q('[data-gases]').setAttribute('opacity', String(s.gases)); q('[data-spark]').setAttribute('opacity', String(s.spark)); q('[data-drops]').setAttribute('opacity', String(s.drops)); q('[data-products]').setAttribute('opacity', String(s.products));
    cap.textContent = s.cap;
  }
  const seg = segmented({ label: 'Step', options: steps.map((s, i) => ({ value: String(i), label: s.label })), value: '0', onChange: (v) => show(Number(v)) });
  const verdict = document.createElement('div'); verdict.className = 'spec';
  verdict.innerHTML = `<div class="spec-line"><span class="sl-label">Showed</span><span class="sl-fill"></span><span class="sl-value body">Building blocks of life form from simple gases and energy, without life</span></div><div class="spec-line"><span class="sl-label">Did not show</span><span class="sl-fill"></span><span class="sl-value body">How life began; the early atmosphere was probably not this mixture</span></div>`;
  wrap.append(head, svgWrap, cap, seg, verdict);
  show(0);
  return wrap;
}
