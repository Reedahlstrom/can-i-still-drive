import { useEffect, useRef } from "react";
import type { DriveId } from "../data/drives";
import type { DriveRaw } from "../lib/score";
import { driveFrame } from "./engine/drives";
import { useT } from "../i18n/useT";
import { getEngine, getLiveEngine, type Engine, type View } from "./engine/engine";
import { drawHud } from "./hud";
import { REACTION, driveLength, driveSeconds, segmentAt } from "./timeline";

// The simulator view: a 3D scene for the drive in progress, with the instruments drawn over it.
// What it shows is a pure function of drive time, so every screen showing the drive stays in step.

type Reaction = { measured: number | null; live: boolean };
type Opts = { maxPixels?: number; shadow?: number };

function frameFor(W: number, H: number, driveT: number, assigned: DriveId[], raw: DriveRaw, opts: Opts) {
  const seg = segmentAt(driveT, assigned);
  const frame = driveFrame(seg.id, seg.local, raw);
  const k = opts.maxPixels && W * H > opts.maxPixels ? Math.sqrt(opts.maxPixels / (W * H)) : 1;
  return { seg, frame, w: Math.max(2, Math.round(W * k)), h: Math.max(2, Math.round(H * k)) };
}

function hud(ctx: CanvasRenderingContext2D, W: number, H: number, view: View, w: number, h: number, f: ReturnType<typeof frameFor>, raw: DriveRaw, reaction: Reaction) {
  const sx = W / w;
  const sy = H / h;
  const scaled = {
    project: (x: number, y: number, z: number) => {
      const p = view.project(x, y, z);
      return p && { x: p.x * sx, y: p.y * sy, d: p.d };
    },
  };
  drawHud(ctx, W, H, { frame: f.frame, seg: f.seg, view: scaled, raw, reaction });
}

/** Draw one frame into a 2D canvas, copying from the shared off-screen engine. Used by the video. */
export function render(ctx: CanvasRenderingContext2D, W: number, H: number, driveT: number, assigned: DriveId[], raw: DriveRaw, reaction: Reaction, opts: Opts = {}) {
  const f = frameFor(W, H, driveT, assigned, raw, opts);
  const engine = getEngine();
  const view = engine.draw(f.frame, f.w, f.h, f.seg.local, opts.shadow);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(engine.canvas, 0, engine.canvas.height - f.h, f.w, f.h, 0, 0, W, H);
  hud(ctx, W, H, view, f.w, f.h, f, raw, reaction);
}

/** Draw straight into an engine's own canvas, with the instruments on a transparent canvas above it. */
function renderLive(engine: Engine, hudCtx: CanvasRenderingContext2D, W: number, H: number, driveT: number, assigned: DriveId[], raw: DriveRaw, reaction: Reaction, opts: Opts) {
  const f = frameFor(W, H, driveT, assigned, raw, opts);
  const view = engine.draw(f.frame, f.w, f.h, f.seg.local, opts.shadow);
  hudCtx.clearRect(0, 0, W, H);
  hud(hudCtx, W, H, view, f.w, f.h, f, raw, reaction);
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
  const host = useRef<HTMLDivElement>(null);
  const t = useT();
  const state = useRef({ simStart, speed, assigned, raw, liveReaction });
  state.current = { simStart, speed, assigned, raw, liveReaction };

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    // The 3D view draws straight into the live engine's canvas. If another view already holds it,
    // fall back to copying frames from the shared engine into this canvas. If the browser takes the
    // 3D context away, a fresh engine takes the old one's place on the next frame.
    let engine: Engine | null = null;
    let own = false;
    const attach = () => {
      if (own) engine!.canvas.remove();
      own = false;
      engine = getLiveEngine();
      own = !engine.canvas.isConnected;
      if (own) {
        Object.assign(engine.canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
        host.current!.appendChild(engine.canvas);
      }
    };
    let raf = 0;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const opts = { maxPixels: 2_400_000, shadow: 2048 };
    // A frame that fails never stops the view: the next tries again, after a pause if they keep failing.
    let failures = 0;
    let resume = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now < resume) return;
      try {
        if (!engine || engine.lost) attach();
        const s = state.current;
        const t = driveSeconds(s.simStart, s.speed, driveLength(s.assigned.length));
        if (own) renderLive(engine!, ctx, canvas.width, canvas.height, t, s.assigned, s.raw, s.liveReaction, opts);
        else render(ctx, canvas.width, canvas.height, t, s.assigned, s.raw, s.liveReaction, opts);
        failures = 0;
      } catch (e) {
        if (!failures++) console.error(e);
        if (failures > 2) resume = now + 1000;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (own) engine!.canvas.remove();
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
    if (seg.id !== "reaction" || seg.local < REACTION.red || seg.local > REACTION.red + 2.5) return;
    onBrake(Math.round(((seg.local - REACTION.red) / s.speed) * 1000));
  }

  return (
    <div ref={host} className={`relative h-full w-full overflow-hidden ${className}`}>
      <canvas ref={ref} onPointerDown={brake} className="absolute inset-0 z-10 block h-full w-full touch-none" aria-label={t("Simulator view")} data-capture="sim" role="img" />
    </div>
  );
}
