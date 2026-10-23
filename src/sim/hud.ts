import { driveById } from "../data/drives";
import type { DriveRaw } from "../lib/score";
import type { Frame } from "./engine/drives";
import type { View } from "./engine/engine";
import { carLength } from "./engine/vehicles";
import { FOD_TARGETS, LEFT_CRASH, NIGHT_HAZARDS, REACTION, SEG, fodCaught, type Segment } from "./timeline";

// Everything drawn over the 3D view: the drive label, speed, signals, test targets, headlights and fades.

const DISPLAY = `"Overpass Variable", "Atkinson Hyperlegible Next Variable", sans-serif`;
const BODY = `"Atkinson Hyperlegible Next Variable", sans-serif`;
const SIGNAL = "#F4B400";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

// Peripheral targets for the spotting drive, as fractions of the frame.
const SPOTS = [
  [0.1, 0.36],
  [0.89, 0.32],
  [0.07, 0.53],
  [0.93, 0.47],
  [0.18, 0.23],
  [0.82, 0.21],
  [0.05, 0.41],
  [0.94, 0.6],
];

export function drawHud(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  o: { frame: Frame; seg: Segment; view: View; raw: DriveRaw; reaction: { measured: number | null; live: boolean } },
) {
  const { frame: f, seg, view, raw, reaction } = o;
  const t = seg.local;
  const u = H / 1000;

  // Oncoming headlights: a bloom at each lamp and a veil over the view as they close in.
  if (f.night) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    let veil = 0;
    for (const c of f.cars) {
      if (!c.lights) continue;
      const toward = Math.cos(c.h - f.h) < -0.7;
      if (!toward) continue;
      const half = carLength(c.kind) / 2;
      const fx = Math.sin(c.h);
      const fz = -Math.cos(c.h);
      for (const side of [-0.66, 0.66]) {
        const lx = c.x + fx * half + Math.cos(c.h) * side;
        const lz = c.z + fz * half + Math.sin(c.h) * side;
        const p = view.project(lx, 0.72, lz);
        if (!p || p.d > 160) continue;
        // Only lamps pointing at the driver dazzle: none once the car is alongside.
        const tx = f.x - lx;
        const tz = f.z - lz;
        const aim = (fx * tx + fz * tz) / Math.max(0.1, Math.hypot(tx, tz));
        const beam = Math.max(0, Math.min(1, (aim - 0.8) / 0.17));
        const k = Math.max(0, Math.min(1, 1.25 - p.d / 70)) * beam;
        if (k <= 0.01) continue;
        veil = Math.max(veil, k);
        const r = H * (0.02 + 0.16 * k * k) + 2;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,252,240,${0.5 + 0.5 * k})`);
        g.addColorStop(0.15, `rgba(255,246,225,${0.28 + 0.4 * k})`);
        g.addColorStop(1, "rgba(255,240,215,0)");
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
    }
    if (veil > 0) {
      ctx.fillStyle = `rgba(255,248,232,${0.16 * veil * veil})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  // Spotting objects: targets at the edge of vision. A ring confirms each one she caught, after her
  // recorded response time; the ones she missed fade out unanswered.
  if (seg.id === "fod") {
    const caught = fodCaught(raw.fod.spotted);
    FOD_TARGETS.forEach((at, i) => {
      const hit = caught.has(i);
      const rt = (raw.fod.avgMs / 1000) * (0.85 + 0.3 * ((i * 0.618) % 1));
      const life = hit ? rt + 0.45 : 1.0;
      if (t < at || t > at + life) return;
      const age = t - at;
      const [sx, sy] = SPOTS[i];
      const x = sx * W;
      const y = sy * H;
      const r = 17 * u * Math.min(1, age / 0.1);
      const fade = Math.min(1, (life - age) * 4);
      ctx.save();
      ctx.globalAlpha = fade;
      const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
      g.addColorStop(0, "rgba(244,180,0,0.45)");
      g.addColorStop(1, "rgba(244,180,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SIGNAL;
      ctx.strokeStyle = "rgba(28,34,41,0.9)";
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (hit && age > rt) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3 * u;
        ctx.beginPath();
        ctx.arc(x, y, r * (1.35 + (age - rt) * 1.8), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // Night: a ring around each person she saw, while they're in view.
  if (seg.id === "night") {
    const seen = new Set([0, 2, 4, 1, 3].slice(0, raw.night.spotted));
    for (const p of f.peds) {
      if (p.hazard === undefined || !seen.has(p.hazard)) continue;
      const at = NIGHT_HAZARDS[p.hazard];
      if (t < at + 0.38 || t > at + 1.5) continue;
      const q = view.project(p.x, 1.0, p.z);
      if (!q) continue;
      const k = (t - at - 0.38) / 1.12;
      const r = Math.max(14 * u, (H * 1.3) / q.d);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 3, k * 8);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * (1 + k * 0.25), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Soft vignette.
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${f.night ? 0.4 : 0.22})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Collision.
  if (seg.id === "left" && raw.left.collision && t > LEFT_CRASH && t < LEFT_CRASH + 0.7) {
    ctx.fillStyle = `rgba(168,67,42,${0.38 * (1 - (t - LEFT_CRASH) / 0.7)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Speed and turn signal on the dash.
  const mph = Math.round(f.v / 0.44704);
  const sx = W * 0.5 + H * 0.36;
  const sy = H * 0.955;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  ctx.font = `800 ${62 * u}px ${DISPLAY}`;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillText(String(mph), sx, sy);
  ctx.textAlign = "left";
  ctx.font = `600 ${22 * u}px ${BODY}`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("mph", sx + 8 * u, sy);
  if (f.signal && t % 0.72 < 0.4) {
    const ax = f.signal < 0 ? W * 0.5 - H * 0.36 : sx + 70 * u;
    const ay = sy - 22 * u;
    const s = 15 * u * f.signal;
    ctx.fillStyle = "#43D17E";
    ctx.beginPath();
    ctx.moveTo(ax + s, ay);
    ctx.lineTo(ax, ay - Math.abs(s) * 0.8);
    ctx.lineTo(ax, ay + Math.abs(s) * 0.8);
    ctx.closePath();
    ctx.fill();
  }

  // Live brake reaction: a prompt, then the measured time.
  if (seg.id === "reaction" && reaction.live && t > REACTION.red && t < REACTION.red + 1.6 && reaction.measured === null) {
    ctx.font = `700 ${34 * u}px ${BODY}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Tap to brake", W / 2, H * 0.74);
  }
  if (seg.id === "reaction" && reaction.measured !== null && t > REACTION.red && t < REACTION.green + 1) {
    ctx.font = `800 ${52 * u}px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${(reaction.measured / 1000).toFixed(2)} s`, W / 2, H * 0.74);
  }

  // Fade between drives.
  const fadeIn = seg.index > 0 ? 1 - Math.min(1, seg.local / 0.4) : 0;
  const fadeOut = seg.index < seg.count - 1 ? Math.max(0, (seg.local - (SEG - 0.3)) / 0.3) : 0;
  const fade = Math.max(fadeIn, fadeOut);
  if (fade > 0) {
    ctx.fillStyle = `rgba(12,15,19,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Which drive this is.
  const name = driveById[seg.id].name;
  const count = `Drive ${seg.index + 1} of ${seg.count}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${27 * u}px ${BODY}`;
  const cw = ctx.measureText(count).width;
  ctx.font = `700 ${27 * u}px ${BODY}`;
  const nw = ctx.measureText(name).width;
  const px = 26 * u;
  const py = 26 * u;
  const ph = 54 * u;
  const gap = 14 * u;
  rr(ctx, px, py, cw + nw + gap + 44 * u, ph, ph / 2);
  ctx.fillStyle = "rgba(20,25,30,0.72)";
  ctx.fill();
  ctx.font = `600 ${27 * u}px ${BODY}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(count, px + 22 * u, py + ph / 2 + 1);
  ctx.font = `700 ${27 * u}px ${BODY}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, px + 22 * u + cw + gap, py + ph / 2 + 1);
}
