import * as THREE from "three";
import { Kit, m4, mats } from "./kit";
import { Path, right } from "./motion";

// The simulator's environments. Each is a small, fixed world that one or two drives play out in.
// Coordinates are metres; the main road always runs along -Z from near the origin.

export type SetId = "arterial" | "residential" | "suburb" | "boulevard" | "rural" | "downtown";
export type Light = "red" | "yellow" | "green";
export type SignalHead = { approach: string; lamps: THREE.Mesh[]; at: THREE.Vector3[]; normal: THREE.Vector3; halo: THREE.Sprite };

export type SetData = {
  id: SetId;
  root: THREE.Group;
  /** Light pools and lamp halos, shown only at night. */
  night: THREE.Group;
  signals: SignalHead[];
  lamps: THREE.Vector3[];
};

const PI = Math.PI;

// ---------- shared pieces ----------

function signalMast(k: Kit, set: SetData, x: number, z: number, faceH: number, heads: number[], approach: string, arm: number) {
  const m = mats();
  const at = m4(x, 0.15, z, -faceH);
  const pole = new THREE.CylinderGeometry(0.15, 0.2, 6.7, 12);
  pole.translate(0, 3.35, 0);
  k.add(pole, m.metal, at);
  const a = new THREE.CylinderGeometry(0.08, 0.11, arm, 8);
  a.rotateZ(PI / 2);
  a.translate(-arm / 2, 6.35, 0);
  k.add(a, m.metal, at);
  for (const hx of heads) {
    const housing = new THREE.BoxGeometry(0.42, 1.18, 0.32);
    housing.translate(hx, 5.55, 0);
    k.add(housing, m.signal, at);
    const plate = new THREE.BoxGeometry(0.78, 1.5, 0.03);
    plate.translate(hx, 5.55, -0.18);
    k.add(plate, m.backplate, at);
    const hanger = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6);
    hanger.translate(hx, 6.2, 0);
    k.add(hanger, m.metal, at);
    const lamps: THREE.Mesh[] = [];
    const pts: THREE.Vector3[] = [];
    (["red", "yellow", "green"] as const).forEach((c, i) => {
      const y = 5.55 + 0.37 * (1 - i);
      const hood = new THREE.BoxGeometry(0.34, 0.025, 0.24);
      hood.translate(hx, y + 0.16, 0.27);
      k.add(hood, m.signal, at);
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.135, 20), m.lampOff[c]);
      lamp.position.set(hx, y, 0.165);
      lamp.applyMatrix4(at);
      set.root.add(lamp);
      lamps.push(lamp);
      pts.push(new THREE.Vector3(hx, y, 0.3).applyMatrix4(at));
    });
    const halo = new THREE.Sprite(m.halo.clone());
    halo.scale.setScalar(1.6);
    set.root.add(halo);
    set.signals.push({ approach, lamps, at: pts, normal: new THREE.Vector3(0, 0, 1).transformDirection(at), halo });
  }
}

/** Lamp with its night light pool and halo. */
function lamp(k: Kit, set: SetData, x: number, z: number, faceH: number, o: { height?: number; arm?: number; y?: number } = {}) {
  const head = k.lamp(x, z, faceH, o);
  set.lamps.push(new THREE.Vector3(head.x, head.y, head.z));
  const m = mats();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m.pool);
  pool.rotation.x = -PI / 2;
  const r = (o.height ?? 8) * 0.95;
  pool.scale.set(r * 2, r * 2, 1);
  pool.position.set(head.x, 0.2, head.z);
  pool.renderOrder = 2;
  set.night.add(pool);
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.2);
  halo.position.set(head.x, head.y - 0.1, head.z);
  set.night.add(halo);
}

function ground(k: Kit, size = 1600, cx = 0, cz = -200) {
  k.rect(cx - size / 2, cz + size / 2, cx + size / 2, cz - size / 2, -0.02, mats().grass, 7);
}

function newSet(id: SetId): SetData {
  return { id, root: new THREE.Group(), night: new THREE.Group(), signals: [], lamps: [] };
}

function finish(k: Kit, set: SetData) {
  set.root.add(k.build());
  set.root.add(set.night);
  set.root.visible = false;
  return set;
}

// ---------- Arterial: four lanes and a signalled intersection (brake reaction) ----------

export const ARTERIAL = { half: 7.2, crossZ: -120, stopLine: -108.45, lanes: [1.7, 5.1] };

