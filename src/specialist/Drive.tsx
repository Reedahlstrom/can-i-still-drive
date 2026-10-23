import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { patient } from "../data/demo";
import { SimCanvas } from "../sim/SimCanvas";
import { DRIVE, LEFT_TURNS, SCENARIOS, driveEvents, driveSeconds, scenarioAt, useDriveClock } from "../sim/timeline";
import { useDemo, useRaw, useScore } from "../state/store";
import { HealthKeyLogo } from "../ui/Brand";
import { Button } from "../ui/primitives";
import { Card, Pane } from "./Shell";

export function DrivePrep() {
  const feeling = useDemo((s) => s.preDriveFeeling);
  const go = useDemo((s) => s.go);
  const concern = feeling && feeling !== "I feel fine";
  return (
    <Pane
      title="Simulator drive"
      sub="Six scored drives on Simulator 1."
      actions={
        <Button size="md" variant="signal" disabled={!feeling} onClick={() => go("driving", { simStart: Date.now(), drivesCompleted: null, collisionSeen: false, live: { ...useDemo.getState().live, reactionMs: undefined } })}>
          Start simulator
        </Button>
      }
    >
      <div className="grid grid-cols-[1fr_1fr] gap-5">
        <Card title="Before the drive">
          <div className="px-5 pt-2 pb-5">
            {feeling ? (
              <div className={`rounded-xl px-4 py-3.5 ${concern ? "bg-alert-tint" : "bg-canvas"}`}>
                <div className="text-[14px] text-graphite">{patient.first} says</div>
                <div className="text-[19px] font-semibold">{feeling}</div>
                {concern && <div className="mt-1 text-[15px]">Check symptoms before starting. Stop the drive if they get worse.</div>}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3.5 text-[17px]">
                <motion.span className="block size-4 rounded-full border-2 border-asphalt border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                Waiting for {patient.first} to answer on her phone
              </div>
            )}
          </div>
        </Card>
        <Card title="Scored drives">
          <ol className="divide-y divide-line pb-1">
            {SCENARIOS.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <span className="flex items-center gap-3 text-[16px]">
                  <span className="w-5 font-display font-bold text-graphite">{i + 1}</span>
                  {s.label}
                </span>
                <span className="text-[14px] text-graphite">{s.max} points</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </Pane>
  );
}

export function LiveDrive() {
  const simStart = useDemo((s) => s.simStart);
  const speed = useDemo((s) => s.speed);
  const scenario = useDemo((s) => s.scenario);
  const liveReaction = useDemo((s) => s.live.reactionMs);
  const setLive = useDemo((s) => s.setLive);
  const go = useDemo((s) => s.go);
  const raw = useRaw();
  const t = useDriveClock(simStart, speed, 10);
  const idx = scenarioAt(t);
  const [confirmStop, setConfirmStop] = useState(false);
  useEffect(() => {
    if (!confirmStop) return;
    const id = setTimeout(() => setConfirmStop(false), 3000);
    return () => clearTimeout(id);
  }, [confirmStop]);
  const stopDrive = () => {
    if (!confirmStop) return setConfirmStop(true);
    go("post-drive", { drivesCompleted: idx, collisionSeen: raw.collision && t >= LEFT_TURNS[1] + 0.7 });
  };
  const isLive = scenario === "live";
  const events = driveEvents(raw, isLive ? liveReaction : undefined).filter((e) => e.at <= t);

  useEffect(() => {
    const s = useDemo.getState();
    if (s.phase === "driving" && driveSeconds(s.simStart, s.speed) >= DRIVE) go("post-drive");
  }, [t, go]);

  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);

  return (
    <Pane
      title="Simulator drive"
      sub={
        <span className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <motion.span className="absolute inset-0 rounded-full bg-alert" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          </span>
          Live from Simulator 1
        </span>
      }
      actions={
        <>
          <span className="font-display text-[24px] font-bold tnum">{`${mins}:${String(secs).padStart(2, "0")}`}</span>
          <Button size="md" variant={confirmStop ? "primary" : "secondary"} onClick={stopDrive} className={confirmStop ? "!bg-alert" : ""}>
            {confirmStop ? "Tap again to stop" : "Stop drive"}
          </Button>
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl bg-asphalt" style={{ aspectRatio: "16 / 7.6" }}>
        <SimCanvas simStart={simStart} speed={speed} raw={raw} liveReaction={{ live: isLive, measured: isLive ? liveReaction ?? null : null }} onBrake={(ms) => setLive({ reactionMs: ms })} />
      </div>
      <div className="mt-4 grid grid-cols-[1fr_1fr] gap-5">
        <Card title="Drives">
          <ol className="divide-y divide-line pb-1">
            {SCENARIOS.map((s, i) => {
              const done = i < idx || t >= DRIVE;
              const now = i === idx && t < DRIVE;
              return (
                <li key={s.id} className={`flex items-center justify-between px-5 py-[7px] ${now ? "bg-signal-soft" : ""}`}>
                  <span className={`flex items-center gap-3 text-[16px] ${now ? "font-semibold" : done ? "" : "text-graphite"}`}>
                    <span className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-asphalt text-white" : now ? "bg-signal" : "bg-mist"}`}>{done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card title="Events">
          <div className="no-scrollbar flex max-h-[210px] flex-col-reverse overflow-y-auto pb-1">
            <AnimatePresence initial={false}>
              {[...events].reverse().map((e) => (
                <motion.div key={e.at + e.text} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`flex items-center justify-between gap-3 border-t border-line px-5 py-2.5 ${e.alert ? "bg-alert-tint" : ""}`}>
                  <span className={`text-[15px] ${e.alert ? "font-semibold text-alert" : ""}`}>{e.text}</span>
                  {e.points && <span className="font-display text-[15px] font-bold tnum">{e.points}</span>}
                </motion.div>
              ))}
            </AnimatePresence>
            {events.length === 0 && <div className="px-5 py-3 text-[15px] text-graphite">Results appear here as each drive finishes.</div>}
          </div>
        </Card>
      </div>
    </Pane>
  );
}

export function DriveDone() {
  const go = useDemo((s) => s.go);
  const postFeel = useDemo((s) => s.postFeel);
  const selfRating = useDemo((s) => s.selfRating);
  const result = useScore();
  const sim = result.domains.find((d) => d.id === "simulator")!;
  return (
    <Pane title={sim.items.every((i) => i.done) ? "Drive complete" : "Drive stopped"} sub="Results came across from Simulator 1." actions={<Button size="md" onClick={() => go("uploading")}>Continue to review</Button>}>
      <div className="grid grid-cols-[1.3fr_1fr] gap-5">
        <Card title="Simulator" aside={<span className="font-display text-[15px] font-bold tnum">{sim.points} <span className="font-normal text-graphite">of {sim.max}</span></span>}>
          <div className="divide-y divide-line pb-1">
            {sim.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-[16px] font-semibold">{it.label}</div>
                  <div className="text-[13px] text-graphite">{it.raw}</div>
                </div>
                {it.done ? (
                  <span className="font-display text-[16px] font-bold tnum">
                    {it.points} <span className="font-normal text-graphite">of {it.max}</span>
                  </span>
                ) : (
                  <span className="text-[15px] text-graphite">Not completed</span>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card title={`${patient.first} after the drive`}>
          <div className="px-5 pt-1 pb-5">
            {postFeel ? (
              <>
                <div className="text-[19px] font-semibold">{postFeel}</div>
                <div className="mt-1 text-[16px] text-graphite">{selfRating ? `Rates her drive ${selfRating} of 5` : "Rating her drive now"}</div>
              </>
            ) : (
              <div className="text-[16px] text-graphite">Answering on her phone</div>
            )}
          </div>
        </Card>
      </div>
    </Pane>
  );
}

const uploads = [
  { label: "Intake answers", detail: "4 answers, patient reported" },
  { label: "Tablet tests", detail: "4 results and the clock drawing" },
  { label: "Hands-on checks", detail: "10 results, entered by you" },
  { label: "Simulator", detail: "Drive results and the session file" },
];

export function Upload() {
  const startReview = useDemo((s) => s.startReview);
  const speed = useDemo((s) => s.speed);
  const [n, setN] = useState(0);
  useEffect(() => {
    const timers = uploads.map((_, i) => setTimeout(() => setN(i + 1), (350 + i * 420) / speed));
    const end = setTimeout(() => useDemo.getState().phase === "uploading" && startReview(), (350 + uploads.length * 420 + 500) / speed);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [speed, startReview]);
  return (
    <Pane title={`Saving results to ${patient.first}'s record`} sub={<span className="flex items-center gap-2">Each result keeps its source and time. Your decision is added when you sign. <HealthKeyLogo height={18} /></span>}>
      <Card>
        <div className="divide-y divide-line">
          {uploads.map((u, i) => (
            <div key={u.label} className="flex items-center gap-4 px-6 py-4">
              <span className={`flex size-8 items-center justify-center rounded-full transition-colors duration-300 ${i < n ? "bg-hk text-white" : "bg-mist"}`}>
                {i < n ? (
                  <Check size={18} strokeWidth={3} />
                ) : i === n ? (
                  <motion.span className="block size-4 rounded-full border-2 border-hk border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                ) : null}
              </span>
              <div className="flex-1">
                <div className="text-[18px] font-semibold">{u.label}</div>
                <div className="text-[15px] text-graphite">{u.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Pane>
  );
}
