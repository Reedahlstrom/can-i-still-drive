import type { DriveId } from "../../data/drives";
import type { DriveRaw } from "../../lib/score";
import { CITY_STOP, LEFT_CRASH, REACTION } from "../timeline";
import { Motion, Path, dir, mph, right, smooth, type Pose } from "./motion";
import { ARTERIAL, BOULEVARD, DOWNTOWN, RESIDENTIAL, RURAL_PATH, SUBURB, type Light, type SetId } from "./sets";
import { carLength, type CarKind } from "./vehicles";

// What happens in each drive: the driver's car, the traffic, people and signals, as functions of
// seconds into the drive. Nothing here moves on its own, so every screen showing a drive agrees.

const HALF = carLength("sedan") / 2;
const PI = Math.PI;

export type CarState = { key: string; kind: CarKind; paint: number; x: number; z: number; h: number; braking: boolean; lights: boolean };
export type PedState = { key: string; seed: number; x: number; z: number; y: number; h: number; walked: number; hazard?: number };
export type Frame = {
  set: SetId;
  night: boolean;
  x: number;
  z: number;
  h: number;
  v: number;
  a: number;
  /** Steering wheel angle, radians, positive to the right. */
  steer: number;
  /** Where the driver is looking, radians from straight ahead, positive to the right. */
  look: number;
  signal: -1 | 0 | 1;
  shake: number;
  cars: CarState[];
  peds: PedState[];
  lights: Record<string, Light>;
};

type Actor = { key: string; kind: CarKind; paint: number; path: Path; motion: Motion; s0?: number; lat?: number; reverse?: boolean; lights?: boolean };
type Walker = { key: string; seed: number; at: (t: number) => { x: number; z: number; y: number; h: number; walked: number }; hazard?: number };

type Plan = {
  set: SetId;
  night: boolean;
  path: Path;
  motion: Motion;
  lateral?: (t: number) => number;
  look?: (t: number) => number;
  signal?: (t: number) => -1 | 0 | 1;
  jolt?: (t: number) => number;
  shake?: (t: number) => number;
  cars: Actor[];
  walkers?: Walker[];
  lights: (t: number) => Record<string, Light>;
  /** On the curved rural road the driver follows the road's own path from this distance. */
  roadS0?: number;
};

/** Whether a results note like "Mirror check on changes 1 and 3" names manoeuvre n with any of these words. */
function missed(note: string | undefined, n: number, words: string[]) {
  if (!note) return false;
  return note
    .toLowerCase()
    .split(",")
    .some((clause) => words.some((w) => clause.includes(w)) && (clause.includes("all") || (clause.match(/\d+/g) ?? []).map(Number).includes(n)));
}

const bump = (a: number, b: number, c: number, d: number, t: number) => smooth(a, b, t) * (1 - smooth(c, d, t));
const still = (v = 0) => new Motion([[0, v]]);
const line = (len = 900) => [{ kind: "line" as const, len }];

/** A car on a straight road at constant speed, at (x, z) at time tp. */
function passing(key: string, kind: CarKind, paint: number, x: number, z: number, h: number, tp: number, v: number, lights = false): Actor {
  const d = dir(h);
  return { key, kind, paint, path: new Path({ x: x - d.x * v * tp, z: z - d.z * v * tp, h }, line(2000)), motion: still(v), lights };
}

/** A car that comes to rest (or starts) with its centre at (x, z) at time `at` of its motion. */
function anchored(key: string, kind: CarKind, paint: number, x: number, z: number, h: number, motion: Motion, at: number, lights = false): Actor {
  const d = dir(h);
  const s = motion.s(at);
  return { key, kind, paint, path: new Path({ x: x - d.x * s, z: z - d.z * s, h }, line(2000)), motion, lights };
}

/** Someone walking a straight line, on the sidewalk unless `onRoad` says they have stepped off it. */
function walker(key: string, seed: number, x: number, z: number, h: number, speed: number, t0 = 0, onRoad?: (x: number, z: number) => boolean): Walker {
  const d = dir(h);
  return {
    key,
    seed,
    at: (t) => {
      const w = speed * Math.max(0, t - t0);
      const px = x + d.x * w;
      const pz = z + d.z * w;
      return { x: px, z: pz, y: onRoad?.(px, pz) ? 0 : 0.15, h, walked: w };
    },
  };
}