function arterial(): SetData {
  const set = newSet("arterial");
  const k = new Kit(0.17);
  const m = mats();
  const H = ARTERIAL.half;
  const cz = ARTERIAL.crossZ;
  ground(k);
  k.rect(-H, 120, H, -700, 0, m.asphalt);
  k.rect(-500, cz + H, 500, cz - H, 0.001, m.asphalt);
  const blocks: [number, number, number, number][] = [
    [H, cz + H, 220, 120],
    [-220, cz + H, -H, 120],
    [H, -700, 220, cz - H],
    [-220, -700, -H, cz - H],
  ];
  for (const [x0, z0, x1, z1] of blocks) k.block(x0, z0, x1, z1, { r: 7, top: m.lawn, walk: 1.9, strip: 1.4 });
  // Main road markings.
  const nearStop = ARTERIAL.stopLine;
  const farStop = cz - H - 4.1;
  for (const [a, b] of [
    [120, nearStop],
    [farStop, -700],
  ]) {
    k.line("z", -0.14, a, b, 0.11, m.yellow);
    k.line("z", 0.14, a, b, 0.11, m.yellow);
    k.line("z", -3.4, a, b, 0.12, m.white, 3, 9);
    k.line("z", 3.4, a, b, 0.12, m.white, 3, 9);
    k.line("z", -6.75, a, b, 0.14, m.white);
    k.line("z", 6.75, a, b, 0.14, m.white);
  }
  k.rect(0.2, nearStop, 6.9, nearStop - 0.45, 0.02, m.white, 1);
  k.rect(-6.9, farStop, -0.2, farStop + 0.45, 0.02, m.white, 1);
  k.crosswalk("z", cz + H + 0.4, cz + H + 3.4, -H, H);
  k.crosswalk("z", cz - H - 3.4, cz - H - 0.4, -H, H);
  k.crosswalk("x", -H - 3.6, -H - 0.6, cz - H, cz + H);
  k.crosswalk("x", H + 0.6, H + 3.6, cz - H, cz + H);
  // Cross street markings.
  for (const [a, b] of [
    [-500, -H - 4.4],
    [H + 4.4, 500],
  ]) {
    k.line("x", cz - 0.14, a, b, 0.11, m.yellow);
    k.line("x", cz + 0.14, a, b, 0.11, m.yellow);
    k.line("x", cz - 3.4, a, b, 0.12, m.white, 3, 9);
    k.line("x", cz + 3.4, a, b, 0.12, m.white, 3, 9);
  }
  k.rect(-H - 4.4, cz + 6.9, -H - 3.95, cz + 0.2, 0.02, m.white, 1);
  k.rect(H + 3.95, cz - 0.2, H + 4.4, cz - 6.9, 0.02, m.white, 1);
  // Signals on all four corners.
  const c = H + 2.4;
  signalMast(k, set, c, cz - c, 0, [-4.5, -7.9], "main", 9.2);
  signalMast(k, set, -c, cz + c, PI, [-4.5, -7.9], "main", 9.2);
  signalMast(k, set, c, cz + c, PI / 2, [-4.5, -7.9], "cross", 9.2);
  signalMast(k, set, -c, cz - c, -PI / 2, [-4.5, -7.9], "cross", 9.2);
  // Frontage: shops and offices with parking, trees and lamps.
  const r = k.rnd;
  const facades = [m.stucco, m.brickTan, m.stuccoGrey, m.stucco];
  for (const side of [-1, 1]) {
    const faceIn = side > 0 ? -PI / 2 : PI / 2;
    for (let z = 100; z > -680; z -= 13) {
      if (Math.abs(z - cz) < 16) continue;
      k.tree(side * (H + 0.75), z, 0.85, "street", 0.15);
    }
    for (let z = 90; z > -680; z -= 42) {
      if (Math.abs(z - cz) < 22) continue;
      lamp(k, set, side * (H + 0.6), z - 6, faceIn, { height: 9, arm: 2.6 });
    }
    let z = 110;
    while (z > -660) {
      const w = 26 + r() * 22;
      const zc = z - w / 2;
      z -= w + 6;
      if (Math.abs(zc - cz) < 14 + w / 2) continue;
      const kind = r();
      const fac = facades[Math.floor(r() * facades.length)];
      if (kind < 0.45) {
        // Building near the road with shopfronts.
        const d = 16 + r() * 6;
        k.building(side * (H + 7 + d / 2), zc, faceIn, w, d, 1 + Math.floor(r() * 2), fac, { ground: true, awning: r() < 0.5 });
      } else if (kind < 0.8) {
        // Parking lot in front of a larger building.
        const x0 = H + 6;
        const x1 = H + 34;
        k.rect(side * x0, zc + w / 2, side * x1, zc - w / 2, 0.17, m.patch, 4);
        for (let s = zc + w / 2 - 1; s > zc - w / 2 + 1; s -= 2.8) k.rect(side * (x0 + 2), s, side * (x0 + 7.2), s - 0.12, 0.18, m.white, 1);
        for (let s = zc + w / 2 - 2.4; s > zc - w / 2 + 2; s -= 2.8) if (r() < 0.55) k.parked(side * (x0 + 4.6), s, side > 0 ? PI / 2 : -PI / 2, (["sedan", "suv", "hatch"] as const)[Math.floor(r() * 3)], Math.floor(r() * 8), 0.17);
        const d = 20 + r() * 8;
        k.building(side * (x1 + 4 + d / 2), zc, faceIn, w, d, 1 + Math.floor(r() * 2), fac, { ground: r() < 0.6 });
      } else {
        for (let i = 0; i < 5; i++) k.tree(side * (H + 9 + r() * 30), zc + (r() - 0.5) * w, 1.1, "round", 0.15);
      }
    }
  }
  // Corner buildings along the cross street.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = sx * (H + 30 + i * 34);
        k.building(x, cz + sz * (H + 16), sz > 0 ? 0 : PI, 26, 18, 1 + (i % 2), facades[(i + (sx > 0 ? 1 : 0)) % 4], { ground: true });
        k.tree(x + 15, cz + sz * (H + 0.75), 0.85, "street", 0.15);
      }
    }
  k.hills(0, -200, 760, 70, m.hillFar, 0.3);
  k.hills(0, -200, 520, 30, m.hill, 0.7);
  return finish(k, set);
}

