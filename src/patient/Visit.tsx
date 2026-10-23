import { ChevronRight, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { locations, simulators, specialist, visit } from "../data/demo";
import { longDate, today } from "../lib/dates";
import { driveById } from "../data/drives";
import { driveLength, driveSeconds, useDriveClock } from "../sim/timeline";
import { atLeast, recommendedFor, useDemo, type Phase } from "../state/store";
import { Avatar } from "../ui/Brand";
import { Button, CheckDot, ChoiceList, Group, SectionLabel } from "../ui/primitives";
import { RoadLoader, SteeringWheel } from "../ui/Road";
import { Lead, Meta, Screen, Title } from "./Screen";

export function Home() {
  const set = useDemo((s) => s.set);
  const bring = ["Someone who can drive you home. If Dana says to pause driving, that starts today.", "Your glasses and hearing aids", "Your driver's license"];
  return (
    <Screen
      speech={`Your driving assessment is today at ${visit.time}, at ${visit.place}, ${visit.unit}, with ${specialist.name}, a driving specialist. It takes about 2 hours. Bring someone who can drive you home, because if Dana says to pause driving, that starts today. Bring your glasses, hearing aids and driver's license.`}
      footer={<Button onClick={() => set({ patientStep: "where" })}>I'm here</Button>}
    >
      <Meta>Driving assessment</Meta>
      <Title className="mt-2">Today, {visit.time}</Title>
      <p className="mt-1 text-[20px] text-graphite">
        {longDate(today())}. {visit.length}.
      </p>
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
        <SectionLabel>Bring</SectionLabel>
        <Group>
          {bring.map((b) => (
            <div key={b} className="flex items-center gap-4 px-5 py-4">
              <span className="h-6 w-1.5 shrink-0 rounded-full bg-signal" />
              <span className="text-[19px]">{b}</span>
            </div>
          ))}
        </Group>
      </div>
    </Screen>
  );
}

export function Where() {
  const set = useDemo((s) => s.set);
  const here = locations.find((l) => l.here)!;
  return (
    <Screen speech={`You're at ${here.name}. Choose your simulator. Simulator 1 in Room 204 is ready.`}>
      <Title>Check in</Title>
      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-paper px-5 py-4">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-mist">
          <motion.span className="absolute inset-0 rounded-full bg-signal/40" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <MapPin size={22} className="relative" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] text-graphite">You're at</span>
          <span className="block text-[20px] font-semibold leading-snug">{here.name}</span>
          <span className="block text-[17px] text-graphite">{here.detail}</span>
        </span>
      </div>
      <h2 className="mt-8 mb-3 font-display text-[24px] font-extrabold">Your simulator</h2>
      <div className="flex flex-col gap-3">
        {simulators.map((s) => {
          const ready = s.status === "ready";
          return (
            <button
              key={s.id}
              disabled={!ready}
              onClick={() => set({ location: here.id, simulator: s.id, patientStep: "connecting" })}
              className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-5 text-left transition-colors ${ready ? "border-asphalt bg-paper" : "border-transparent bg-mist/70"}`}
            >
              <SimGlyph active={ready} />
              <span className="flex-1">
                <span className="block text-[21px] font-semibold">{s.name}</span>
                <span className="block text-[17px] text-graphite">
                  {s.room}, {ready ? "ready for you" : s.note?.toLowerCase()}
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
      const now = useDemo.getState();
      if (now.phase !== "ready" || now.patientStep !== "connecting") return;
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
  { label: "Record review", from: "checked-in", done: "pre-drive" },
  { label: "Simulator drives", from: "pre-drive", done: "post-drive" },
  { label: "Go over results", from: "post-drive", done: "released" },
];

function statusFor(phase: Phase, unwell: boolean) {
  switch (phase) {
    case "checked-in":
      return { title: "You're checked in", lead: `${specialist.first} will meet you in Room 204.` };
    case "record-review":
      return { title: `${specialist.first} is reviewing your record`, lead: "She'll choose the simulator drives for you from your record and answers." };
    case "pre-drive":
      return { title: "Simulator drive next", lead: unwell ? `${specialist.first} will check on you before you start.` : `${specialist.first} will help you adjust the seat and mirrors.` };
    default:
      return { title: `${specialist.first} is reviewing your results`, lead: "You'll go over them together in a few minutes." };
  }
}

export function VisitStatus() {
  const phase = useDemo((s) => s.phase);
  const unwell = useDemo((s) => !!s.preDriveFeeling && s.preDriveFeeling !== "I feel fine");
  const { title, lead } = statusFor(phase, unwell);
  const reviewing = atLeast(phase, "post-drive");
  return (
    <Screen speech={`${title}. ${lead}`}>
      <div className="flex items-center gap-4 pt-1">
        <Avatar initials={specialist.initials} size={52} />
        <div>
          <div className="text-[20px] font-semibold">{specialist.name}</div>
          <div className="text-[17px] text-graphite">Driving specialist, Room 204</div>
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
  const assigned = useDemo((s) => s.assigned);
  const answers = useDemo((s) => s.answers);
  const [seen, setSeen] = useState(false);
  const [v, setV] = useState<string | undefined>();
  const options = ["I feel fine", "A little dizzy or queasy", "Tired"];
  const why = Object.fromEntries(recommendedFor(answers).map((r) => [r.id, r.patientReason]));

  if (!seen)
    return (
      <Screen
        speech={`${specialist.first} chose ${assigned.length} drives for you. ${assigned.map((id) => `${driveById[id].name}. ${why[id] ?? driveById[id].measures}.`).join(" ")}`}
        footer={<Button onClick={() => setSeen(true)}>Continue</Button>}
      >
        <Meta className="mb-3">Your drives today</Meta>
        <Title>
          {specialist.first} chose {assigned.length} drives for you
        </Title>
        <Lead>About {assigned.reduce((a, id) => a + driveById[id].minutes, 0)} minutes on the simulator.</Lead>
        <Group className="mt-6">
          {assigned.map((id, i) => (
            <div key={id} className="flex gap-4 px-5 py-4">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-mist font-display text-[15px] font-bold">{i + 1}</span>
              <div>
                <div className="text-[19px] font-semibold leading-snug">{driveById[id].name}</div>
                <div className="mt-0.5 text-[17px] leading-snug text-graphite">{why[id] ?? driveById[id].measures}</div>
              </div>
            </div>
          ))}
        </Group>
      </Screen>
    );

  return (
    <Screen speech={`Before you drive. How do you feel right now? Your answer doesn't count toward your result. If you're not feeling well, ${specialist.first} will wait. ${options.join(". ")}.`} footer={<Button disabled={!v} onClick={() => set({ preDriveFeeling: v })}>Continue</Button>}>
      <Meta className="mb-3">Before you drive</Meta>
      <Title>How do you feel right now?</Title>
      <Lead>Your answer doesn't count toward your result. If you're not feeling well, {specialist.first} will wait.</Lead>
      <div className="mt-7">
        <ChoiceList options={options} value={v} onChange={(x) => setV(x as string)} />
      </div>
    </Screen>
  );
}

export function Driving() {
  const simStart = useDemo((s) => s.simStart);
  const speed = useDemo((s) => s.speed);
  const assigned = useDemo((s) => s.assigned);
  const go = useDemo((s) => s.go);
  const t = useDriveClock(simStart, speed, driveLength(assigned.length), 2);
  useEffect(() => {
    const s = useDemo.getState();
    const length = driveLength(s.assigned.length);
    if (s.phase === "driving" && driveSeconds(s.simStart, s.speed, length) >= length) go("post-drive");
  }, [t, go]);
  return (
    <Screen tone="dark" speech={`You're driving. ${specialist.first} is right beside you. Say stop any time.`}>
      <div className="flex h-full flex-col justify-center pb-10">
        <div className="flex justify-center">
          <RoadLoader width={280} light />
        </div>
        <h1 className="mt-10 font-display text-[36px] leading-tight font-extrabold">You're driving</h1>
        <p className="mt-4 text-[20px] leading-relaxed text-white/75">{specialist.first} is right beside you. Say "stop" any time.</p>
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
    <Screen speech={`How do you think you did? ${specialist.first} sees your answer. It isn't part of your DriverScore. Choose 1 for not well, up to 5 for very well.`} footer={<Button disabled={rating === null} onClick={() => set({ selfRating: rating })}>Done</Button>}>
      <Meta className="mb-3">After the drive</Meta>
      <Title>How do you think you did?</Title>
      <Lead>{specialist.first} sees your answer. It isn't part of your DriverScore.</Lead>
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