/** Downtown, the road is the main street and each cross street. */
const downtownRoad = (x: number, z: number) => Math.abs(x) < DOWNTOWN.half || DOWNTOWN.cross.some((c) => Math.abs(z - c) < DOWNTOWN.half);

// ---------- the drives ----------

function reaction(raw: DriveRaw): Plan {
  const A = ARTERIAL;
  const T = REACTION;
  const v0 = mph(30);
  const ran = !!raw.reaction.ranRed;
  // Scripted results brake after their first measured delay. A single live tap keeps the default,
  // so the car never jumps when the tap lands mid-drive.
  const trials = raw.reaction.trials;
  const rd = Math.min(1.6, Math.max(0.45, (trials.length > 1 ? trials[0] : 700) / 1000));
  const tb = T.red + rd;
  const stopT = tb + 2.4;
  const motion = ran ? still(v0) : new Motion([[0, v0], [tb, v0], [stopT, 0], [T.green + 0.3, 0], [8.6, 7.5]]);
  const anchorT = ran ? T.ranRed : stopT;
  const anchorZ = ran ? A.stopLine + HALF : A.stopLine + 0.6 + HALF;
  const path = new Path({ x: A.lanes[0], z: anchorZ + motion.s(anchorT), h: 0 }, line(600));
  const zAt = (t: number) => path.at(motion.s(t)).z;
  const cz = A.crossZ;
  const farStop = cz - A.half - 4.1;
  const cars: Actor[] = [
    anchored("r1", "suv", 1, A.lanes[1], A.stopLine + 0.8 + 2.43, 0, new Motion([[0, 12.6], [1.8, 12.6], [4.6, 0], [T.green + 0.6, 0], [8.6, 7]]), 4.6),
    passing("o1", "sedan", 3, -1.7, zAt(0.9), PI, 0.9, 13.4),
    passing("o2", "hatch", 0, -5.1, zAt(2.0) - 6, PI, 2.0, 12),
    anchored("o3", "sedan", 6, -1.7, farStop - 0.6 - HALF, PI, new Motion([[0, 11], [2.6, 11], [4.4, 0], [T.green + 0.5, 0], [8.6, 7]]), 4.4),
    anchored("c1", "sedan", 4, -14.5, cz + 1.7, PI / 2, ran ? new Motion([[0, 0], [2.9, 0], [3.4, 2.2], [3.8, 0], [5.6, 0], [7.6, 9]]) : new Motion([[0, 0], [2.9, 0], [5.6, 11], [9, 11]]), 0),
    anchored("c1b", "suv", 7, -21.8, cz + 1.7, PI / 2, ran ? new Motion([[0, 0], [6.2, 0], [8.4, 8]]) : new Motion([[0, 0], [3.6, 0], [6.3, 10.5], [9, 10.5]]), 0),
    anchored("c2", "hatch", 2, 14.5, cz - 1.7, -PI / 2, ran ? new Motion([[0, 0], [5.4, 0], [7.6, 8]]) : new Motion([[0, 0], [3.2, 0], [5.9, 10.5], [9, 10.5]]), 0),
    passing("c3", "sedan", 5, 0, cz + 5.1, PI / 2, ran ? 6.6 : 5.0, 12),
  ];
  return {
    set: "arterial",
    night: false,
    path,
    motion,
    cars,
    walkers: [walker("w1", 0.3, A.half + 3.0, -60, PI, 1.3), walker("w2", 0.7, -A.half - 3.0, -100, 0, 1.2)],
    lights: (t) => ({
      main: t < T.yellow ? "green" : t < T.red ? "yellow" : t < T.green ? "red" : "green",
      cross: t < T.red + 0.7 ? "red" : t < T.green - 0.9 ? "green" : t < T.green - 0.3 ? "yellow" : "red",
    }),
  };
}