// ---------- Residential: a quiet grid with all-way stops (right turns) ----------

export const RESIDENTIAL = { half: 4.6, crossZ: -100, stopLine: -93.8, nextX: 110, lane: 2.1 };

function residential(): SetData {
  const set = newSet("residential");
  const k = new Kit(0.29);
  const m = mats();
  const H = RESIDENTIAL.half;
  const cz = RESIDENTIAL.crossZ;
  const nx = RESIDENTIAL.nextX;
  const z2 = -230;
  ground(k);
  k.rect(-H, 120, H, -400, 0, m.asphalt);
  k.rect(-300, cz + H, 400, cz - H, 0.001, m.asphalt);
  k.rect(-300, z2 + H, 400, z2 - H, 0.001, m.asphalt);
  k.rect(nx - H, 120, nx + H, -400, 0.001, m.asphalt);
  const xs: [number, number][] = [
    [-200, -H],
    [H, nx - H],
    [nx + H, 300],
  ];
  const zs: [number, number][] = [
    [cz + H, 120],
    [z2 + H, cz - H],
    [-400, z2 - H],
  ];
  for (const [x0, x1] of xs) for (const [z0, z1] of zs) k.block(x0, z0, x1, z1, { r: 6, top: m.lawn, walk: 1.5, strip: 1.8 });
  // Stop lines at the all-way stop, and at the next corner.
  const sl = RESIDENTIAL.stopLine;
  k.rect(0.15, sl, H - 0.2, sl - 0.4, 0.02, m.white, 1);
  k.rect(-H + 0.2, cz - H - 1.4, -0.15, cz - H - 1.0, 0.02, m.white, 1);
  k.rect(-H - 1.4, cz + H - 0.2, -H - 1.0, cz + 0.15, 0.02, m.white, 1);
  k.rect(H + 1.0, cz - 0.15, H + 1.4, cz - H + 0.2, 0.02, m.white, 1);
  k.rect(nx - H - 1.4, cz + H - 0.2, nx - H - 1.0, cz + 0.15, 0.02, m.white, 1);
  k.stopSign(H + 1.6, sl + 0.4, 0);
  k.stopSign(-H - 1.6, cz - H - 1.6, PI);
  k.stopSign(-H - 1.6, cz + H + 1.6, PI / 2);
  k.stopSign(H + 1.6, cz - H - 1.6, -PI / 2);
  k.stopSign(nx - H - 1.6, cz + H + 1.6, PI / 2);
  const r = k.rnd;
  // Houses facing the main street.
  for (const side of [-1, 1]) {
    const face = side > 0 ? -PI / 2 : PI / 2;
    for (const [a, b] of [
      [100, cz + H + 8],
      [cz - H - 10, z2 + H + 8],
      [z2 - H - 10, -390],
    ]) {
      for (let z = a; z > b; z -= 19) {
        k.house(side * 23, z - 9, face);
        if (r() < 0.35) k.parked(side * (H + 14.5), z - 9 + (r() < 0.5 ? 3 : -3), face + (r() < 0.5 ? 0 : PI), r() < 0.5 ? "suv" : "sedan", Math.floor(r() * 8), 0.17);
      }
      for (let z = a - 4; z > b; z -= 13) k.tree(side * (H + 0.9), z, 0.95, "round", 0.15);
    }
  }
  // Houses along the cross street, both sides, out past the next corner.
  for (const sz of [-1, 1]) {
    const face = sz > 0 ? 0 : PI;
    for (let x = H + 36; x < 290; x += 19) {
      if (Math.abs(x - nx) < 14) continue;
      k.house(x, cz + sz * 23, face);
    }
    for (let x = -H - 30; x > -195; x -= 19) k.house(x, cz + sz * 23, face);
    for (let x = H + 10; x < 290; x += 13) if (Math.abs(x - nx) > 10) k.tree(x, cz + sz * (H + 0.9), 0.95, "round", 0.15);
    for (let x = -H - 8; x > -195; x -= 13) k.tree(x, cz + sz * (H + 0.9), 0.95, "round", 0.15);
  }
  for (let i = 0; i < 6; i++) lamp(k, set, H + 0.8, 80 - i * 55, -PI / 2, { height: 7.5, arm: 1.6 });
  for (let i = 0; i < 6; i++) lamp(k, set, 20 + i * 48, cz + H + 0.8, PI, { height: 7.5, arm: 1.6 });
  // Backyard trees fill the gaps between rows.
  for (let i = 0; i < 160; i++) {
    const x = (r() - 0.5) * 560;
    const z = 100 - r() * 480;
    const nearStreet = Math.abs(x) < 34 || Math.abs(z - cz) < 34 || Math.abs(z - z2) < 30 || Math.abs(x - nx) < 30;
    if (!nearStreet) k.tree(x, z, 1.3, r() < 0.3 ? "cone" : "round", 0.15);
  }
  k.hills(0, -150, 700, 60, m.hillFar, 0.4);
  k.hills(0, -150, 480, 26, m.hill, 0.9);
  return finish(k, set);
}

