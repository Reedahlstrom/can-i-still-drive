import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { patient, specialist, visit } from "../data/demo";
import { atLeast, useDemo, type Phase } from "../state/store";
import { Avatar, DriverScoreMark } from "../ui/Brand";

const steps: { label: string; from: Phase; done: Phase }[] = [
  { label: "Record review", from: "record-review", done: "tablet-tests" },
  { label: "Tablet tests", from: "tablet-tests", done: "hands-on" },
  { label: "Hands-on checks", from: "hands-on", done: "pre-drive" },
  { label: "Simulator drive", from: "pre-drive", done: "post-drive" },
  { label: "Review and sign", from: "post-drive", done: "released" },
];

export function Rail() {
  const phase = useDemo((s) => s.phase);
  const go = useDemo((s) => s.go);
  const reopen: Partial<Record<string, () => void>> = {
    "Record review": () => go("record-review"),
    "Tablet tests": () => go("tablet-tests", { tabletStep: "handoff" }),
    "Hands-on checks": () => go("hands-on"),
    "Simulator drive": () => go("pre-drive"),
  };
  const inVisit = atLeast(phase, "record-review");
  const simBusy = atLeast(phase, "checked-in") && phase !== "released";
  return (
    <aside className="dark-surface flex w-[290px] shrink-0 flex-col bg-asphalt px-6 pt-[calc(var(--safe-top,0px)+20px)] pb-6 text-white">
      <div className="flex items-center gap-3">
        <DriverScoreMark size={34} />
        <div>
          <div className="text-[17px] font-semibold leading-tight">Simulator 1</div>
          <div className="flex items-center gap-2 text-[14px] text-white/60">
            <span className={`size-2 rounded-full ${simBusy ? "bg-signal" : "bg-[#5FBF85]"}`} />
            {simBusy ? "In session" : "Ready"}, Room 204
          </div>
        </div>
      </div>

      {inVisit ? (
        <>
          <div className="mt-10 flex items-center gap-3">
            <Avatar initials={patient.initials} size={46} tone="signal" />
            <div>
              <div className="text-[18px] font-semibold leading-tight">
                {patient.first} {patient.last}
              </div>
              <div className="text-[14px] text-white/60">
                {patient.age}, {visit.time}
              </div>
            </div>
          </div>
          <ol className="mt-8 flex flex-col gap-1">
            {steps.map((s, i) => {
              const done = atLeast(phase, s.done);
              const now = !done && atLeast(phase, s.from);
              const canOpen = done && phase !== "released" && !!reopen[s.label];
              return (
                <li key={s.label}>
                  <button
                    disabled={!canOpen}
                    onClick={reopen[s.label]}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${now ? "bg-white/10" : canOpen ? "hover:bg-white/5" : ""}`}
                  >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-bold ${
                      done ? "bg-white text-asphalt" : now ? "bg-signal text-asphalt" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-[16px] ${now ? "font-semibold" : done ? "text-white/70" : "text-white/55"}`}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div className="mt-10 text-[15px] leading-relaxed text-white/55">No patient in session.</div>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-5">
        <Avatar initials={specialist.initials} size={38} tone="mist" />
        <div>
          <div className="text-[15px] font-semibold leading-tight">{specialist.name}</div>
          <div className="text-[13px] text-white/55">{specialist.credentials}</div>
        </div>
      </div>
    </aside>
  );
}

export function Pane({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-end justify-between gap-6 px-10 pt-[calc(var(--safe-top,0px)+22px)] pb-5">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-tight font-extrabold tracking-[-0.01em]">{title}</h1>
          {sub && <div className="mt-1 text-[16px] text-graphite">{sub}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-10 pb-10">{children}</div>
    </div>
  );
}

export function Card({ title, children, className = "", aside }: { title?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-paper ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 className="text-[15px] font-semibold text-graphite">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
