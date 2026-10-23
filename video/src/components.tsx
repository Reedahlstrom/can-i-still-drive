import { getLength } from "@remotion/paths";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { render as renderSim } from "./sim/SimCanvas";
import { presets } from "./data/scenarios";
import { sortDrives, type DriveId } from "./data/drives";
import { C, body, display } from "./theme";

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export function useSpring(delay = 0, config: Partial<{ damping: number; stiffness: number; mass: number }> = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 80, mass: 1, ...config } });
}

/** 0 → 1 between two frames with the house easing. */
export function useProgress(from: number, to: number, easing = ease) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export function Background({ tone = "dark" }: { tone?: "dark" | "light" }) {
  if (tone === "light")
    return <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #FFFFFF 0%, ${C.canvas} 55%, #E9ECE9 100%)` }} />;
  return <AbsoluteFill style={{ background: `radial-gradient(110% 85% at 50% 38%, #26303A 0%, ${C.asphalt} 48%, ${C.night} 100%)` }} />;
}

/** The connective motif: an amber dashed centerline that draws itself along a path, its dashes flowing. */
export function RoadLine({ d, start = 0, duration = 40, width = 4, opacity = 0.9, flow = 0.9, style }: { d: string; start?: number; duration?: number; width?: number; opacity?: number; flow?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const len = getLength(d);
  const p = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const id = `m${Math.abs(hash(d))}`;
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse">
          <path d={d} fill="none" stroke="#fff" strokeWidth={width * 4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
        </mask>
      </defs>
      <path d={d} fill="none" stroke={C.signal} strokeOpacity={opacity} strokeWidth={width} strokeLinecap="round" strokeDasharray="20 22" strokeDashoffset={-frame * flow} mask={`url(#${id})`} />
    </svg>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** A line of type that rises into place. */
export function Rise({ children, delay = 0, y = 26, style }: { children: ReactNode; delay?: number; y?: number; style?: CSSProperties }) {
  const s = useSpring(delay, { damping: 200, stiffness: 70 });
  return <div style={{ opacity: s, transform: `translateY(${(1 - s) * y}px)`, ...style }}>{children}</div>;
}

export function Kicker({ children, delay = 0, color = C.signal, textColor = "rgba(255,255,255,0.78)" }: { children: ReactNode; delay?: number; color?: string; textColor?: string }) {
  const s = useSpring(delay, { damping: 200, stiffness: 90 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: s }}>
      <div style={{ width: 46 * s, height: 5, borderRadius: 3, background: color }} />
      <div style={{ fontFamily: display, fontWeight: 800, fontSize: 30, color: textColor, transform: `translateX(${(1 - s) * -12}px)` }}>{children}</div>
    </div>
  );
}

// ---------- Brand ----------

export function DriverScoreMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="15" fill={C.asphalt} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <path d="M28.5 13 15 53M35.5 13 49 53" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M32 16v4.5M32 27v7M32 41.5v10" stroke={C.signal} strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

export function HealthKeyTile({ size = 40, inverted = true }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="0.5" y="0.5" width="47" height="47" rx="10" fill={inverted ? C.hk : "#fff"} />
      <path d="M24 13v22M13 24h22" stroke={inverted ? "#fff" : C.hk} strokeWidth="4.2" />
    </svg>
  );
}

export function HealthKeyLogo({ height = 40, light = true }: { height?: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.38 }}>
      <HealthKeyTile size={height} inverted={light ? true : true} />
      <Img src={staticFile(light ? "healthkey-wordmark-white.png" : "healthkey-wordmark-ink.png")} style={{ height: height * 0.62 }} />
    </div>
  );
}

// ---------- Devices ----------

const PHONE = { w: 393, h: 852, bezel: 14 };
const IPAD = { w: 1180, h: 820, bezel: 22 };

export type Shot = { src: string; at: number; motion?: "push" | "fade" | "scroll" | "sheet" };

/** Screens replace each other the way the app navigates: a short push, a scroll, or a sheet rising. */
export function Screens({ shots, width, height }: { shots: Shot[]; width: number; height: number }) {
  const frame = useCurrentFrame();
  const visible = shots.filter((s, i) => i === 0 || frame >= s.at);
  const last = visible.length - 1;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.canvas }}>
      {visible.map((s, i) => {
        if (i < last - 1) return null;
        const p = i === 0 ? 1 : interpolate(frame, [s.at, s.at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        const m = s.motion ?? "push";
        const tx = m === "push" ? (1 - p) * 34 : 0;
        const ty = m === "scroll" ? (1 - p) * 60 : m === "sheet" ? (1 - p) * 40 : 0;
        return <Img key={s.src + i} src={staticFile(`shots/${s.src}.png`)} style={{ position: "absolute", left: 0, top: 0, width, height, opacity: p, transform: `translate(${tx}px, ${ty}px)` }} />;
      })}
    </div>
  );
}

