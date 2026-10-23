import { FileText, House, Users } from "lucide-react";
import { family, record, specialist } from "../data/demo";
import { shortDate, today } from "../lib/dates";
import type { Outcome } from "../lib/score";
import { useT } from "../i18n/useT";
import { atLeast, useDemo, useScore, type Tab } from "../state/store";
import { Avatar, HealthKeyLogo, initialsOf } from "../ui/Brand";
import { Group, SectionLabel, Toggle } from "../ui/primitives";
import { Screen, Title } from "./Screen";

export function TabBar() {
  const tab = useDemo((s) => s.tab);
  const set = useDemo((s) => s.set);
  const t = useT();
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "tab::Home", icon: <House size={26} /> },
    { id: "record", label: "Health record", icon: <FileText size={26} /> },
    { id: "family", label: "Family", icon: <Users size={26} /> },
  ];
  return (
    <nav className="grid grid-cols-3 border-t border-line bg-paper pb-[var(--safe-bottom,0px)]" aria-label={t("Main")}>
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
            {t(it.label)}
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
  const t = useT();
  const dana = t(specialist.first);
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
    <Screen speech={t("Your health record, from HealthKey.")}>
      <Title className="pt-1">{t("Health record")}</Title>
      <div className="mt-2 flex items-center gap-2 text-[17px] text-graphite">
        <span>{t("From")}</span>
        <HealthKeyLogo height={20} />
      </div>

      <section className="mt-8">
        <SectionLabel>{t("Driving assessments")}</SectionLabel>
        <Group>
          {released && d?.outcome ? (
            <Row
              name={t(recordTitle[d.outcome])}
              detail={t("Decided by {name}, driving specialist", { name: t(specialist.name) })}
              meta={t("{place}, {date}. DriverScore {score}, one part of {name}'s decision.", { place: t("Lakeview Medical Center"), date: shortDate(today()), score: result.total, name: dana })}
            />
          ) : inVisit ? (
            <Row name={t("Assessment in progress")} detail={t("Your result appears after your specialist signs.")} meta={`${t("Lakeview Medical Center")}${t(", ")}${shortDate(today())}`} />
          ) : (
            <Row name={t("None yet")} meta={t("Your first assessment will appear here.")} />
          )}
        </Group>
      </section>

      {sections.map((s) => (
        <section key={s.title} className="mt-8">
          <SectionLabel>
            {t(s.title)}
            {!hkShare[s.id] && <span className="font-normal">{t(", not shared")}</span>}
          </SectionLabel>
          <Group>
            {s.items.map((it) => (
              <Row key={it.name + it.date} name={t(it.name)} detail={t(it.detail)} meta={`${t(it.source)}${t(", ")}${t(it.date)}`} />
            ))}
          </Group>
        </section>
      ))}

      <section className="mt-8">
        <SectionLabel>{t("Sharing")}</SectionLabel>
        <Group>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-[19px] font-semibold">{t("Share with {name} and Dr. Patel", { name: dana })}</div>
              <div className="text-[17px] leading-snug text-graphite">
                {hkSharing ? t("Only they see what you chose. Turn this off any time. Your signed result stays in your record.") : t("Off. {name} and Dr. Patel can't see your record.", { name: dana })}
              </div>
            </div>
            <Toggle tone="hk" label={t("Share with {name} and Dr. Patel", { name: dana })} on={hkSharing} onChange={(v) => set({ hkSharing: v })} />
          </div>
        </Group>
      </section>
    </Screen>
  );
}

export function FamilyTab() {
  const familyShare = useDemo((s) => s.familyShare);
  const set = useDemo((s) => s.set);
  const t = useT();
  const sarah = t(family.first);
  const perms = [{ id: "results", label: t("Keep {name} updated on my result and plan", { name: sarah }), detail: t("She gets a text when Dana signs and when your plan changes.") }];
  return (
    <Screen speech={t("Family. You choose what {name} can see.", { name: t(family.name) })}>
      <Title className="pt-1">{t("Family")}</Title>
      <div className="mt-7 flex items-center gap-4">
        <Avatar initials={initialsOf(family.name)} size={56} tone="signal" />
        <div>
          <div className="text-[21px] font-semibold">{t(family.name)}</div>
          <div className="text-[17px] leading-snug text-graphite">
            {t(family.relation)}
            {t(", ")}
            {family.phone}
          </div>
        </div>
      </div>
      <section className="mt-7">
        <SectionLabel>{t("You choose what {name} can see", { name: sarah })}</SectionLabel>
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
