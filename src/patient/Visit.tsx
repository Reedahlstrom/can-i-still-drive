import { ChevronRight, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { locations, simulators, specialist, visit } from "../data/demo";
import { longDate, today } from "../lib/dates";
import { SCENARIOS, scenarioAt, useDriveClock } from "../sim/timeline";
import { atLeast, useDemo, type Phase } from "../state/store";
import { Avatar } from "../ui/Brand";
import { Button, CheckDot, ChoiceList, Group, SectionLabel } from "../ui/primitives";
import { RoadLoader, SteeringWheel } from "../ui/Road";
import { Lead, Meta, Screen, Title } from "./Screen";

export function Home() {
  const set = useDemo((s) => s.set);
  const hkConnected = useDemo((s) => s.hkConnected);
  const answers = useDemo((s) => s.answers);
  const checklist = [
    { label: "Health record connected", done: hkConnected },
    { label: "Driving questions answered", done: Object.keys(answers).length > 0 },
    { label: "Bring your glasses and hearing aids", done: false },
    { label: "Bring your driver's license", done: false },
  ];
  return (
    <Screen
      speech={`Your driving assessment is today at ${visit.time}, at ${visit.place}, ${visit.unit}, with ${specialist.name}.`}
      footer={<Button onClick={() => set({ patientStep: "where" })}>Check in</Button>}
    >
      <Meta>Driving assessment</Meta>
      <Title className="mt-2">Today, {visit.time}</Title>
      <p className="mt-1 text-[20px] text-graphite">{longDate(today())}</p>
      <Group className="mt-6">
        <div className="flex items-start gap-4 px-5 py-4">
          <MapPin className="mt-1 shrink-0 text-asphalt" size={24} />
          <div>
            <div className="text-[20px] font-semibold">{visit.place}</div>
            <div className="text-[18px] text-graphite">{visit.unit}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <Avatar initials={specialist.initials} size={44} />
          <div>
            <div className="text-[20px] font-semibold">{specialist.name}</div>
            <div className="text-[18px] text-graphite">{specialist.role}</div>
          </div>
        </div>
      </Group>
      <div className="mt-8">
        <SectionLabel>Before you go</SectionLabel>
        <Group>
          {checklist.map((c) => (
            <div key={c.label} className="flex items-center gap-4 px-5 py-4">
              <CheckDot done={c.done} />
              <span className={`text-[19px] ${c.done ? "text-graphite" : ""}`}>{c.label}</span>
            </div>
          ))}
        </Group>
      </div>
    </Screen>
  );
}

export function Where() {
  const set = useDemo((s) => s.set);
  return (
    <Screen speech="Where are you? Choose your location.">
      <Title>Where are you?</Title>
      <Group className="mt-7">
        {locations.map((l) => (
          <button
            key={l.id}
            disabled={!l.here}
            onClick={() => set({ location: l.id, patientStep: "which-sim" })}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas disabled:opacity-45"
          >
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-mist">
              {l.here && <motion.span className="absolute inset-0 rounded-full bg-signal/40" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}
              <MapPin size={22} className="relative" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[20px] font-semibold leading-snug">{l.name}</span>
              <span className="block text-[17px] text-graphite">{l.here ? "You're here" : l.distance}</span>
            </span>
            {l.here && <ChevronRight className="shrink-0 text-fog" />}
          </button>
        ))}
      </Group>
    </Screen>
  );
}

export function WhichSim() {
  const set = useDemo((s) => s.set);
  return (
    <Screen speech="Choose your simulator. Simulator 1 in Room 204 is ready.">
      <Title>Choose your simulator</Title>
      <Lead>
        {visit.place}, {visit.unit}
      </Lead>
      <div className="mt-7 flex flex-col gap-3">
        {simulators.map((s) => {
          const ready = s.status === "ready";
          return (
            <button
              key={s.id}
              disabled={!ready}
              onClick={() => set({ simulator: s.id, patientStep: "connecting" })}
              className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-5 text-left transition-colors ${ready ? "border-asphalt bg-paper" : "border-transparent bg-mist/70"}`}
            >
              <SimGlyph active={ready} />
              <span className="flex-1">
                <span className="block text-[21px] font-semibold">{s.name}</span>
                <span className="block text-[17px] text-graphite">
                  {s.room}, {ready ? "ready" : s.note?.toLowerCase()}
                </span>
              </span>
              {ready && <ChevronRight className="text-asphalt" />}
            </button>
          );
        })}
      </div>
    </Screen>
  );
}

function SimGlyph({ active }: { active: boolean }) {
  return (
    <span className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${active ? "bg-asphalt" : "bg-line"}`}>
      <svg width="34" height="34" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="46" fill="none" stroke={active ? "#fff" : "#8B949D"} strokeWidth="12" />
        <path d="M16 62c14-4 27-6 44-6s30 2 44 6M60 70v34" stroke={active ? "#fff" : "#8B949D"} strokeWidth="11" strokeLinecap="round" fill="none" />
        <circle cx="60" cy="62" r="9" fill={active ? "#F4B400" : "#8B949D"} />
      </svg>
    </span>
  );
}

export function Connecting() {
  const set = useDemo((s) => s.set);
  const go = useDemo((s) => s.go);
  const speed = useDemo((s) => s.speed);
  useEffect(() => {
    const id = setTimeout(() => {
      go("checked-in");
      set({ patientStep: "home" });
    }, 2600 / speed);
    return () => clearTimeout(id);
  }, [go, set, speed]);
  return (
    <Screen speech="Connecting to Simulator 1.">
      <div className="flex h-full flex-col items-center justify-center pb-16 text-center">
        <SteeringWheel size={132} />
        <h1 className="mt-9 font-display text-[28px] font-extrabold">Connecting to Simulator 1</h1>
        <p className="mt-2 text-[19px] text-graphite">Room 204</p>
      </div>
    </Screen>
  );
}

const visitSteps: { label: string; from: Phase; done: Phase }[] = [
  { label: "Record review", from: "checked-in", done: "tablet-tests" },
  { label: "Tablet tests", from: "tablet-tests", done: "hands-on" },
  { label: "Hands-on checks", from: "hands-on", done: "pre-drive" },
  { label: "Simulator drive", from: "pre-drive", done: "post-drive" },
  { label: "Go over results", from: "post-drive", done: "released" },
];

function statusFor(phase: Phase) {
  switch (phase) {
    case "checked-in":
      return { title: "You're checked in", lead: `${specialist.first} will meet you in Room 204.` };
    case "record-review":
      return { title: `${specialist.first} is reviewing your record`, lead: "Your health record and answers are open on the iPad." };
    case "tablet-tests":
      return { title: "Tablet tests", lead: `${specialist.first} will hand you the iPad. Take your time.` };
    case "hands-on":
      return { title: "Hands-on checks", lead: `${specialist.first} will check your vision, memory and movement.` };
    case "pre-drive":
      return { title: "Simulator drive next", lead: `${specialist.first} will help you adjust the seat and mirrors.` };
    default:
      return { title: `${specialist.first} is reviewing your results`, lead: "You'll go over them together in a few minutes." };
  }
}

export function VisitStatus() {
  const phase = useDemo((s) => s.phase);
  const { title, lead } = statusFor(phase);
  const reviewing = atLeast(phase, "post-drive");
  return (
    <Screen speech={`${title}. ${lead}`}>
      <div className="flex items-center gap-4 pt-1">
        <Avatar initials={specialist.initials} size={52} />
        <div>
          <div className="text-[20px] font-semibold">{specialist.name}</div>
          <div className="text-[17px] text-graphite">
            {specialist.credentials}, Room 204
          </div>
        </div>
      </div>
      <motion.div key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-8">
        <Title>{title}</Title>
        <Lead>{lead}</Lead>
      </motion.div>
      {reviewing && (
        <div className="mt-6 flex justify-center">
          <SteeringWheel size={92} />
        </div>
      )}
      <div className="mt-8">
        <SectionLabel>Your visit</SectionLabel>
        <Group>
          {visitSteps.map((s, i) => {
            const done = atLeast(phase, s.done);
            const now = !done && atLeast(phase, s.from);
            return (
              <div key={s.label} className="flex items-center gap-4 px-5 py-4">
                {done ? (
                  <CheckDot done />
                ) : (
                  <span className={`flex size-7 items-center justify-center rounded-full font-display text-[15px] font-bold ${now ? "bg-signal text-asphalt" : "bg-mist text-graphite"}`}>{i + 1}</span>
                )}
                <span className={`text-[19px] ${now ? "font-semibold" : done ? "text-graphite" : ""}`}>{s.label}</span>
              </div>
            );
          })}
        </Group>
      </div>
    </Screen>
  );
}

export function PreDrive() {
  const set = useDemo((s) => s.set);
  const [v, setV] = useState<string | undefined>();
  const options = ["I feel fine", "A little dizzy or queasy", "Tired"];
  return (
    <Screen speech={`Before you drive. How do you feel right now? ${options.join(". ")}.`} footer={<Button disabled={!v} onClick={() => set({ preDriveFeeling: v })}>Continue</Button>}>
      <Meta className="mb-3">Before you drive</Meta>
      <Title>How do you feel right now?</Title>
      <div className="mt-7">
        <ChoiceList options={options} value={v} onChange={(x) => setV(x as string)} />
      </div>
    </Screen>
  );
}

export function Driving() {
  const simStart = useDemo((s) => s.simStart);
  const speed = useDemo((s) => s.speed);
  const t = useDriveClock(simStart, speed, 4);
  const i = scenarioAt(t);
  return (
    <Screen tone="dark" speech={`You're driving. ${SCENARIOS[i].label}.`}>
      <div className="flex h-full flex-col justify-center pb-10">
        <div className="flex justify-center">
          <RoadLoader width={280} light />
        </div>
        <h1 className="mt-10 font-display text-[36px] leading-tight font-extrabold">You're driving</h1>
        <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-[21px] text-white/80">
          {SCENARIOS[i].label}, {i + 1} of {SCENARIOS.length}
        </motion.p>
        <p className="mt-6 text-[18px] leading-relaxed text-white/60">{specialist.first} is watching from the iPad. You can ask to stop at any time.</p>
      </div>
    </Screen>
  );
}

export function PostDrive() {
  const set = useDemo((s) => s.set);
  const postFeel = useDemo((s) => s.postFeel);
  const [feel, setFeel] = useState<string | undefined>();
  const [rating, setRating] = useState<number | null>(null);
  const feelOptions = ["Comfortable", "A little hard", "Very hard", "I felt sick"];

  if (!postFeel) {
    return (
      <Screen speech={`How did that drive feel? ${feelOptions.join(". ")}.`} footer={<Button disabled={!feel} onClick={() => set({ postFeel: feel })}>Continue</Button>}>
        <Meta className="mb-3">After the drive</Meta>
        <Title>How did that drive feel?</Title>
        <div className="mt-7">
          <ChoiceList options={feelOptions} value={feel} onChange={(x) => setFeel(x as string)} />
        </div>
      </Screen>
    );
  }
  return (
    <Screen speech="How do you think you did? Choose 1 for not well, up to 5 for very well." footer={<Button disabled={rating === null} onClick={() => set({ selfRating: rating })}>Done</Button>}>
      <Meta className="mb-3">After the drive</Meta>
      <Title>How do you think you did?</Title>
      <div className="mt-9 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            className={`flex aspect-square items-center justify-center rounded-2xl border-2 font-display text-[28px] font-bold transition-colors ${rating === n ? "border-asphalt bg-asphalt text-white" : "border-transparent bg-paper"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[17px] text-graphite">
        <span>Not well</span>
        <span>Very well</span>
      </div>
    </Screen>
  );
}
