import { useEffect, useRef } from "react";
import { driveById, type DriveId } from "../data/drives";
import type { DriveRaw } from "../lib/score";
import {
  CITY_STOP_AT,
  CRASH_AT,
  FOD_TARGETS,
  GO_AT,
  LANE_CHANGES,
  LEFT_TURNS,
  LIGHT_RED_AT,
  NIGHT_HAZARDS,
  RIGHT_TURNS,
  SEG,
  STOP_AT,
  TURN_LEN,
  driveLength,
  driveSeconds,
  fodCaught,
  segmentAt,
} from "./timeline";

// Pseudo-3D road renderer. Position is a pure function of drive time, so every
// screen showing the drive stays in step.

const SEG_LEN = 200;
const ROAD_W = 2000;
const CAM_H = 1050;
const CAM_DEPTH = 1 / Math.tan((50 * Math.PI) / 180);
const DRAW = 200;
const BASE_V = 5600;
const DT = 1 / 60;

const WORLD = 48; // seconds of road at 1x

const DAY = {
  skyTop: "#9FBBD0",
  skyLow: "#E4ECEF",
  hillFar: "#B9C9BE",
  hillNear: "#A3B7A8",
  grassA: "#B7C5A8",
  grassB: "#B0BFA1",
  rumbleA: "#E9EDEB",
  rumbleB: "#C2C9C5",
  roadA: "#4E555D",
  roadB: "#4B5259",
  line: "#F2F4F3",
  yellow: "#F4B400",
  dash: "#1C2229",
};

const NIGHT: typeof DAY = {
  skyTop: "#070C14",
  skyLow: "#1A2533",
  hillFar: "#111923",
  hillNear: "#151E27",
  grassA: "#18221C",
  grassB: "#16201A",
  rumbleA: "#3A4148",
  rumbleB: "#2D333A",
  roadA: "#24292F",
  roadB: "#22272D",
  line: "#C9CDCA",
  yellow: "#B88A10",
  dash: "#1C2229",
};

// The palette in use for the frame being drawn.
let C = DAY;
let isNight = false;

type Sprite = { kind: "tree" | "building" | "lamp" | "stop" | "light" | "crosswalk"; offset: number; seed: number };
type Seg = { index: number; curve: number; sprites: Sprite[]; crosswalk?: boolean; stopLine?: boolean };

function smooth(a: number, b: number, t: number) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** Speed through a turn at a stop sign: full stop, a pause, then the turn at a crawl. */
function stopAndTurn(t: number, at: number, hold: number) {
  if (t < at - 1.0 || t > at + TURN_LEN + 0.7) return 1;
  if (t < at - 0.3) return 1 - smooth(at - 1.0, at - 0.3, t);
  if (t < at - 0.3 + hold) return 0;
  if (t < at + TURN_LEN) return 0.36 * smooth(at - 0.3 + hold, at + 0.2 + hold, t);
  return 0.36 + 0.64 * smooth(at + TURN_LEN, at + TURN_LEN + 0.7, t);
}

function speedAt(t: number, ranStop = false) {
  let v = 1;
  // Reaction: brake for the red light, then pull away.
  const brakeStart = LIGHT_RED_AT + 0.6;
  if (t > brakeStart && t < GO_AT + 1.6) {
    if (t < STOP_AT) v = 1 - smooth(brakeStart, STOP_AT, t);
    else if (t < GO_AT) v = 0;
    else v = smooth(GO_AT, GO_AT + 1.6, t);
  }
  for (const at of RIGHT_TURNS) v = Math.min(v, stopAndTurn(t, at, 0.35));
  // Left turns wait for the cross traffic to clear.
  for (const at of LEFT_TURNS) v = Math.min(v, stopAndTurn(t, at, 0.6));
  if (t >= 24 && t < 32) v *= 1 + 0.25 * smooth(24, 25, t) * (1 - smooth(31.4, 32, t));
  if (t >= 40) {
    v *= 0.88;
    // The stop sign in town: a full stop, or a roll through it.
    const at = CITY_STOP_AT;
    if (t > at - 0.9 && t < at + 1.1) {
      if (ranStop) v *= 1 - 0.4 * Math.sin(Math.PI * smooth(at - 0.9, at + 1.1, t));
      else if (t < at - 0.2) v *= 1 - smooth(at - 0.9, at - 0.2, t);
      else if (t < at + 0.3) v = 0;
      else v *= smooth(at + 0.3, at + 1.1, t);
    }
  }
  return v * BASE_V;
}