// The clip shows the first of the three turns, as her results recorded it.
function rightTurns(raw: DriveRaw): Plan {
  const R = RESIDENTIAL;
  const v0 = mph(20);
  const rolled = missed(raw.right.missed, 1, ["stop"]);
  const noLook = missed(raw.right.missed, 1, ["look"]);
  const motion = rolled
    ? new Motion([[0, v0], [0.5, v0], [2.5, 1.5], [3.0, 2.0], [4.2, 4.2], [6.0, 5.2], [8.6, 9]])
    : new Motion([[0, v0], [0.5, v0], [2.3, 0], [3.6, 0], [4.7, 4.0], [6.3, 5.2], [8.6, 9]]);
  const turnR = 6.5;
  const zA = R.crossZ + R.lane + turnR;
  // A full stop ends just short of the line; a rolled stop crosses it at 2.6 s.
  const z0 = rolled ? R.stopLine + HALF + motion.s(2.6) : R.stopLine + 0.5 + HALF + motion.s(2.3);
  const path = new Path({ x: R.lane, z: z0, h: 0 }, [{ kind: "line", len: z0 - zA }, { kind: "arc", r: turnR, a: PI / 2 }, ...line(400)]);
  const cz = R.crossZ;
  return {
    set: "residential",
    night: false,
    path,
    motion,
    look: (t) =>
      (noLook ? 0 : rolled ? -0.45 * bump(1.9, 2.2, 2.3, 2.55, t) : -0.7 * bump(2.35, 2.7, 2.9, 3.15, t) + 0.62 * bump(3.1, 3.35, 3.45, 3.8, t)) +
      0.22 * bump(3.8, 4.3, 5.6, 6.5, t),
    signal: (t) => (t > 0.3 && t < 6.3 ? 1 : 0),
    cars: [
      anchored("x1", "suv", 3, R.half + 1.5 + HALF, cz - R.lane, -PI / 2, new Motion([[0, 0], [0.9, 0], [3.4, 8], [9, 8]]), 0),
      anchored("o1", "sedan", 0, -R.lane, cz - R.half - 1.5 - HALF, PI, new Motion([[0, 0], [4.4, 0], [6.7, 8], [9, 8]]), 0),
    ],
    walkers: [walker("w1", 0.41, 30, cz + R.half + 2.55, -PI / 2, 1.25), walker("w2", 0.62, -R.half - 2.55, -40, PI, 1.1), walker("w3", 0.18, 60, cz - R.half - 2.55, PI / 2, 1.3)],
    lights: () => ({}),
  };
}

