import { getLength, getPointAtLength } from "@remotion/paths";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import meta from "../public/shots/meta.json";
import {
  Background,
  Callout,
  DriverScoreMark,
  Gauge,
  HealthKeyLogo,
  HealthKeyTile,
  Highlight,
  Icon,
  IPad,
  IPAD_BEZEL,
  Kicker,
  Phone,
  Rise,
  RoadLine,
  SimView,
  T,
  ease,
  easeInOut,
  ipadSize,
  useProgress,
  useSpring,
  type Shot,
} from "./components";
import { C, FPS, body, display } from "./theme";
import { LEAD, at, sceneFrames, type SceneId } from "./timing";

/** Every scene: background, its voice line, and a slow drift so nothing ever sits perfectly still. */
function Scene({ id, children, tone = "dark", drift = 0.03 }: { id: SceneId; children: ReactNode; tone?: "dark" | "light"; drift?: number }) {
  const frame = useCurrentFrame();
  const total = sceneFrames(id);
  const z = 1 + interpolate(frame, [0, total], [0, drift]);
  return (
    <AbsoluteFill>
      <Background tone={tone} />
      <AbsoluteFill style={{ transform: `scale(${z})` }}>{children}</AbsoluteFill>
      <Sequence from={Math.round(LEAD * FPS)} layout="none">
        <Audio src={staticFile(`vo/${id}.wav`)} />
      </Sequence>
    </AbsoluteFill>
  );
}

/** A device eases up into place. */
function Enter({ delay = 0, y = 70, children, style }: { delay?: number; y?: number; children: ReactNode; style?: CSSProperties }) {
  const s = useSpring(delay, { damping: 200, stiffness: 55 });
  return <div style={{ position: "absolute", opacity: s, transform: `translateY(${(1 - s) * y}px)`, ...style }}>{children}</div>;
}