type World = { z: Float32Array; segs: Seg[]; cum: Float32Array; zAt: (t: number) => number; segAtTime: (t: number) => number };

const worldCache: Partial<Record<"stops" | "rolls", World>> = {};

function buildWorld(ranStop: boolean): World {
  const cacheKey = ranStop ? "rolls" : "stops";
  const cached = worldCache[cacheKey];
  if (cached) return cached;
  const steps = Math.ceil(WORLD / DT) + 2;
  const z = new Float32Array(steps);
  for (let i = 1; i < steps; i++) z[i] = z[i - 1] + speedAt(i * DT, ranStop) * DT;
  const zAt = (t: number) => {
    const f = Math.max(0, Math.min(steps - 1.001, t / DT));
    const i = Math.floor(f);
    return z[i] + (z[i + 1] - z[i]) * (f - i);
  };
  const segAtTime = (t: number) => Math.floor(zAt(t) / SEG_LEN);
  const n = Math.ceil(z[steps - 1] / SEG_LEN) + DRAW + 20;
  const segs: Seg[] = Array.from({ length: n }, (_, index) => ({ index, curve: 0, sprites: [] }));

  const curveBetween = (t0: number, t1: number, amount: number) => {
    const a = segAtTime(t0);
    const b = segAtTime(t1);
    const len = Math.max(1, b - a);
    for (let i = a; i <= b && i < n; i++) {
      const k = (i - a) / len;
      segs[i].curve += amount * Math.sin(k * Math.PI);
    }
  };
  // Gentle bends between tasks, sharp ones for turns.
  const curveSegs = (a: number, len: number, amount: number) => {
    for (let i = a; i <= a + len && i < n; i++) segs[i].curve += amount * Math.sin(((i - a) / len) * Math.PI);
  };
  curveBetween(0.2, 1.8, 1.2);
  // Turns bend away just past the crosswalk the car stopped at.
  RIGHT_TURNS.forEach((at) => curveSegs(segAtTime(at) + 10, 16, 8));
  LEFT_TURNS.forEach((at) => curveSegs(segAtTime(at) + 10, 16, -8));
  curveBetween(26.2, 27.4, -1.4);
  curveBetween(32.5, 35.5, 1.6);
  curveBetween(36, 39.5, -1.8);
  curveBetween(41, 43.5, 2.4);
  curveBetween(44.5, 47, -2.6);

  // Intersection markings.
  const mark = (seg: number, stop = false) => {
    for (let i = seg; i < seg + 3 && i < n; i++) segs[i].crosswalk = true;
    if (stop && seg - 1 >= 0) segs[seg - 1].stopLine = true;
  };
  // Stop line just ahead of where the car halts; the signal hangs on the far side of the intersection.
  const stopSeg = segAtTime(STOP_AT);
  mark(stopSeg + 7, true);
  mark(stopSeg + 25);
  segs[stopSeg + 28].sprites.push({ kind: "light", offset: 1.32, seed: 0 });
  // Every turn and the town stop sign: the car halts just short of the stop line, with the sign in view.
  [...RIGHT_TURNS, ...LEFT_TURNS, CITY_STOP_AT].forEach((at) => {
    const s = segAtTime(at) + 6;
    mark(s + 1, true);
    segs[s].sprites.push({ kind: "stop", offset: 1.28, seed: 0 });
  });

  // Roadside: trees and lamps outside town, buildings in town.
  const townStart = segAtTime(40);
  const signSegs = new Set([...RIGHT_TURNS, ...LEFT_TURNS, CITY_STOP_AT].map((at) => segAtTime(at) + 6));
  let rnd = 7;
  const rand = () => {
    rnd = (rnd * 16807) % 2147483647;
    return rnd / 2147483647;
  };
  for (let i = 6; i < n; i++) {
    if (segs[i].crosswalk || signSegs.has(i) || (i > stopSeg + 6 && i < stopSeg + 28)) continue;
    if (i >= townStart) {
      if (i % 3 === 0) segs[i].sprites.push({ kind: "building", offset: -(1.9 + rand() * 0.5), seed: rand() });
      if (i % 3 === 1) segs[i].sprites.push({ kind: "building", offset: 1.9 + rand() * 0.5, seed: rand() });
      if (i % 9 === 4) segs[i].sprites.push({ kind: "lamp", offset: 1.22, seed: 0 });
    } else {
      if (i % 5 === 0) segs[i].sprites.push({ kind: "tree", offset: -(1.5 + rand() * 1.6), seed: rand() });
      if (i % 7 === 3) segs[i].sprites.push({ kind: "tree", offset: 1.5 + rand() * 1.6, seed: rand() });
      if (i % 16 === 8) segs[i].sprites.push({ kind: "lamp", offset: 1.22, seed: 0 });
    }
  }

  const cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + segs[i].curve;
  const world = { z, segs, cum, zAt, segAtTime };
  worldCache[cacheKey] = world;
  return world;
}

