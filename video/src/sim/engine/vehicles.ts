import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { textures } from "./textures";

// Cars, a box truck and pedestrians, modelled in local space: forward is -Z, ground at y = 0.

export type CarKind = "sedan" | "suv" | "hatch" | "truck";
export type Role = "paint" | "glass" | "trim" | "tire" | "rim" | "tail" | "head" | "box";
export type Part = { geo: THREE.BufferGeometry; role: Role };

const PAINTS = ["#E9EAE6", "#B9BEC2", "#3B4249", "#2A3F5C", "#6E2A26", "#151A1F", "#7D8B7A", "#C8C0AE"];

let shared: ReturnType<typeof makeMaterials> | null = null;
export const carMaterials = () => (shared ??= makeMaterials());

function makeMaterials() {
  const paint = PAINTS.map(
    (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.25, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }),
  );
  return {
    paint,
    glass: new THREE.MeshPhysicalMaterial({ color: "#16212A", metalness: 0.1, roughness: 0.06, envMapIntensity: 1.4 }),
    trim: new THREE.MeshStandardMaterial({ color: "#1B1F23", roughness: 0.7 }),
    tire: new THREE.MeshStandardMaterial({ color: "#17191B", roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: "#B4BABF", metalness: 0.85, roughness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: "#5A0E0B", emissive: "#FF2A1A", emissiveIntensity: 0.25, roughness: 0.3 }),
    tailBright: new THREE.MeshStandardMaterial({ color: "#5A0E0B", emissive: "#FF2A1A", emissiveIntensity: 4, roughness: 0.3 }),
    head: new THREE.MeshStandardMaterial({ color: "#DCE3E8", emissive: "#FFF6E0", emissiveIntensity: 0, roughness: 0.15, metalness: 0.2 }),
    headOn: new THREE.MeshStandardMaterial({ color: "#DCE3E8", emissive: "#FFF6E0", emissiveIntensity: 9, roughness: 0.15 }),
    box: new THREE.MeshStandardMaterial({ color: "#F1F1EE", roughness: 0.6 }),
    shadow: new THREE.MeshBasicMaterial({ color: "#000", alphaMap: textures().contact, transparent: true, opacity: 0.55, depthWrite: false }),
  };
}

function profile(points: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
}

