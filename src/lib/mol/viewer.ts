/**
 * One WebGL renderer draws every molecule on a page. Each tile owns a scene and camera; the renderer paints
 * each visible tile into its own scissor rectangle on a single fixed canvas behind the page. Six separate
 * canvases would mean six GL contexts, which tablets handle badly; one context with several viewports is cheap.
 */
import * as THREE from 'three';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const BOND = '#8b94a1';

export interface Structure {
  id: string;
  name?: string;
  subtitle?: string;
  positions: Float32Array;
  bonds: Array<[number, number]>;
  atomColors: string[];
  atomRadii?: number[];
  bondColors?: string[];
  bondRadius?: number;
  /** Tap label per atom. Falls back to bond-count text when `degree` is present. */
  labels?: string[];
  degree?: Uint8Array;
  /** Bulk bond count for a crystalline model. Edge atoms cut by the model boundary keep the bulk color. */
  bulkDegree?: number;
  /** Ordered atom indices of faces to fill (the twelve C60 pentagons). */
  faces?: number[][];
  faceColor?: string;
  /** Atom pairs joined by a dashed line (graphite interlayer spacing, hydrogen bonds). */
  dashed?: Array<[number, number]>;
  dashedColor?: string;
  /** Extra meshes: dipole arrows, groove markers, anything the structure needs. */
  decorate?: (group: THREE.Group, s: Structure) => void;
  tilt: [number, number, number];
  radius: number;
  facts?: string[];
}

export interface Tile {
  id: string;
  el: HTMLElement;
  view: HTMLElement;
  label: HTMLElement | null;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  spinner: THREE.Group;
  content: THREE.Group;
  atoms: THREE.InstancedMesh;
  bondsMesh: THREE.InstancedMesh;
  dashedLine: THREE.LineSegments | null;
  structure: Structure;
  basePositions: Float32Array;
  dist: number;
  target: number;
  fitDist: number;
  zoom: number;
  visible: boolean;
  spinSpeed: number;
  flash?: number;
  onPick?: (index: number) => void;
}

