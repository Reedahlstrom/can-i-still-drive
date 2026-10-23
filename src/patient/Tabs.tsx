import { FileText, House, Users } from "lucide-react";
import { family, record, specialist } from "../data/demo";
import { outcomeCopy } from "../data/scenarios";
import { shortDate, today } from "../lib/dates";
import { atLeast, useDemo, useScore, type Tab } from "../state/store";
import { Avatar, HealthKeyLogo } from "../ui/Brand";
import { Group, SectionLabel, Toggle } from "../ui/primitives";
import { Screen, Title } from "./Screen";

export function TabBar() {
  const tab = useDemo((s) => s.tab);
  const set = useDemo((s) => s.set);
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <House size={26} /> },
    { id: "record", label: "Health record", icon: <FileText size={26} /> },
    { id: "family", label: "Family", icon: <Users size={26} /> },
  ];
  return (
    <nav className="grid grid-cols-3 border-t border-line bg-paper pb-[var(--safe-bottom,0px)]" aria-label="Main">
      {items.map((it) => {
        const on = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => set({ tab: it.id })}
            aria-current={on ? "page" : undefined}
            className={`flex h-[68px] flex-col items-center justify-center gap-1 text-[15px] font-semibold transition-colors ${on ? "text-asphalt" : "text-fog hover:text-graphite"}`}
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

function Row({ name, detail, meta }: { name: string; detail?: string; meta: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[19px] font-semibold leading-snug">{name}</div>
      {detail && <div className="mt-0.5 text-[17px] leading-snug">{detail}</div>}
      <div className="mt-1 text-[15px] text-graphite">{meta}</div>
    </div>
  );
}

export function RecordTab() {
  const phase = useDemo((s) => s.phase);
  const d = useDemo((s) => s.determination);
  const result = useScore();
  const released = phase === "released" && d;
  const inVisit = atLeast(phase, "checked-in") && !released;
  const sections: { title: string; items: typeof record.conditions }[] = [
    { title: "Medicines", items: record.medicines },
    { title: "Conditions", items: record.conditions },
    { title: "Eye exams", items: record.eyes },
    { title: "Visits", items: record.visits },
    { title: "Lab results", items: record.labs },
  ];
  return (
    <Screen speech="Your health record, from HealthKey.">
      <div className="flex items-center justify-between pt-1">
        <Title>Health record</Title>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[16px] text-graphite">
        <span>From</span>
        <HealthKeyLogo height={20} />
      </div>

      <section className="mt-8">
        <SectionLabel>Driving assessments</SectionLabel>
        <Group>
          {released ? (
            <Row
              name={`DriverScore ${result.total}, ${outcomeCopy[d.outcome].label.toLowerCase()}`}
              detail={`Signed by ${specialist.name}, ${specialist.credentials}`}
              meta={`Lakeview Medical Center, ${shortDate(today())}`}
            />
          ) : inVisit ? (
            <Row name="Assessment in progress" detail="Results arrive after your specialist signs." meta={`Lakeview Medical Center, ${shortDate(today())}`} />
          ) : (
            <Row name="None yet" meta="Your first assessment will appear here." />
          )}
        </Group>
      </section>

      {sections.map((s) => (
        <section key={s.title} className="mt-8">
          <SectionLabel>{s.title}</SectionLabel>
          <Group>
            {s.items.map((it) => (
              <Row key={it.name + it.date} name={it.name} detail={it.detail} meta={`${it.source}, ${it.date}`} />
            ))}
          </Group>
        </section>
      ))}
    </Screen>
  );
}

export function FamilyTab() {
  const familyShare = useDemo((s) => s.familyShare);
  const set = useDemo((s) => s.set);
  const perms = [
    { id: "results", label: "Results and plan" },
    { id: "rides", label: "Ride requests" },
    { id: "record", label: "Health record" },
  ];
  return (
    <Screen speech={`Family. ${family.name}, your ${family.relation.toLowerCase()}, can see what you allow.`}>
      <Title className="pt-1">Family</Title>
      <div className="mt-7 flex items-center gap-4">
        <Avatar initials={family.initials} size={56} tone="signal" />
        <div>
          <div className="text-[21px] font-semibold">{family.name}</div>
          <div className="text-[17px] text-graphite">{family.relation}</div>
        </div>
      </div>
      <section className="mt-7">
        <SectionLabel>{family.first} can see</SectionLabel>
        <Group>
          {perms.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-[19px]">{p.label}</span>
              <Toggle label={p.label} on={!!familyShare[p.id]} onChange={(v) => set({ familyShare: { ...familyShare, [p.id]: v } })} />
            </div>
          ))}
        </Group>
      </section>
    </Screen>
  );
}