/** Text that swaps with the narration: each line fades up as the previous one leaves. */
function Beats({ items, style }: { items: { at: number; node: ReactNode }[]; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", ...style }}>
      {items.map((it, i) => {
        const next = items[i + 1]?.at ?? Infinity;
        const inn = interpolate(frame, [it.at, it.at + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        const out = Number.isFinite(next) ? interpolate(frame, [next - 6, next + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        const o = Math.min(inn, out);
        if (o <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: 0, width: "100%", opacity: o, transform: `translateY(${(1 - inn) * 24 + (1 - out) * -16}px)` }}>
            {it.node}
          </div>
        );
      })}
    </div>
  );
}

const Line = ({ title, lead }: { title: string; lead?: string }) => (
  <div>
    <div style={{ ...T.title, fontSize: 62 }}>{title}</div>
    {lead && <div style={{ ...T.lead, marginTop: 18, maxWidth: 620 }}>{lead}</div>}
  </div>
);

// ---------------------------------------------------------------- 1. Open

function PerspectiveRoad() {
  const frame = useCurrentFrame();
  const vx = 960;
  const vy = 560;
  const draw = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp", easing: easeInOut });
  const N = 10;
  const dashes = Array.from({ length: N }, (_, i) => {
    const d0 = ((i + frame / 26) % N) / N;
    const d1 = Math.min(1, d0 + 0.42 / N);
    const y0 = vy + 520 * Math.pow(d0, 2.3);
    const y1 = vy + 520 * Math.pow(d1, 2.3);
    const w0 = 0.8 + 18 * Math.pow(d0, 1.7);
    const w1 = 0.8 + 18 * Math.pow(d1, 1.7);
    const o = Math.min(1, d0 * 6) * draw;
    return <polygon key={i} points={`${vx - w0},${y0} ${vx + w0},${y0} ${vx + w1},${y1} ${vx - w1},${y1}`} fill={C.signal} opacity={o} />;
  });
  const edgeY = vy + (1080 - vy) * draw;
  const k = (edgeY - vy) / (1080 - vy);
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A323B" stopOpacity="0" />
          <stop offset="0.35" stopColor="#2A323B" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="52%" r="40%">
          <stop offset="0" stopColor={C.signal} stopOpacity="0.10" />
          <stop offset="1" stopColor={C.signal} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#glow)" />
      <polygon points={`${vx - 6},${vy} ${vx + 6},${vy} ${vx + (1300 * k)},${edgeY} ${vx - 1300 * k},${edgeY}`} fill="url(#road)" opacity={draw} />
      <path d={`M${vx - 6} ${vy} L${vx - 6 - 1294 * k} ${edgeY} M${vx + 6} ${vy} L${vx + 6 + 1294 * k} ${edgeY}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="3" />
      {dashes}
    </svg>
  );
}

export function Open() {
  const t = at("open", "Can I still drive?");
  return (
    <Scene id="open" drift={0.05}>
      <PerspectiveRoad />
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center" }}>
        <Rise delay={t - 4} y={30}>
          <div style={{ ...T.hero, fontSize: 138 }}>Can I still drive?</div>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 80, top: 70 }}>
        <Rise delay={t + 40}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <DriverScoreMark size={46} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 34, color: "#fff" }}>DriverScore</span>
          </div>
        </Rise>
      </div>
    </Scene>
  );
}

// ---------------------------------------------------------------- 2. Problem

function DotField({ lit, single }: { lit: number; single: number }) {
  const cols = 24;
  const rows = 14;
  return (
    <svg width="760" height="460" viewBox="0 0 760 460">
      {Array.from({ length: cols * rows }, (_, i) => {
        const x = (i % cols) * 32 + 12;
        const y = Math.floor(i / cols) * 32 + 12;
        const order = ((i * 37) % (cols * rows)) / (cols * rows);
        const on = order < lit;
        const isOne = i === 189;
        return <circle key={i} cx={x} cy={y} r={isOne ? 6 + 4 * single : 5} fill={isOne && single > 0 ? C.signal : "#fff"} opacity={isOne && single > 0 ? 1 : on ? 0.55 * (1 - single * 0.75) : 0.06} />;
      })}
      {single > 0 && (
        <circle cx={(189 % cols) * 32 + 12} cy={Math.floor(189 / cols) * 32 + 12} r={18 + 10 * single} fill="none" stroke={C.signal} strokeOpacity={0.35 * single} strokeWidth="3" />
      )}
    </svg>
  );
}

function Scattered({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const cards = [
    { icon: "doctor" as const, label: "Doctor's notes", x: 820, y: 230, at: at("problem", "in the doctor's notes") },
    { icon: "pill" as const, label: "Pharmacy", x: 1310, y: 470, at: at("problem", "at the pharmacy") },
    { icon: "eye" as const, label: "Eye exam", x: 900, y: 690, at: at("problem", "in last year's eye exam") },
  ];
  const appear = interpolate(frame, [start, start + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: appear }}>
        {[
          [cards[0], cards[1]],
          [cards[1], cards[2]],
          [cards[2], cards[0]],
        ].map(([a, b], i) => (
          <line key={i} x1={a.x + 150} y1={a.y + 60} x2={b.x + 150} y2={b.y + 60} stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeDasharray="6 26" strokeDashoffset={-frame * 0.4} />
        ))}
      </svg>
      {cards.map((c, i) => {
        const s = interpolate(frame, [c.at - 6, c.at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        const bob = Math.sin((frame + i * 40) / 34) * 7;
        return (
          <div key={c.label} style={{ position: "absolute", left: c.x, top: c.y + bob + (1 - s) * 30, opacity: s, width: 300, height: 120, borderRadius: 26, background: C.asphalt2, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 22, padding: "0 28px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={c.icon} size={38} />
            </div>
            <div style={{ fontFamily: body, fontWeight: 700, fontSize: 30, color: "#fff" }}>{c.label}</div>
          </div>
        );
      })}
    </>
  );
}

export function Problem() {
  const frame = useCurrentFrame();
  const b1 = at("problem", "fifty-two million") - 6;
  const b2 = at("problem", "Yet only a few hundred") - 4;
  const b3 = at("problem", "And the evidence") - 4;
  const count = Math.round(interpolate(frame, [b1, b1 + 50], [0, 52], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
  const lit = interpolate(frame, [b1, b1 + 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const single = interpolate(frame, [b2, b2 + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const fieldOut = interpolate(frame, [b3 - 8, b3 + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Scene id="problem">
      <div style={{ position: "absolute", left: 150, top: 120 }}>
        <Kicker delay={4}>The question today</Kicker>
      </div>
      <div style={{ position: "absolute", left: 980, top: 300, opacity: fieldOut }}>
        <DotField lit={lit} single={single} />
      </div>
      <Beats
        style={{ left: 150, top: 360, width: 760 }}
        items={[
          {
            at: b1,
            node: (
              <div>
                <div style={{ ...T.hero, fontSize: 150 }}>{count} million</div>
                <div style={{ ...T.lead, marginTop: 14 }}>licensed drivers 65 and older in the U.S.</div>
                <div style={{ ...T.small, marginTop: 18 }}>Source: NHTSA, 2022 data</div>
              </div>
            ),
          },
          {
            at: b2,
            node: (
              <div>
                <div style={{ ...T.hero, fontSize: 120 }}>A few hundred</div>
                <div style={{ ...T.lead, marginTop: 14 }}>certified driver rehabilitation specialists for the whole country</div>
              </div>
            ),
          },
          {
            at: b3,
            node: (
              <div>
                <div style={{ ...T.hero, fontSize: 92, lineHeight: 1.08 }}>The evidence is scattered</div>
              </div>
            ),
          },
        ]}
      />
      {frame > b3 - 10 && <Scattered start={b3} />}
    </Scene>
  );
}

// ---------------------------------------------------------------- 3. Solution

const flowPaths = {
  a: "M490 380 C 590 380, 600 520, 670 532",
  b: "M490 700 C 590 700, 600 560, 670 548",
  d: "M980 540 C 1020 540, 1050 540, 1100 540",
  e: "M1400 540 C 1440 540, 1470 540, 1510 540",
};

function Particles({ d, start, count = 5, speed = 70 }: { d: string; start: number; count?: number; speed?: number }) {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const p = (((frame - start) / speed + i / count) % 1 + 1) % 1;
        const pt = getPointAtLength(d, p * getLength(d));
        if (!pt) return null;
        const o = Math.sin(p * Math.PI);
        return <circle key={i} cx={pt.x} cy={pt.y} r={6} fill={C.signal} opacity={o} />;
      })}
    </>
  );
}

function Node({ x, y, w = 330, delay, icon, title, sub, accent }: { x: number; y: number; w?: number; delay: number; icon: ReactNode; title: string; sub?: string; accent?: string }) {
  const s = useSpring(delay, { damping: 18, stiffness: 110 });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translateY(-50%) scale(${0.9 + 0.1 * s})`, opacity: Math.min(1, s * 1.2) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 22px", borderRadius: 28, background: C.asphalt2, boxShadow: `0 30px 60px -24px rgba(0,0,0,0.55), inset 0 0 0 ${accent ? 2 : 1}px ${accent ?? "rgba(255,255,255,0.08)"}` }}>
        <div style={{ width: 60, height: 60, borderRadius: 17, background: accent ? `${accent}26` : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 29, color: "#fff", lineHeight: 1.1, whiteSpace: "nowrap" }}>{title}</div>
          {sub && <div style={{ fontFamily: body, fontSize: 21, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function Solution() {
  const a1 = at("solution", "the patient's own health record");
  const a2 = at("solution", "simulator drives chosen for her");
  const a5 = at("solution", "A driving specialist reviews");
  const a4 = a5 - 22;
  const a6 = at("solution", "and signs the result");
  return (
    <Scene id="solution" drift={0.02}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", justifyContent: "center" }}>
        <Rise delay={6}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <DriverScoreMark size={56} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 44, color: "#fff" }}>DriverScore</span>
          </div>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 176, textAlign: "center" }}>
        <Rise delay={20}>
          <div style={{ ...T.lead, fontSize: 30 }}>Part of a doctor's visit</div>
        </Rise>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <Particles d={flowPaths.a} start={a4} />
        <Particles d={flowPaths.b} start={a4 + 8} />
        <Particles d={flowPaths.d} start={a5} count={3} speed={50} />
        <Particles d={flowPaths.e} start={a6} count={2} speed={40} />
      </svg>
      <RoadLine d={flowPaths.a} start={a1 + 8} duration={30} opacity={0.45} width={3} />
      <RoadLine d={flowPaths.b} start={a2 + 8} duration={30} opacity={0.45} width={3} />
      <RoadLine d={flowPaths.d} start={a5} duration={20} opacity={0.6} width={3} />
      <RoadLine d={flowPaths.e} start={a6} duration={14} opacity={0.6} width={3} />
      <Node x={100} y={380} w={390} delay={a1} icon={<HealthKeyTile size={40} />} title="Health record" sub="From HealthKey, by consent" />
      <Node x={100} y={700} w={390} delay={a2} icon={<Icon name="wheel" size={38} />} title="Simulator drives" sub="Chosen for her" />
      <Node x={670} y={540} w={310} delay={a4} accent={C.hk} icon={<Icon name="record" size={38} />} title="One record" sub="Every value keeps its source" />
      <Node x={1100} y={540} w={300} delay={a5} icon={<Icon name="pen" size={38} />} title="Specialist" sub="Reviews and decides" />
      <Node x={1510} y={540} w={310} delay={a6} accent={C.signal} icon={<Icon name="phone" size={38} />} title="Signed plan" sub="On her phone" />
    </Scene>
  );
}

// ---------------------------------------------------------------- 4. At home

export function Home() {
  const det = at("home", "Margaret confirms");
  const hk = at("home", "then connects");
  const share = at("home", "She chooses exactly");
  const only = at("home", "and only her specialist");
  const q = at("home", "Four short questions");
  const shots: Shot[] = [
    { src: "p-welcome", at: 0 },
    { src: "p-details", at: det },
    { src: "p-hk-intro", at: hk },
    { src: "p-hk-signin", at: hk + 40, motion: "sheet" },
    { src: "p-hk-sources", at: hk + 78, motion: "fade" },
    { src: "p-hk-share", at: share, motion: "fade" },
    { src: "p-hk-gather-1", at: only, motion: "fade" },
    { src: "p-hk-gather-2", at: only + 34, motion: "fade" },
    { src: "p-hk-connected", at: q - 40 },
    { src: "p-q1", at: q },
    { src: "p-q2", at: q + 56 },
  ];
  return (
    <Scene id="home">
      <div style={{ position: "absolute", left: 150, top: 150 }}>
        <Kicker delay={2}>At home</Kicker>
      </div>
      <Beats
        style={{ left: 150, top: 360, width: 700 }}
        items={[
          { at: 4, node: <Line title="Before the visit" lead="Margaret sets up on her own phone, with her daughter if she likes." /> },
          { at: det, node: <Line title="Confirm her details" lead="Her doctor's office sent the invitation." /> },
          { at: hk, node: <Line title="Connect her health record" lead="HealthKey gathers it from her doctors and pharmacy." /> },
          { at: share, node: <Line title="She chooses what to share" lead="Only her specialist and her doctor see it." /> },
          { at: q, node: <Line title="Four short questions" lead="About how, when and where she drives." /> },
        ]}
      />
      <div style={{ position: "absolute", left: 150, top: 800 }}>
        <Rise delay={hk + 6}>
          <HealthKeyLogo height={42} />
        </Rise>
      </div>
      <Enter delay={0} style={{ left: 1090, top: 100 }}>
        <Phone shots={shots} scale={1} />
      </Enter>
    </Scene>
  );
}

// ---------------------------------------------------------------- 5. At the hospital

export function Checkin() {
  const frame = useCurrentFrame();
  const here = at("checkin", "she taps");
  const pick = at("checkin", "and picks");
  const ipad = at("checkin", "On the specialist's iPad");
  const rec = at("checkin", "with her record");
  const most = at("checkin", "What matters most");
  const phoneShots: Shot[] = [
    { src: "p-home", at: 0 },
    { src: "p-checkin", at: here + 10 },
    { src: "p-connecting", at: pick + 22 },
    { src: "p-checked-in", at: ipad - 8 },
  ];
  const ipadShots: Shot[] = [
    { src: "i-arrived", at: 0 },
    { src: "i-record-review", at: rec },
  ];
  const focusIpad = interpolate(frame, [ipad - 10, ipad + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const sc = 0.86;
  const zoom = interpolate(frame, [most - 6, most + 30], [1, 1.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  return (
    <Scene id="checkin" drift={0.015}>
      <div style={{ position: "absolute", left: 150, top: 64 }}>
        <Kicker delay={2}>At the hospital</Kicker>
      </div>
      <Enter delay={0} style={{ left: 160, top: 150, opacity: 1 - focusIpad * 0.55 }}>
        <Phone shots={phoneShots} scale={0.86} />
      </Enter>
      <div style={{ position: "absolute", left: 640, top: 150, opacity: 0.35 + focusIpad * 0.65, transform: `scale(${zoom})`, transformOrigin: "30% 55%" }}>
        <IPad shots={ipadShots} scale={sc}>
          <Highlight x={330} y={133} w={370} h={512} delay={most} radius={26} />
        </IPad>
      </div>
      <Callout text="Margaret has checked in" delay={ipad + 4} style={{ left: 660, top: 1010 }} />
    </Scene>
  );
}

// ---------------------------------------------------------------- 6. The specialist assigns drives

/** Moves a full-frame layer so that frame point F lands at screen point P, scaled by s. Keys interpolate in order. */
function useCamera(keys: { f: number; s: number; F: [number, number]; P?: [number, number] }[]) {
  const frame = useCurrentFrame();
  const k = keys.map((x) => ({ ...x, P: x.P ?? (x.s === 1 ? x.F : ([960, 540] as [number, number])) }));
  let i = 0;
  while (i < k.length - 1 && frame >= k[i + 1].f) i++;
  const a = k[i];
  const b = k[Math.min(i + 1, k.length - 1)];
  const p = b.f === a.f ? 1 : interpolate(frame, [a.f, b.f], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const mix = (u: number, v: number) => u + (v - u) * p;
  const s = mix(a.s, b.s);
  const F = [mix(a.F[0], b.F[0]), mix(a.F[1], b.F[1])];
  const P = [mix(a.P[0], b.P[0]), mix(a.P[1], b.P[1])];
  return { transform: `translate(${P[0] - s * F[0]}px, ${P[1] - s * F[1]}px) scale(${s})`, transformOrigin: "0 0" } as CSSProperties;
}

/** Screen position of a point on an iPad screen placed at (left, top) with this scale. */
const onIpad = (left: number, top: number, scale: number, x: number, y: number): [number, number] => [left + (IPAD_BEZEL + x) * scale, top + (IPAD_BEZEL + y) * scale];

const reasons = [
  { phrase: "Brake reaction", title: "Brake reaction", why: "New sleep medicine can slow reactions", row: { y: 183, h: 107 } },
  { phrase: "A night drive with glare", title: "Night drive with glare", why: "Cataract, left eye", row: { y: 662, h: 90 } },
  { phrase: "Left turns, where", title: "Left turns across traffic", why: "Where most close calls happen", row: { y: 378, h: 88 } },
];

export function Assign() {
  const frame = useCurrentFrame();
  const picks = at("assign", "the specialist picks");
  const sees = at("assign", "Margaret sees which drives");
  const sc = 0.92;
  const L = 90;
  const Tp = 140;
  const card = onIpad(L, Tp, sc, 930, 470);
  const cam = useCamera([
    { f: 0, s: 1, F: [960, 540] },
    { f: picks, s: 1, F: [960, 540] },
    { f: picks + 30, s: 1.3, F: card, P: [760, 560] },
    { f: sees - 12, s: 1.3, F: card, P: [760, 560] },
    { f: sees + 18, s: 1, F: [960, 540] },
  ]);
  const listOut = interpolate(frame, [sees - 10, sees + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Scene id="assign" drift={0.01}>
      <AbsoluteFill style={cam}>
        <div style={{ position: "absolute", left: 150, top: 64 }}>
          <Kicker delay={2}>The specialist assigns the drives</Kicker>
        </div>
        <Enter delay={0} style={{ left: L, top: Tp }}>
          <IPad shots={[{ src: "i-assign", at: 0 }]} scale={sc}>
            {reasons.map((r) => (
              <Highlight key={r.phrase} x={735} y={r.row.y} w={400} h={r.row.h} delay={at("assign", r.phrase) - 4} radius={14} />
            ))}
          </IPad>
        </Enter>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 1330, top: 330, width: 520, opacity: listOut }}>
        {reasons.map((r, i) => (
          <div key={r.phrase} style={{ marginTop: i ? 44 : 0 }}>
            <Rise delay={at("assign", r.phrase) - 2} y={18}>
              <div style={{ display: "flex", gap: 18 }}>
                <div style={{ width: 6, borderRadius: 3, background: C.signal, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: display, fontWeight: 800, fontSize: 38, color: "#fff", lineHeight: 1.1 }}>{r.title}</div>
                  <div style={{ ...T.lead, fontSize: 27, marginTop: 6 }}>{r.why}</div>
                </div>
              </div>
            </Rise>
          </div>
        ))}
      </div>
      <Enter delay={sees - 6} y={80} style={{ left: 1390, top: 150 }}>
        <Phone shots={[{ src: "p-assigned", at: 0 }]} scale={0.9} />
      </Enter>
    </Scene>
  );
}

// ---------------------------------------------------------------- 7. The drive

// One moment from each assigned drive: the part that shows what the drive tests.
// t0 is seconds into that drive (each drive runs 8 s at 1x), len is seconds on screen.
const CLIP_SPEC = [
  { t0: 1.7, len: 2.5 }, // brake reaction: the light turns red, she brakes
  { t0: 2.9, len: 3.0 }, // left turn: an oncoming car passes, then she turns across
  { t0: 0.9, len: 2.3 }, // lane change: a glance over the shoulder, signal, move over
  { t0: 2.2, len: 2.2 }, // spotting objects at the edge of vision
  { t0: 3.0, len: 2.6 }, // night: oncoming glare, people at the curb
  { t0: 2.9, len: 2.6 }, // city: a full stop while someone crosses
];
const XF = 10;
export const clips = CLIP_SPEC.reduce<{ from: number; to: number; t0: number; index: number }[]>((acc, c, index) => {
  const from = acc.length ? acc[acc.length - 1].to - XF : 0;
  return [...acc, { from, to: from + Math.round(c.len * FPS), t0: index * 8 + c.t0, index }];
}, []);

export function Drive() {
  const frame = useCurrentFrame();
  const pull = clips[clips.length - 1].to;
  const p = interpolate(frame, [pull, pull + 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const canvas = meta.liveCanvas as { x: number; y: number; w: number; h: number };
  // iPad final placement
  const s1 = 1.0;
  const { w: iw } = ipadSize(s1);
  const x1 = (1920 - iw) / 2;
  const y1 = 80;
  // At p=0 the iPad is scaled so its canvas covers the frame.
  const s0 = 1920 / canvas.w;
  const cx = (IPAD_BEZEL + canvas.x) * s0;
  const cy = (IPAD_BEZEL + canvas.y) * s0;
  const x0 = -cx;
  const y0 = -cy - (canvas.h * s0 - 1080) / 2;
  const s = s0 + (s1 - s0) * p;
  const x = x0 + (x1 - x0) * p;
  const y = y0 + (y1 - y0) * p;
  // The iPad's canvas carries on from the last full-screen clip.
  const last = clips[clips.length - 1];
  const simT = last.t0 + (frame - last.from) / FPS;
  return (
    <Scene id="drive" drift={0}>
      {frame < pull + 10 &&
        clips.map((c, i) => {
          if (frame < c.from || frame > c.to) return null;
          // Each clip fades up over the one before it.
          const o = i === 0 ? 1 : interpolate(frame, [c.from, c.from + XF], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const t = c.t0 + (frame - c.from) / FPS;
          return (
            <AbsoluteFill key={i} style={{ opacity: o }}>
              <SimView t={t} width={1920} height={1080} />
            </AbsoluteFill>
          );
        })}
      {frame >= pull && (
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: "0 0" }}>
          <IPad shots={[{ src: "i-live-drive", at: 0 }]} scale={1}>
            <div style={{ position: "absolute", left: canvas.x, top: canvas.y, width: canvas.w, height: canvas.h, borderRadius: 16, overflow: "hidden" }}>
              <SimView t={simT} width={canvas.w} height={canvas.h} />
            </div>
          </IPad>
        </div>
      )}
      {frame >= pull + 40 && <Callout text="Each score appears as its drive finishes" delay={pull + 44} style={{ left: x1 + 30, top: 1010 }} />}
    </Scene>
  );
}

// ---------------------------------------------------------------- 8. Saved to the record

export function Record() {
  const frame = useCurrentFrame();
  const rows = [
    { t: "Intake answers", s: "Patient reported" },
    { t: "Assigned drives", s: "Chosen by Dana Ruiz, with her reasons" },
    { t: "Drive results", s: "What was measured, and the rule for each score" },
    { t: "Simulator session", s: "Simulator 1, the full session file" },
  ];
  return (
    <Scene id="record" drift={0.02}>
      <Enter delay={0} style={{ left: 110, top: 180 }}>
        <IPad
          scale={0.74}
          shots={[
            { src: "i-upload-1", at: 0 },
            { src: "i-upload-2", at: 44, motion: "fade" },
          ]}
        />
      </Enter>
      <RoadLine d="M1040 540 C 1110 540, 1130 540, 1200 540" start={14} duration={22} />
      <Enter delay={8} style={{ left: 1210, top: 240 }}>
        <div style={{ width: 620, borderRadius: 32, background: "#fff", padding: "34px 36px", boxShadow: "0 50px 100px -30px rgba(0,0,0,0.6)" }}>
          <HealthKeyLogo height={40} light={false} />
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 38, color: C.asphalt, marginTop: 24 }}>Margaret's health record</div>
          <div style={{ marginTop: 18 }}>
            {rows.map((r, i) => {
              const d = 26 + i * 18;
              const o = interpolate(frame, [d, d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
              return (
                <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 0", borderTop: i ? "1px solid #E1E4E2" : "none", opacity: o, transform: `translateX(${(1 - o) * 20}px)` }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 17, background: C.hk, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: C.asphalt }}>{r.t}</div>
                    <div style={{ fontFamily: body, fontSize: 20, color: C.graphite }}>{r.s}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Enter>
    </Scene>
  );
}

// ---------------------------------------------------------------- 9. Review and sign

/** A kicker shown between two frames, fading at both ends. */
function Label({ from, to, style, children }: { from: number; to: number; style: CSSProperties; children: ReactNode }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 12, to - 10, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", opacity: o, ...style }}>
      <Kicker delay={from}>{children}</Kicker>
    </div>
  );
}

export function Review() {
  const measured = at("review", "what was measured");
  const steps = at("review", "DriverScore shows each step");
  const suggests = at("review", "suggests an outcome");
  const decides = at("review", "But the specialist decides");
  const chooses = at("review", "She chooses");
  const signs = at("review", "and signs");
  const sc = 1.06;
  const { w } = ipadSize(sc);
  const L = (1920 - w) / 2;
  const Tp = 110;
  const row = onIpad(L, Tp, sc, 565, 578);
  const why = onIpad(L, Tp, sc, 565, 700);
  const decision = onIpad(L, Tp, sc, 1010, 200);
  const signArea = onIpad(L, Tp, sc, 1010, 690);
  const cam = useCamera([
    { f: 0, s: 1, F: [960, 540] },
    { f: measured - 14, s: 1, F: [960, 540] },
    { f: measured + 14, s: 1.32, F: row, P: [960, 560] },
    { f: steps - 8, s: 1.32, F: row, P: [960, 560] },
    { f: steps + 16, s: 1.32, F: why, P: [960, 600] },
    { f: suggests + 8, s: 1.32, F: why, P: [960, 600] },
    { f: decides - 4, s: 1.3, F: decision, P: [960, 520] },
    { f: signs - 14, s: 1.3, F: decision, P: [960, 520] },
    { f: signs + 8, s: 1.3, F: signArea, P: [960, 560] },
    { f: signs + 34, s: 1.3, F: signArea, P: [960, 560] },
    { f: signs + 60, s: 1, F: [960, 540] },
  ]);
  const shots: Shot[] = [
    { src: "i-review-blank", at: 0 },
    { src: "i-review-row", at: measured - 10, motion: "fade" },
    { src: "i-review-blank", at: steps - 6, motion: "fade" },
    { src: "i-review-chosen", at: chooses, motion: "fade" },
    { src: "i-review-signed", at: signs - 6, motion: "fade" },
    { src: "i-released", at: signs + 46 },
  ];
  return (
    <Scene id="review" drift={0.01}>
      <AbsoluteFill style={cam}>
        <Enter delay={0} y={50} style={{ left: L, top: Tp }}>
          <IPad shots={shots} scale={sc}>
            <Highlight x={338} y={490} w={454} h={178} delay={measured + 10} radius={16} />
            <Highlight x={330} y={603} w={470} h={190} delay={steps + 12} radius={18} />
            <Highlight x={865} y={80} w={290} h={232} delay={decides} radius={16} />
          </IPad>
        </Enter>
      </AbsoluteFill>
      <Label from={4} to={measured - 12} style={{ left: 0, right: 0, top: 40, display: "flex", justifyContent: "center" }}>
        Every score explains itself
      </Label>
      <Label from={decides + 6} to={signs - 16} style={{ left: 1270, top: 470 }}>
        The specialist decides
      </Label>
      <Label from={signs - 4} to={signs + 36} style={{ left: 1270, top: 650 }}>
        She signs
      </Label>
    </Scene>
  );
}

// ---------------------------------------------------------------- 10. Clear

function DriveBars({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const rows = [
    { l: "Brake reaction", v: 10 },
    { l: "Left turns across traffic", v: 9 },
    { l: "Lane changes", v: 9 },
    { l: "Spotting objects", v: 9 },
    { l: "Night drive with glare", v: 8 },
    { l: "City drive", v: 10 },
  ];
  return (
    <div style={{ width: 600 }}>
      {rows.map((r, i) => {
        const p = interpolate(frame, [delay + i * 5, delay + i * 5 + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        return (
          <div key={r.l} style={{ marginTop: i ? 16 : 0, opacity: Math.min(1, p * 2) }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: body, fontSize: 24, color: "#fff" }}>
              <span style={{ fontWeight: 700 }}>{r.l}</span>
              <span style={{ fontFamily: display, fontWeight: 800 }}>
                {r.v} <span style={{ fontFamily: body, fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>of 10</span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.12)", marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${r.v * 10 * p}%`, background: "#fff", borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Clear() {
  const arrives = at("clear", "Margaret's result arrives");
  const clear = at("clear", "She's clear to drive");
  const drives = at("clear", "Each drive is explained");
  const steps = at("clear", "her next steps");
  return (
    <Scene id="clear" drift={0.02}>
      <Enter delay={0} style={{ left: 250, top: 100 }}>
        <Phone
          scale={1}
          shots={[
            { src: "p-result-clear", at: 0 },
            { src: "p-result-clear-drives", at: drives - 4, motion: "scroll" },
            { src: "p-result-clear-steps", at: steps, motion: "scroll" },
          ]}
        />
      </Enter>
      <div style={{ position: "absolute", left: 980, top: 110 }}>
        <Rise delay={arrives}>
          <Kicker>Her result</Kicker>
        </Rise>
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 18 }}>
          <Gauge value={92} delay={clear} size={360} />
          <Rise delay={clear + 20}>
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 36, color: "#fff" }}>DriverScore</div>
            <div style={{ ...T.lead, fontSize: 25, marginTop: 6, maxWidth: 300 }}>One part of Dana's decision</div>
          </Rise>
        </div>
      </div>
      <div style={{ position: "absolute", left: 980, top: 540 }}>
        <DriveBars delay={clear + 30} />
      </div>
    </Scene>
  );
}

// ---------------------------------------------------------------- 11. Time to stop

export function Stop() {
  const frame = useCurrentFrame();
  const person = at("stop", "it's shared in person first");
  const leads = at("stop", "Then the app leads");
  const daughter = at("stop", "a ride with her daughter");
  const taxi = at("stop", "a taxi by phone");
  const shuttle = at("stop", "a senior shuttle");
  const shots: Shot[] = [
    { src: "p-result-stop", at: 0 },
    { src: "p-result-stop-rides", at: leads + 26, motion: "scroll" },
    { src: "p-ride-choose", at: daughter, motion: "sheet" },
    { src: "p-ride-asked", at: taxi + 10, motion: "fade" },
    { src: "p-ride-yes", at: shuttle + 24, motion: "fade" },
  ];
  const phoneIn = interpolate(frame, [leads - 20, leads + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <Scene id="stop" drift={0.02}>
      <div style={{ position: "absolute", left: 150, top: 70 }}>
        <Kicker delay={2}>When the news is harder</Kicker>
      </div>
      <Enter delay={0} style={{ left: 120, top: 190, opacity: 1 - phoneIn * 0.6 }}>
        <IPad shots={[{ src: "i-review-stop-signed", at: 0 }]} scale={0.66}>
          <Highlight x={866} y={553} w={289} h={60} delay={person - 4} radius={14} />
        </IPad>
      </Enter>
      <Callout text="Talked about in person first" delay={person + 4} style={{ left: 140, top: 830, opacity: 1 - phoneIn }} />
      <div style={{ position: "absolute", left: 1180, top: 100, opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 60}px)` }}>
        <Phone shots={shots} scale={1} />
      </div>
    </Scene>
  );
}

// ---------------------------------------------------------------- 12. Four outcomes

export function Outcomes() {
  const cards = [
    { k: "Clear.", title: "Clear", line: "No limits now. Re-test in a year." },
    { k: "Drive with conditions.", title: "Drive with conditions", line: "Daylight only, no highways, close to home." },
    { k: "Pause and reassess.", title: "Pause and reassess", line: "Treat what can be treated, then test again." },
    { k: "And time to stop.", title: "Time to stop", line: "A plan for getting around, with family help if she wants it." },
  ];
  const plan = at("outcomes", "Each one comes with a plan");
  return (
    <Scene id="outcomes" drift={0.02}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center" }}>
        <Rise delay={4}>
          <div style={{ ...T.title, fontSize: 72 }}>Four outcomes</div>
        </Rise>
      </div>
      <RoadLine d="M150 760 C 600 760, 1320 760, 1770 760" start={plan - 10} duration={40} />
      {cards.map((c, i) => {
        const d = at("outcomes", c.k) - 4;
        return (
          <div key={c.title} style={{ position: "absolute", left: 150 + i * 412, top: 380, width: 380 }}>
            <Rise delay={d} y={34}>
              <div style={{ height: 300, borderRadius: 30, background: C.asphalt2, padding: "34px 30px", boxShadow: "0 40px 80px -30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.07)" }}>
                <div style={{ width: 54, height: 6, borderRadius: 3, background: C.signal }} />
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 40, lineHeight: 1.08, color: "#fff", marginTop: 26 }}>{c.title}</div>
                <div style={{ fontFamily: body, fontSize: 25, lineHeight: 1.4, color: "rgba(255,255,255,0.7)", marginTop: 16 }}>{c.line}</div>
              </div>
            </Rise>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center" }}>
        <Rise delay={plan + 4}>
          <div style={{ ...T.lead, color: "#fff" }}>Each one comes with a plan.</div>
        </Rise>
      </div>
    </Scene>
  );
}

// ---------------------------------------------------------------- 13. Safeguards

export function Trust() {
  const rows = [
    { at: at("trust", "The specialist always decides"), icon: "pen" as const, text: "The specialist decides" },
    { at: at("trust", "Margaret controls her data"), icon: "lock" as const, text: "Margaret controls her data" },
    { at: at("trust", "Her result goes"), icon: "send" as const, text: "Her result goes to her and her doctor" },
    { at: at("trust", "The app never sends"), icon: "ban" as const, text: "The app never sends it to the DMV" },
    { at: at("trust", "and her records are never sold"), icon: "shield" as const, text: "Records are never sold" },
  ];
  return (
    <Scene id="trust" drift={0.02}>
      <div style={{ position: "absolute", left: 300, top: 120 }}>
        <Kicker delay={2}>Safeguards</Kicker>
      </div>
      <RoadLine d="M339 230 L339 940" start={rows[0].at - 6} duration={rows[4].at - rows[0].at + 14} width={4} opacity={0.6} />
      {rows.map((r, i) => (
        <div key={r.text} style={{ position: "absolute", left: 300, top: 230 + i * 160 }}>
          <Rise delay={r.at - 4} y={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: C.asphalt2, boxShadow: `inset 0 0 0 2px ${C.signal}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={r.icon} size={38} />
              </div>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 54, color: "#fff", letterSpacing: "-0.01em" }}>{r.text}</div>
            </div>
          </Rise>
        </div>
      ))}
    </Scene>
  );
}

// ---------------------------------------------------------------- 14. Close

export function Close() {
  const frame = useCurrentFrame();
  const total = sceneFrames("close");
  const out = interpolate(frame, [total - 24, total], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Scene id="close" drift={0.03}>
      <RoadLine d="M560 650 C 800 650, 1120 650, 1360 650" start={10} duration={40} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center" }}>
        <Rise delay={4}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <DriverScoreMark size={120} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 104, color: "#fff", letterSpacing: "-0.02em" }}>DriverScore</span>
          </div>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, display: "flex", justifyContent: "center" }}>
        <Rise delay={36}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontFamily: body, fontSize: 28, color: "rgba(255,255,255,0.6)" }}>Powered by</span>
            <HealthKeyLogo height={44} />
          </div>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, textAlign: "center" }}>
        <Rise delay={60}>
          <div style={{ fontFamily: body, fontSize: 24, color: "rgba(255,255,255,0.45)" }}>can-i-still-drive.reedahlstrom.workers.dev</div>
        </Rise>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: out }} />
    </Scene>
  );
}