// ---------- Suburb: two lanes and a signal, left turns across oncoming traffic ----------

export const SUBURB = { half: 5.0, crossZ: -110, stopLine: -100.65, lane: 1.8 };

function suburb(): SetData {
  const set = newSet("suburb");
  const k = new Kit(0.41);
  const m = mats();
  const H = SUBURB.half;
  const cz = SUBURB.crossZ;
  ground(k);
  k.rect(-H, 120, H, -500, 0, m.asphalt);
  k.rect(-400, cz + H, 400, cz - H, 0.001, m.asphalt);
  const blocks: [number, number, number, number][] = [
    [H, cz + H, 200, 120],
    [-200, cz + H, -H, 120],
    [H, -500, 200, cz - H],
    [-200, -500, -H, cz - H],
  ];
  for (const [x0, z0, x1, z1] of blocks) k.block(x0, z0, x1, z1, { r: 6.5, top: m.lawn, walk: 1.8, strip: 1.4 });
  const sl = SUBURB.stopLine;
  for (const [a, b] of [
    [120, sl],
    [cz - H - 4.5, -500],
  ]) {
    k.line("z", -0.13, a, b, 0.11, m.yellow);
    k.line("z", 0.13, a, b, 0.11, m.yellow);
    k.line("z", -4.4, a, b, 0.14, m.white);
    k.line("z", 4.4, a, b, 0.14, m.white);
  }
  for (const [a, b] of [
    [-400, -H - 4.5],
    [H + 4.5, 400],
  ]) {
    k.line("x", cz - 0.13, a, b, 0.11, m.yellow);
    k.line("x", cz + 0.13, a, b, 0.11, m.yellow);
  }
  k.rect(0.2, sl, H - 0.4, sl - 0.45, 0.02, m.white, 1);
  k.rect(-H + 0.4, cz - H - 4.5, -0.2, cz - H - 4.05, 0.02, m.white, 1);
  k.rect(-H - 4.5, cz + H - 0.4, -H - 4.05, cz + 0.2, 0.02, m.white, 1);
  k.rect(H + 4.05, cz - 0.2, H + 4.5, cz - H + 0.4, 0.02, m.white, 1);
  k.crosswalk("z", cz + H + 0.5, cz + H + 3.5, -H, H);
  k.crosswalk("z", cz - H - 3.5, cz - H - 0.5, -H, H);
  k.crosswalk("x", -H - 3.5, -H - 0.5, cz - H, cz + H);
  k.crosswalk("x", H + 0.5, H + 3.5, cz - H, cz + H);
  const c = H + 2.4;
  signalMast(k, set, c, cz - c, 0, [-0.55, -5.6], "main", 6.4);
  signalMast(k, set, -c, cz + c, PI, [-0.55, -5.6], "main", 6.4);
  signalMast(k, set, c, cz + c, PI / 2, [-0.55, -5.6], "cross", 6.4);
  signalMast(k, set, -c, cz - c, -PI / 2, [-0.55, -5.6], "cross", 6.4);
  const r = k.rnd;
  for (const side of [-1, 1]) {
    const face = side > 0 ? -PI / 2 : PI / 2;
    for (let z = 100; z > -490; z -= 20) {
      if (Math.abs(z - 9 - cz) < 30) continue;
      if (side < 0 && z < cz && z > cz - 90) continue;
      k.house(side * 24, z - 9, face);
    }
    for (let z = 96; z > -490; z -= 12) if (Math.abs(z - cz) > 14) k.tree(side * (H + 0.7), z, 0.9, "round", 0.15);
    for (let z = 70; z > -490; z -= 45) if (Math.abs(z - cz) > 18) lamp(k, set, side * (H + 0.6), z, face, { height: 8, arm: 2.0 });
  }
  // A small shopping strip on the far left corner, seen while turning.
  k.rect(-H - 6, cz - H - 6, -H - 52, cz - H - 34, 0.17, m.patch, 4);
  for (let x = -H - 9; x > -H - 50; x -= 2.8) k.rect(x, cz - H - 8, x - 0.12, cz - H - 13, 0.18, m.white, 1);
  for (let x = -H - 10.4; x > -H - 49; x -= 2.8) if (r() < 0.6) k.parked(x, cz - H - 10.5, r() < 0.5 ? 0 : PI, (["sedan", "suv", "hatch"] as const)[Math.floor(r() * 3)], Math.floor(r() * 8), 0.17);
  k.building(-H - 30, cz - H - 46, PI, 46, 16, 1, m.stucco, { ground: true, awning: true });
  // Houses along the cross street.
  for (const sz of [-1, 1]) {
    for (let x = -H - 70; x > -380; x -= 20) k.house(x, cz + sz * 24, sz > 0 ? 0 : PI);
    for (let x = H + 32; x < 380; x += 20) k.house(x, cz + sz * 24, sz > 0 ? 0 : PI);
    for (let x = -H - 8; x > -380; x -= 12) k.tree(x, cz + sz * (H + 0.7), 0.9, "round", 0.15);
    for (let x = H + 8; x < 380; x += 12) k.tree(x, cz + sz * (H + 0.7), 0.9, "round", 0.15);
  }
  for (let i = 0; i < 170; i++) {
    const x = (r() - 0.5) * 600;
    const z = 100 - r() * 560;
    if (Math.abs(x) > 34 && Math.abs(z - cz) > 34) k.tree(x, z, 1.3, r() < 0.3 ? "cone" : "round", 0.15);
  }
  k.hills(0, -150, 720, 64, m.hillFar, 0.5);
  k.hills(0, -150, 500, 28, m.hill, 0.2);
  return finish(k, set);
}