export class MultiViewer {
  private renderer: THREE.WebGLRenderer;
  private tiles: Tile[] = [];
  private timer = new THREE.Timer();
  private raycaster = new THREE.Raycaster();
  private io: IntersectionObserver;
  private dirty = true;
  playing: boolean;
  focused: Tile | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.playing = !reduceMotion();
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) { const t = this.tiles.find((t) => t.el === e.target); if (t) t.visible = e.isIntersecting; }
      this.dirty = true;
    }, { rootMargin: '80px' });
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('scroll', () => { this.dirty = true; }, { passive: true });
    this.resize();
    requestAnimationFrame(this.frame);
  }

  /** Mount a structure into `el`, which must contain a `[data-view]` element (and may contain `[data-atom-label]`). */
  addTile(el: HTMLElement, structure: Structure, opts: { spinSpeed?: number; orbit?: boolean; onPick?: (index: number) => void } = {}): Tile {
    const view = el.querySelector<HTMLElement>('[data-view]')!;
    const label = el.querySelector<HTMLElement>('[data-atom-label]');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(4, 6, 8); camera.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-6, -3, 5); camera.add(fill);
    scene.add(camera, new THREE.HemisphereLight(0xffffff, 0x2a3140, 1.1));
    const root = new THREE.Group(); root.rotation.set(...structure.tilt);
    const spinner = new THREE.Group(); root.add(spinner); scene.add(root);
    const content = new THREE.Group(); spinner.add(content);
    const { atoms, bonds, dashedLine } = buildContent(content, structure);
    const tile: Tile = {
      id: structure.id, el, view, label, scene, camera, root, spinner, content, atoms, bondsMesh: bonds, dashedLine, structure,
      basePositions: structure.positions.slice(), dist: 10, target: 10, fitDist: 10, zoom: 1, visible: true,
      spinSpeed: opts.spinSpeed ?? 0.35, onPick: opts.onPick,
    };
    if (opts.orbit) el.dataset.orbit = 'full';
    this.fit(tile, false);
    this.bindPointer(tile);
    this.io.observe(el);
    this.tiles.push(tile);
    return tile;
  }

  /** Swap a tile's structure for another (a toggle between two molecules, for example). */
  replace(t: Tile, structure: Structure, keepView = true) {
    t.content.clear();
    const { atoms, bonds, dashedLine } = buildContent(t.content, structure);
    t.atoms = atoms; t.bondsMesh = bonds; t.dashedLine = dashedLine; t.structure = structure; t.basePositions = structure.positions.slice();
    if (!keepView) { t.root.rotation.set(...structure.tilt); t.zoom = 1; }
    this.fit(t, false);
  }

  /** Move every atom to `positions` (same atom order) and re-lay the bonds. Used for morphs and animation. */
  setPositions(t: Tile, positions: Float32Array) {
    t.structure.positions = positions;
    layoutAtoms(t.atoms, positions, t.structure);
    layoutBonds(t.bondsMesh, positions, t.structure);
    if (t.dashedLine && t.structure.dashed) {
      const attr = t.dashedLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      t.structure.dashed.forEach(([i, j], k) => { attr.setXYZ(2 * k, positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]); attr.setXYZ(2 * k + 1, positions[3 * j], positions[3 * j + 1], positions[3 * j + 2]); });
      attr.needsUpdate = true; t.dashedLine.computeLineDistances();
    }
    this.dirty = true;
  }

  /** Linear morph between the tile's base positions and `to`, with 0 <= k <= 1. */
  morph(t: Tile, to: Float32Array, k: number) {
    const a = t.basePositions, out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] + (to[i] - a[i]) * k;
    this.setPositions(t, out);
  }

  recolor(t: Tile, colors: string[]) {
    const c = new THREE.Color();
    colors.forEach((hex, i) => t.atoms.setColorAt(i, c.set(hex)));
    t.atoms.instanceColor!.needsUpdate = true;
    t.structure.atomColors = colors;
    this.dirty = true;
  }

  setPlaying(p: boolean) { this.playing = p; this.dirty = true; }
  redraw() { this.dirty = true; }

  /** Expand one tile (or none). The page changes layout first; the cameras refit on the next frame. */
  focus(tile: Tile | null) {
    this.focused = tile;
    requestAnimationFrame(() => this.fitAll(true));
  }

  fitAll(animate: boolean) { for (const t of this.tiles) this.fit(t, animate); }

  private resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.fitAll(false);
  }

  private fit(t: Tile, animate: boolean) {
    const r = t.view.getBoundingClientRect();
    const aspect = Math.max(0.25, (r.width || 1) / (r.height || 1));
    const vfov = THREE.MathUtils.degToRad(t.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    t.fitDist = (t.structure.radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.02;
    t.target = t.fitDist * t.zoom;
    if (!animate || reduceMotion()) t.dist = t.target;
    this.dirty = true;
  }

  zoom(t: Tile, factor: number) {
    t.zoom = clamp(t.zoom * factor, 0.35, 2.6);
    t.target = t.fitDist * t.zoom;
    if (reduceMotion()) t.dist = t.target;
    this.dirty = true;
  }

  private frame = () => {
    requestAnimationFrame(this.frame);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    let animating = this.playing;
    for (const t of this.tiles) {
      if (Math.abs(t.dist - t.target) > 0.005) { t.dist += (t.target - t.dist) * Math.min(1, dt * 7); animating = true; }
    }
    if (!animating && !this.dirty) return;
    this.dirty = false;
    const H = this.canvas.clientHeight;
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);
    for (const t of this.tiles) {
      if (!t.visible || t.el.offsetParent === null) continue;
      const r = t.view.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 2 || r.height < 2) continue;
      if (this.playing && t.spinSpeed) t.spinner.rotation.y += dt * t.spinSpeed;
      t.camera.aspect = r.width / r.height;
      t.camera.position.set(0, 0, t.dist);
      t.camera.updateProjectionMatrix();
      const bottom = H - r.bottom;
      this.renderer.setViewport(r.left, bottom, r.width, r.height);
      this.renderer.setScissor(r.left, bottom, r.width, r.height);
      this.renderer.render(t.scene, t.camera);
    }
  };

  private bindPointer(t: Tile) {
    const v = t.view;
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = false, pinch = 0, last: { x: number; y: number } | null = null;
    const fullOrbit = () => this.focused === t || t.el.dataset.orbit === 'full';
    v.addEventListener('pointerdown', (e) => {
      v.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false; last = { x: e.clientX, y: e.clientY };
      this.hideLabel(t);
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    v.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) this.zoom(t, pinch / d);
        pinch = d; moved = true; return;
      }
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      t.root.rotation.y += dx * 0.008;
      if (fullOrbit()) t.root.rotation.x = clamp(t.root.rotation.x + dy * 0.008, -1.45, 1.45);
      this.dirty = true;
    });
    const up = (e: PointerEvent) => {
      const tap = !moved && pointers.size === 1;
      pointers.delete(e.pointerId); last = null; pinch = 0;
      if (tap) this.pick(t, e);
    };
    v.addEventListener('pointerup', up);
    v.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); last = null; pinch = 0; });
    v.addEventListener('wheel', (e) => {
      // A plain wheel keeps scrolling the page. Ctrl or Cmd with the wheel (a trackpad pinch) zooms.
      if (!fullOrbit() || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      this.zoom(t, Math.exp(e.deltaY * 0.01));
    }, { passive: false });
  }

  private pick(t: Tile, e: PointerEvent) {
    const r = t.view.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    t.camera.aspect = r.width / r.height; t.camera.position.set(0, 0, t.dist); t.camera.updateProjectionMatrix(); t.camera.updateMatrixWorld();
    t.scene.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, t.camera);
    const hit = this.raycaster.intersectObject(t.atoms, false)[0];
    if (!hit || hit.instanceId === undefined) { this.hideLabel(t); return; }
    const i = hit.instanceId;
    const s = t.structure;
    let text = s.labels?.[i] ?? 'atom';
    if (!s.labels && s.degree) {
      const deg = s.degree[i];
      text = s.bulkDegree && deg < s.bulkDegree ? `Carbon, ${deg} of ${s.bulkDegree} bonds shown (model edge)` : `Carbon, ${deg} bond${deg === 1 ? '' : 's'}, ${deg >= 4 ? 'sp3' : deg === 3 ? 'sp2' : 'sp'}`;
      if (s.faces?.some((f) => f.includes(i))) text += ', on a pentagon';
    }
    if (t.label) {
      t.label.textContent = text;
      t.label.hidden = false;
      t.label.style.left = `${e.clientX - r.left}px`;
      t.label.style.top = `${e.clientY - r.top}px`;
    }
    t.onPick?.(i);
    const original = new THREE.Color();
    t.atoms.getColorAt(i, original);
    t.atoms.setColorAt(i, new THREE.Color('#ffffff'));
    t.atoms.instanceColor!.needsUpdate = true;
    this.dirty = true;
    window.clearTimeout(t.flash);
    t.flash = window.setTimeout(() => { t.atoms.setColorAt(i, original); t.atoms.instanceColor!.needsUpdate = true; this.dirty = true; }, 1600);
  }

  private hideLabel(t: Tile) { if (t.label) t.label.hidden = true; }
}