function leftTurns(raw: DriveRaw): Plan {
  const S = SUBURB;
  const v0 = mph(25);
  const crash = raw.left.collision;
  const zWait = -106.0 + HALF;
  const turnR = 8;
  const cz = S.crossZ;
  const zA = cz - S.lane + turnR;
  const motion = crash
    ? new Motion([[0, v0], [0.3, v0], [2.2, 0], [2.4, 0], [3.9, 5], [LEFT_CRASH, 5], [LEFT_CRASH + 0.14, 0]])
    : new Motion([[0, v0], [0.3, v0], [2.2, 0], [4.4, 0], [6.0, 6], [8.6, 9]]);
  const z0 = zWait + motion.s(2.2);
  const path = new Path({ x: S.lane, z: z0, h: 0 }, [{ kind: "line", len: z0 - zA }, { kind: "arc", r: turnR, a: -PI / 2 }, ...line(400)]);
  const on = (key: string, kind: CarKind, paint: number, tp: number) => passing(key, kind, paint, -S.lane, zWait, PI, tp, 13.4);
  const cars: Actor[] = [
    anchored("w1", "sedan", 1, -12.4, cz + S.lane, PI / 2, still(), 0),
    anchored("w1b", "suv", 5, -19.8, cz + S.lane, PI / 2, still(), 0),
    anchored("w2", "hatch", 3, 12.4, cz - S.lane, -PI / 2, still(), 0),
  ];
  if (crash) {
    cars.push(on("o1", "sedan", 0, 1.7));
    // The oncoming car she turns in front of: it ends up against her right side.
    const p = path.at(motion.s(LEFT_CRASH));
    const d = dir(p.h);
    const r = right(p.h);
    const u = Math.max(-HALF, Math.min(HALF, (-S.lane - p.x - r.x * 0.92) / (d.x || -1e-6)));
    const contactZ = p.z + d.z * u + r.z * 0.92;
    // It brakes too late: first contact lands exactly at the collision moment, then it stops short.
    const m = new Motion([[0, 13.4], [LEFT_CRASH - 0.4, 13.4], [LEFT_CRASH, 6.5], [LEFT_CRASH + 0.1, 0]]);
    const impactZ = contactZ - carLength("suv") / 2;
    cars.push({ key: "o2", kind: "suv", paint: 4, path: new Path({ x: -S.lane, z: impactZ - m.s(LEFT_CRASH), h: PI }, line(2000)), motion: m });
  } else {
    cars.push(on("o1", "sedan", 0, 2.6), on("o2", "suv", 4, 3.9), on("o3", "hatch", 6, 10.4));
  }
  return {
    set: "suburb",
    night: false,
    path,
    motion,
    look: (t) => 0.3 * bump(2.4, 2.8, 3.6, 4.0, t) - 0.2 * bump(4.4, 4.9, 6.2, 6.8, t),
    signal: (t) => (t > 0.4 && t < 7.2 ? -1 : 0),
    jolt: crash ? (t) => 0.09 * smooth(LEFT_CRASH, LEFT_CRASH + 0.22, t) : undefined,
    shake: crash ? (t) => (t > LEFT_CRASH ? Math.max(0, 1 - (t - LEFT_CRASH) / 0.7) : 0) : undefined,
    cars,
    walkers: [walker("w1", 0.52, -30, cz - S.half - 36.5, PI / 2, 1.2), walker("w2", 0.27, S.half + 2.6, -60, PI, 1.3)],
    lights: () => ({ main: "green", cross: "red" }),
  };
}

// The clip shows the first two changes: out to pass, then back in.
function laneChanges(raw: DriveRaw): Plan {
  const B = BOULEVARD;
  const note = raw.lane.missed;
  const look1 = !missed(note, 1, ["mirror", "blind"]);
  const look2 = !missed(note, 2, ["mirror", "blind"]);
  const sig1 = missed(note, 1, ["signal"]) ? 1.55 : 0.9;
  const sig2 = missed(note, 2, ["signal"]) ? 6.25 : 5.8;
  const v = mph(50);
  const path = new Path({ x: B.lanes[1], z: 0, h: 0 }, line(900));
  const motion = still(v);
  const opp = [-6.6, -10.2, -13.8];
  const zAt = (t: number) => -v * t;
  const cars: Actor[] = [
    passing("truck", "truck", 0, B.lanes[1], -38.5, 0, 0, 13.4),
    passing("l3", "sedan", 1, B.lanes[2], -12, 0, 0, 21.6),
    passing("l1", "suv", 2, B.lanes[0], -78, 0, 0, 24.6),
    ...[0.8, 2.1, 3.0, 4.6, 5.5, 6.9, 7.8].map((tp, i) => passing(`op${i}`, (["sedan", "suv", "hatch"] as const)[i % 3], (i * 3) % 8, opp[i % 3], zAt(tp), PI, tp, 20)),
  ];
  return {
    set: "boulevard",
    night: false,
    path,
    motion,
    lateral: (t) => -3.6 * smooth(1.6, 3.0, t) + 3.6 * smooth(6.3, 7.7, t),
    look: (t) => (look1 ? -0.55 * bump(0.9, 1.15, 1.4, 1.65, t) : 0) + (look2 ? 0.5 * bump(5.75, 6.0, 6.25, 6.5, t) : 0),
    signal: (t) => (t > sig1 && t < 3.0 ? -1 : t > sig2 && t < 7.7 ? 1 : 0),
    cars,
    lights: () => ({}),
  };
}