/** Extrude a side profile (u along the car from the rear, v up) across the width, centred. */
function side(points: [number, number][], width: number, length: number, bevel = 0.085) {
  const g = new THREE.ExtrudeGeometry(profile(points), {
    depth: Math.max(0.01, width - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 6,
  });
  // Profile x runs rear to front; map it to -Z, and the extrusion to X.
  g.rotateY(Math.PI / 2);
  g.translate(-(width - bevel * 2) / 2, 0, length / 2);
  return g;
}

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function wheels(r: number, track: number, axles: number[], width = 0.24): Part[] {
  const out: Part[] = [];
  for (const z of axles)
    for (const sx of [-1, 1]) {
      const t = new THREE.CylinderGeometry(r, r, width, 22);
      t.rotateZ(Math.PI / 2);
      t.translate((sx * track) / 2, r, z);
      out.push({ geo: t, role: "tire" });
      const h = new THREE.CylinderGeometry(r * 0.6, r * 0.6, width + 0.02, 18);
      h.rotateZ(Math.PI / 2);
      h.translate((sx * track) / 2, r, z);
      out.push({ geo: h, role: "rim" });
    }
  return out;
}

function lights(L: number, y: number, xIn: number, xOut: number, frontY: number, frontIn = xIn, frontOut = xOut): Part[] {
  const w = xOut - xIn;
  const fw = frontOut - frontIn;
  const out: Part[] = [];
  for (const s of [-1, 1]) {
    out.push({ geo: boxAt(w, 0.1, 0.06, s * (xIn + w / 2), y, L / 2 + 0.02), role: "tail" });
    out.push({ geo: boxAt(fw, 0.09, 0.06, s * (frontIn + fw / 2), frontY, -L / 2 - 0.02), role: "head" });
  }
  return out;
}

const cache = new Map<CarKind, Part[]>();

export function carParts(kind: CarKind): Part[] {
  const hit = cache.get(kind);
  if (hit) return hit;
  let parts: Part[] = [];
  if (kind === "sedan") {
    const L = 4.72;
    parts = [
      { geo: side([[0.06, 0.3], [4.64, 0.3], [4.72, 0.44], [4.7, 0.62], [4.5, 0.78], [3.36, 0.95], [1.06, 0.99], [0.5, 0.98], [0.1, 0.9], [0.02, 0.62]], 1.82, L), role: "paint" },
      { geo: side([[1.0, 0.96], [1.62, 1.37], [2.9, 1.41], [3.46, 0.93]], 1.5, L, 0.03), role: "glass" },
      { geo: side([[1.56, 1.34], [1.68, 1.42], [2.86, 1.46], [2.98, 1.38]], 1.42, L, 0.03), role: "paint" },
      { geo: boxAt(1.86, 0.16, 0.12, 0, 0.36, L / 2 - 0.02), role: "trim" },
      { geo: boxAt(1.86, 0.16, 0.12, 0, 0.36, -L / 2 + 0.02), role: "trim" },
      ...wheels(0.33, 1.6, [-1.45, 1.38]),
      ...lights(L, 0.82, 0.5, 0.86, 0.66, 0.46, 0.84),
    ];
  } else if (kind === "hatch") {
    const L = 4.25;
    parts = [
      { geo: side([[0.05, 0.3], [4.18, 0.3], [4.25, 0.44], [4.22, 0.62], [4.02, 0.78], [3.0, 0.95], [0.3, 0.99], [0.06, 0.92], [0.02, 0.6]], 1.78, L), role: "paint" },
      { geo: side([[0.22, 0.97], [0.5, 1.4], [2.55, 1.44], [3.1, 0.94]], 1.48, L, 0.03), role: "glass" },
      { geo: side([[0.45, 1.37], [0.58, 1.45], [2.5, 1.48], [2.66, 1.4]], 1.4, L, 0.03), role: "paint" },
      { geo: boxAt(1.82, 0.16, 0.12, 0, 0.36, L / 2 - 0.02), role: "trim" },
      ...wheels(0.32, 1.56, [-1.3, 1.28]),
      ...lights(L, 0.86, 0.5, 0.84, 0.66, 0.46, 0.8),
    ];
  } else if (kind === "suv") {
    const L = 4.85;
    parts = [
      { geo: side([[0.06, 0.38], [4.76, 0.38], [4.85, 0.52], [4.83, 0.78], [4.62, 0.98], [3.5, 1.12], [0.12, 1.12], [0.04, 0.9], [0.02, 0.6]], 1.92, L), role: "paint" },
      { geo: side([[0.18, 1.1], [0.36, 1.7], [3.0, 1.74], [3.56, 1.1]], 1.62, L, 0.03), role: "glass" },
      { geo: side([[0.3, 1.68], [0.4, 1.77], [2.96, 1.8], [3.08, 1.72]], 1.56, L, 0.03), role: "paint" },
      { geo: boxAt(1.96, 0.2, 0.12, 0, 0.46, L / 2 - 0.02), role: "trim" },
      { geo: boxAt(1.96, 0.2, 0.12, 0, 0.46, -L / 2 + 0.02), role: "trim" },
      ...wheels(0.38, 1.66, [-1.5, 1.45], 0.27),
      ...lights(L, 1.0, 0.56, 0.9, 0.8, 0.5, 0.88),
    ];
  } else {
    const L = 8.2;
    parts = [
      // Cab at the front, cargo box behind.
      { geo: side([[5.9, 0.55], [8.1, 0.55], [8.2, 0.8], [8.15, 1.35], [7.75, 1.55], [7.5, 2.6], [5.9, 2.65]], 2.3, L), role: "paint" },
      { geo: side([[7.52, 1.62], [7.7, 1.62], [7.86, 1.55], [7.62, 2.5], [7.52, 2.5]], 2.18, L, 0.02), role: "glass" },
      { geo: boxAt(2.48, 2.75, 5.7, 0, 0.95 + 1.375, L / 2 - 2.85), role: "box" },
      { geo: boxAt(2.1, 0.32, 8.0, 0, 0.62, 0), role: "trim" },
      ...wheels(0.48, 1.92, [-2.95, 2.0, 2.95], 0.32),
      ...lights(L, 0.9, 0.72, 1.12, 1.0, 0.7, 1.0),
    ];
  }
  cache.set(kind, parts);
  return parts;
}

export function carLength(kind: CarKind) {
  return kind === "sedan" ? 4.72 : kind === "hatch" ? 4.25 : kind === "suv" ? 4.85 : 8.2;
}

export function materialFor(role: Role, paintIndex: number) {
  const m = carMaterials();
  if (role === "paint") return m.paint[paintIndex % m.paint.length];
  return m[role];
}

/** One moving car: merged by material so it is a handful of draw calls. */
export class Car {
  group = new THREE.Group();
  private tail: THREE.Mesh;
  private head: THREE.Mesh;
  kind: CarKind;
  constructor(kind: CarKind, paint: number) {
    this.kind = kind;
    const parts = carParts(kind);
    const byRole = new Map<Role, THREE.BufferGeometry[]>();
    for (const p of parts) byRole.set(p.role, [...(byRole.get(p.role) ?? []), p.geo.index ? p.geo.toNonIndexed() : p.geo]);
    let tail: THREE.Mesh | null = null;
    let head: THREE.Mesh | null = null;
    for (const [role, geos] of byRole) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), materialFor(role, paint));
      mesh.castShadow = role !== "tail" && role !== "head";
      mesh.receiveShadow = role === "paint" || role === "box";
      this.group.add(mesh);
      if (role === "tail") tail = mesh;
      if (role === "head") head = mesh;
    }
    this.tail = tail!;
    this.head = head!;
    const L = carLength(kind);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(kind === "truck" ? 3.0 : 2.4, L * 1.1), carMaterials().shadow);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.03;
    sh.renderOrder = 1;
    this.group.add(sh);
  }
  place(x: number, z: number, h: number, opts: { braking?: boolean; lights?: boolean; pitch?: number; visible?: boolean } = {}) {
    this.group.visible = opts.visible ?? true;
    this.group.position.set(x, 0, z);
    this.group.rotation.set(opts.pitch ?? 0, -h, 0, "YXZ");
    const m = carMaterials();
    this.tail.material = opts.braking ? m.tailBright : opts.lights ? m.tailBright : m.tail;
    this.head.material = opts.lights ? m.headOn : m.head;
  }
}

