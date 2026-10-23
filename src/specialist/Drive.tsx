import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, lazy, useEffect, useState } from "react";
import { patient } from "../data/demo";
import { DRIVES, driveById } from "../data/drives";
import { useT } from "../i18n/useT";
import { prepareDrives } from "../sim/prepare";
import { SCORE_AT, driveEvents, driveLength, driveSeconds, hardStopAt, segmentAt, useDriveClock } from "../sim/timeline";
import { useDemo, useResults, useScore } from "../state/store";
import { HealthKeyLogo } from "../ui/Brand";
import { Button } from "../ui/primitives";
import { Card, Pane } from "./Shell";

const SimCanvas = lazy(() => import("../sim/SimCanvas").then((m) => ({ default: m.SimCanvas })));

export function DrivePrep() {
  const feeling = useDemo((s) => s.preDriveFeeling);
  const assigned = useDemo((s) => s.assigned);
  const go = useDemo((s) => s.go);
  const t = useT();
  const concern = feeling && feeling !== "I feel fine";
  useEffect(() => prepareDrives(assigned), [assigned]);
  const minutes = DRIVES.filter((d) => assigned.includes(d.id)).reduce((a, d) => a + d.minutes, 0);
  return (
    <Pane
      title={t("Simulator drives")}
      sub={t("{n} drives assigned, about {m} minutes on Simulator 1.", { n: assigned.length, m: minutes })}
      actions={
        <Button
          size="md"
          variant="signal"
          disabled={!feeling || !assigned.length}
          onClick={() => go("driving", { simStart: Date.now(), drivesCompleted: null, hardStopSeen: false, live: { ...useDemo.getState().live, reactionMs: undefined } })}
        >
          {t("Start simulator")}
        </Button>
      }
    >
      <div className="grid grid-cols-[1fr_1fr] items-start gap-5">
        <Card title={t("Before the drive")}>
          <div className="px-5 pt-2 pb-5">
            {feeling ? (
              <div className={`rounded-xl px-4 py-3.5 ${concern ? "bg-alert-tint" : "bg-canvas"}`}>
                <div className="text-[14px] text-graphite">{t("{name} says", { name: t(patient.first) })}</div>
                <div className="text-[19px] font-semibold">{t(feeling)}</div>
                {concern && <div className="mt-1 text-[15px]">{t("Check symptoms before starting. Stop the drive if they get worse.")}</div>}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3.5 text-[17px]">
                <motion.span className="block size-4 rounded-full border-2 border-asphalt border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                {t("Waiting for {name} to answer on her phone", { name: t(patient.first) })}
              </div>
            )}
          </div>
        </Card>
        <Card
          title={t("Assigned drives")}
          aside={
            <button onClick={() => go("record-review")} className="text-[14px] font-semibold text-graphite hover:text-asphalt">
              {t("Change")}
            </button>
          }
        >
          <ol className="divide-y divide-line pb-1">
            {assigned.map((id, i) => (
              <li key={id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 font-display font-bold text-graphite">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{t(driveById[id].name)}</span>
                  <span className="block text-[13px] text-graphite">{t(driveById[id].measures)}</span>
                </span>
                <span className="text-[13px] text-graphite">{t("{m} min", { m: driveById[id].minutes })}</span>
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
  const assigned = useDemo((s) => s.assigned);
  const liveReaction = useDemo((s) => s.live.reactionMs);
  const setLive = useDemo((s) => s.setLive);
  const go = useDemo((s) => s.go);
  const raw = useResults();
  const result = useScore();
  const tt = useT();
  const length = driveLength(assigned.length);
  const t = useDriveClock(simStart, speed, length, 10);
  const seg = segmentAt(t, assigned);
  const isLive = scenario === "live";
  const events = driveEvents(assigned, result.drives, raw).filter((e) => e.at <= t);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!confirmStop) return;
    const id = setTimeout(() => setConfirmStop(false), 3000);
    return () => clearTimeout(id);
  }, [confirmStop]);

  useEffect(() => {
    const s = useDemo.getState();
    if (s.phase === "driving" && driveSeconds(s.simStart, s.speed, driveLength(s.assigned.length)) >= driveLength(s.assigned.length)) go("post-drive");
  }, [t, go]);

  const stopDrive = () => {
    if (!confirmStop) return setConfirmStop(true);
    // Read the clock now, not the last tick, so the stop matches what the simulator view just showed.
    const s = useDemo.getState();
    const now = segmentAt(driveSeconds(s.simStart, s.speed, driveLength(s.assigned.length)), s.assigned);
    // A drive whose score has already appeared counts as done; so does a hard stop already seen.
    const finished = now.local >= SCORE_AT;
    const hs = hardStopAt(now.id, raw);
    go("post-drive", { drivesCompleted: finished ? now.index + 1 : now.index, hardStopSeen: !finished && hs !== null && now.local >= hs });
  };

  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);

  return (
    <Pane
      title={tt("Simulator drives")}
      sub={
        <span className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <motion.span className="absolute inset-0 rounded-full bg-alert" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          </span>
          {tt("Live from Simulator 1")}
        </span>
      }
      actions={
        <>
          <span className="font-display text-[24px] font-bold tnum">{`${mins}:${String(secs).padStart(2, "0")}`}</span>
          <Button size="md" variant={confirmStop ? "primary" : "secondary"} onClick={stopDrive} className={confirmStop ? "!bg-alert" : ""}>
            {confirmStop ? tt("Tap again to stop") : tt("Stop drive")}
          </Button>
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl bg-asphalt" style={{ aspectRatio: "16 / 7.6" }}>
        <Suspense fallback={null}>
          <SimCanvas
            simStart={simStart}
            speed={speed}
            assigned={assigned}
            raw={raw}
            liveReaction={{ live: isLive, measured: isLive ? liveReaction ?? null : null }}
            onBrake={(ms) => setLive({ reactionMs: ms })}
          />
        </Suspense>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_1fr] gap-5">
        <Card title={tt("Drives")}>
          <ol className="divide-y divide-line pb-1">
            {assigned.map((id, i) => {
              const done = i < seg.index || t >= length;
              const now = i === seg.index && t < length;
              return (
                <li key={id} className={`flex items-center justify-between px-5 py-[7px] ${now ? "bg-signal-soft" : ""}`}>
                  <span className={`flex items-center gap-3 text-[16px] ${now ? "font-semibold" : done ? "" : "text-graphite"}`}>
                    <span className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-asphalt text-white" : now ? "bg-signal" : "bg-mist"}`}>{done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                    {tt(driveById[id].name)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card title={tt("Results as they come in")}>
          <div className="no-scrollbar flex max-h-[210px] flex-col-reverse overflow-y-auto pb-1">
            <AnimatePresence initial={false}>
              {[...events].reverse().map((e) => (
                <motion.div key={e.at + e.text} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`flex items-center justify-between gap-3 border-t border-line px-5 py-2.5 ${e.alert ? "bg-alert-tint" : ""}`}>
                  <span className={`text-[15px] ${e.alert ? "font-semibold text-alert" : ""}`}>{e.text}</span>
                  {e.points && <span className="font-display text-[15px] font-bold tnum">{e.points}</span>}
                </motion.div>
              ))}
            </AnimatePresence>
            {events.length === 0 && <div className="px-5 py-3 text-[15px] text-graphite">{tt("Each drive's score appears here when it finishes.")}</div>}
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
  const t = useT();
  return (
    <Pane
      title={result.incomplete ? t("Drive stopped") : t("Drives complete")}
      sub={t("Each score comes with what was measured and why.")}
      actions={<Button size="md" onClick={() => go("uploading")}>{t("Continue to review")}</Button>}
    >
      <div className="grid grid-cols-[1.45fr_1fr] items-start gap-5">
        <Card title={t("Scores")} aside={<span className="font-display text-[15px] font-bold tnum">DriverScore {result.total}</span>}>
          <div className="divide-y divide-line pb-1">
            {result.drives.map((d) => (
              <div key={d.id} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[16px] font-semibold">{d.name}</span>
                  {d.done ? (
                    <span className={`font-display text-[16px] font-bold tnum ${d.hardStop ? "text-alert" : ""}`}>
                      {d.points} <span className="font-normal text-graphite">{t("of 10")}</span>
                    </span>
                  ) : (
                    <span className="text-[15px] text-graphite">{t("Not completed")}</span>
                  )}
                </div>
                {d.done && <div className="mt-0.5 text-[14px] leading-snug">{d.reason}</div>}
              </div>
            ))}
          </div>
        </Card>
        <Card title={t("{name} after the drive", { name: t(patient.first) })}>
          <div className="px-5 pt-1 pb-5">
            {postFeel ? (
              <>
                <div className="text-[19px] font-semibold">{t(postFeel)}</div>
                <div className="mt-1 text-[16px] text-graphite">{selfRating ? t("Rates her drive {n} of 5", { n: selfRating }) : t("Rating her drive now")}</div>
              </>
            ) : (
              <div className="text-[16px] text-graphite">{t("Answering on her phone")}</div>
            )}
          </div>
        </Card>
      </div>
    </Pane>
  );
}

const uploads = [
  { label: "Intake answers", detail: "4 answers, patient reported" },
  { label: "Assigned drives", detail: "Which drives you chose, and why" },
  { label: "Drive results", detail: "Scores, measurements and the rule behind each" },
  { label: "Simulator session", detail: "The full session file" },
];

export function Upload() {
  const startReview = useDemo((s) => s.startReview);
  const speed = useDemo((s) => s.speed);
  const t = useT();
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
    <Pane
      title={t("Saving results to {name}'s record", { name: t(patient.first) })}
      sub={
        <span className="flex items-center gap-2">
          {t("Each result keeps its source and time. Your decision is added when you sign.")} <HealthKeyLogo height={18} />
        </span>
      }
    >
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
                <div className="text-[18px] font-semibold">{t(u.label)}</div>
                <div className="text-[15px] text-graphite">{t(u.detail)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Pane>
  );
}
