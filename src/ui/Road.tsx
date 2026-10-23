import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { tr } from "../i18n";

/** Top-down car, pointing right. */
export function CarTop({ width = 30, color = "#F4B400" }: { width?: number; color?: string }) {
  return (
    <svg width={width} height={width * 0.52} viewBox="0 0 50 26" aria-hidden>
      <rect x="1" y="1" width="48" height="24" rx="8" fill={color} stroke="#1C2229" strokeWidth="2" />
      <path d="M31 4.5h6.5a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H31z" fill="#1C2229" />
      <path d="M9 5.5h5v15H9z" fill="#1C2229" opacity="0.85" />
    </svg>
  );
}

/** The visit as a road. The car sits at the current step. */
export function RoadProgress({ steps, current }: { steps: string[]; current: number }) {
  const reduce = useReducedMotion();
  const frac = steps.length > 1 ? current / (steps.length - 1) : 0;
  return (
    <div className="relative h-8 w-full" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1} aria-valuetext={tr("Step {n} of {total}: {name}", { n: current + 1, total: steps.length, name: steps[current] })}>
      <div className="absolute inset-x-0 top-1/2 h-[10px] -translate-y-1/2 overflow-hidden rounded-full bg-asphalt">
        <div
          className="absolute inset-x-1.5 top-1/2 h-[2px] -translate-y-1/2"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, #ffffff 0 7px, transparent 7px 13px)", opacity: 0.85 }}
        />
      </div>
      <motion.div
        className="absolute top-1/2"
        initial={false}
        animate={{ left: `calc(${frac * 100}% - ${frac * 30}px)` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
        style={{ y: "-50%" }}
      >
        <CarTop width={30} />
      </motion.div>
    </div>
  );
}

/** Steering wheel turning through curves. */
export function SteeringWheel({ size = 120, light = false }: { size?: number; light?: boolean }) {
  const reduce = useReducedMotion();
  const ink = light ? "#ffffff" : "#1C2229";
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden
      animate={reduce ? undefined : { rotate: [0, -38, -38, 26, 26, 0] }}
      transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity, times: [0, 0.22, 0.38, 0.62, 0.8, 1] }}
    >
      <circle cx="60" cy="60" r="50" fill="none" stroke={ink} strokeWidth="11" />
      <path d="M14 62c14-4 27-6 46-6s32 2 46 6" fill="none" stroke={ink} strokeWidth="10" strokeLinecap="round" />
      <path d="M60 70v38" stroke={ink} strokeWidth="10" strokeLinecap="round" />
      <circle cx="60" cy="62" r="15" fill={ink} />
      <circle cx="60" cy="62" r="6" fill="#F4B400" />
      <path d="M52 11.5a50 50 0 0 1 16 0" stroke="#F4B400" strokeWidth="11" fill="none" />
    </motion.svg>
  );
}

const ROAD_PATH = "M14 150 C 60 150, 70 96, 120 96 S 180 40, 226 40 S 262 20, 290 20";

/** A road that draws itself, with a car driving it. */
export function RoadLoader({ width = 300, light = false }: { width?: number; light?: boolean }) {
  const reduce = useReducedMotion();
  const id = useId();
  const ink = light ? "#ffffff" : "#1C2229";
  return (
    <div className="relative" style={{ width, height: width * 0.56 }} aria-hidden>
      <svg viewBox="0 0 300 168" width={width} height={width * 0.56} className="absolute inset-0 overflow-visible">
        <motion.path
          d={ROAD_PATH}
          fill="none"
          stroke={ink}
          strokeWidth="22"
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d={ROAD_PATH}
          fill="none"
          stroke="#F4B400"
          strokeWidth="2.5"
          strokeDasharray="8 9"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, strokeDashoffset: reduce ? 0 : [0, -34] }}
          transition={{ opacity: { delay: 0.8, duration: 0.3 }, strokeDashoffset: { duration: 0.9, repeat: Infinity, ease: "linear" } }}
        />
      </svg>
      {!reduce && (
        <motion.div
          key={id}
          className="absolute top-0 left-0"
          style={{ offsetPath: `path("${ROAD_PATH}")`, offsetRotate: "auto", width: 30 * (width / 300), scale: width / 300, transformOrigin: "0 0" }}
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.6, delay: 0.6, repeat: Infinity, ease: "easeInOut", times: [0, 0.12, 0.88, 1] }}
        >
          <div style={{ transform: "translate(-15px, -8px)" }}>
            <CarTop width={30} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** Speedometer-style score dial. */
