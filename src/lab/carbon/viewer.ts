/**
 * One WebGL renderer draws every model. Each tile on the page owns a scene and camera, and
 * the renderer paints each visible tile into its own scissor rectangle on a single fixed
 * canvas behind the page. Six separate canvases would mean six GL contexts, which tablets
 * handle badly; one context with six viewports is cheap.
 */
import * as THREE from 'three';
import { COLORS, type Structure } from './structures';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface Tile {
  id: string;
  el: HTMLElement;
  view: HTMLElement;
  label: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  spinner: THREE.Group;
  atoms: THREE.InstancedMesh;
  structure: Structure;
  dist: number;
  target: number;
  fitDist: number;
  zoom: number;
  visible: boolean;
  spinSpeed: number;
  flash?: number;
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

  addTile(el: HTMLElement, structure: Structure, spinSpeed = 0.35): Tile {
    const view = el.querySelector<HTMLElement>('[data-view]')!;
    const label = el.querySelector<HTMLElement>('[data-atom-label]')!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(4, 6, 8); camera.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-6, -3, 5); camera.add(fill);
    scene.add(camera, new THREE.HemisphereLight(0xffffff, 0x2a3140, 1.1));
    const root = new THREE.Group(); root.rotation.set(...structure.tilt);
    const spinner = new THREE.Group(); root.add(spinner); scene.add(root);
    const atoms = buildAtoms(structure);
    spinner.add(atoms, buildBonds(structure));
    if (structure.faces) spinner.add(buildFaces(structure));
    if (structure.dashed) spinner.add(buildDashed(structure));
    const tile: Tile = { id: structure.id, el, view, label, scene, camera, root, spinner, atoms, structure, dist: 10, target: 10, fitDist: 10, zoom: 1, visible: true, spinSpeed };
    this.fit(tile, false);
    this.bindPointer(tile);
    this.io.observe(el);
    this.tiles.push(tile);
    return tile;
  }

  setPlaying(p: boolean) { this.playing = p; this.dirty = true; }

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
      if (this.playing) t.spinner.rotation.y += dt * t.spinSpeed;
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
      if (this.focused === t) t.root.rotation.x = clamp(t.root.rotation.x + dy * 0.008, -1.45, 1.45);
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
      // A plain wheel keeps scrolling the page. Ctrl or Cmd with the wheel, which is also what a
      // trackpad pinch sends, zooms the expanded model.
      if (this.focused !== t || !(e.ctrlKey || e.metaKey)) return;
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
    const deg = s.degree[i];
    let text: string;
    if (s.bulkDegree && deg < s.bulkDegree) text = `Carbon, ${deg} of ${s.bulkDegree} bonds shown (model edge)`;
    else text = `Carbon, ${deg} bond${deg === 1 ? '' : 's'}, ${deg >= 4 ? 'sp3' : deg === 3 ? 'sp2' : 'sp'}`;
    if (s.faces?.some((f) => f.includes(i))) text += ', on a pentagon';
    t.label.textContent = text;
    t.label.hidden = false;
    t.label.style.left = `${e.clientX - r.left}px`;
    t.label.style.top = `${e.clientY - r.top}px`;
    const original = new THREE.Color();
    t.atoms.getColorAt(i, original);
    t.atoms.setColorAt(i, new THREE.Color('#ffffff'));
    t.atoms.instanceColor!.needsUpdate = true;
    this.dirty = true;
    window.clearTimeout(t.flash);
    t.flash = window.setTimeout(() => { t.atoms.setColorAt(i, original); t.atoms.instanceColor!.needsUpdate = true; this.dirty = true; }, 1600);
  }

  private hideLabel(t: Tile) { t.label.hidden = true; }
}

function buildAtoms(s: Structure) {
  const n = s.positions.length / 3;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 20, 14), new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 }), n);
  const M = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    M.makeTranslation(s.positions[3 * i], s.positions[3 * i + 1], s.positions[3 * i + 2]);
    mesh.setMatrixAt(i, M);
    mesh.setColorAt(i, c.set(s.atomColors[i]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function buildBonds(s: Structure) {
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 10, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0 }), s.bonds.length);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion(), S = new THREE.Vector3(), M = new THREE.Matrix4(), c = new THREE.Color();
  s.bonds.forEach(([i, j], k) => {
    A.fromArray(s.positions, 3 * i); B.fromArray(s.positions, 3 * j);
    mid.addVectors(A, B).multiplyScalar(0.5);
    dir.subVectors(B, A);
    const len = dir.length();
    q.setFromUnitVectors(up, dir.normalize());
    S.set(1, len, 1);
    M.compose(mid, q, S);
    mesh.setMatrixAt(k, M);
    mesh.setColorAt(k, c.set(s.bondColors?.[k] ?? COLORS.bond));
  });
  mesh.instanceMatrix.needsUpdate = true;
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
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
}

function buildDashed(s: Structure) {
  const pts: THREE.Vector3[] = [];
  for (const [i, j] of s.dashed!) pts.push(new THREE.Vector3().fromArray(s.positions, 3 * i), new THREE.Vector3().fromArray(s.positions, 3 * j));
  const line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: COLORS.dash, dashSize: 0.32, gapSize: 0.22, transparent: true, opacity: 0.85 }));
  line.computeLineDistances();
  return line;
}