// ---------- Boulevard: three lanes each way, a planted median (lane changes) ----------

export const BOULEVARD = { lanes: [2.2, 5.8, 9.4], edge: 11.6, median: [-4.4, 0] as const };

function boulevard(): SetData {
  const set = newSet("boulevard");
  const k = new Kit(0.53);
  const m = mats();
  ground(k, 2000, 0, -300);
  const E = BOULEVARD.edge;
  k.rect(-16, 150, E, -900, 0, m.asphalt);
  k.block(-4.4, -900, 0, 150, { r: 1.5, top: m.lawn });
  k.block(E, -900, 120, 150, { r: 1, top: m.lawn, walk: 2.2, strip: 3 });
  k.block(-120, -900, -16, 150, { r: 1, top: m.lawn, walk: 2.2, strip: 3 });
  for (const s of [1, -1]) {
    const x = (v: number) => (s > 0 ? v : -4.4 - v);
    k.line("z", x(0.45), 150, -900, 0.14, s > 0 ? m.yellow : m.yellow);
    k.line("z", x(4.0), 150, -900, 0.13, m.white, 3, 9);
    k.line("z", x(7.6), 150, -900, 0.13, m.white, 3, 9);
    k.line("z", x(11.15), 150, -900, 0.15, m.white);
  }
  const r = k.rnd;
  for (let z = 140; z > -890; z -= 16) k.tree(-2.2, z, 1.05, r() < 0.5 ? "round" : "cone", 0.15);
  for (let z = 132; z > -890; z -= 32) k.shrub(-2.2, z + 8, 1.2);
  for (let z = 120; z > -890; z -= 48) {
    lamp(k, set, -2.2, z, PI / 2, { height: 10, arm: 2.4 });
    lamp(k, set, -2.2, z, -PI / 2, { height: 10, arm: 2.4 });
  }
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? E : -16;
    for (let z = 130; z > -880; z -= 11) k.tree(x0 + side * 1.6, z, 1.0, "round", 0.15);
    let z = 120;
    while (z > -860) {
      const w = 34 + r() * 30;
      const d = 22 + r() * 10;
      const floors = 3 + Math.floor(r() * 5);
      k.building(x0 + side * (28 + d / 2), z - w / 2, side > 0 ? -PI / 2 : PI / 2, w, d, floors, r() < 0.6 ? m.office : m.stuccoGrey, { floorH: 3.8 });
      for (let i = 0; i < 3; i++) k.tree(x0 + side * (12 + r() * 10), z - r() * w, 1.2, "round", 0.15);
      z -= w + 14 + r() * 20;
    }
  }
  // A footbridge ahead gives the road depth.
  const bz = -330;
  const deck = new THREE.BoxGeometry(44, 0.7, 3.2);
  deck.translate(-2.2, 6.6, bz);
  k.add(deck, m.barrier);
  for (const x of [-20, -2.2, 15.6]) {
    const pier = new THREE.BoxGeometry(1.0, 6.4, 1.6);
    pier.translate(x, 3.2, bz);
    k.add(pier, m.barrier);
  }
  for (const dz of [-1.5, 1.5]) {
    const rail = new THREE.BoxGeometry(44, 1.1, 0.12);
    rail.translate(-2.2, 7.5, bz + dz);
    k.add(rail, m.galv);
  }
  k.hills(0, -300, 800, 80, m.hillFar, 0.6);
  return finish(k, set);
}

