import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { dir, rng } from "./motion";
import { textures } from "./textures";
import { carLength, carParts, materialFor, type CarKind } from "./vehicles";

// Shared environment materials and a builder that merges static scenery by material.

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });

let M: ReturnType<typeof makeMats> | null = null;
export const mats = () => (M ??= makeMats());

function makeMats() {
  const t = textures();
  const facade = (f: { map: THREE.Texture; night: THREE.Texture }) => std({ map: f.map, emissiveMap: f.night, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.75 });
  const offset = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  return {
    asphalt: std({ map: t.asphalt, roughness: 0.94 }),
    patch: std({ color: "#3E4348", roughness: 0.95, ...offset }),
    white: std({ color: "#EFEFEA", roughness: 0.6, ...offset }),
    yellow: std({ color: "#E6B23A", roughness: 0.6, ...offset }),
    concrete: std({ map: t.concrete, roughness: 0.9, ...offset }),
    curb: std({ color: "#BEBCB4", roughness: 0.85 }),
    grass: std({ map: t.grass, roughness: 0.98 }),
    lawn: std({ map: t.grass, color: "#E6F0D2", roughness: 0.98, ...offset }),
    field: std({ map: t.grass, color: "#E8E0B8", roughness: 1 }),
    gravel: std({ map: t.gravel, roughness: 1, ...offset }),
    bark: std({ color: "#5E4C3D" }),
    foliage: std({ vertexColors: true, roughness: 0.9 }),
    siding: ["#F2F1EC", "#C9D3D9", "#C7CDB8", "#E5DCC9", "#9AA7B0", "#D7C7B5"].map((c) => std({ map: t.siding, color: c })),
    roof: ["#5B5B5C", "#4A3F3A", "#6B6460"].map((c) => std({ map: t.shingles, color: c, roughness: 0.95 })),
    trim: std({ color: "#F4F3EF", roughness: 0.6 }),
    door: ["#2F3E4E", "#7A2F28", "#3E4A3B", "#1E2226"].map((c) => std({ color: c, roughness: 0.5 })),
    window: new THREE.MeshPhysicalMaterial({ color: "#2A3845", roughness: 0.08, metalness: 0.15, envMapIntensity: 1.3, emissive: "#FFD9A0", emissiveIntensity: 0 }),
    brickRed: facade(t.brickRed),
    brickTan: facade(t.brickTan),
    stucco: facade(t.stucco),
    stuccoGrey: facade(t.stuccoGrey),
    office: facade(t.office),
    storefront: facade(t.storefront),
    roofFlat: std({ color: "#6F7275", roughness: 0.95 }),
    cornice: std({ color: "#DCD8CE", roughness: 0.7 }),
    awning: ["#2F4A3F", "#7A2E2A", "#2C3E5A", "#4A4F55"].map((c) => std({ color: c, roughness: 0.8, side: THREE.DoubleSide })),
    metal: std({ color: "#3F464D", roughness: 0.5, metalness: 0.6 }),
    galv: std({ color: "#A3AAAF", roughness: 0.45, metalness: 0.7 }),
    signal: std({ color: "#22272C", roughness: 0.6 }),
    backplate: std({ color: "#15181B", roughness: 0.7 }),
    stopFace: std({ map: t.stop, roughness: 0.5, emissive: "#ffffff", emissiveMap: t.stop, emissiveIntensity: 0 }),
    signBack: std({ color: "#9DA3A7", roughness: 0.5, metalness: 0.4 }),
    lampHead: std({ color: "#D9D6CC", emissive: "#FFD8A0", emissiveIntensity: 0, roughness: 0.4 }),
    wood: std({ color: "#8A7A66", roughness: 0.95 }),
    barn: std({ color: "#8C4A3C", roughness: 0.9 }),
    barrier: std({ color: "#C8C7C1", roughness: 0.8 }),
    hill: std({ color: "#8FA396", roughness: 1, flatShading: true, side: THREE.DoubleSide }),
    hillFar: std({ color: "#A9B9B4", roughness: 1, flatShading: true, side: THREE.DoubleSide }),
    skyline: std({ color: "#9CA8B3", roughness: 1 }),
    pool: new THREE.MeshBasicMaterial({ color: "#FFC98A", alphaMap: t.glow, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, ...offset }),
    tailOff: std({ color: "#7A1C16", roughness: 0.3 }),
    headOff: std({ color: "#C9D0D5", roughness: 0.15, metalness: 0.3 }),
    contact: new THREE.MeshBasicMaterial({ color: "#000", alphaMap: t.contact, transparent: true, opacity: 0.5, depthWrite: false, ...offset }),
    lampOff: { red: std({ color: "#3A1512", roughness: 0.3 }), yellow: std({ color: "#3A2C0E", roughness: 0.3 }), green: std({ color: "#0F2E22", roughness: 0.3 }) },
    lampOn: {
      red: new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF3A2A").multiplyScalar(3) }),
      yellow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFB524").multiplyScalar(3) }),
      green: new THREE.MeshBasicMaterial({ color: new THREE.Color("#2BE08A").multiplyScalar(3) }),
    },
    halo: new THREE.SpriteMaterial({ map: t.glow, color: "#FFD9A0", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}

export type Mats = ReturnType<typeof makeMats>;

/** Materials whose surfaces sit on the ground: they take shadows but don't cast them. */
const flat = () => {
  const m = mats();
  return new Set<THREE.Material>([m.asphalt, m.patch, m.white, m.yellow, m.concrete, m.grass, m.lawn, m.field, m.gravel, m.pool, m.contact]);
};

export const m4 = (x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(sx, sy, sz));

export class Kit {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  rnd: () => number;
  constructor(seed: number) {
    this.rnd = rng(seed);
  }

  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    if ((mat as THREE.MeshStandardMaterial).vertexColors && !g.attributes.color) {
      const c = new Float32Array(g.attributes.position.count * 3).fill(1);
      g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    }
    if (!(mat as THREE.MeshStandardMaterial).vertexColors && g.attributes.color) g.deleteAttribute("color");
    const list = this.buckets.get(mat) ?? [];
    list.push(g);
    this.buckets.set(mat, list);
  }

  build() {
    const group = new THREE.Group();
    const ground = flat();
    for (const [mat, geos] of this.buckets) {
      const merged = mergeGeometries(geos);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.receiveShadow = true;
      mesh.castShadow = !ground.has(mat);
      if (mat === mats().pool || mat === mats().contact) mesh.renderOrder = 2;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }

  // ---------- Ground ----------

  /** Horizontal rectangle with world-aligned UVs (one repeat every `tile` metres). */
  rect(x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, tile = 8) {
    const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0));
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, -p.getZ(i) / tile);
    this.add(g, mat);
  }

  /** A raised block with rounded corners: curb sides, a top surface, and an optional sidewalk ring. */
  block(x0: number, z0: number, x1: number, z1: number, o: { r?: number; top: THREE.Material; walk?: number; strip?: number; height?: number }) {
    const m = mats();
    const r = o.r ?? 5;
    const h = o.height ?? 0.15;
    const shape = roundRect(x0, z0, x1, z1, r);
    const slab = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 8 });
    slab.rotateX(-Math.PI / 2);
    this.add(slab, m.curb);
    const top = new THREE.ShapeGeometry(shape, 8);
    top.rotateX(-Math.PI / 2);
    top.translate(0, h + 0.004, 0);
    uvFromXZ(top, o.top === m.concrete ? 1.6 : 6);
    this.add(top, o.top);
    if (o.walk) {
      const s = o.strip ?? 0;
      const outer = roundRect(x0 + s, z0 + s, x1 - s, z1 - s, Math.max(0.3, r - s));
      const inner = roundRect(x0 + s + o.walk, z0 + s + o.walk, x1 - s - o.walk, z1 - s - o.walk, Math.max(0.3, r - s - o.walk));
      outer.holes.push(inner);
      const ring = new THREE.ShapeGeometry(outer, 8);
      ring.rotateX(-Math.PI / 2);
      ring.translate(0, h + 0.012, 0);
      uvFromXZ(ring, 1.6);
      this.add(ring, m.concrete);
    }
  }

  /** Dashed or solid line along an axis. */
  line(axis: "x" | "z", at: number, from: number, to: number, w: number, mat: THREE.Material, dash = 0, gap = 0) {
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const step = dash ? dash + gap : b - a;
    for (let s = a; s < b - 0.01; s += step) {
      const e = Math.min(b, s + (dash || b - a));
      if (axis === "z") this.rect(at - w / 2, s, at + w / 2, e, 0.02, mat, 1);
      else this.rect(s, at - w / 2, e, at + w / 2, 0.02, mat, 1);
    }
  }

  /** Zebra crosswalk across a street: stripes run along `axis`, spread across [from, to]. */
  crosswalk(axis: "x" | "z", c0: number, c1: number, from: number, to: number) {
    const m = mats();
    for (let s = from + 0.3; s < to - 0.3; s += 1.2) {
      if (axis === "z") this.rect(s, c0, s + 0.6, c1, 0.02, m.white, 1);
      else this.rect(c0, s, c1, s + 0.6, 0.02, m.white, 1);
    }
  }

  // ---------- Props ----------

  tree(x: number, z: number, size = 1, kind: "round" | "cone" | "street" = "round", y = 0) {
    const m = mats();
    const r = this.rnd;
    const s = size * (0.85 + r() * 0.35);
    const trunkH = (kind === "cone" ? 1.4 : 2.4) * s;
    const trunk = new THREE.CylinderGeometry(0.1 * s, 0.17 * s, trunkH, 7);
    trunk.translate(0, trunkH / 2, 0);
    this.add(trunk, m.bark, m4(x, y, z));
    const greens = [
      [0.36, 0.47, 0.29],
      [0.31, 0.43, 0.28],
      [0.42, 0.5, 0.3],
      [0.29, 0.38, 0.26],
      [0.45, 0.48, 0.3],
    ];
    const pick = greens[Math.floor(r() * greens.length)];
    // Conifers are darker and bluer than broadleaf trees.
    const base = kind === "cone" ? [pick[0] * 0.55, pick[1] * 0.68, pick[2] * 0.62] : pick;
    const blobs: THREE.BufferGeometry[] = [];
    if (kind === "cone") {
      for (let i = 0; i < 3; i++) {
        const g = new THREE.ConeGeometry((1.6 - i * 0.4) * s, 2.2 * s, 9);
        g.translate(0, trunkH + (0.9 + i * 1.15) * s, 0);
        blobs.push(g.toNonIndexed());
      }
    } else {
      const n = kind === "street" ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const rad = (kind === "street" ? 1.05 : 1.45) * s * (0.75 + r() * 0.4);
        const ico = new THREE.IcosahedronGeometry(rad, 2);
        ico.deleteAttribute("normal");
        ico.deleteAttribute("uv");
        const g = mergeVertices(ico);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k) / rad;
          const y = p.getY(k) / rad;
          const z = p.getZ(k) / rad;
          const j = 0.9 + 0.1 * Math.sin(x * 5.1 + y * 3.7 + i) * Math.cos(z * 4.3 - y * 2.1) + 0.06 * Math.sin(x * 13 + z * 11);
          p.setXYZ(k, p.getX(k) * j, p.getY(k) * j * 0.9, p.getZ(k) * j);
        }
        const a = (i / n) * Math.PI * 2 + r();
        const off = i === 0 ? 0 : 0.75 * s;
        g.translate(Math.cos(a) * off, trunkH + rad * 0.7 + (i === 0 ? 0.5 * s : r() * 0.8 * s), Math.sin(a) * off);
        g.computeVertexNormals();
        blobs.push(g);
      }
    }
    for (const g of blobs) {
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      for (let k = 0; k < p.count; k++) {
        const lift = 0.85 + Math.min(0.35, Math.max(0, (p.getY(k) - trunkH) / (4 * s)) * 0.35) + (Math.sin(k * 12.9898) * 0.5 + 0.5) * 0.08;
        col[k * 3] = base[0] * lift;
        col[k * 3 + 1] = base[1] * lift;
        col[k * 3 + 2] = base[2] * lift;
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      this.add(g, m.foliage, m4(x, y, z, r() * 6));
    }
  }

  shrub(x: number, z: number, size = 1, y = 0.15) {
    const g = new THREE.IcosahedronGeometry(0.6 * size, 1);
    g.scale(1.3, 0.75, 1);
    g.translate(0, 0.35 * size, 0);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      const l = 0.8 + (p.getY(k) / size) * 0.3;
      col.set([0.3 * l, 0.42 * l, 0.27 * l], k * 3);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.add(g, mats().foliage, m4(x, y, z, this.rnd() * 3));
  }

  /** A house facing heading h (its front looks along dir(h)), centred on (x, z). */
  house(x: number, z: number, h: number, y = 0.15) {
    const m = mats();
    const r = this.rnd;
    const w = 10 + r() * 3.5;
    const d = 8.5 + r() * 2;
    const two = r() < 0.45;
    const wallH = two ? 5.6 : 3.1;
    const siding = m.siding[Math.floor(r() * m.siding.length)];
    const roof = m.roof[Math.floor(r() * m.roof.length)];
    const rot = -h;
    const at = (lx: number, ly: number, lz: number) => m4(x, y, z, rot).multiply(m4(lx, ly, lz));
    // Body. Local frame: front faces -Z.
    const body = new THREE.BoxGeometry(w, wallH, d);
    body.translate(0, wallH / 2, 0);
    uvBox(body, w, wallH, d, 1);
    this.add(body, siding, at(0, 0, 0));
    // Gable roof across the width.
    const pitch = 2.2 + r() * 0.6;
    const prof = new THREE.Shape();
    prof.moveTo(-d / 2 - 0.45, 0);
    prof.lineTo(d / 2 + 0.45, 0);
    prof.lineTo(0, pitch);
    prof.closePath();
    const rg = new THREE.ExtrudeGeometry(prof, { depth: w + 0.7, bevelEnabled: false });
    rg.rotateY(Math.PI / 2);
    rg.translate(-(w + 0.7) / 2, wallH - 0.05, 0);
    uvFromXZ(rg, 1.6, true);
    this.add(rg, roof, at(0, 0, 0));
    // Gable ends in siding.
    const gable = new THREE.ShapeGeometry(triangle(d / 2, pitch));
    for (const s of [-1, 1]) {
      const gg = gable.clone();
      gg.rotateY((s * Math.PI) / 2);
      gg.translate((s * w) / 2 + s * 0.01, wallH, 0);
      this.add(gg, siding, at(0, 0, 0));
    }
    // Windows, door and garage on the front.
    const front = -d / 2 - 0.02;
    const glass = m.window;
    const win = (lx: number, ly: number, ww = 1.15, wh = 1.35) => {
      this.add(boxAt(ww + 0.22, wh + 0.22, 0.06), m.trim, at(lx, ly, front));
      this.add(boxAt(ww, wh, 0.08), glass, at(lx, ly, front - 0.01));
    };
    const garageLeft = r() < 0.5;
    const gx = (garageLeft ? -1 : 1) * (w / 2 - 2.0);
    this.add(boxAt(3.2, 2.3, 0.08), m.trim, at(gx, 1.15, front - 0.01));
    for (let i = 0; i < 4; i++) this.add(boxAt(3.1, 0.04, 0.1), m.curb, at(gx, 0.45 + i * 0.5, front - 0.02));
    const doorX = garageLeft ? w / 2 - 4.6 : -(w / 2 - 4.6);
    this.add(boxAt(1.0, 2.1, 0.08), m.door[Math.floor(r() * m.door.length)], at(doorX, 1.05, front - 0.01));
    this.add(boxAt(1.3, 0.25, 0.4), m.trim, at(doorX, 2.25, front - 0.15));
    const wx = garageLeft ? doorX + 2.2 : doorX - 2.2;
    if (Math.abs(wx) < w / 2 - 0.8) win(wx, 1.55);
    if (two) {
      for (const lx of [-w / 3, 0, w / 3]) win(lx, 4.2, 1.1, 1.25);
    }
    // Driveway to the street.
    this.drive(x, z, h, gx, d, y);
    // Foundation shrubs.
    for (let i = 0; i < 3; i++) {
      const lx = doorX + (garageLeft ? -1 : 1) * (1.4 + i * 1.3);
      if (Math.abs(lx) < w / 2 - 0.6 && Math.abs(lx - gx) > 2.2) {
        const p = new THREE.Vector3(lx, 0, front - 0.8).applyMatrix4(m4(0, 0, 0, rot));
        this.shrub(x + p.x, z + p.z, 0.8);
      }
    }
  }

  private drive(x: number, z: number, h: number, gx: number, d: number, y: number) {
    // Driveway from the garage out to the curb, as a concrete strip a little above the lawn.
    const len = 13;
    const g = new THREE.PlaneGeometry(3.2, len);
    g.rotateX(-Math.PI / 2);
    g.translate(gx, y + 0.02, -d / 2 - len / 2);
    uvFromXZ(g, 1.6);
    this.add(g, mats().concrete, m4(x, 0, z, -h));
  }

  /** Low-rise building with a facade texture; `ground` adds shopfronts. */
  building(x: number, z: number, h: number, w: number, d: number, floors: number, facade: THREE.Material, o: { ground?: boolean; floorH?: number; y?: number; awning?: boolean } = {}) {
    const m = mats();
    const fh = o.floorH ?? 3.4;
    const y = o.y ?? 0.15;
    const gH = o.ground ? 4.4 : 0;
    const upper = floors * fh;
    const H = gH + upper;
    const at = m4(x, y, z, -h);
    const r = this.rnd;
    if (o.ground) {
      const g = walls(w, gH, d, 5, gH, 4, 1, Math.floor(r() * 4), 0);
      this.add(g, m.storefront, at);
    }
    const u = walls(w, upper, d, 3.2, fh, 8, 8, Math.floor(r() * 8), Math.floor(r() * 8));
    u.translate(0, 0, 0);
    this.add(u, facade, m4(x, y + gH, z, -h));
    const cap = new THREE.PlaneGeometry(w, d);
    cap.rotateX(-Math.PI / 2);
    cap.translate(0, H, 0);
    this.add(cap, m.roofFlat, at);
    // Parapet and cornice.
    this.add(boxAt(w + 0.3, 0.35, 0.3), m.cornice, mul(at, m4(0, H, -d / 2)));
    this.add(boxAt(0.3, 0.35, d), m.cornice, mul(at, m4(-w / 2, H, 0)));
    this.add(boxAt(0.3, 0.35, d), m.cornice, mul(at, m4(w / 2, H, 0)));
    if (o.ground) this.add(boxAt(w + 0.1, 0.22, 0.25), m.cornice, mul(at, m4(0, gH, -d / 2 - 0.05)));
    if (r() < 0.6) this.add(boxAt(2.2, 1.2, 1.6), m.galv, mul(at, m4((r() - 0.5) * w * 0.5, H, (r() - 0.2) * d * 0.3)));
    if (o.awning && o.ground) {
      const aw = m.awning[Math.floor(r() * m.awning.length)];
      const a = new THREE.PlaneGeometry(w * 0.86, 1.6);
      a.rotateX(-Math.PI / 2 + 0.38);
      a.translate(0, gH - 0.9, -d / 2 - 0.75);
      this.add(a, aw, at);
    }
  }

  lamp(x: number, z: number, faceH: number, o: { height?: number; arm?: number; y?: number } = {}) {
    const m = mats();
    const H = o.height ?? 8;
    const arm = o.arm ?? 2.2;
    const y = o.y ?? 0.15;
    const at = m4(x, y, z, -faceH);
    const pole = new THREE.CylinderGeometry(0.07, 0.11, H, 8);
    pole.translate(0, H / 2, 0);
    this.add(pole, m.metal, at);
    const a = new THREE.CylinderGeometry(0.05, 0.05, arm, 6);
    a.rotateX(Math.PI / 2);
    a.translate(0, H - 0.1, -arm / 2);
    this.add(a, m.metal, at);
    this.add(boxAt(0.36, 0.14, 0.75), m.metal, mul(at, m4(0, H - 0.18, -arm)));
    this.add(boxAt(0.3, 0.03, 0.62), m.lampHead, mul(at, m4(0, H - 0.27, -arm)));
    // Head position, for night light pools.
    const d = dir(faceH);
    return { x: x + d.x * arm, z: z + d.z * arm, y: y + H - 0.3 };
  }

  /** Stop sign facing a driver who travels along heading h. */
  stopSign(x: number, z: number, h: number) {
    const m = mats();
    const at = m4(x, 0.15, z, -h);
    const post = new THREE.BoxGeometry(0.07, 2.2, 0.07);
    post.translate(0, 1.1, 0);
    this.add(post, m.galv, at);
    const face = new THREE.CircleGeometry(0.4, 8);
    face.rotateZ(Math.PI / 8);
    // Map the octagon onto the texture square.
    const p = face.attributes.position;
    const uv = face.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 0.8, 0.5 + p.getY(i) / 0.8);
    face.translate(0, 2.35, 0.05);
    this.add(face, m.stopFace, at);
    const back = new THREE.CircleGeometry(0.4, 8);
    back.rotateZ(Math.PI / 8);
    back.rotateY(Math.PI);
    back.translate(0, 2.35, 0.03);
    this.add(back, m.signBack, at);
  }

  /** A parked car, merged into the scenery. */
  parked(x: number, z: number, h: number, kind: CarKind, paint: number, y = 0) {
    const at = m4(x, y, z, -h);
    const m = mats();
    for (const p of carParts(kind)) this.add(p.geo, p.role === "tail" ? m.tailOff : p.role === "head" ? m.headOff : materialFor(p.role, paint), at);
    const sh = new THREE.PlaneGeometry(2.3, carLength(kind) * 1.08);
    sh.rotateX(-Math.PI / 2);
    sh.translate(0, 0.025, 0);
    this.add(sh, m.contact, at);
  }

  /** Ring of low hills around the set, softened by fog. */
  hills(cx: number, cz: number, radius: number, height: number, mat: THREE.Material, seed: number) {
    const n = 96;
    const r = rng(seed);
    const ph = [r() * 6, r() * 6, r() * 6];
    const pos: number[] = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const hh = (a: number) => height * (0.45 + 0.3 * Math.sin(a * 3 + ph[0]) + 0.18 * Math.sin(a * 7 + ph[1]) + 0.07 * Math.sin(a * 17 + ph[2]));
      const p = (a: number, y: number, rr = radius) => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
      pos.push(...p(a0, -2), ...p(a1, -2), ...p(a1, hh(a1), radius * 0.97), ...p(a0, -2), ...p(a1, hh(a1), radius * 0.97), ...p(a0, hh(a0), radius * 0.97));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    this.add(g, mat);
  }
}