// ---------- People ----------

const SKIN = ["#E7C3A3", "#C99A72", "#8D5A3B", "#5E3B28", "#F0D2B8"];
const TOPS = ["#2E3D55", "#8B4A36", "#5B6B4A", "#D8D2C2", "#3A3F45", "#7A6A8E", "#B89A5A"];
const BOTTOMS = ["#24292F", "#3C4652", "#55504A", "#2D3A4A"];

const personMats = new Map<string, THREE.MeshStandardMaterial>();
const pm = (c: string) => {
  let m = personMats.get(c);
  if (!m) personMats.set(c, (m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })));
  return m;
};

export class Person {
  group = new THREE.Group();
  private legs: THREE.Object3D[] = [];
  private arms: THREE.Object3D[] = [];
  constructor(seed: number, opts: { vest?: boolean } = {}) {
    const pick = <T,>(a: T[], k: number) => a[Math.floor(((seed * 9301 + k * 49297) % 233280) / 233280 * a.length) % a.length];
    const skin = pm(pick(SKIN, 1));
    const top = pm(pick(TOPS, 2));
    const bottom = pm(pick(BOTTOMS, 3));
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), top);
    torso.scale.z = 0.7;
    torso.position.y = 1.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), skin);
    head.position.y = 1.66;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), pm(pick(["#2B2420", "#6B5B4B", "#C9C2B6", "#1A1716", "#8A6A4A"], 4)));
    hair.position.y = 1.68;
    this.group.add(torso, head, hair);
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      const lm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.74, 4, 8), bottom);
      lm.position.y = -0.44;
      leg.add(lm);
      leg.position.set(s * 0.1, 0.92, 0);
      this.legs.push(leg);
      const arm = new THREE.Group();
      const am = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.56, 4, 8), top);
      am.position.y = -0.32;
      arm.add(am);
      arm.position.set(s * 0.25, 1.46, 0);
      this.arms.push(arm);
      this.group.add(leg, arm);
    }
    if (opts.vest) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), new THREE.MeshStandardMaterial({ color: "#E8E2C8", emissive: "#FFF2C0", emissiveIntensity: 0.35, roughness: 0.4 }));
      band.scale.z = 0.72;
      band.position.y = 1.18;
      this.group.add(band);
    }
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
  }
  /** Walking phase in metres travelled; 0 speed stands still. */
  place(x: number, z: number, h: number, walked: number, visible = true, y = 0.15) {
    this.group.visible = visible;
    this.group.position.set(x, y, z);
    this.group.rotation.y = -h;
    const sw = Math.sin(walked * 2.6) * 0.42;
    this.legs[0].rotation.x = sw;
    this.legs[1].rotation.x = -sw;
    this.arms[0].rotation.x = -sw * 0.8;
    this.arms[1].rotation.x = sw * 0.8;
  }
}