function laneX(t: number) {
  // Player starts in the right lane (+0.5) and changes lanes three times.
  const lanes = [0.5, -0.5, 0.5, -0.5];
  let x = lanes[0];
  LANE_CHANGES.forEach((at, i) => {
    x += (lanes[i + 1] - lanes[i]) * smooth(at, at + 1.4, t);
  });
  x += (0.5 - lanes[3]) * smooth(32.4, 33.6, t);
  return x;
}

type Traffic = { lane: number; z: number; color: string };

function trafficAt(t: number, w: World): Traffic[] {
  const out: Traffic[] = [];
  const colors = ["#D7DCDF", "#6E8296", "#8E2F2A", "#E9E9E4"];
  // Slower cars to pass during lane changes.
  LANE_CHANGES.forEach((at, i) => {
    const fromLane = i % 2 === 0 ? 0.5 : -0.5;
    const t0 = at - 2.2;
    if (t < t0 - 0.5 || t > at + 3.5) return;
    const z0 = w.zAt(t0) + 2600;
    out.push({ lane: fromLane, z: z0 + 0.55 * BASE_V * (t - t0), color: colors[i] });
  });
  return out;
}

function lightState(t: number) {
  if (t < LIGHT_RED_AT - 0.7) return "green";
  if (t < LIGHT_RED_AT) return "yellow";
  if (t < GO_AT - 0.3) return "red";
  return "green";
}

// --- drawing helpers ---