// ---------- geometry helpers ----------

export function boxAt(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  return g;
}

function mul(a: THREE.Matrix4, b: THREE.Matrix4) {
  return a.clone().multiply(b);
}

function triangle(halfBase: number, height: number) {
  const s = new THREE.Shape();
  s.moveTo(-halfBase, 0);
  s.lineTo(halfBase, 0);
  s.lineTo(0, height);
  s.closePath();
  return s;
}

/** Rounded rectangle in the XZ plane, as a Shape in (x, -z) so it lies flat after rotateX(-90°). */
function roundRect(x0: number, z0: number, x1: number, z1: number, r: number) {
  const ax = Math.min(x0, x1);
  const bx = Math.max(x0, x1);
  const ay = -Math.max(z0, z1);
  const by = -Math.min(z0, z1);
  const rr = Math.min(r, (bx - ax) / 2, (by - ay) / 2);
  const s = new THREE.Shape();
  s.moveTo(ax + rr, ay);
  s.lineTo(bx - rr, ay);
  s.quadraticCurveTo(bx, ay, bx, ay + rr);
  s.lineTo(bx, by - rr);
  s.quadraticCurveTo(bx, by, bx - rr, by);
  s.lineTo(ax + rr, by);
  s.quadraticCurveTo(ax, by, ax, by - rr);
  s.lineTo(ax, ay + rr);
  s.quadraticCurveTo(ax, ay, ax + rr, ay);
  return s;
}

