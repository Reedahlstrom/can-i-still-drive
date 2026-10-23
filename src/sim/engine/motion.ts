// Paths and speed profiles. Every position in a drive is a pure function of time.
//
// Ground plane is XZ, Y up. Heading 0 faces -Z; positive heading turns right (clockwise from above).

export type Pose = { x: number; z: number; h: number };

export const dir = (h: number) => ({ x: Math.sin(h), z: -Math.cos(h) });
export const right = (h: number) => ({ x: Math.cos(h), z: Math.sin(h) });

export function smooth(a: number, b: number, t: number) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export const mph = (v: number) => v * 0.44704;

type Seg = { kind: "line"; len: number } | { kind: "arc"; r: number; a: number };
type Placed = Seg & { start: Pose; s0: number; len: number };

/** Straight lines and circular arcs, joined end to end. Arc angle a > 0 turns right. */
export class Path {
  segs: Placed[] = [];
  length = 0;
  start: Pose;

  constructor(start: Pose, segs: Seg[]) {
    this.start = start;
    let p = start;
    for (const s of segs) {
      const len = s.kind === "line" ? s.len : s.r * Math.abs(s.a);
      const placed = { ...s, start: p, s0: this.length, len } as Placed;
      this.segs.push(placed);
      this.length += len;
      p = this.local(placed, len);
    }
  }

  private local(seg: Placed, u: number): Pose {
    const { x, z, h } = seg.start;
    if (seg.kind === "line") {
      const d = dir(h);
      return { x: x + d.x * u, z: z + d.z * u, h };
    }
    const sign = Math.sign(seg.a);
    const r0 = right(h);
    const cx = x + r0.x * seg.r * sign;
    const cz = z + r0.z * seg.r * sign;
    const nh = h + (u / seg.r) * sign;
    const r1 = right(nh);
    return { x: cx - r1.x * seg.r * sign, z: cz - r1.z * seg.r * sign, h: nh };
  }

  /** Pose at distance s along the path, offset sideways (positive to the right). Straight beyond either end. */
  at(s: number, lateral = 0): Pose {
    let p: Pose;
    if (s <= 0 || !this.segs.length) {
      const d = dir(this.start.h);
      p = { x: this.start.x + d.x * s, z: this.start.z + d.z * s, h: this.start.h };
    } else if (s >= this.length) {
      const last = this.segs[this.segs.length - 1];
      const end = this.local(last, last.len);
      const d = dir(end.h);
      const over = s - this.length;
      p = { x: end.x + d.x * over, z: end.z + d.z * over, h: end.h };
    } else {
      let seg = this.segs[0];
      for (const sg of this.segs) if (sg.s0 <= s) seg = sg;
      p = this.local(seg, s - seg.s0);
    }
    if (lateral) {
      const r = right(p.h);
      p = { x: p.x + r.x * lateral, z: p.z + r.z * lateral, h: p.h };
    }
    return p;
  }

  /** Signed curvature at s, averaged over a short window so the wheel eases in and out of turns. */
  curvature(s: number, window = 3) {
    const a = this.at(s - window).h;
    const b = this.at(s + window).h;
    return (b - a) / (2 * window);
  }
}

/** Speed in m/s from keyframes [time, speed], eased between neighbours. Integrated once into distance. */
export class Motion {
  private keys: [number, number][];
  private table: Float32Array;
  private static DT = 1 / 240;
  private static END = 9;

  constructor(keys: [number, number][]) {
    this.keys = keys;
    const n = Math.ceil(Motion.END / Motion.DT) + 2;
    this.table = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      const t = (i - 0.5) * Motion.DT;
      this.table[i] = this.table[i - 1] + this.v(t) * Motion.DT;
    }
  }

  v(t: number) {
    const k = this.keys;
    if (t <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) {
      const [t0, v0] = k[i];
      const [t1, v1] = k[i + 1];
      if (t < t1) return v0 + (v1 - v0) * smooth(t0, t1, t);
    }
    return k[k.length - 1][1];
  }

  /** Acceleration, m/s². */
  a(t: number) {
    return (this.v(t + 0.02) - this.v(t - 0.02)) / 0.04;
  }

  /** Distance travelled since t = 0. */
  s(t: number) {
    if (t <= 0) return this.v(0) * t;
    const f = t / Motion.DT;
    const n = this.table.length;
    if (f >= n - 1) return this.table[n - 1] + this.v(Motion.END) * (t - (n - 1) * Motion.DT);
    const i = Math.floor(f);
    return this.table[i] + (this.table[i + 1] - this.table[i]) * (f - i);
  }
}

/** Deterministic pseudo-random numbers from a seed. */
export function rng(seed: number) {
  let s = Math.floor(seed * 2147483646) % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