/** Optional per-tile helpers a model can use when it builds its own decorations. */
export const M = THREE;

function buildContent(group: THREE.Group, s: Structure) {
  const atoms = buildAtoms(s);
  const bonds = buildBonds(s);
  group.add(atoms, bonds);
  if (s.faces) group.add(buildFaces(s));
  let dashedLine: THREE.LineSegments | null = null;
  if (s.dashed) { dashedLine = buildDashed(s); group.add(dashedLine); }
  s.decorate?.(group, s);
  return { atoms, bonds, dashedLine };
}

const unitSphere = new THREE.SphereGeometry(1, 20, 14);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1);

function layoutAtoms(mesh: THREE.InstancedMesh, positions: Float32Array, s: Structure) {
  const n = positions.length / 3, M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const r = s.atomRadii?.[i] ?? 0.34;
    M4.compose(v.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]), q, sc.set(r, r, r));
    mesh.setMatrixAt(i, M4);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
function layoutBonds(mesh: THREE.InstancedMesh, positions: Float32Array, s: Structure) {
  const A = new THREE.Vector3(), B = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion(), S = new THREE.Vector3(), M4 = new THREE.Matrix4();
  const rb = s.bondRadius ?? 0.1;
  s.bonds.forEach(([i, j], k) => {
    A.fromArray(positions, 3 * i); B.fromArray(positions, 3 * j);
    mid.addVectors(A, B).multiplyScalar(0.5);
    dir.subVectors(B, A);
    const len = dir.length();
    q.setFromUnitVectors(up, dir.normalize());
    S.set(rb, len, rb);
    M4.compose(mid, q, S);
    mesh.setMatrixAt(k, M4);
  });
  mesh.instanceMatrix.needsUpdate = true;
}
function buildAtoms(s: Structure) {
  const n = s.positions.length / 3;
  const mesh = new THREE.InstancedMesh(unitSphere, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 }), n);
  layoutAtoms(mesh, s.positions, s);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c.set(s.atomColors[i]));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
