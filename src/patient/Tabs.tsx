import { FileText, House, Users } from "lucide-react";
import { family, record, specialist } from "../data/demo";
import { shortDate, today } from "../lib/dates";
import type { Outcome } from "../lib/score";
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
            className={`flex h-[68px] flex-col items-center justify-center gap-1 text-[16px] font-semibold transition-colors ${on ? "text-asphalt" : "text-graphite hover:text-asphalt"}`}
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
      <div className="mt-1 text-[16px] text-graphite">{meta}</div>
    </div>
  );
}

const recordTitle: Record<Outcome, string> = {
  clear: "Clear to drive",
  conditions: "Drive with limits",
  pause: "Pause driving",
  stop: "Stop driving",
};

export function RecordTab() {
  const phase = useDemo((s) => s.phase);
  const d = useDemo((s) => s.determination);
  const hkShare = useDemo((s) => s.hkShare);
  const hkSharing = useDemo((s) => s.hkSharing);
  const set = useDemo((s) => s.set);
  const result = useScore();
  const released = phase === "released" && d?.outcome;
  const inVisit = atLeast(phase, "checked-in") && !released;
  const sections: { id: string; title: string; items: typeof record.conditions }[] = [
    { id: "medicines", title: "Medicines", items: record.medicines },
    { id: "conditions", title: "Conditions", items: record.conditions },
    { id: "eyes", title: "Eye exams", items: record.eyes },
    { id: "visits", title: "Visit notes", items: record.visits },
    { id: "labs", title: "Lab results", items: record.labs },
  ];
  return (
    <Screen speech="Your health record, from HealthKey.">
      <Title className="pt-1">Health record</Title>
      <div className="mt-2 flex items-center gap-2 text-[17px] text-graphite">
        <span>From</span>
        <HealthKeyLogo height={20} />
      </div>

      <section className="mt-8">
        <SectionLabel>Driving assessments</SectionLabel>
        <Group>
          {released && d?.outcome ? (
            <Row name={recordTitle[d.outcome]} detail={`Decided by ${specialist.name}, driving specialist`} meta={`Lakeview Medical Center, ${shortDate(today())}. DriverScore ${result.total}, one part of ${specialist.first}'s decision.`} />
          ) : inVisit ? (
            <Row name="Assessment in progress" detail="Your result appears after your specialist signs." meta={`Lakeview Medical Center, ${shortDate(today())}`} />
          ) : (
            <Row name="None yet" meta="Your first assessment will appear here." />
          )}
        </Group>
      </section>

      {sections.map((s) => (
        <section key={s.title} className="mt-8">
          <SectionLabel>
            {s.title}
            {!hkShare[s.id] && <span className="font-normal">, not shared</span>}
          </SectionLabel>
          <Group>
            {s.items.map((it) => (
              <Row key={it.name + it.date} name={it.name} detail={it.detail} meta={`${it.source}, ${it.date}`} />
            ))}
          </Group>
        </section>
      ))}

      <section className="mt-8">
        <SectionLabel>Sharing</SectionLabel>
        <Group>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-[19px] font-semibold">Share with {specialist.first} and Dr. Patel</div>
              <div className="text-[17px] leading-snug text-graphite">
                {hkSharing ? "Only they see what you chose. Turn this off any time. Your signed result stays in your record." : `Off. ${specialist.first} and Dr. Patel can't see your record.`}
              </div>
            </div>
            <Toggle tone="hk" label={`Share with ${specialist.first} and Dr. Patel`} on={hkSharing} onChange={(v) => set({ hkSharing: v })} />
          </div>
        </Group>
      </section>
    </Screen>
  );
}

export function FamilyTab() {
  const familyShare = useDemo((s) => s.familyShare);
  const set = useDemo((s) => s.set);
  const perms = [{ id: "results", label: `Keep ${family.first} updated on my result and plan`, detail: "She gets a text when Dana signs and when your plan changes." }];
  return (
    <Screen speech={`Family. You choose what ${family.name} can see.`}>
      <Title className="pt-1">Family</Title>
      <div className="mt-7 flex items-center gap-4">
        <Avatar initials={family.initials} size={56} tone="signal" />
        <div>
          <div className="text-[21px] font-semibold">{family.name}</div>
          <div className="text-[17px] leading-snug text-graphite">
            {family.relation}, {family.phone}
          </div>
        </div>
      </div>
      <section className="mt-7">
        <SectionLabel>You choose what {family.first} can see</SectionLabel>
        <Group>
          {perms.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <span>
                <span className="block text-[19px] leading-snug">{p.label}</span>
                <span className="block text-[16px] leading-snug text-graphite">{p.detail}</span>
              </span>
              <Toggle label={p.label} on={!!familyShare[p.id]} onChange={(v) => set({ familyShare: { ...familyShare, [p.id]: v } })} />
            </div>
          ))}
        </Group>
      </section>
    </Screen>
  );
}