function spotting(): Plan {
  const v = mph(40);
  const s0 = 30;
  const motion = still(v);
  const path = RURAL_PATH;
  const oncoming = (key: string, kind: CarKind, paint: number, tp: number, vo: number): Actor => ({
    key,
    kind,
    paint,
    path,
    motion: still(-vo),
    s0: s0 + v * tp + vo * tp,
    lat: -1.65,
    reverse: true,
  });
  return {
    set: "rural",
    night: false,
    path: new Path({ x: 0, z: 0, h: 0 }, []),
    motion,
    cars: [oncoming("o1", "suv", 2, 4.6, 18), oncoming("o2", "truck", 0, 8.4, 15)],
    lights: () => ({}),
    lateral: () => 1.65,
    roadS0: s0,
  };
}

function city(raw: DriveRaw): Plan {
  const D = DOWNTOWN;
  const v0 = mph(22);
  const ran = !!raw.city.ranStop;
  const motion = ran ? new Motion([[0, v0], [2.3, v0], [3.9, 3.4], [4.6, 3.4], [6.6, 9.4]]) : new Motion([[0, v0], [2.0, v0], [CITY_STOP, 0], [5.6, 0], [7.4, 6.5], [9, 8]]);
  const anchorZ = ran ? D.stopLine + HALF : D.stopLine + 0.5 + HALF;
  const path = new Path({ x: D.lane, z: anchorZ + motion.s(CITY_STOP), h: 0 }, line(600));
  const zAt = (t: number) => path.at(motion.s(t)).z;
  const cz = D.cross[1];
  const walkers: Walker[] = [
    walker("p1", 0.11, D.half + 1.4, cz + D.half + 2.0, -PI / 2, 1.35, ran ? 5.2 : 0.2, downtownRoad),
    walker("s1", 0.23, 8.2, -110, 0, 1.3, 0, downtownRoad),
    walker("s2", 0.37, 8.6, -175, PI, 1.4, 0, downtownRoad),
    walker("s3", 0.49, -8.3, -128, PI, 1.25, 0, downtownRoad),
    walker("s4", 0.58, -8.0, -96, 0, 1.35, 0, downtownRoad),
    walker("s5", 0.66, 7.8, -136, PI, 1.2, 0, downtownRoad),
    walker("s6", 0.74, -8.4, -182, 0, 1.3, 0, downtownRoad),
    walker("s7", 0.88, 8.1, -200, 0, 1.1, 0, downtownRoad),
    walker("s8", 0.95, -7.9, -150, 0, 1.4, 0, downtownRoad),
  ];
  return {
    set: "downtown",
    night: false,
    path,
    motion,
    look: ran ? undefined : (t) => -0.45 * bump(4.3, 4.6, 4.8, 5.05, t) + 0.42 * bump(5.0, 5.25, 5.35, 5.6, t),
    cars: [
      passing("o1", "sedan", 2, -D.lane, zAt(1.4), PI, 1.4, 10),
      // Waits at its stop sign until the person on the crosswalk is past its lane.
      anchored("o2", "suv", 0, -D.lane, cz - D.half - 4.3 - 0.5 - HALF, PI, new Motion([[0, 0], [6.4, 0], [8.8, 7]]), 0),
      anchored("c1", "hatch", 4, -D.half - 4.8 - HALF, cz + D.lane, PI / 2, new Motion([[0, 0], [1.0, 0], [3.2, 8], [9, 9]]), 0),
      anchored("c2", "sedan", 7, D.half + 4.8 + HALF, cz - D.lane, -PI / 2, new Motion([[0, 0], [6.6, 0], [8.6, 6]]), 0),
    ],
    walkers,
    lights: () => ({ main: "green", cross: "red" }),
  };
}

