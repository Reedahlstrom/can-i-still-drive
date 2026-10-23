import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { patient, specialist } from "../data/demo";
import { useDemo, type TabletStep } from "../state/store";
import { Button } from "../ui/primitives";
import { Pane } from "./Shell";

const order: TabletStep[] = ["trails", "clock", "signs", "colors", "choice"];
const names: Record<string, string> = { trails: "Connect the circles", clock: "Draw a clock", signs: "Match the signs", colors: "Name the ink color", choice: "Driving questions" };

export function Handoff() {
  const set = useDemo((s) => s.set);
  return (
    <Pane title="Tablet tests" sub={`${patient.first} takes these on her own. About 10 minutes.`}>
      <div className="grid grid-cols-[1fr_340px] gap-6">
        <div className="rounded-2xl bg-paper p-8">
          <ol className="flex flex-col gap-4">
            {order.map((s, i) => (
              <li key={s} className="flex items-center gap-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-mist font-display text-[16px] font-bold">{i + 1}</span>
                <span className="text-[20px]">{names[s]}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-asphalt p-7 text-white">
          <div>
            <p className="text-[20px] leading-snug">Hand the iPad to {patient.first}. Results stay hidden from her screen.</p>
            <p className="mt-3 text-[15px] leading-snug text-white/60">To end early, press and hold "Test 1 of 5" at the top.</p>
          </div>
          <Button variant="signal" className="mt-6 w-full" onClick={() => set({ tabletStep: "trails" })}>
            Start patient mode
          </Button>
        </div>
      </div>
    </Pane>
  );
}

function PatientFrame({ step, children }: { step: TabletStep; children: ReactNode }) {
  const go = useDemo((s) => s.go);
  const i = order.indexOf(step);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The specialist can end the tests early by pressing and holding the step label.
  const startHold = () => {
    hold.current = setTimeout(() => {
      const s = useDemo.getState();
      if (s.tabletStep === "trails" && s.live.trailsSeconds === undefined) s.setLive({ trailsSeconds: null });
      go("hands-on", { tabletStep: "done" });
    }, 1200);
  };
  const endHold = () => {
    if (hold.current) clearTimeout(hold.current);
  };
  return (
    <div className="flex h-full w-full flex-col bg-canvas">
      <header className="flex items-center justify-between px-10 pt-[calc(var(--safe-top,0px)+18px)] pb-3">
        <span onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} className="select-none text-[18px] font-semibold text-graphite">
          {i >= 0 ? `Test ${i + 1} of ${order.length}` : "Tablet tests"}
        </span>
      </header>
      <div className="min-h-0 flex-1 px-10 pb-8">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full">
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function Intro({ title, body, onStart, children }: { title: string; body: string; onStart: () => void; children?: ReactNode }) {
  return (
    <div className="mx-auto flex h-full max-w-[640px] flex-col justify-center">
      <h1 className="font-display text-[44px] leading-tight font-extrabold tracking-[-0.015em]">{title}</h1>
      <p className="mt-4 text-[24px] leading-snug text-graphite">{body}</p>
      {children}
      <Button className="mt-10 w-[260px]" onClick={onStart}>
        Start
      </Button>
    </div>
  );
}

// --- Trails B, short form ---
const TRAIL = ["1", "A", "2", "B", "3", "C", "4", "D", "5", "E"];
const SPOTS: [number, number][] = [
  [0.1, 0.72],
  [0.24, 0.2],
  [0.42, 0.58],
  [0.58, 0.14],
  [0.76, 0.5],
  [0.9, 0.18],
  [0.84, 0.86],
  [0.5, 0.9],
  [0.28, 0.48],
  [0.66, 0.78],
];

function Trails({ next }: { next: () => void }) {
  const setLive = useDemo((s) => s.setLive);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const errors = useRef(0);
  const t0 = useRef(0);

  const tap = (i: number) => {
    if (i < idx) return;
    if (i !== idx) {
      errors.current += 1;
      setWrong(i);
      setTimeout(() => setWrong(null), 500);
      return;
    }
    const n = idx + 1;
    setIdx(n);
    if (n === TRAIL.length) {
      setLive({ trailsSeconds: Math.round((performance.now() - t0.current) / 1000), trailsErrors: errors.current });
      setTimeout(next, 700);
    }
  };

  if (!started)
    return (
      <Intro
        title={names.trails}
        body="Tap the circles in order, switching between numbers and letters. Go as quickly as you can."
        onStart={() => {
          t0.current = performance.now();
          setStarted(true);
        }}
      >
        <div className="mt-6 flex items-center gap-3">
          {["1", "A", "2", "B", "3"].map((x, i) => (
            <span key={x} className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-full border-[3px] border-asphalt bg-paper font-display text-[22px] font-bold">{x}</span>
              {i < 4 && <span className="h-[3px] w-6 bg-asphalt" />}
            </span>
          ))}
        </div>
      </Intro>
    );

  return (
    <div className="relative h-full w-full rounded-3xl bg-paper">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {SPOTS.slice(0, Math.max(0, idx - 1)).map((p, i) => (
          <line key={i} x1={`${p[0] * 100}%`} y1={`${p[1] * 100}%`} x2={`${SPOTS[i + 1][0] * 100}%`} y2={`${SPOTS[i + 1][1] * 100}%`} stroke="#1C2229" strokeWidth="4" strokeLinecap="round" />
        ))}
      </svg>
      {TRAIL.map((label, i) => {
        const done = i < idx;
        return (
          <motion.button
            key={label}
            onClick={() => tap(i)}
            animate={wrong === i ? { x: [0, -8, 8, -5, 0] } : {}}
            transition={{ duration: 0.35 }}
            aria-label={label}
            className={`absolute flex size-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] font-display text-[30px] font-bold transition-colors ${
              done ? "border-asphalt bg-asphalt text-white" : wrong === i ? "border-alert bg-alert-tint" : "border-asphalt bg-paper"
            }`}
            style={{ left: `${SPOTS[i][0] * 100}%`, top: `${SPOTS[i][1] * 100}%` }}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}

// --- Clock drawing ---
function Clock({ next }: { next: () => void }) {
  const setLive = useDemo((s) => s.setLive);
  const [started, setStarted] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = c.clientWidth * 2;
    c.height = c.clientHeight * 2;
    const ctx = c.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#1C2229";
  }, [started]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * e.currentTarget.width, ((e.clientY - r.top) / r.height) * e.currentTarget.height];
  };

  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDrawn(false);
  };

  const done = () => {
    const c = ref.current!;
    const out = document.createElement("canvas");
    out.width = 360;
    out.height = 360;
    const o = out.getContext("2d")!;
    o.fillStyle = "#fff";
    o.fillRect(0, 0, 360, 360);
    o.drawImage(c, 0, 0, 360, 360);
    setLive({ clock: out.toDataURL("image/png") });
    next();
  };

  if (!started) return <Intro title={names.clock} body="Draw a clock with all the numbers. Set the hands to 10 past 11." onStart={() => setStarted(true)} />;

  return (
    <div className="flex h-full items-center gap-10">
      <div className="flex w-[300px] shrink-0 flex-col">
        <p className="text-[24px] leading-snug">Draw a clock with all the numbers. Set the hands to 10 past 11.</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button disabled={!drawn} onClick={done}>
            Done
          </Button>
          <Button variant="secondary" disabled={!drawn} onClick={clear}>
            Start over
          </Button>
        </div>
      </div>
      <canvas
        ref={ref}
        className="aspect-square h-full max-h-[560px] touch-none rounded-3xl bg-paper"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.1, y + 0.1);
          ctx.stroke();
          setDrawn(true);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
        aria-label="Drawing area"
      />
    </div>
  );
}

// --- Road signs ---
type SignKind = "stop" | "yield" | "warning" | "school" | "railroad" | "noEntry" | "speed" | "oneWay";

export function Sign({ kind, size = 120 }: { kind: SignKind; size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden>
      {kind === "stop" && (
        <>
          <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="#B8322A" stroke="#fff" strokeWidth="3" />
          <text x="50" y="59" textAnchor="middle" fontFamily="Overpass Variable" fontWeight="800" fontSize="24" fill="#fff">STOP</text>
        </>
      )}
      {kind === "yield" && (
        <>
          <polygon points="4,8 96,8 50,94" fill="#B8322A" />
          <polygon points="22,19 78,19 50,71" fill="#fff" />
        </>
      )}
      {kind === "warning" && (
        <>
          <polygon points="50,3 97,50 50,97 3,50" fill="#F4C21A" stroke="#1C2229" strokeWidth="3" />
          <path d="M50 28v28" stroke="#1C2229" strokeWidth="9" strokeLinecap="round" />
          <circle cx="50" cy="70" r="5" fill="#1C2229" />
        </>
      )}
      {kind === "school" && (
        <>
          <polygon points="50,3 96,40 96,97 4,97 4,40" fill="#C8DB3C" stroke="#1C2229" strokeWidth="3" />
          <circle cx="40" cy="48" r="7" fill="#1C2229" />
          <circle cx="62" cy="52" r="6" fill="#1C2229" />
          <path d="M34 60h14l-3 22M58 62h11l-2 20" stroke="#1C2229" strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      )}
      {kind === "railroad" && (
        <>
          <g transform="rotate(45 50 50)">
            <rect x="8" y="41" width="84" height="18" fill="#fff" stroke="#1C2229" strokeWidth="3" />
          </g>
          <g transform="rotate(-45 50 50)">
            <rect x="8" y="41" width="84" height="18" fill="#fff" stroke="#1C2229" strokeWidth="3" />
          </g>
        </>
      )}
      {kind === "noEntry" && (
        <>
          <circle cx="50" cy="50" r="46" fill="#B8322A" stroke="#fff" strokeWidth="3" />
          <rect x="18" y="42" width="64" height="16" rx="2" fill="#fff" />
        </>
      )}
      {kind === "speed" && (
        <>
          <rect x="16" y="4" width="68" height="92" rx="6" fill="#fff" stroke="#1C2229" strokeWidth="4" />
          <text x="50" y="27" textAnchor="middle" fontFamily="Overpass Variable" fontWeight="800" fontSize="12" fill="#1C2229">SPEED</text>
          <text x="50" y="41" textAnchor="middle" fontFamily="Overpass Variable" fontWeight="800" fontSize="12" fill="#1C2229">LIMIT</text>
          <text x="50" y="80" textAnchor="middle" fontFamily="Overpass Variable" fontWeight="800" fontSize="34" fill="#1C2229">35</text>
        </>
      )}
      {kind === "oneWay" && (
        <>
          <rect x="2" y="30" width="96" height="40" rx="4" fill="#1C2229" />
          <path d="M10 50h70M66 38l16 12-16 12" stroke="#fff" strokeWidth="8" fill="none" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

const SIGN_ITEMS: { target: SignKind; options: SignKind[] }[] = [
  { target: "stop", options: ["yield", "stop", "noEntry", "warning"] },
  { target: "yield", options: ["stop", "warning", "yield", "railroad"] },
  { target: "school", options: ["warning", "school", "speed", "yield"] },
  { target: "noEntry", options: ["noEntry", "stop", "oneWay", "yield"] },
  { target: "railroad", options: ["school", "warning", "railroad", "speed"] },
];

function Signs({ next }: { next: () => void }) {
  const setLive = useDemo((s) => s.setLive);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = useRef(0);
  const item = SIGN_ITEMS[i];

  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (item.options[k] === item.target) correct.current += 1;
    setTimeout(() => {
      setPicked(null);
      if (i + 1 < SIGN_ITEMS.length) setI(i + 1);
      else {
        setLive({ signs: correct.current });
        next();
      }
    }, 450);
  };

  if (!started) return <Intro title={names.signs} body="You'll see a road sign at the top. Tap the one below that matches it." onStart={() => setStarted(true)} />;

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <motion.div key={i} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-paper p-6">
        <Sign kind={item.target} size={150} />
      </motion.div>
      <div className="mt-10 grid grid-cols-4 gap-5">
        {item.options.map((o, k) => (
          <button
            key={`${i}-${k}`}
            onClick={() => pick(k)}
            aria-label={`Option ${k + 1}`}
            className={`rounded-3xl border-[3px] bg-paper p-5 transition-colors ${picked === k ? "border-asphalt" : "border-transparent hover:border-line-strong"}`}
          >
            <Sign kind={o} size={120} />
          </button>
        ))}
      </div>
      <p className="mt-8 text-[18px] text-graphite">
        {i + 1} of {SIGN_ITEMS.length}
      </p>
    </div>
  );
}

// --- Colors ---
const INKS = { Red: "#C0392B", Blue: "#2D5FA8", Green: "#2F855A", Yellow: "#C99A06" } as const;
type Ink = keyof typeof INKS;
const COLOR_ITEMS: { word: Ink; ink: Ink }[] = [
  { word: "Red", ink: "Blue" },
  { word: "Green", ink: "Red" },
  { word: "Blue", ink: "Yellow" },
  { word: "Yellow", ink: "Green" },
  { word: "Blue", ink: "Red" },
  { word: "Red", ink: "Green" },
];

function Colors({ next }: { next: () => void }) {
  const setLive = useDemo((s) => s.setLive);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const correct = useRef(0);
  const item = COLOR_ITEMS[i];

  const pick = (c: Ink) => {
    if (c === item.ink) correct.current += 1;
    if (i + 1 < COLOR_ITEMS.length) setI(i + 1);
    else {
      setLive({ colors: correct.current });
      next();
    }
  };

  if (!started) return <Intro title={names.colors} body="Tap the color of the ink, not the word. If you see the word Red written in blue, tap Blue." onStart={() => setStarted(true)} />;

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <motion.div key={i} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="font-display text-[110px] leading-none font-extrabold" style={{ color: INKS[item.ink] }}>
        {item.word.toUpperCase()}
      </motion.div>
      <p className="mt-6 text-[22px] text-graphite">Tap the color of the ink, not the word.</p>
      <div className="mt-8 grid grid-cols-4 gap-4">
        {(Object.keys(INKS) as Ink[]).map((c) => (
          <button key={c} onClick={() => pick(c)} className="flex h-[88px] w-[170px] items-center gap-4 rounded-2xl bg-paper px-5 text-[22px] font-semibold hover:bg-white">
            <span className="size-9 rounded-full" style={{ background: INKS[c] }} />
            {c}
          </button>
        ))}
      </div>
      <p className="mt-8 text-[18px] text-graphite">
        {i + 1} of {COLOR_ITEMS.length}
      </p>
    </div>
  );
}

// --- Multiple choice ---
const CHOICE_ITEMS = [
  { q: "A school bus ahead has its red lights flashing. What do you do?", options: ["Stop and wait", "Pass slowly on the left", "Slow down and pass carefully"], answer: 0 },
  { q: "You're turning left on a green light with no arrow. What do you do?", options: ["Turn right away", "Yield to oncoming traffic, then turn", "Wait for the light to turn red"], answer: 1 },
  { q: "What does a yellow diamond-shaped sign mean?", options: ["You have the right of way", "Stop ahead", "Warning: something ahead needs care"], answer: 2 },
];

function Choices({ next }: { next: () => void }) {
  const setLive = useDemo((s) => s.setLive);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = useRef(0);
  const item = CHOICE_ITEMS[i];
  const confirm = () => {
    if (picked === null) return;
    if (picked === item.answer) correct.current += 1;
    setPicked(null);
    if (i + 1 < CHOICE_ITEMS.length) setI(i + 1);
    else {
      setLive({ choice: correct.current });
      next();
    }
  };
  return (
    <div className="mx-auto flex h-full max-w-[760px] flex-col justify-center">
      <p className="text-[18px] font-semibold text-graphite">
        Question {i + 1} of {CHOICE_ITEMS.length}
      </p>
      <motion.h1 key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="mt-3 font-display text-[38px] leading-tight font-extrabold">
        {item.q}
      </motion.h1>
      <div className="mt-8 flex flex-col gap-3">
        {item.options.map((o, k) => (
          <button
            key={`${i}-${k}`}
            role="radio"
            aria-checked={picked === k}
            onClick={() => setPicked(k)}
            className={`min-h-[76px] rounded-2xl border-2 bg-paper px-6 text-left text-[23px] transition-colors ${picked === k ? "border-asphalt" : "border-transparent hover:border-line-strong"}`}
          >
            {o}
          </button>
        ))}
      </div>
      <Button className="mt-8 w-[260px]" disabled={picked === null} onClick={confirm}>
        {i + 1 < CHOICE_ITEMS.length ? "Next" : "Done"}
      </Button>
    </div>
  );
}

function AllDone() {
  const go = useDemo((s) => s.go);
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <h1 className="font-display text-[52px] font-extrabold">All done</h1>
      <p className="mt-3 text-[26px] text-graphite">Please hand the iPad back to {specialist.first}.</p>
      <Button variant="secondary" className="mt-12 w-[300px]" onClick={() => go("hands-on", { tabletStep: "done" })}>
        {specialist.first}: continue
      </Button>
    </div>
  );
}

export function PatientMode() {
  const step = useDemo((s) => s.tabletStep);
  const set = useDemo((s) => s.set);
  const advance = () => {
    const now = useDemo.getState();
    if (now.phase !== "tablet-tests" || now.tabletStep !== step) return;
    const i = order.indexOf(step);
    set({ tabletStep: i + 1 < order.length ? order[i + 1] : "done" });
  };
  return (
    <PatientFrame step={step}>
      {step === "trails" && <Trails next={advance} />}
      {step === "clock" && <Clock next={advance} />}
      {step === "signs" && <Signs next={advance} />}
      {step === "colors" && <Colors next={advance} />}
      {step === "choice" && <Choices next={advance} />}
      {step === "done" && <AllDone />}
    </PatientFrame>
  );
}
