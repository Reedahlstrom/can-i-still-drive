import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { DRIVES, recommendDrives, sortDrives, type DriveId } from "../data/drives";
import { patient, questions, record, referringDoctor, schedule, sources, visit } from "../data/demo";
import { longDate, today } from "../lib/dates";
import { useDemo } from "../state/store";
import { Avatar, HealthKeyLogo } from "../ui/Brand";
import { Button } from "../ui/primitives";
import { Card, Pane } from "./Shell";

export function Schedule() {
  const phase = useDemo((s) => s.phase);
  const go = useDemo((s) => s.go);
  const arrived = phase === "checked-in";
  const statusFor = (status: string) => {
    if (status !== "current") return status;
    if (arrived) return "Checked in";
    if (phase === "ready") return "Pre-visit done";
    return "Invited";
  };
  return (
    <Pane title="Today" sub={longDate(today())}>
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
            <div className="text-[20px] font-semibold">
              {patient.first} {patient.last} checked in
            </div>
            <div className="text-[16px] text-white/65">Simulator 1, Room 204. Health record and answers are ready.</div>
          </div>
          <Button variant="signal" size="md" onClick={() => go("record-review")}>
            Open
          </Button>
        </motion.div>
      )}
      <Card>
        <div className="divide-y divide-line">
          {schedule.map((r) => {
            const current = r.status === "current";
            return (
              <div key={r.name} className={`flex items-center gap-5 px-6 py-4 ${current ? "" : "opacity-60"}`}>
                <span className="w-24 font-display text-[17px] font-bold tnum">{r.time}</span>
                <Avatar initials={r.name.split(" ").map((x) => x[0]).join("")} size={40} tone={current ? "asphalt" : "mist"} />
                <div className="flex-1">
                  <div className="text-[18px] font-semibold">{r.name}</div>
                  <div className="text-[15px] text-graphite">{r.age}</div>
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
  for (const m of [...shared.medicines, ...shared.conditions]) if (m.flag) items.push({ title: m.name, detail: m.flag, source: `${m.source}, ${m.date}` });
  items.push({ title: "Referral", detail: "Daughter raised a driving concern at her annual wellness visit.", source: `${referringDoctor.name}, Oct 6` });
  if (answers.incidents && answers.incidents !== "No") items.push({ title: `Reports ${String(answers.incidents).toLowerCase()} in the past year`, detail: "From her intake answers", source: "Patient reported, today" });
  const avoid = answers.avoid as string[] | undefined;
  if (avoid?.length && !avoid.includes("None of these")) items.push({ title: `Avoids ${avoid.map((a) => a.toLowerCase()).join(", ")}`, detail: "From her intake answers", source: "Patient reported, today" });
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
  const recById = Object.fromEntries(recs.map((r) => [r.id, r]));
  const minutes = DRIVES.filter((d) => picked.includes(d.id)).reduce((a, d) => a + d.minutes, 0);
  const list = locked ? DRIVES.filter((d) => picked.includes(d.id)) : DRIVES;

  return (
    <Card
      title={locked ? "Assigned drives" : "Assign drives"}
      aside={
        <span className="text-[14px] text-graphite">
          {picked.length} {picked.length === 1 ? "drive" : "drives"}, about {minutes} min
        </span>
      }
    >
      {!locked && picked.length < 3 && <p className="px-5 pb-2 text-[13px] text-graphite">DriverScore needs at least 3 drives to suggest an outcome.</p>}
      <div className="divide-y divide-line pb-1">
        {list.map((d) => {
          const on = picked.includes(d.id);
          const rec = recById[d.id];
          return (
            <button
              key={d.id}
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
                  <span className="text-[16px] font-semibold">{d.name}</span>
                  {rec && !locked && <span className="rounded-md bg-signal-soft px-1.5 py-0.5 text-[11px] font-bold text-signal-ink">Recommended</span>}
                </span>
                <span className="block text-[13px] text-graphite">{d.measures}</span>
                {rec?.reasons.map((r) => (
                  <span key={r} className="mt-0.5 flex items-start gap-1.5 text-[13px] leading-snug">
                    <span className="mt-[5px] h-2.5 w-0.5 shrink-0 rounded-full bg-signal" />
                    {r}
                  </span>
                ))}
              </span>
              <span className="shrink-0 text-[13px] text-graphite tnum">{d.minutes} min</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function RecordReview() {
  const go = useDemo((s) => s.go);
  const answers = useDemo((s) => s.answers);
  const shared = useSharedRecord();
  const hk = shared.on;
  const reviewing = useDemo((s) => s.determination !== null);
  const attention = useAttention();
  const current = useDemo((s) => s.assigned);
  const recs = useRecommended();
  const [picked, setPicked] = useState<DriveId[]>(() => (current.length ? current : recs.map((r) => r.id)));
  const toggle = (id: DriveId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const assign = () => {
    const next = sortDrives(picked);
    // A changed set goes back to the patient so she sees the new drives before saying how she feels.
    const changed = next.join() !== current.join();
    go("pre-drive", { assigned: next, simStart: null, drivesCompleted: null, hardStopSeen: false, ...(changed ? { preDriveFeeling: null } : {}) });
  };
  return (
    <Pane
      title={`${patient.first} ${patient.last}`}
      sub={`${patient.age}, born ${patient.dob}. Referred by ${referringDoctor.name}: ${visit.reason.toLowerCase()}.`}
      actions={
        reviewing ? (
          <Button size="md" onClick={() => go("review")}>Back to review</Button>
        ) : (
          <Button size="md" disabled={!picked.length} onClick={assign}>
            Assign {picked.length} {picked.length === 1 ? "drive" : "drives"}
          </Button>
        )
      }
    >
      <div className="grid grid-cols-[1fr_1.12fr] gap-5">
        <div className="flex flex-col gap-5">
          <Card title="Needs attention">
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
          <Card title="Her answers">
            <div className="divide-y divide-line pb-1">
              {questions.map((q) => {
                const a = answers[q.id];
                return <Line key={q.id} title={Array.isArray(a) ? a.join(", ") : a ?? "Not answered"} detail={q.prompt} />;
              })}
            </div>
          </Card>
          {hk ? (
            <>
              <Card title="Medicines">
                <div className="divide-y divide-line pb-1">
                  {shared.medicines.map((m) => (
                    <Line key={m.name} title={m.name} detail={m.detail} source={`${m.source}, ${m.date}`} />
                  ))}
                </div>
              </Card>
              <Card title="Conditions">
                <div className="divide-y divide-line pb-1">
                  {shared.conditions.map((m) => (
                    <Line key={m.name} title={m.name} detail={m.detail} source={`${m.source}, ${m.date}`} />
                  ))}
                </div>
              </Card>
              <Card title="Eye exams">
                <div className="divide-y divide-line pb-1">
                  {shared.eyes.map((m) => (
                    <Line key={m.date} title={m.date} detail={m.detail} source={m.source} />
                  ))}
                </div>
              </Card>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[14px] text-graphite">
                <HealthKeyLogo height={18} />
                <span>{sources.map((s) => s.name).join(", ")}</span>
              </div>
            </>
          ) : (
            <Card title="Health record">
              <p className="px-5 pt-1 pb-4 text-[16px]">Not connected. Ask about medicines and recent eye exams.</p>
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