function StatusBar({ small = false, dark = false }: { small?: boolean; dark?: boolean }) {
  const ink = dark ? "#fff" : C.asphalt;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: small ? 24 : 54, padding: small ? "0 24px" : "4px 34px 0", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: body, fontWeight: 700, fontSize: small ? 13 : 17, color: ink, zIndex: 5 }}>
      <span>10:30</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="18" height="12" viewBox="0 0 18 12">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="0.8" fill={ink} />
          ))}
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke={ink} strokeOpacity="0.5" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill={ink} />
        </svg>
      </span>
    </div>
  );
}

export function Phone({ shots, scale = 1, dark = false, children, style }: { shots?: Shot[]; scale?: number; dark?: boolean; children?: ReactNode; style?: CSSProperties }) {
  const W = PHONE.w + PHONE.bezel * 2;
  const Hh = PHONE.h + PHONE.bezel * 2;
  return (
    <div style={{ width: W * scale, height: Hh * scale, ...style }}>
      <div
        style={{
          width: W,
          height: Hh,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          borderRadius: 66,
          background: "linear-gradient(145deg, #2C343D, #0B0E12 40%, #161B20)",
          padding: PHONE.bezel,
          boxShadow: "0 60px 120px -30px rgba(0,0,0,0.65), 0 30px 60px -30px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ position: "relative", width: PHONE.w, height: PHONE.h, borderRadius: 52, overflow: "hidden", background: C.canvas }}>
          {shots && <Screens shots={shots} width={PHONE.w} height={PHONE.h} />}
          {children}
          <StatusBar dark={dark} />
          <div style={{ position: "absolute", top: 11, left: "50%", width: 124, height: 35, marginLeft: -62, borderRadius: 20, background: "#000", zIndex: 6 }} />
          <div style={{ position: "absolute", bottom: 8, left: "50%", width: 136, height: 5, marginLeft: -68, borderRadius: 3, background: "rgba(28,34,41,0.75)", zIndex: 6 }} />
        </div>
      </div>
    </div>
  );
}

export function IPad({ shots, scale = 1, children, style }: { shots?: Shot[]; scale?: number; children?: ReactNode; style?: CSSProperties }) {
  const W = IPAD.w + IPAD.bezel * 2;
  const Hh = IPAD.h + IPAD.bezel * 2;
  return (
    <div style={{ width: W * scale, height: Hh * scale, ...style }}>
      <div
        style={{
          width: W,
          height: Hh,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          borderRadius: 46,
          background: "linear-gradient(145deg, #2C343D, #0B0E12 40%, #161B20)",
          padding: IPAD.bezel,
          boxShadow: "0 70px 140px -30px rgba(0,0,0,0.6), 0 30px 70px -30px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ position: "relative", width: IPAD.w, height: IPAD.h, borderRadius: 26, overflow: "hidden", background: C.canvas }}>
          {shots && <Screens shots={shots} width={IPAD.w} height={IPAD.h} />}
          {children}
          <StatusBar small />
        </div>
      </div>
    </div>
  );
}

export const phoneSize = (scale: number) => ({ w: (PHONE.w + PHONE.bezel * 2) * scale, h: (PHONE.h + PHONE.bezel * 2) * scale });
export const ipadSize = (scale: number) => ({ w: (IPAD.w + IPAD.bezel * 2) * scale, h: (IPAD.h + IPAD.bezel * 2) * scale });
export const IPAD_BEZEL = IPAD.bezel;

/** A soft amber ring that draws attention to a region of a device screen. */
export function Highlight({ x, y, w, h, delay, radius = 18 }: { x: number; y: number; w: number; h: number; delay: number; radius?: number }) {
  const s = useSpring(delay, { damping: 18, stiffness: 120 });
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [delay + 70, delay + 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x - 8,
        top: y - 8,
        width: w + 16,
        height: h + 16,
        borderRadius: radius,
        border: `4px solid ${C.signal}`,
        boxShadow: `0 0 0 8px rgba(244,180,0,0.18)`,
        opacity: Math.min(s, fade),
        transform: `scale(${0.96 + s * 0.04})`,
        zIndex: 8,
      }}
    />
  );
}

/** A short label with a leader dot, placed beside a device. */
export function Callout({ text, delay, style, align = "left" }: { text: string; delay: number; style?: CSSProperties; align?: "left" | "right" }) {
  const s = useSpring(delay, { damping: 200, stiffness: 90 });
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 14, flexDirection: align === "left" ? "row" : "row-reverse", opacity: s, transform: `translateY(${(1 - s) * 14}px)`, ...style }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: C.signal, boxShadow: "0 0 0 6px rgba(244,180,0,0.2)" }} />
      <div style={{ fontFamily: body, fontSize: 30, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

// ---------- Score dial, frame-driven ----------

export function Gauge({ value, delay = 0, size = 520, light = true }: { value: number; delay?: number; size?: number; light?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sweep = 240;
  const start = -120;
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 32, mass: 1.2 } });
  const shown = value * s;
  const a = start + (sweep * shown) / 100;
  const ink = light ? "#fff" : C.asphalt;
  const muted = light ? "rgba(255,255,255,0.14)" : "#E1E4E2";
  const cx = 150;
  const cy = 150;
  const r = 118;
  const polar = (deg: number, rad: number) => {
    const q = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(q), cy + rad * Math.sin(q)];
  };
  const arc = (from: number, to: number, rad: number) => {
    const [x1, y1] = polar(from, rad);
    const [x2, y2] = polar(to, rad);
    return `M${x1} ${y1} A${rad} ${rad} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{ position: "relative", width: size, height: size * 0.86 }}>
      <svg viewBox="0 0 300 258" width={size} height={size * 0.86}>
        <path d={arc(start, start + sweep, r)} fill="none" stroke={muted} strokeWidth="14" strokeLinecap="round" />
        {a > start + 0.5 && <path d={arc(start, a, r)} fill="none" stroke={C.signal} strokeWidth="14" strokeLinecap="round" />}
        {Array.from({ length: 21 }, (_, i) => i * 5).map((t) => {
          const deg = start + (sweep * t) / 100;
          const major = t % 20 === 0;
          const [x1, y1] = polar(deg, major ? 92 : 97);
          const [x2, y2] = polar(deg, 104);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeOpacity={major ? 0.75 : 0.28} strokeWidth={major ? 2.5 : 1.5} strokeLinecap="round" />;
        })}
        {[0, 20, 40, 60, 80, 100].map((t) => {
          const [x, y] = polar(start + (sweep * t) / 100, 76);
          return (
            <text key={t} x={x} y={y + 5} textAnchor="middle" fontFamily="Overpass Variable" fontWeight="700" fontSize="13" fill={ink} fillOpacity="0.5">
              {t}
            </text>
          );
        })}
        <g transform={`rotate(${a} 150 150)`}>
          <path d="M150 54 L154.5 150 L145.5 150 Z" fill={ink} />
        </g>
        <circle cx={cx} cy={cy} r="12" fill={ink} />
        <circle cx={cx} cy={cy} r="4.5" fill={C.signal} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: size * 0.58, textAlign: "center", fontFamily: display, fontWeight: 800, fontSize: size * 0.25, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {Math.round(shown)}
      </div>
    </div>
  );
}

// ---------- The real simulator renderer, driven by the frame ----------

/** The drives the app recommends for Margaret, in the order they run. */
export const ASSIGNED: DriveId[] = sortDrives(["reaction", "left", "lane", "fod", "night", "city"]);

/** t is drive time across the assigned drives (8 s each at 1x), exactly as the app counts it. */
export function SimView({ t, width, height, style }: { t: number; width: number; height: number; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    renderSim(ctx, c.width, c.height, t, ASSIGNED, presets.clear, { live: false, measured: null }, { maxPixels: 3_400_000 });
  }, [t]);
  return <canvas ref={ref} width={width * 2} height={height * 2} style={{ width, height, display: "block", ...style }} />;
}

// ---------- Small icons ----------

export function Icon({ name, size = 44, color = "#fff" }: { name: "wheel" | "clipboard" | "record" | "pen" | "phone" | "shield" | "lock" | "send" | "ban" | "doctor" | "pill" | "eye"; size?: number; color?: string }) {
  const sw = 2.2;
  const p = { fill: "none", stroke: color, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {name === "wheel" && (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <circle cx="12" cy="12.5" r="2.4" {...p} />
          <path d="M3.4 12.2c3-.8 5.6-1 8.6-1s5.6.2 8.6 1M12 15v6" {...p} />
        </>
      )}
      {name === "clipboard" && (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2.5" {...p} />
          <path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4" {...p} />
        </>
      )}
      {name === "record" && (
        <>
          <rect x="4" y="3" width="16" height="18" rx="3" {...p} />
          <path d="M12 7.5v7M8.5 11h7" {...p} />
        </>
      )}
      {name === "pen" && <path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3" {...p} />}
      {name === "phone" && (
        <>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" {...p} />
          <path d="M11 18.5h2" {...p} />
        </>
      )}
      {name === "shield" && <path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z" {...p} />}
      {name === "lock" && (
        <>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" {...p} />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...p} />
        </>
      )}
      {name === "send" && <path d="M4 12l16-8-6 16-3-6-7-2z" {...p} />}
      {name === "ban" && (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M5.6 5.6l12.8 12.8" {...p} />
        </>
      )}
      {name === "doctor" && (
        <>
          <circle cx="12" cy="7" r="3.5" {...p} />
          <path d="M5 21c0-4 3-7 7-7s7 3 7 7" {...p} />
        </>
      )}
      {name === "pill" && (
        <>
          <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)" {...p} />
          <path d="M9.3 8.2l5.4 7.6" {...p} />
        </>
      )}
      {name === "eye" && (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...p} />
          <circle cx="12" cy="12" r="3" {...p} />
        </>
      )}
    </svg>
  );
}

export const T = {
  hero: { fontFamily: display, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.02 } as CSSProperties,
  title: { fontFamily: display, fontWeight: 800, color: "#fff", fontSize: 64, letterSpacing: "-0.015em", lineHeight: 1.06 } as CSSProperties,
  lead: { fontFamily: body, fontSize: 32, color: "rgba(255,255,255,0.74)", lineHeight: 1.4 } as CSSProperties,
  small: { fontFamily: body, fontSize: 22, color: "rgba(255,255,255,0.5)" } as CSSProperties,
};