function poly(ctx: CanvasRenderingContext2D, pts: number[], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  const h = w * 0.62;
  ctx.fillStyle = "rgba(20,24,28,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.56, w * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x - w / 2, y - h, w, h * 0.78, w * 0.12);
  ctx.fill();
  rr(ctx, x - w * 0.38, y - h * 1.22, w * 0.76, h * 0.5, w * 0.14);
  ctx.fill();
  ctx.fillStyle = "#26303A";
  rr(ctx, x - w * 0.32, y - h * 1.14, w * 0.64, h * 0.34, w * 0.08);
  ctx.fill();
  ctx.fillStyle = "#C2362B";
  rr(ctx, x - w * 0.46, y - h * 0.72, w * 0.16, h * 0.13, w * 0.03);
  ctx.fill();
  rr(ctx, x + w * 0.3, y - h * 0.72, w * 0.16, h * 0.13, w * 0.03);
  ctx.fill();
  ctx.fillStyle = "#1C2229";
  rr(ctx, x - w * 0.5, y - h * 0.24, w * 0.18, h * 0.24, w * 0.04);
  ctx.fill();
  rr(ctx, x + w * 0.32, y - h * 0.24, w * 0.18, h * 0.24, w * 0.04);
  ctx.fill();
}

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale: number, W: number, t: number) {
  const unit = scale * ROAD_W * (W / 2); // pixels per road half-width
  if (unit < 0.5) return;
  switch (s.kind) {
    case "tree": {
      const h = unit * (0.9 + s.seed * 0.6);
      ctx.fillStyle = isNight ? "#221E1A" : "#6F6253";
      ctx.fillRect(x - h * 0.04, y - h * 0.38, h * 0.08, h * 0.38);
      ctx.fillStyle = isNight ? (s.seed > 0.5 ? "#1E2A22" : "#1A251E") : s.seed > 0.5 ? "#7F9B83" : "#6C8A73";
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.66, h * 0.32, h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "building": {
      const w = unit * (0.9 + s.seed * 0.5);
      const h = unit * (1.2 + s.seed * 1.4);
      const tones = isNight ? ["#20262E", "#1C2229", "#252B33", "#1A1F25"] : ["#CBC6BD", "#B9BFC3", "#D9D4CA", "#A9B2B7"];
      ctx.fillStyle = tones[Math.floor(s.seed * 4) % 4];
      ctx.fillRect(x - w / 2, y - h, w, h);
      if (w > 14) {
        const cols = 3;
        const rows = Math.max(2, Math.floor(h / (w / 2.4)));
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            // At night some windows are lit.
            const lit = isNight && ((r * 7 + c * 3 + Math.floor(s.seed * 10)) % 3 === 0);
            ctx.fillStyle = isNight ? (lit ? "rgba(244,195,90,0.85)" : "rgba(10,14,18,0.6)") : "rgba(38,48,58,0.55)";
            ctx.fillRect(x - w / 2 + w * (0.12 + c * 0.28), y - h + h * (0.08 + r * (0.84 / rows)), w * 0.16, (h * 0.84) / rows - h * 0.05);
          }
      }
      break;
    }
    case "lamp": {
      if (unit > W * 0.5) return;
      const h = unit * 1.3;
      ctx.strokeStyle = "#5C6670";
      ctx.lineWidth = Math.max(1, unit * 0.022);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h);
      ctx.lineTo(x - unit * 0.22, y - h);
      ctx.stroke();
      if (isNight) {
        const r = Math.max(1.5, unit * 0.16);
        const g = ctx.createRadialGradient(x - unit * 0.22, y - h, 0, x - unit * 0.22, y - h, r);
        g.addColorStop(0, "rgba(255,226,170,0.9)");
        g.addColorStop(0.25, "rgba(255,214,140,0.35)");
        g.addColorStop(1, "rgba(255,214,140,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x - unit * 0.22, y - h, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "stop": {
      const h = unit * 0.9;
      const r = unit * 0.17;
      ctx.fillStyle = "#5C6670";
      ctx.fillRect(x - unit * 0.015, y - h, unit * 0.03, h);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 8) * (2 * i + 1);
        ctx.lineTo(x + r * Math.cos(a), y - h + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle = "#B8322A";
      ctx.fill();
      if (r > 9) {
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${r * 0.62}px "Overpass Variable", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STOP", x, y - h + r * 0.06);
      }
      break;
    }
    case "light": {
      const h = unit * 1.55;
      ctx.fillStyle = "#4A535C";
      ctx.fillRect(x - unit * 0.02, y - h, unit * 0.04, h);
      ctx.fillRect(x - unit * 0.62, y - h, unit * 0.62, unit * 0.04);
      const bx = x - unit * 0.62;
      const bw = unit * 0.16;
      const bh = unit * 0.44;
      ctx.fillStyle = "#1C2229";
      rr(ctx, bx - bw / 2, y - h, bw, bh, bw * 0.2);
      ctx.fill();
      const st = lightState(t);
      const lamps: [string, string][] = [
        ["red", "#E2463A"],
        ["yellow", "#F4B400"],
        ["green", "#3FB36B"],
      ];
      lamps.forEach(([k, col], i) => {
        ctx.fillStyle = st === k ? col : "#38414A";
        ctx.beginPath();
        ctx.arc(bx, y - h + bh * (0.2 + i * 0.3), bw * 0.32, 0, Math.PI * 2);
        ctx.fill();
        if (st === k && bw > 6) {
          ctx.fillStyle = col + "40";
          ctx.beginPath();
          ctx.arc(bx, y - h + bh * (0.2 + i * 0.3), bw * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;
    }
  }
}

function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = "#11161B";
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.17;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, r * 0.04);
  ctx.quadraticCurveTo(0, -r * 0.12, r * 0.92, r * 0.04);
  ctx.moveTo(0, r * 0.1);
  ctx.lineTo(0, r * 0.9);
  ctx.stroke();
  ctx.fillStyle = "#11161B";
  ctx.beginPath();
  ctx.arc(0, r * 0.04, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#F4B400";
  ctx.beginPath();
  ctx.arc(0, r * 0.04, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#F4B400";
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2 - 0.13, -Math.PI / 2 + 0.13);
  ctx.stroke();
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  driveT: number,
  assigned: DriveId[],
  raw: DriveRaw,
  reaction: { measured: number | null; live: boolean },
) {
  const w = buildWorld(!!raw.city.ranStop);
  const drive = segmentAt(driveT, assigned);
  const t = drive.world;
  C = drive.night ? NIGHT : DAY;
  isNight = drive.night;
  const position = w.zAt(t);
  const baseIndex = Math.floor(position / SEG_LEN);
  const basePct = (position % SEG_LEN) / SEG_LEN;
  // At night the car wanders in its lane by the drift that was measured.
  const playerX = laneX(t) + (drive.night ? (raw.night.drift / 12) * Math.sin((t - 40) * 1.6) : 0);
  const horizon = H * 0.5;

  // Collision shake.
  const crashAt = CRASH_AT;
  const crashing = drive.id === "left" && raw.left.collision && t > crashAt - 0.1 && t < crashAt + 0.6;
  ctx.save();
  if (crashing) ctx.translate(Math.sin(t * 90) * W * 0.004, Math.cos(t * 70) * H * 0.004);

  // Sky and hills.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, W + 40, horizon + 40);
  const bend = w.cum[Math.min(baseIndex, w.cum.length - 1)] * 0.0045;
  const hills = (color: string, amp: number, freq: number, par: number, base: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-20, horizon + 2);
    for (let x = -20; x <= W + 20; x += 8) {
      const u = x / W + bend * par;
      const y = horizon - base * H - amp * H * (0.5 + 0.5 * Math.sin(u * freq * Math.PI * 2) * Math.cos(u * freq * 1.7));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 20, horizon + 2);
    ctx.closePath();
    ctx.fill();
  };
  hills(C.hillFar, 0.07, 1.3, 0.25, 0.02);
  hills(C.hillNear, 0.045, 2.3, 0.6, 0.0);

  // Road segments, near to far.
  type P = { x: number; y: number; w: number; scale: number; z: number };
  const proj: { p1: P; p2: P; seg: Seg; clip: number }[] = [];
  let x = 0;
  let dx = -(w.segs[baseIndex].curve * basePct);
  let maxy = H;
  const camX = playerX * ROAD_W;
  const project = (worldZ: number, cx: number): P => {
    const cz = worldZ - position;
    const scale = CAM_DEPTH / cz;
    return { x: W / 2 + scale * -cx * (W / 2), y: horizon + scale * CAM_H * (H / 2) * 0.92, w: scale * ROAD_W * (W / 2), scale, z: cz };
  };
  for (let n = 0; n < DRAW; n++) {
    const seg = w.segs[Math.min(baseIndex + n, w.segs.length - 1)];
    const z1 = seg.index * SEG_LEN;
    const z2 = z1 + SEG_LEN;
    const p1 = project(z1, camX - x);
    const p2 = project(z2, camX - x - dx);
    x += dx;
    dx += seg.curve;
    proj.push({ p1, p2, seg, clip: maxy });
    if (p1.z > CAM_DEPTH * 120 && p2.y < p1.y) maxy = Math.min(maxy, p1.y);
  }

  // Paint far to near so each band overlaps the one behind it by a pixel.
  for (let n = proj.length - 1; n >= 0; n--) {
    const { p1, p2, seg } = proj[n];
    if (p1.z <= CAM_DEPTH * 120 || p2.y >= p1.y || p2.y >= H) continue;
    const alt = Math.floor(seg.index / 3) % 2 === 0;
    const y2 = p2.y - 1;
    ctx.fillStyle = alt ? C.grassA : C.grassB;
    ctx.fillRect(0, y2, W, p1.y - y2);
    const r1 = p1.w / 9;
    const r2 = p2.w / 9;
    poly(ctx, [p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, y2, p2.x - p2.w - r2, y2], alt ? C.rumbleA : C.rumbleB);
    poly(ctx, [p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, y2, p2.x + p2.w + r2, y2], alt ? C.rumbleA : C.rumbleB);
    poly(ctx, [p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, y2, p2.x - p2.w, y2], alt ? C.roadA : C.roadB);
    const l1 = p1.w / 34;
    const l2 = p2.w / 34;
    // Edge lines: yellow on the left, white on the right.
    poly(ctx, [p1.x - p1.w + l1 * 0.6, p1.y, p1.x - p1.w + l1 * 1.6, p1.y, p2.x - p2.w + l2 * 1.6, y2, p2.x - p2.w + l2 * 0.6, y2], C.yellow);
    poly(ctx, [p1.x + p1.w - l1 * 1.6, p1.y, p1.x + p1.w - l1 * 0.6, p1.y, p2.x + p2.w - l2 * 0.6, y2, p2.x + p2.w - l2 * 1.6, y2], C.line);
    if (seg.crosswalk) {
      const stripes = 9;
      for (let i = 0; i < stripes; i++) {
        const a = -1 + (2 * (i + 0.2)) / stripes;
        const b = -1 + (2 * (i + 0.75)) / stripes;
        poly(ctx, [p1.x + p1.w * a, p1.y, p1.x + p1.w * b, p1.y, p2.x + p2.w * b, p2.y, p2.x + p2.w * a, p2.y], C.line);
      }
    } else if (seg.stopLine) {
      poly(ctx, [p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y], C.line);
    } else if (seg.index % 4 < 2) {
      poly(ctx, [p1.x - l1 * 0.5, p1.y, p1.x + l1 * 0.5, p1.y, p2.x + l2 * 0.5, p2.y, p2.x - l2 * 0.5, p2.y], C.line);
    }
  }

  // Sprites and traffic, far to near.
  // At night the road ahead stays clear so the roadside hazards are the task.
  const traffic = drive.night ? [] : trafficAt(t, w);
  for (let n = proj.length - 1; n >= 0; n--) {
    const { p1, seg, clip } = proj[n];
    if (p1.z <= CAM_DEPTH * 120) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, clip);
    ctx.clip();
    for (const s of seg.sprites) drawSprite(ctx, s, p1.x + p1.scale * s.offset * ROAD_W * (W / 2), p1.y, p1.scale, W, t);
    for (const car of traffic) {
      if (Math.floor(car.z / SEG_LEN) !== seg.index) continue;
      const k = (car.z % SEG_LEN) / SEG_LEN;
      const p2 = proj[n].p2;
      const cx = p1.x + (p2.x - p1.x) * k + p1.scale * car.lane * ROAD_W * (W / 2);
      const cy = p1.y + (p2.y - p1.y) * k;
      drawCar(ctx, cx, cy, p1.scale * ROAD_W * (W / 2) * 0.62, car.color);
    }
    ctx.restore();
  }

  // Cross traffic at left turns.
  LEFT_TURNS.forEach((at, i) => {
    const near = raw.left.collision && i === 1;
    let cx: number;
    const size = W * (near ? 0.2 : 0.07);
    const y = horizon + H * (near ? 0.2 : 0.06);
    if (near) {
      // The car the driver misses pulls across and is struck in front of them.
      const t0 = crashAt - 0.9;
      if (t < t0 || t > crashAt + 0.7) return;
      cx = -size + (W / 2 + size) * smooth(t0, crashAt, t);
    } else {
      const t0 = at - 1.4;
      if (t < t0 || t > t0 + 1.6) return;
      cx = -size + (W + 2 * size) * ((t - t0) / 1.6);
    }
    ctx.save();
    ctx.translate(cx, y);
    ctx.fillStyle = "rgba(20,24,28,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.55, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6E8296";
    rr(ctx, -size / 2, -size * 0.36, size, size * 0.28, size * 0.08);
    ctx.fill();
    rr(ctx, -size * 0.28, -size * 0.52, size * 0.5, size * 0.22, size * 0.07);
    ctx.fill();
    ctx.fillStyle = "#26303A";
    rr(ctx, -size * 0.22, -size * 0.48, size * 0.4, size * 0.13, size * 0.04);
    ctx.fill();
    ctx.fillStyle = "#1C2229";
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.08, size * 0.08, 0, Math.PI * 2);
    ctx.arc(size * 0.3, -size * 0.08, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Object detection targets.
  const caught = fodCaught(raw.fod.spotted);
  // Eight objects at the edges of the view, alternating sides.
  const spots = [
    [0.11, 0.36],
    [0.87, 0.31],
    [0.08, 0.55],
    [0.93, 0.5],
    [0.19, 0.24],
    [0.81, 0.2],
    [0.05, 0.4],
    [0.95, 0.66],
  ];
  FOD_TARGETS.forEach((at, i) => {
    if (t < at || t > at + 1.0) return;
    const k = (t - at) / 1.0;
    const [fx, fy] = spots[i];
    const r = W * 0.018;
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.fillStyle = C.yellow;
    ctx.strokeStyle = "#1C2229";
    ctx.lineWidth = r * 0.25;
    ctx.beginPath();
    ctx.arc(fx * W, fy * H, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (caught.has(i) && k > 0.35) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = r * 0.18;
      ctx.beginPath();
      ctx.arc(fx * W, fy * H, r * (1.3 + (k - 0.35) * 2.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  // Night drive: headlight pool, oncoming glare and people at the roadside.
  if (drive.night) {
    const vg = ctx.createRadialGradient(W / 2, H * 0.95, H * 0.1, W / 2, H * 0.75, H * 0.95);
    vg.addColorStop(0, "rgba(255,236,200,0.10)");
    vg.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    [41.7, 44.6, 46.5].forEach((at) => {
      if (t < at - 0.9 || t > at + 0.5) return;
      const k = Math.min(1, (t - (at - 0.9)) / 1.2);
      const x = W * (0.45 - 0.32 * k * k);
      const y = horizon + H * (0.012 + 0.14 * k * k);
      const r = W * (0.003 + 0.022 * k * k);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 16);
      glow.addColorStop(0, `rgba(255,255,240,${0.95 * Math.min(1, k * 1.6)})`);
      glow.addColorStop(0.18, `rgba(255,248,220,${0.5 * k})`);
      glow.addColorStop(1, "rgba(255,248,220,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFFDF2";
      ctx.beginPath();
      ctx.arc(x - r * 1.7, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 1.7, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    const seen = new Set([0, 2, 4, 1, 3].slice(0, raw.night.spotted));
    const hx = [0.64, 0.34, 0.7, 0.3, 0.66];
    NIGHT_HAZARDS.forEach((at, i) => {
      if (t < at || t > at + 1.1) return;
      const k = (t - at) / 1.1;
      const x = W * hx[i];
      const y = horizon + H * (0.07 + 0.1 * k);
      const sz = H * (0.05 + 0.07 * k);
      ctx.globalAlpha = Math.min(1, (1 - k) * 3);
      ctx.fillStyle = "#59626D";
      ctx.beginPath();
      ctx.arc(x, y - sz * 0.95, sz * 0.13, 0, Math.PI * 2);
      ctx.fill();
      rr(ctx, x - sz * 0.12, y - sz * 0.8, sz * 0.24, sz * 0.55, sz * 0.06);
      ctx.fill();
      ctx.fillRect(x - sz * 0.1, y - sz * 0.28, sz * 0.07, sz * 0.28);
      ctx.fillRect(x + sz * 0.03, y - sz * 0.28, sz * 0.07, sz * 0.28);
      ctx.fillStyle = "#F4B400";
      ctx.fillRect(x - sz * 0.12, y - sz * 0.6, sz * 0.24, sz * 0.045);
      if (seen.has(i) && k > 0.35) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1.5, sz * 0.03);
        ctx.beginPath();
        ctx.arc(x, y - sz * 0.5, sz * (0.75 + (k - 0.35) * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  }

  // Dashboard and wheel.
  const dashTop = H * 0.84;
  ctx.fillStyle = "#1F262D";
  ctx.beginPath();
  ctx.moveTo(-20, H + 20);
  ctx.lineTo(-20, dashTop + H * 0.04);
  ctx.quadraticCurveTo(W / 2, dashTop - H * 0.05, W + 20, dashTop + H * 0.04);
  ctx.lineTo(W + 20, H + 20);
  ctx.closePath();
  ctx.fill();
  const seg = w.segs[baseIndex];
  const laneSteer = (laneX(t + 0.25) - laneX(t)) * 6;
  const steer = Math.max(-1.6, Math.min(1.6, seg.curve * 0.2 + laneSteer));
  drawWheel(ctx, W / 2, H * 1.02, H * 0.26, steer);

  const mph = Math.round((speedAt(t, !!raw.city.ranStop) / BASE_V) * 38);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${H * 0.07}px "Overpass Variable", sans-serif`;
  ctx.fillText(String(mph), W * 0.05, H * 0.955);
  const mphW = ctx.measureText(String(mph)).width;
  ctx.font = `600 ${H * 0.028}px "Atkinson Hyperlegible Next Variable", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("mph", W * 0.05 + mphW + H * 0.012, H * 0.955);

  // Brake prompt for a live reaction test.
  if (drive.id === "reaction" && reaction.live && t > LIGHT_RED_AT && t < LIGHT_RED_AT + 1.6 && reaction.measured === null) {
    ctx.font = `700 ${H * 0.034}px "Atkinson Hyperlegible Next Variable", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Tap to brake", W / 2, H * 0.8);
  }
  if (drive.id === "reaction" && reaction.measured !== null && t > LIGHT_RED_AT && t < GO_AT + 1) {
    ctx.font = `800 ${H * 0.05}px "Overpass Variable", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${(reaction.measured / 1000).toFixed(2)} s`, W / 2, H * 0.8);
  }

  ctx.restore();
  if (crashing) {
    ctx.fillStyle = `rgba(168,67,42,${0.35 * (1 - Math.abs(t - crashAt) / 0.6)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Fade between drives.
  const fadeIn = drive.index > 0 ? 1 - Math.min(1, drive.local / 0.4) : 0;
  const fadeOut = drive.index < drive.count - 1 ? Math.max(0, (drive.local - (SEG - 0.3)) / 0.3) : 0;
  const fade = Math.max(fadeIn, fadeOut);
  if (fade > 0) {
    ctx.fillStyle = `rgba(12,15,19,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Drive label.
  const label = `Drive ${drive.index + 1} of ${drive.count}: ${driveById[drive.id].name}`;
  ctx.font = `700 ${H * 0.032}px "Atkinson Hyperlegible Next Variable", sans-serif`;
  ctx.textAlign = "left";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(28,34,41,0.78)";
  rr(ctx, W * 0.03, H * 0.04, tw + H * 0.05, H * 0.065, H * 0.02);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(label, W * 0.03 + H * 0.025, H * 0.084);
}

export function SimCanvas({
  simStart,
  speed,
  assigned,
  raw,
  liveReaction,
  onBrake,
  className = "",
}: {
  simStart: number | null;
  speed: number;
  assigned: DriveId[];
  raw: DriveRaw;
  liveReaction: { live: boolean; measured: number | null };
  onBrake?: (ms: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ simStart, speed, assigned, raw, liveReaction });
  state.current = { simStart, speed, assigned, raw, liveReaction };

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const loop = () => {
      const s = state.current;
      const t = driveSeconds(s.simStart, s.speed, driveLength(s.assigned.length));
      render(ctx, canvas.width, canvas.height, t, s.assigned, s.raw, s.liveReaction);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!onBrake) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") brake();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  function brake() {
    const s = state.current;
    if (!onBrake || !s.liveReaction.live || s.liveReaction.measured !== null) return;
    const seg = segmentAt(driveSeconds(s.simStart, s.speed, driveLength(s.assigned.length)), s.assigned);
    if (seg.id !== "reaction" || seg.world < LIGHT_RED_AT || seg.world > LIGHT_RED_AT + 2.5) return;
    onBrake(Math.round(((seg.world - LIGHT_RED_AT) / s.speed) * 1000));
  }

  return <canvas ref={ref} onPointerDown={brake} className={`block h-full w-full touch-none ${className}`} aria-label="Simulator view" role="img" />;
}