export function Gauge({ value, max = 100, size = 300, delay = 0.2, light = false }: { value: number; max?: number; size?: number; delay?: number; light?: boolean }) {
  const reduce = useReducedMotion();
  const sweep = 240;
  const start = -120;
  const angle = useMotionValue(start);
  const shown = useTransform(angle, (a) => Math.round(((a - start) / sweep) * max));
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => shown.on("change", (v) => setN(v)), [shown]);
  useEffect(() => {
    const target = start + (sweep * Math.min(value, max)) / max;
    if (reduce) {
      angle.set(target);
      setN(value);
      return;
    }
    const c = animate(angle, target, { type: "spring", stiffness: 38, damping: 11, mass: 1.1, delay });
    return () => c.stop();
  }, [value, max, delay, reduce, angle]);

  const ink = light ? "#ffffff" : "#1C2229";
  const muted = light ? "rgba(255,255,255,0.18)" : "#E1E4E2";
  const cx = 150;
  const cy = 150;
  const r = 118;
  const polar = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arc = (from: number, to: number, rad: number) => {
    const [x1, y1] = polar(from, rad);
    const [x2, y2] = polar(to, rad);
    return `M${x1} ${y1} A${rad} ${rad} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const valueArc = useTransform(angle, (a) => (a <= start + 0.5 ? "" : arc(start, a, r)));
  const needleRef = useRef<SVGGElement>(null);
  useEffect(() => {
    const apply = (a: number) => needleRef.current?.setAttribute("transform", `rotate(${a} 150 150)`);
    apply(angle.get());
    return angle.on("change", apply);
  }, [angle]);
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);

  return (
    <div className="relative" style={{ width: size, height: size * 0.86 }}>
      <svg viewBox="0 0 300 258" width={size} height={size * 0.86} aria-hidden>
        <path d={arc(start, start + sweep, r)} fill="none" stroke={muted} strokeWidth="16" strokeLinecap="round" />
        <motion.path d={valueArc} fill="none" stroke={ink} strokeWidth="16" strokeLinecap="round" />
        {ticks.map((t) => {
          const deg = start + (sweep * t) / 100;
          const major = t % 20 === 0;
          const [x1, y1] = polar(deg, major ? 92 : 97);
          const [x2, y2] = polar(deg, 104);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeOpacity={major ? 0.8 : 0.3} strokeWidth={major ? 2.5 : 1.5} strokeLinecap="round" />;
        })}
        {size >= 200 && max === 100 && [0, 20, 40, 60, 80, 100].map((t) => {
          const [x, y] = polar(start + (sweep * t) / 100, 76);
          return (
            <text key={t} x={x} y={y + 5} textAnchor="middle" fontFamily="Overpass Variable" fontWeight="700" fontSize="14" fill={ink} fillOpacity="0.55">
              {t}
            </text>
          );
        })}
        <g ref={needleRef} transform={`rotate(${start} 150 150)`}>
          <path d="M150 52 L155 150 L145 150 Z" fill="#F4B400" stroke={light ? "#1C2229" : "none"} strokeWidth="1" />
        </g>
        <circle cx={cx} cy={cy} r="13" fill={ink} />
        <circle cx={cx} cy={cy} r="4.5" fill="#F4B400" />
      </svg>
      <div className="absolute inset-x-0 text-center" style={{ top: size * 0.6 }}>
        <span className={`font-display font-extrabold tnum leading-none tracking-[-0.03em] ${light ? "text-white" : "text-asphalt"}`} style={{ fontSize: size * 0.27 }}>
          {n}
        </span>
      </div>
    </div>
  );
}