function uvFromXZ(g: THREE.BufferGeometry, tile: number, useY = false) {
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + (useY ? p.getZ(i) : 0)) / tile, (useY ? p.getY(i) : -p.getZ(i)) / tile);
}

function uvBox(g: THREE.BufferGeometry, w: number, h: number, d: number, tile: number) {
  // BoxGeometry faces: +x, -x, +y, -y, +z, -z; four vertices each.
  const uv = g.attributes.uv;
  const size = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * size[f][0]) / tile, (uv.getY(i) * size[f][1]) / tile);
    }
}

/** Four walls (no top or bottom), UVs in facade modules so windows keep their size on any building. */
function walls(w: number, h: number, d: number, modW: number, modH: number, gridU: number, gridV: number, offU: number, offV: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const uv = g.attributes.uv;
  const size = [d, d, w, w, w, w];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const fu = f === 2 || f === 3 ? 0 : (uv.getX(i) * Math.max(1, Math.round(size[f] / modW)) + offU) / gridU;
      const fv = f === 2 || f === 3 ? 0 : (uv.getY(i) * Math.max(1, Math.round(h / modH)) + offV) / gridV;
      uv.setXY(i, fu, fv);
    }
  // Drop the top and bottom faces.
  const idx = g.index!;
  const keep: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const face = Math.floor(idx.getX(i) / 4);
    if (face !== 2 && face !== 3) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  }
  g.setIndex(keep);
  return g;
}