function buildBonds(s: Structure) {
  const mesh = new THREE.InstancedMesh(unitCyl, new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0 }), Math.max(1, s.bonds.length));
  mesh.count = s.bonds.length;
  layoutBonds(mesh, s.positions, s);
  const c = new THREE.Color();
  s.bonds.forEach((_, k) => mesh.setColorAt(k, c.set(s.bondColors?.[k] ?? BOND)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
function buildFaces(s: Structure) {
  const verts: number[] = [];
  for (const f of s.faces!) {
    const c = [0, 0, 0];
    for (const i of f) { c[0] += s.positions[3 * i] / f.length; c[1] += s.positions[3 * i + 1] / f.length; c[2] += s.positions[3 * i + 2] / f.length; }
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length];
      verts.push(c[0], c[1], c[2], s.positions[3 * a], s.positions[3 * a + 1], s.positions[3 * a + 2], s.positions[3 * b], s.positions[3 * b + 1], s.positions[3 * b + 2]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: s.faceColor ?? '#f2785c', transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
}
function buildDashed(s: Structure) {
  const pts: THREE.Vector3[] = [];
  for (const [i, j] of s.dashed!) pts.push(new THREE.Vector3().fromArray(s.positions, 3 * i), new THREE.Vector3().fromArray(s.positions, 3 * j));
  const line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: s.dashedColor ?? '#9aa4b2', dashSize: 0.32, gapSize: 0.22, transparent: true, opacity: 0.85 }));
  line.computeLineDistances();
  return line;
}

/** A small arrow (dipole moment, direction marker) from `from` to `to`. */
export function arrow(from: [number, number, number], to: [number, number, number], color: string, radius = 0.06) {
  const g = new THREE.Group();
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length(); dir.normalize();
  const shaftLen = Math.max(0.01, len - 0.35);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, shaftLen, 10), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, 0.35, 14), mat);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  shaft.quaternion.copy(q); head.quaternion.copy(q);
  shaft.position.copy(a).addScaledVector(dir, shaftLen / 2);
  head.position.copy(a).addScaledVector(dir, shaftLen + 0.175);
  g.add(shaft, head);
  return g;
}