// ---------- Rural: a two-lane road through fields (spotting objects) ----------

export const RURAL_PATH = new Path({ x: 0, z: 40, h: 0 }, [
  { kind: "line", len: 110 },
  { kind: "arc", r: 380, a: 0.24 },
  { kind: "line", len: 40 },
  { kind: "arc", r: 420, a: -0.32 },
  { kind: "line", len: 300 },
]);

function ribbon(k: Kit, path: Path, from: number, to: number, l0: number, l1: number, y: number, mat: THREE.Material, tile = 6, dash = 0, gap = 0) {
  const step = 2;
  const pos: number[] = [];
  const uv: number[] = [];
  const period = dash + gap;
  for (let s = from; s < to; s += step) {
    const e = Math.min(to, s + step);
    if (period) {
      const ph = ((s % period) + period) % period;
      if (ph >= dash) continue;
    }
    const a0 = path.at(s, l0);
    const a1 = path.at(s, l1);
    const b0 = path.at(e, l0);
    const b1 = path.at(e, l1);
    // Wound so the faces point up.
    pos.push(a0.x, y, a0.z, a1.x, y, a1.z, b0.x, y, b0.z, a1.x, y, a1.z, b1.x, y, b1.z, b0.x, y, b0.z);
    const u0 = l0 / tile;
    const u1 = l1 / tile;
    uv.push(u0, s / tile, u1, s / tile, u0, e / tile, u1, s / tile, u1, e / tile, u0, e / tile);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  k.add(g, mat);
}

function rural(): SetData {
  const set = newSet("rural");
  const k = new Kit(0.67);
  const m = mats();
  const P = RURAL_PATH;
  k.rect(-900, 900, 900, -1100, -0.02, m.field, 9);
  ribbon(k, P, -60, P.length + 100, -3.6, 3.6, 0, m.asphalt, 8);
  ribbon(k, P, -60, P.length + 100, -5.0, -3.6, 0.005, m.gravel, 3);
  ribbon(k, P, -60, P.length + 100, 3.6, 5.0, 0.005, m.gravel, 3);
  ribbon(k, P, -60, P.length + 100, -9, -5.0, 0.004, m.grass, 6);
  ribbon(k, P, -60, P.length + 100, 5.0, 9, 0.004, m.grass, 6);
  ribbon(k, P, -60, P.length + 100, -3.3, -3.15, 0.02, m.white, 1);
  ribbon(k, P, -60, P.length + 100, 3.15, 3.3, 0.02, m.white, 1);
  ribbon(k, P, -60, P.length + 100, -0.07, 0.07, 0.02, m.yellow, 1, 3, 9);
  const r = k.rnd;
  // Fences and power poles follow the road.
  for (let s = -50; s < P.length + 90; s += 3.2) {
    for (const l of [-10, 10]) {
      const p = P.at(s, l);
      const post = new THREE.BoxGeometry(0.12, 1.25, 0.12);
      post.translate(0, 0.62, 0);
      k.add(post, m.wood, m4(p.x, 0, p.z, -p.h));
      const rail = new THREE.BoxGeometry(0.05, 0.1, 3.2);
      for (const y of [0.55, 1.05]) {
        const rg = rail.clone();
        rg.translate(0, y, -1.6);
        k.add(rg, m.wood, m4(p.x, 0, p.z, -p.h));
      }
    }
  }
  let prev: THREE.Vector3 | null = null;
  for (let s = -40; s < P.length + 80; s += 42) {
    const p = P.at(s, 7.2);
    const pole = new THREE.CylinderGeometry(0.11, 0.15, 10, 8);
    pole.translate(0, 5, 0);
    k.add(pole, m.wood, m4(p.x, 0, p.z));
    const bar = new THREE.BoxGeometry(2.2, 0.12, 0.12);
    bar.translate(0, 9.3, 0);
    k.add(bar, m.wood, m4(p.x, 0, p.z, -p.h));
    const top = new THREE.Vector3(p.x, 9.4, p.z);
    if (prev) {
      for (const off of [-0.9, 0.9]) {
        const rr = right(p.h);
        const a = prev.clone().add(new THREE.Vector3(rr.x * off, 0, rr.z * off));
        const b = top.clone().add(new THREE.Vector3(rr.x * off, 0, rr.z * off));
        const len = a.distanceTo(b);
        const wire = new THREE.CylinderGeometry(0.015, 0.015, len, 3);
        wire.rotateX(PI / 2);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y -= 0.5;
        const look = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
        const mtx = new THREE.Matrix4().makeTranslation(mid.x, mid.y, mid.z).multiply(look);
        k.add(wire, m.metal, mtx);
      }
    }
    prev = top;
  }
  // Tree lines, copses and a farm.
  for (let s = -40; s < P.length + 80; s += 7) {
    for (const side of [-1, 1]) {
      if (r() < 0.55) continue;
      const p = P.at(s, side * (16 + r() * 50));
      if (r() < 0.6) k.tree(p.x, p.z, 1.35, r() < 0.35 ? "cone" : "round");
    }
  }
  for (let i = 0; i < 9; i++) {
    const s = 30 + i * 60;
    const side = i % 2 ? 1 : -1;
    const c = P.at(s, side * (70 + r() * 70));
    for (let j = 0; j < 14; j++) k.tree(c.x + (r() - 0.5) * 40, c.z + (r() - 0.5) * 40, 1.5, r() < 0.4 ? "cone" : "round");
  }
  const farm = P.at(175, -58);
  k.house(farm.x, farm.z, farm.h + PI / 2, 0);
  const barn = new THREE.BoxGeometry(14, 7, 20);
  barn.translate(0, 3.5, 0);
  k.add(barn, m.barn, m4(farm.x - 30, 0, farm.z - 18, -farm.h));
  const roof = new THREE.CylinderGeometry(7.6, 7.6, 20.4, 4, 1, false, 0, PI);
  roof.rotateX(PI / 2);
  roof.rotateZ(PI / 2);
  roof.scale(1, 0.5, 1);
  roof.translate(0, 7, 0);
  k.add(roof, m.roof[0], m4(farm.x - 30, 0, farm.z - 18, -farm.h));
  k.hills(0, -250, 650, 90, m.hillFar, 0.8);
  k.hills(0, -250, 420, 34, m.hill, 0.1);
  return finish(k, set);
}

// ---------- Downtown: storefronts, parked cars, people (city drive, night drive) ----------

export const DOWNTOWN = {
  half: 5.8,
  travel: 3.4,
  cross: [-70, -160, -250, -340],
  /** Near edge of the painted stop line at the all-way stop (cross street at -160). */
  stopLine: -160 + 5.8 + 4.3,
  lane: 1.7,
  walk: 4.5,
  /** Where the night drive's pedestrians wait at the kerb; parking stays clear there. */
  hazards: [
    { z: -223, side: 1 },
    { z: -241.5, side: -1 },
    { z: -260.5, side: 1 },
    { z: -279, side: -1 },
    { z: -295.5, side: 1 },
  ],
};

function downtown(): SetData {
  const set = newSet("downtown");
  const k = new Kit(0.79);
  const m = mats();
  const H = DOWNTOWN.half;
  const W = DOWNTOWN.walk;
  const cross = DOWNTOWN.cross;
  ground(k, 1800, 0, -250);
  k.rect(-H, 120, H, -560, 0, m.asphalt);
  for (const cz of cross) k.rect(-300, cz + H, 300, cz - H, 0.001, m.asphalt);
  const zEdges = [120, ...cross.flatMap((c) => [c + H, c - H]), -560];
  for (let i = 0; i < zEdges.length; i += 2) {
    const z1 = zEdges[i];
    const z0 = zEdges[i + 1];
    k.block(H, z0, 140, z1, { r: 4, top: m.concrete });
    k.block(-140, z0, -H, z1, { r: 4, top: m.concrete });
  }
  // Markings: centre line, parking lanes, stop lines and crosswalks.
  for (let i = 0; i < zEdges.length; i += 2) {
    const a = zEdges[i] - (i ? 4.4 : 0);
    const b = zEdges[i + 1] + 4.4;
    k.line("z", -0.13, a, b, 0.11, m.yellow);
    k.line("z", 0.13, a, b, 0.11, m.yellow);
    k.line("z", -DOWNTOWN.travel, a, b, 0.12, m.white);
    k.line("z", DOWNTOWN.travel, a, b, 0.12, m.white);
  }
  for (const cz of cross) {
    k.crosswalk("z", cz + H + 0.5, cz + H + 3.5, -H, H);
    k.crosswalk("z", cz - H - 3.5, cz - H - 0.5, -H, H);
    k.crosswalk("x", -H - 3.5, -H - 0.5, cz - H, cz + H);
    k.crosswalk("x", H + 0.5, H + 3.5, cz - H, cz + H);
    k.rect(0.2, cz + H + 3.9, DOWNTOWN.travel, cz + H + 4.3, 0.02, m.white, 1);
    k.rect(-DOWNTOWN.travel, cz - H - 4.3, -0.2, cz - H - 3.9, 0.02, m.white, 1);
    k.line("x", cz - 0.13, -300, -H - 4.4, 0.11, m.yellow);
    k.line("x", cz + 0.13, -300, -H - 4.4, 0.11, m.yellow);
    k.line("x", cz - 0.13, H + 4.4, 300, 0.11, m.yellow);
    k.line("x", cz + 0.13, H + 4.4, 300, 0.11, m.yellow);
  }
  // All-way stop at the first two corners; a signal further on.
  for (const cz of [cross[0], cross[1]]) {
    k.stopSign(H + 0.9, cz + H + 4.2, 0);
    k.stopSign(-H - 0.9, cz - H - 4.2, PI);
    k.stopSign(-H - 4.2, cz + H + 0.9, PI / 2);
    k.stopSign(H + 4.2, cz - H - 0.9, -PI / 2);
  }
  for (const cz of [cross[2], cross[3]]) {
    const c = H + 1.6;
    signalMast(k, set, c, cz - c, 0, [-4.1], "main", 5.6);
    signalMast(k, set, -c, cz + c, PI, [-4.1], "main", 5.6);
    signalMast(k, set, c, cz + c, PI / 2, [-4.1], "cross", 5.6);
    signalMast(k, set, -c, cz - c, -PI / 2, [-4.1], "cross", 5.6);
  }
  const r = k.rnd;
  const facades = [m.brickRed, m.brickTan, m.stucco, m.stuccoGrey, m.brickRed];
  const front = H + W;
  for (const side of [-1, 1]) {
    const face = side > 0 ? -PI / 2 : PI / 2;
    for (let i = 0; i < zEdges.length; i += 2) {
      const z1 = zEdges[i] - 0.5;
      const z0 = zEdges[i + 1] + 0.5;
      let z = z1;
      while (z > z0 + 4) {
        const w = Math.min(z - z0, 8 + r() * 9);
        const d = 16 + r() * 4;
        const floors = 1 + Math.floor(r() * 4);
        k.building(side * (front + d / 2), z - w / 2, face, w, d, floors, facades[Math.floor(r() * facades.length)], { ground: true, awning: r() < 0.55 });
        z -= w;
      }
      // Buildings facing the cross streets near each corner.
      for (const [cz, sz] of [
        [zEdges[i] + H, -1],
        [zEdges[i + 1] - H, 1],
      ] as const) {
        if (!cross.includes(cz)) continue;
        for (let j = 0; j < 3; j++) {
          const x = side * (front + 22 + j * 15);
          k.building(x, cz + sz * (H + W + 9), sz < 0 ? PI : 0, 13, 17, 2 + Math.floor(r() * 3), facades[Math.floor(r() * facades.length)], { ground: true });
        }
      }
    }
    // Street trees, lamps and parked cars.
    const nearHazard = (z: number, gap: number) => DOWNTOWN.hazards.some((hz) => hz.side === side && Math.abs(z - hz.z) < gap);
    for (let z = 110; z > -550; z -= 16) {
      if (cross.some((c) => Math.abs(z - c) < H + 6) || nearHazard(z, 3)) continue;
      k.tree(side * (H + 1.0), z, 0.75, "street", 0.15);
    }
    for (let z = 102; z > -550; z -= 24) {
      if (cross.some((c) => Math.abs(z - c) < H + 5) || nearHazard(z, 2.5)) continue;
      lamp(k, set, side * (H + 0.55), z, face, { height: 6.5, arm: 0.9 });
    }
    for (let z = 110; z > -550; z -= 6.6) {
      if (cross.some((c) => Math.abs(z - c) < H + 9)) continue;
      // Keep the curb clear in front of each person too, so a parked car never hides them.
      if (DOWNTOWN.hazards.some((hz) => hz.side === side && z - hz.z > -5 && z - hz.z < 24)) continue;
      if (r() < 0.62) k.parked(side * 4.6, z, side > 0 ? 0 : PI, (["sedan", "suv", "hatch", "sedan"] as const)[Math.floor(r() * 4)], Math.floor(r() * 8));
    }
  }
  // Skyline beyond.
  for (let i = 0; i < 70; i++) {
    const a = r() * PI * 2;
    const d = 330 + r() * 280;
    const x = Math.cos(a) * d;
    const z = -250 + Math.sin(a) * d;
    if (Math.abs(x) < 150 && z < 120 && z > -560) continue;
    const g = new THREE.BoxGeometry(24 + r() * 30, 30 + r() * 110, 24 + r() * 30);
    g.translate(x, g.parameters.height / 2, z);
    k.add(g, r() < 0.5 ? m.office : m.stuccoGrey);
  }
  return finish(k, set);
}

const builders: Record<SetId, () => SetData> = { arterial, residential, suburb, boulevard, rural, downtown };

export function buildSet(id: SetId) {
  return builders[id]();
}

