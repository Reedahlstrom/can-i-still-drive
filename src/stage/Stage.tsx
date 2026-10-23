import { ExternalLink, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { scenarioLabels, type ScenarioKey } from "../data/scenarios";
import { PatientApp } from "../patient/PatientApp";
import { SpecialistApp } from "../specialist/SpecialistApp";
import { jumpLabels, useDemo, type JumpStage } from "../state/store";
import { DriverScoreWordmark } from "../ui/Brand";
import { Segmented } from "../ui/primitives";

const PHONE = { w: 393, h: 852, bezel: 13 };
const IPAD = { w: 1180, h: 820, bezel: 20 };
const GAP = 72;
const CAPTION = 44;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/, "");
}

function StatusBar({ dark = false, small = false }: { dark?: boolean; small?: boolean }) {
  const time = useClock();
  const ink = dark ? "#ffffff" : "#1C2229";
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between font-semibold ${small ? "h-[24px] px-6 text-[13px]" : "h-[54px] px-8 pt-1 text-[16px]"}`} style={{ color: ink }}>
      <span className="tnum">{time}</span>
      <span className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="0.8" fill={ink} />
          ))}
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
          <path d="M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0zM3.4 6.4a6.6 6.6 0 0 1 9.2 0l-1.3 1.3a4.8 4.8 0 0 0-6.6 0zM1.2 4.2a9.7 9.7 0 0 1 13.6 0l-1.3 1.3a7.9 7.9 0 0 0-11 0z" fill={ink} />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden>
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke={ink} strokeOpacity="0.5" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill={ink} />
          <rect x="23.5" y="4" width="1.8" height="4" rx="0.9" fill={ink} fillOpacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

function Phone({ children, darkStatus }: { children: ReactNode; darkStatus: boolean }) {
  return (
    <div className="relative rounded-[62px] bg-[#0D1014] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),inset_0_0_0_1.5px_#48525C]" style={{ width: PHONE.w + PHONE.bezel * 2, height: PHONE.h + PHONE.bezel * 2, padding: PHONE.bezel }}>
      <div className="relative h-full w-full overflow-hidden rounded-[50px]" style={{ "--safe-top": "54px", "--safe-bottom": "26px" } as CSSProperties}>
        <StatusBar dark={darkStatus} />
        <div className="pointer-events-none absolute top-[11px] left-1/2 z-50 h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black" />
        {children}
        <div className="pointer-events-none absolute bottom-[8px] left-1/2 z-50 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-asphalt/80 mix-blend-multiply" />
      </div>
    </div>
  );
}

function Tablet({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-[44px] bg-[#0D1014] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),inset_0_0_0_1.5px_#48525C]" style={{ width: IPAD.w + IPAD.bezel * 2, height: IPAD.h + IPAD.bezel * 2, padding: IPAD.bezel }}>
      <div className="relative h-full w-full overflow-hidden rounded-[26px]" style={{ "--safe-top": "24px", "--safe-bottom": "16px" } as CSSProperties}>
        <StatusBar small />
        {children}
      </div>
    </div>
  );
}

function useFocus(): "phone" | "ipad" | "both" {
  const s = useDemo();
  if (s.hkStep || s.ride) return "phone";
  switch (s.phase) {
    case "onboarding":
    case "ready":
    case "released":
      return "phone";
    case "pre-drive":
      return s.preDriveFeeling ? "ipad" : "phone";
    case "post-drive":
      return !s.postFeel || s.selfRating === null ? "both" : "ipad";
    default:
      return "ipad";
  }
}

function useFit() {
  const calc = () => {
    const totalW = PHONE.w + PHONE.bezel * 2 + GAP + IPAD.w + IPAD.bezel * 2;
    const totalH = Math.max(PHONE.h + PHONE.bezel * 2, IPAD.h + IPAD.bezel * 2) + CAPTION;
    return Math.min((window.innerWidth - 80) / totalW, (window.innerHeight - 110) / totalH, 1);
  };
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return scale;
}

function Presenter({ onClose }: { onClose: () => void }) {
  const scenario = useDemo((s) => s.scenario);
  const speed = useDemo((s) => s.speed);
  const set = useDemo((s) => s.set);
  const jump = useDemo((s) => s.jump);
  const reset = useDemo((s) => s.reset);
  const open = (hash: string) => window.open(`${location.pathname}#/${hash}`, `driverscore-${hash}`);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute right-6 bottom-20 z-50 w-[360px] rounded-3xl bg-paper p-5 text-asphalt shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[20px] font-extrabold">Demo controls</h2>
        <button onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-full hover:bg-mist">
          <X size={20} />
        </button>
      </div>
      <h3 className="mt-4 mb-2 text-[14px] font-semibold text-graphite">Result</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(scenarioLabels) as ScenarioKey[]).map((k) => (
          <button key={k} onClick={() => set({ scenario: k, handsOn: {} })} aria-pressed={scenario === k} className={`h-10 rounded-xl px-3 text-left text-[15px] font-semibold ${scenario === k ? "bg-asphalt text-white" : "bg-mist hover:bg-line"}`}>
            {scenarioLabels[k]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-graphite">Live scores the tablet tests and brake reaction as they're taken.</p>
      <h3 className="mt-4 mb-2 text-[14px] font-semibold text-graphite">Jump to</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(jumpLabels) as JumpStage[]).map((k) => (
          <button key={k} onClick={() => jump(k)} className="h-10 rounded-xl bg-mist px-3 text-left text-[15px] font-semibold hover:bg-line">
            {jumpLabels[k]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-graphite">Speed</span>
        <Segmented
          label="Speed"
          size="sm"
          value={speed}
          onChange={(v) => set({ speed: v })}
          options={[
            { value: 1, label: "1×" },
            { value: 2, label: "2×" },
          ]}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {[
          ["phone", "Phone"],
          ["ipad", "iPad"],
          ["simulator", "Simulator"],
        ].map(([h, l]) => (
          <button key={h} onClick={() => open(h)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-line text-[14px] font-semibold hover:border-line-strong">
            {l}
            <ExternalLink size={14} />
          </button>
        ))}
      </div>
      <button onClick={reset} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-asphalt text-[15px] font-semibold text-white">
        <RotateCcw size={16} /> Start over
      </button>
    </motion.div>
  );
}

export function Stage() {
  const scale = useFit();
  const focus = useFocus();
  const phase = useDemo((s) => s.phase);
  const patientStep = useDemo((s) => s.patientStep);
  const [panel, setPanel] = useState(false);
  const darkStatus = (phase === "onboarding" && patientStep === "welcome") || phase === "driving";
  const dim = (d: "phone" | "ipad") => focus !== "both" && focus !== d;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") setPanel(false);
      if (e.key === "`") setPanel((p) => !p);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return (
    <div className="dark-surface relative flex h-full w-full flex-col overflow-hidden bg-asphalt">
      <div className="flex items-center justify-between px-8 pt-6">
        <DriverScoreWordmark size={30} light />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex items-end" style={{ gap: GAP * scale }}>
          {(
            [
              ["phone", "Margaret's phone"],
              ["ipad", "Specialist's iPad, Simulator 1"],
            ] as const
          ).map(([d, label]) => {
            const w = d === "phone" ? PHONE.w + PHONE.bezel * 2 : IPAD.w + IPAD.bezel * 2;
            const h = d === "phone" ? PHONE.h + PHONE.bezel * 2 : IPAD.h + IPAD.bezel * 2;
            return (
              <div key={d} className="flex flex-col items-center">
                <motion.div
                  animate={{ opacity: dim(d) ? 0.42 : 1, scale: dim(d) ? 0.985 : 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: w * scale, height: h * scale }}
                >
                  <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                    {d === "phone" ? (
                      <Phone darkStatus={darkStatus}>
                        <PatientApp />
                      </Phone>
                    ) : (
                      <Tablet>
                        <SpecialistApp />
                      </Tablet>
                    )}
                  </div>
                </motion.div>
                <motion.div animate={{ opacity: dim(d) ? 0.4 : 0.8 }} className="mt-4 text-[15px] font-semibold text-white">
                  {label}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
      <button
        onClick={() => setPanel(!panel)}
        aria-label="Demo controls"
        aria-expanded={panel}
        className="absolute right-6 bottom-6 z-50 flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <SlidersHorizontal size={20} />
      </button>
      <AnimatePresence>{panel && <Presenter onClose={() => setPanel(false)} />}</AnimatePresence>
    </div>
  );
}