function night(raw: DriveRaw): Plan {
  const D = DOWNTOWN;
  const v = mph(28);
  const path = new Path({ x: D.lane, z: -180, h: 0 }, line(600));
  const motion = still(v);
  const drift = raw.night.drift;
  const zAt = (t: number) => -180 - v * t;
  const cars: Actor[] = [
    ...[1.7, 4.6, 6.5].map((tp, i) => passing(`on${i}`, (["suv", "sedan", "hatch"] as const)[i], [0, 5, 1][i], -D.lane, zAt(tp), PI, tp, 11, true)),
    anchored("cw", "sedan", 3, -D.half - 4.8 - HALF, D.cross[2] + D.lane, PI / 2, still(), 0, true),
  ];
  const walkers: Walker[] = D.hazards.map((hz, i) => {
    const w = walker(`hz${i}`, 0.15 + i * 0.17, hz.side * (D.half + 0.75), hz.z, hz.side > 0 ? -PI / 2 : PI / 2, 0);
    return { ...w, hazard: i };
  });
  walkers.push(walker("n1", 0.81, 8.4, -215, PI, 1.2, 0, downtownRoad), walker("n2", 0.93, -8.2, -300, 0, 1.3, 0, downtownRoad));
  return {
    set: "downtown",
    night: true,
    path,
    motion,
    lateral: (t) => drift * 0.28 * Math.sin(t * 1.6),
    cars,
    walkers,
    lights: () => ({ main: "green", cross: "red" }),
  };
}

// ---------- evaluation ----------

const plans = new Map<string, Plan>();

function plan(id: DriveId, raw: DriveRaw): Plan {
  const key = `${id}:${id === "fod" ? "" : JSON.stringify(raw[id])}`;
  let p = plans.get(key);
  if (!p) {
    p = id === "reaction" ? reaction(raw) : id === "right" ? rightTurns(raw) : id === "left" ? leftTurns(raw) : id === "lane" ? laneChanges(raw) : id === "fod" ? spotting() : id === "night" ? night(raw) : city(raw);
    plans.set(key, p);
  }
  return p;
}

function playerPose(p: Plan, t: number): Pose {
  const s = p.motion.s(t);
  const lat = p.lateral?.(t) ?? 0;
  if (p.roadS0 !== undefined) return RURAL_PATH.at(p.roadS0 + s, lat);
  const pose = p.path.at(s, lat);
  // The car points where it is going: lane changes add a little yaw.
  const dl = ((p.lateral?.(t + 0.05) ?? 0) - (p.lateral?.(t - 0.05) ?? 0)) / 0.1;
  const v = Math.max(0.5, p.motion.v(t));
  return { ...pose, h: pose.h + Math.atan2(dl, v) + (p.jolt?.(t) ?? 0) };
}

export function driveFrame(id: DriveId, t: number, raw: DriveRaw): Frame {
  const p = plan(id, raw);
  const pose = playerPose(p, t);
  const v = Math.max(0, p.motion.v(t));
  const a = p.motion.a(t);
  // Steering from how fast the heading turns per metre travelled.
  const dt = 0.12;
  const h0 = playerPose(p, t - dt).h;
  const h1 = playerPose(p, t + dt).h;
  const ds = Math.max(0.6, v) * 2 * dt;
  const kappa = (h1 - h0) / ds;
  const steer = Math.max(-7, Math.min(7, Math.atan(2.8 * kappa) * 14));

  const cars: CarState[] = p.cars.map((c) => {
    const s = (c.s0 ?? 0) + c.motion.s(t);
    const q = c.path.at(s, c.lat ?? 0);
    const accel = c.motion.a(t) * (c.reverse ? -1 : 1);
    const speed = Math.abs(c.motion.v(t));
    return {
      key: c.key,
      kind: c.kind,
      paint: c.paint,
      x: q.x,
      z: q.z,
      h: c.reverse ? q.h + PI : q.h,
      // Brake lights while slowing, and while waiting.
      braking: accel < -0.6 || speed < 0.05,
      lights: !!c.lights || p.night,
    };
  });
  const peds: PedState[] = (p.walkers ?? []).map((w) => ({ key: w.key, seed: w.seed, hazard: w.hazard, ...w.at(t) }));
  return {
    set: p.set,
    night: p.night,
    x: pose.x,
    z: pose.z,
    h: pose.h,
    v,
    a,
    steer,
    look: p.look?.(t) ?? 0,
    signal: p.signal?.(t) ?? 0,
    shake: p.shake?.(t) ?? 0,
    cars,
    peds,
    lights: p.lights(t),
  };
}

/** The scene each drive plays in, so they can be built before the drive starts. */
export const setOf: Record<DriveId, SetId> = { reaction: "arterial", right: "residential", left: "suburb", lane: "boulevard", fod: "rural", night: "downtown", city: "downtown" };
