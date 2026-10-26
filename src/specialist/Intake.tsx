import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { DRIVES, recommendDrives, sortDrives, type DriveId } from "../data/drives";
import { patient, questions, record, referringDoctor, schedule, sources, visit } from "../data/demo";
import { tr } from "../i18n";
import { useT } from "../i18n/useT";
import { longDate, today } from "../lib/dates";
import { prepareDrives } from "../sim/prepare";
import { useDemo } from "../state/store";
import { Avatar, HealthKeyLogo, initialsOf } from "../ui/Brand";
import { Button } from "../ui/primitives";
import { Card, Pane } from "./Shell";

export function Schedule() {
  const phase = useDemo((s) => s.phase);
  const go = useDemo((s) => s.go);
  const t = useT();
  const arrived = phase === "checked-in";
  const statusFor = (status: string) => {
    if (status !== "current") return t(status);
    if (arrived) return t("Checked in");
    if (phase === "ready") return t("Pre-visit done");
    return t("Invited");
  };
  return (
    <Pane title={t("Today")} sub={longDate(today())}>
      {arrived && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-5 rounded-2xl bg-asphalt px-6 py-5 text-white"
        >
          <span className="relative flex size-3">
            <motion.span className="absolute inset-0 rounded-full bg-signal" animate={{ scale: [1, 2.4], opacity: [0.8, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <span className="relative size-3 rounded-full bg-signal" />
          </span>
          <div className="flex-1">
            <div className="text-[20px] font-semibold">{t("{name} checked in", { name: t(`${patient.first} ${patient.last}`) })}</div>
            <div className="text-[16px] text-white/65">{t("Simulator 1, Room 204. Health record and answers are ready.")}</div>
          </div>
          <Button variant="signal" size="md" onClick={() => go("record-review")}>
            {t("Open")}
          </Button>
        </motion.div>
      )}
      <Card>
        <div className="divide-y divide-line">
          {schedule.map((r) => {
            const current = r.status === "current";
            return (
              <div key={r.name} className={`flex items-center gap-5 px-6 py-4 ${current ? "" : "opacity-60"}`}>
                <span className="w-24 font-display text-[17px] font-bold tnum">{t(r.time)}</span>
                <Avatar initials={initialsOf(r.name)} size={40} tone={current ? "asphalt" : "mist"} />
                <div className="flex-1">
                  <div className="text-[18px] font-semibold">{t(r.name)}</div>
                  <div className="text-[15px] text-graphite">{t("age::{age}", { age: r.age })}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[14px] font-semibold ${current && arrived ? "bg-signal text-asphalt" : "bg-mist text-graphite"}`}>{statusFor(r.status)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </Pane>
  );
}

function Line({ title, detail, source }: { title: string; detail?: string; source?: string }) {
  return (
    <div className="px-5 py-3.5">
      <div className="text-[17px] font-semibold leading-snug">{title}</div>
      {detail && <div className="text-[15px] leading-snug text-asphalt/85">{detail}</div>}
      {source && <div className="mt-0.5 text-[13px] text-graphite">{source}</div>}
    </div>
  );
}

const sourceId: Record<string, string> = {
  "Main Street Pharmacy": "mainst",
  "Granite Eye Associates": "granite-eye",
  "Lakeview Health": "lakeview",
  "Dr. Anika Patel": "lakeview",
};

/** The parts of her record she chose to share, from the sources she connected. */
export function useSharedRecord() {
  const hk = useDemo((s) => s.hkConnected);
  const sharing = useDemo((s) => s.hkSharing);
  const share = useDemo((s) => s.hkShare);
  const sources = useDemo((s) => s.hkSources);
  const on = hk && sharing;
  const pick = (cat: keyof typeof record) => (on && share[cat] ? record[cat].filter((r) => !sourceId[r.source] || sources.includes(sourceId[r.source])) : []);
  return { on, medicines: pick("medicines"), conditions: pick("conditions"), eyes: pick("eyes"), visits: pick("visits"), labs: pick("labs") };
}

export function useAttention() {
  const answers = useDemo((s) => s.answers);
  const shared = useSharedRecord();
  const items: { title: string; detail: string; source: string }[] = [];
  useDemo((s) => s.lang);
  const sep = tr(", ");
  for (const m of [...shared.medicines, ...shared.conditions]) if (m.flag) items.push({ title: tr(m.name), detail: tr(m.flag), source: `${tr(m.source)}${sep}${tr(m.date)}` });
  items.push({ title: tr("Referral"), detail: tr("Daughter raised a driving concern at her annual wellness visit."), source: `${tr(referringDoctor.name)}${sep}${tr("Oct 6")}` });
  if (answers.incidents && answers.incidents !== "No")
    items.push({ title: tr(answers.incidents === "A crash" ? "Reports a crash in the past year" : "Reports a close call in the past year"), detail: tr("From her intake answers"), source: tr("Patient reported, today") });
  const avoid = answers.avoid as string[] | undefined;
  if (avoid?.length && !avoid.includes("None of these"))
    items.push({ title: tr("Avoids {list}", { list: avoid.map((a) => tr(a).toLowerCase()).join(sep) }), detail: tr("From her intake answers"), source: tr("Patient reported, today") });
  return items;
}

function useRecommended() {
  const answers = useDemo((s) => s.answers);
  const shared = useSharedRecord();
  return recommendDrives({
    cataract: shared.conditions.some((c) => c.name.startsWith("Cataract")),
    sleepMed: shared.medicines.some((m) => m.name.startsWith("Zolpidem")),
    answers,
  });
}

function AssignDrives({ picked, toggle, locked }: { picked: DriveId[]; toggle: (id: DriveId) => void; locked: boolean }) {
  const recs = useRecommended();
  const t = useT();
  const recById = Object.fromEntries(recs.map((r) => [r.id, r]));
  const minutes = DRIVES.filter((d) => picked.includes(d.id)).reduce((a, d) => a + d.minutes, 0);
  const list = locked ? DRIVES.filter((d) => picked.includes(d.id)) : DRIVES;

  return (
    <Card
      title={locked ? t("Assigned drives") : t("Assign drives")}
      aside={<span className="text-[14px] text-graphite">{picked.length === 1 ? t("1 drive, about {m} min", { m: minutes }) : t("{n} drives, about {m} min", { n: picked.length, m: minutes })}</span>}
    >
      {!locked && picked.length < 3 && <p className="px-5 pb-2 text-[13px] text-graphite">{t("DriverScore needs at least 3 drives to suggest an outcome.")}</p>}
      <div className="divide-y divide-line pb-1">
        {list.map((d) => {
          const on = picked.includes(d.id);
          const rec = recById[d.id];
          return (
            <button
              key={d.id}
              data-capture={`assign-${d.id}`}
              role="checkbox"
              aria-checked={on}
              disabled={locked}
              onClick={() => toggle(d.id)}
              className={`flex w-full gap-3.5 px-5 py-3 text-left transition-colors ${locked ? "" : "hover:bg-canvas"}`}
            >
              {!locked && (
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${on ? "bg-asphalt text-white" : "border-2 border-line-strong"}`}>{on && <Check size={16} strokeWidth={3} />}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[16px] font-semibold">{t(d.name)}</span>
                  {rec && !locked && <span className="rounded-md bg-signal-soft px-1.5 py-0.5 text-[11px] font-bold text-signal-ink">{t("Recommended")}</span>}
                </span>
                <span className="block text-[13px] text-graphite">{t(d.measures)}</span>
                {rec?.reasons.map((r) => (
                  <span key={r} className="mt-0.5 flex items-start gap-1.5 text-[13px] leading-snug">
                    <span className="mt-[5px] h-2.5 w-0.5 shrink-0 rounded-full bg-signal" />
                    {r}
                  </span>
                ))}
              </span>
              <span className="shrink-0 text-[13px] text-graphite tnum">{t("{m} min", { m: d.minutes })}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function RecordReview() {
  const go = useDemo((s) => s.go);
  const startDrives = useDemo((s) => s.startDrives);
  const answers = useDemo((s) => s.answers);
  const shared = useSharedRecord();
  const hk = shared.on;
  const reviewing = useDemo((s) => s.determination !== null);
  const attention = useAttention();
  const current = useDemo((s) => s.assigned);
  const recs = useRecommended();
  const t = useT();
  const [picked, setPicked] = useState<DriveId[]>(() => (current.length ? current : recs.map((r) => r.id)));
  const toggle = (id: DriveId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  // Build the picked drives' scenes while Dana reviews, so the simulator starts without a stall.
  useEffect(() => prepareDrives(picked), [picked]);
  return (
    <Pane
      title={t(`${patient.first} ${patient.last}`)}
      sub={t("{age}, born {dob}. Referred by {doctor}: {reason}.", { age: patient.age, dob: t(patient.dob), doctor: t(referringDoctor.name), reason: t(visit.reason).toLowerCase() })}
      actions={
        reviewing ? (
          <Button size="md" onClick={() => go("review")}>{t("Back to review")}</Button>
        ) : (
          <Button size="md" variant="signal" disabled={!picked.length} onClick={() => startDrives(sortDrives(picked))}>
            {picked.length === 1 ? t("Start 1 drive") : t("Start {n} drives", { n: picked.length })}
          </Button>
        )
      }
    >
      <div className="grid grid-cols-[1fr_1.12fr] gap-5">
        <div className="flex flex-col gap-5">
          <Card title={t("Needs attention")} capture="attention">
            <div className="divide-y divide-line pb-1">
              {attention.map((a) => (
                <div key={a.title} className="flex gap-4 px-5 py-3">
                  <span className="mt-1.5 h-4 w-1 shrink-0 rounded-full bg-signal" />
                  <div>
                    <div className="text-[16px] font-semibold leading-snug">{a.title}</div>
                    <div className="text-[14px] leading-snug">{a.detail}</div>
                    <div className="mt-0.5 text-[12px] text-graphite">{a.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title={t("Her answers")}>
            <div className="divide-y divide-line pb-1">
              {questions.map((q) => {
                const a = answers[q.id];
                return <Line key={q.id} title={Array.isArray(a) ? a.map((x) => t(x)).join(t(", ")) : t(a ?? "Not answered")} detail={t(q.prompt)} />;
              })}
            </div>
          </Card>
          {hk ? (
            <>
              <Card title={t("Medicines")}>
                <div className="divide-y divide-line pb-1">
                  {shared.medicines.map((m) => (
                    <Line key={m.name} title={t(m.name)} detail={t(m.detail)} source={`${t(m.source)}${t(", ")}${t(m.date)}`} />
                  ))}
                </div>
              </Card>
              <Card title={t("Conditions")}>
                <div className="divide-y divide-line pb-1">
                  {shared.conditions.map((m) => (
                    <Line key={m.name} title={t(m.name)} detail={t(m.detail)} source={`${t(m.source)}${t(", ")}${t(m.date)}`} />
                  ))}
                </div>
              </Card>
              <Card title={t("Eye exams")}>
                <div className="divide-y divide-line pb-1">
                  {shared.eyes.map((m) => (
                    <Line key={m.date} title={t(m.date)} detail={t(m.detail)} source={t(m.source)} />
                  ))}
                </div>
              </Card>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[14px] text-graphite">
                <HealthKeyLogo height={18} />
                <span>{sources.map((s) => t(s.name)).join(t(", "))}</span>
              </div>
            </>
          ) : (
            <Card title={t("Health record")}>
              <p className="px-5 pt-1 pb-4 text-[16px]">{t("Not connected. Ask about medicines and recent eye exams.")}</p>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <AssignDrives picked={picked} toggle={toggle} locked={reviewing} />
        </div>
      </div>
    </Pane>
  );
}
