import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { locations, simulators, specialist, visit } from "../data/demo";
import { longDate, today } from "../lib/dates";
import { useT } from "../i18n/useT";
import { useDemo } from "../state/store";
import { Avatar } from "../ui/Brand";
import { Button, Group, SectionLabel } from "../ui/primitives";
import { SteeringWheel } from "../ui/Road";
import { Lead, Meta, Screen, Title } from "./Screen";

export function Home() {
  const set = useDemo((s) => s.set);
  const t = useT();
  const bring = ["Someone who can drive you home. If Dana says to pause driving, that starts today.", "Your glasses and hearing aids", "Your driver's license"];
  return (
    <Screen
      speech={t("Your driving assessment is today at {time}, at {place}, {unit}, with {name}, a driving specialist. It takes about 2 hours. Bring someone who can drive you home, because if Dana says to pause driving, that starts today. Bring your glasses, hearing aids and driver's license.", {
        time: t(visit.time),
        place: t(visit.place),
        unit: t(visit.unit),
        name: t(specialist.name),
      })}
      footer={<Button onClick={() => set({ patientStep: "where" })}>{t("I'm here")}</Button>}
    >
      <Meta>{t("Driving assessment")}</Meta>
      <Title className="mt-2">{t("Today, {time}", { time: t(visit.time) })}</Title>
      <p className="mt-1 text-[20px] text-graphite">
        {t("{date}. {length}.", { date: longDate(today()), length: t(visit.length) })}
      </p>
      <Group className="mt-6">
        <div className="flex items-start gap-4 px-5 py-4">
          <MapPin className="mt-1 shrink-0 text-asphalt" size={24} />
          <div>
            <div className="text-[20px] font-semibold">{t(visit.place)}</div>
            <div className="text-[18px] text-graphite">{t(visit.unit)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <Avatar initials={specialist.initials} size={44} />
          <div>
            <div className="text-[20px] font-semibold">{t(specialist.name)}</div>
            <div className="text-[18px] text-graphite">{t(specialist.role)}</div>
          </div>
        </div>
      </Group>
      <div className="mt-8">
        <SectionLabel>{t("Bring")}</SectionLabel>
        <Group>
          {bring.map((b) => (
            <div key={b} className="flex items-center gap-4 px-5 py-4">
              <span className="h-6 w-1.5 shrink-0 rounded-full bg-signal" />
              <span className="text-[19px]">{t(b)}</span>
            </div>
          ))}
        </Group>
      </div>
    </Screen>
  );
}

export function Where() {
  const set = useDemo((s) => s.set);
  const t = useT();
  const here = locations.find((l) => l.here)!;
  const sim = simulators.find((s) => s.status === "ready")!;
  return (
    <Screen
      speech={t("You're at {place}. Simulator 1 in Room 204 is ready for you.", { place: t(here.name) })}
      footer={<Button onClick={() => set({ location: here.id, simulator: sim.id, patientStep: "connecting" })}>{t("Check in")}</Button>}
    >
      <Title>{t("Check in")}</Title>
      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-paper px-5 py-4">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-mist">
          <motion.span className="absolute inset-0 rounded-full bg-signal/40" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <MapPin size={22} className="relative" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] text-graphite">{t("You're at")}</span>
          <span className="block text-[20px] font-semibold leading-snug">{t(here.name)}</span>
          <span className="block text-[17px] text-graphite">{t(here.detail)}</span>
        </span>
      </div>
      <h2 className="mt-8 mb-3 font-display text-[24px] font-extrabold">{t("Your simulator")}</h2>
      <div className="flex items-center gap-4 rounded-2xl bg-paper px-5 py-5">
        <SimGlyph active />
        <span className="flex-1">
          <span className="block text-[21px] font-semibold">{t(sim.name)}</span>
          <span className="block text-[17px] text-graphite">
            {t(sim.room)}
            {t(", ")}
            {t("ready for you")}
          </span>
        </span>
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
  const t = useT();
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
    <Screen speech={`${t("Connecting to Simulator 1")}.`}>
      <div className="flex h-full flex-col items-center justify-center pb-16 text-center">
        <SteeringWheel size={132} />
        <h1 className="mt-9 font-display text-[28px] font-extrabold">{t("Connecting to Simulator 1")}</h1>
        <p className="mt-2 text-[19px] text-graphite">{t("Room 204")}</p>
      </div>
    </Screen>
  );
}

const visitSteps = ["Record review", "Simulator drives", "Go over results"];

/** From check-in until her result arrives, nothing here asks anything or changes. */
export function VisitStatus() {
  const t = useT();
  const name = t(specialist.first);
  const meet = t("{name} will meet you in Room 204.", { name });
  const away = t("You can put your phone away. Your results will show here at the end of your visit.");
  return (
    <Screen speech={`${t("You're checked in")}. ${meet} ${away}`}>
      <div className="flex items-center gap-4 pt-1">
        <Avatar initials={specialist.initials} size={52} />
        <div>
          <div className="text-[20px] font-semibold">{t(specialist.name)}</div>
          <div className="text-[17px] text-graphite">{t("Driving specialist, Room 204")}</div>
        </div>
      </div>
      <div className="mt-8">
        <Title>{t("You're checked in")}</Title>
        <Lead>{meet}</Lead>
        <Lead>{away}</Lead>
      </div>
      <div className="mt-8">
        <SectionLabel>{t("Your visit")}</SectionLabel>
        <Group>
          {visitSteps.map((label, i) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-mist font-display text-[15px] font-bold text-graphite">{i + 1}</span>
              <span className="text-[19px]">{t(label)}</span>
            </div>
          ))}
        </Group>
      </div>
    </Screen>
  );
}
