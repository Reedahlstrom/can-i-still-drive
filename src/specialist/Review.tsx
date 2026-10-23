import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { patient, specialist } from "../data/demo";
import { conditionLibrary, outcomeCopy, planLibrary } from "../data/scenarios";
import { addMonths, shortDate, timeOf, today } from "../lib/dates";
import type { Domain, Outcome } from "../lib/score";
import { determinationFor, useDemo, useScore } from "../state/store";
import { HealthKeyLogo } from "../ui/Brand";
import { Button, Segmented } from "../ui/primitives";
import { Gauge } from "../ui/Road";
import { useAttention } from "./Intake";
import { Card, Pane } from "./Shell";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const outcomes: Outcome[] = ["clear", "conditions", "pause", "stop"];

function DomainRow({ d }: { d: Domain }) {
  const [open, setOpen] = useState(false);
  const low = d.points < d.max / 2;
  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-3.5 text-left">
        <span className="w-28 text-[16px] font-semibold">{d.label}</span>
        <span className={`h-2 flex-1 overflow-hidden rounded-full ${low ? "bg-alert-tint" : "bg-mist"}`}>
          <span className={`block h-full rounded-full ${low ? "bg-alert" : "bg-asphalt"}`} style={{ width: `${(d.points / d.max) * 100}%` }} />
        </span>
        <span className="w-20 text-right font-display text-[16px] font-bold tnum">
          {fmt(d.points)} <span className="font-normal text-graphite">/ {d.max}</span>
        </span>
        <ChevronDown size={18} className={`text-graphite transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="mx-5 mb-3 divide-y divide-line rounded-xl bg-canvas">
              {d.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                  <span className="font-semibold">{it.label}</span>
                  <span className="flex-1 truncate text-right text-graphite">{it.raw}</span>
                  <span className="w-12 text-right font-display font-bold tnum">
                    {it.points}/{it.max}
                  </span>
                </div>
              ))}
              {d.id === "cognition" && <div className="px-4 py-2.5 text-[13px] text-graphite">Sheet items total 17. Version 0 rescales cognition to 20.</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`rounded-full border-2 px-3.5 py-1.5 text-left text-[14px] font-semibold transition-colors ${on ? "border-asphalt bg-asphalt text-white" : "border-line bg-paper text-asphalt hover:border-line-strong"}`}>
      {label}
    </button>
  );
}

function SignaturePad({ onSigned, signed }: { onSigned: (v: string | null) => void; signed: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current!;
    c.width = c.clientWidth * 2;
    c.height = c.clientHeight * 2;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1C2229";
  }, []);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * e.currentTarget.width, ((e.clientY - r.top) / r.height) * e.currentTarget.height];
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onSigned(null);
  };
  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="h-[80px] w-full touch-none rounded-xl border-2 border-dashed border-line-strong bg-canvas"
        aria-label="Signature"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          onSigned(e.currentTarget.toDataURL());
        }}
      />
      {!signed && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] text-graphite">Sign here</span>}
      {signed && (
        <button onClick={clear} className="absolute top-2 right-2 rounded-lg bg-white px-2.5 py-1 text-[13px] font-semibold text-graphite shadow-sm">
          Clear
        </button>
      )}
    </div>
  );
}

export function ReviewSign() {
  const d = useDemo((s) => s.determination);
  const set = useDemo((s) => s.set);
  const postFeel = useDemo((s) => s.postFeel);
  const selfRating = useDemo((s) => s.selfRating);
  const result = useScore();
  const attention = useAttention();
  const [more, setMore] = useState(false);
  if (!d) return null;
  const update = (p: Partial<typeof d>) => set({ determination: { ...d, ...p } });
  const pickOutcome = (o: Outcome) => set({ determination: { ...determinationFor(o), signature: d.signature } });
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const stop = d.outcome === "stop";
  const canSign = !!d.signature && (!stop || d.discussed);
  const hardStops = result.findings.filter((f) => f.kind === "hardStop");
  const flags = result.findings.filter((f) => f.kind === "flag");
  const sim = result.domains.find((x) => x.id === "simulator")!;

  const sign = () => {
    const support = d.plan.some((p) => p.startsWith("Sarah added"));
    const familyShare = useDemo.getState().familyShare;
    set({ phase: "released", tab: "home", determination: { ...d, signedAt: Date.now() }, familyShare: support ? { ...familyShare, results: true } : familyShare });
  };

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="min-w-0 flex-1">
        <Pane title="Review and sign" sub={`${patient.first} ${patient.last}, ${shortDate(today())}`}>
          {(hardStops.length > 0 || flags.length > 0) && (
            <Card title="Needs attention" className="mb-5">
              <div className="divide-y divide-line pb-1">
                {hardStops.map((f) => (
                  <div key={f.text} className="flex items-center gap-3 px-5 py-3">
                    <span className="rounded-md bg-alert px-2 py-0.5 text-[12px] font-bold text-white">Hard stop</span>
                    <span className="text-[16px] font-semibold">{f.text}</span>
                  </div>
                ))}
                {flags.map((f) => (
                  <div key={f.text} className="flex items-center gap-3 px-5 py-3">
                    <span className="rounded-md bg-signal-soft px-2 py-0.5 text-[12px] font-bold text-signal-ink">Flag</span>
                    <span className="text-[16px]">{f.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <div className="flex items-center gap-6 px-5 pt-4 pb-2">
              <Gauge value={result.total} size={150} delay={0.1} />
              <div>
                <div className="font-display text-[22px] font-extrabold">DriverScore</div>
                <div className="text-[14px] text-graphite">Version 0, not yet validated. Hard stops override the total.</div>
              </div>
            </div>
            <div className="divide-y divide-line border-t border-line pb-1">
              {result.domains.map((dm) => (
                <DomainRow key={dm.id} d={dm} />
              ))}
            </div>
          </Card>
          <div className="mt-5 grid grid-cols-2 gap-5">
            <Card title="Self-rating">
              <div className="px-5 pt-1 pb-4 text-[16px] leading-snug">
                {selfRating ? `${patient.first} rated her drive ${selfRating} of 5` : "Not given"}
                {postFeel ? `, felt ${postFeel.toLowerCase()}.` : "."} Simulator: {sim.points} of 40.
              </div>
            </Card>
            <Card title="From her record">
              <div className="px-5 pt-1 pb-4 text-[15px] leading-snug">
                {attention.slice(0, 2).map((a) => (
                  <div key={a.title} className="mb-1">
                    <span className="font-semibold">{a.title}.</span> {a.detail}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Pane>
      </div>

      <aside className="flex w-[340px] shrink-0 flex-col border-l border-line bg-paper">
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pt-[calc(var(--safe-top,0px)+24px)] pb-4">
          <h2 className="text-[15px] font-semibold text-graphite">Outcome</h2>
          <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Outcome">
            {outcomes.map((o) => {
              const on = d.outcome === o;
              return (
                <button key={o} role="radio" aria-checked={on} onClick={() => pickOutcome(o)} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors ${on ? "border-asphalt" : "border-line hover:border-line-strong"}`}>
                  <span className="text-[16px] font-semibold">{outcomeCopy[o].label}</span>
                  {result.suggested === o && <span className="rounded-md bg-signal-soft px-2 py-0.5 text-[12px] font-bold text-signal-ink">Suggested</span>}
                </button>
              );
            })}
          </div>

          {d.outcome === "conditions" && (
            <>
              <h2 className="mt-6 text-[15px] font-semibold text-graphite">Conditions</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {conditionLibrary.map((c) => (
                  <Chip key={c} label={c} on={d.conditions.includes(c)} onClick={() => update({ conditions: toggle(d.conditions, c) })} />
                ))}
              </div>
            </>
          )}

          <h2 className="mt-6 text-[15px] font-semibold text-graphite">Plan</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {d.plan.map((p) => (
              <Chip key={p} label={p} on onClick={() => update({ plan: toggle(d.plan, p) })} />
            ))}
            <button onClick={() => setMore(!more)} aria-expanded={more} className="rounded-full border-2 border-dashed border-line-strong px-3.5 py-1.5 text-[14px] font-semibold text-graphite hover:text-asphalt">
              {more ? "Done" : "Add"}
            </button>
          </div>
          {more && (
            <div className="mt-2 flex flex-wrap gap-2">
              {planLibrary
                .filter((p) => !d.plan.includes(p))
                .map((p) => (
                  <Chip key={p} label={p} on={false} onClick={() => update({ plan: [...d.plan, p] })} />
                ))}
            </div>
          )}

          {!stop && (
            <>
              <h2 className="mt-6 text-[15px] font-semibold text-graphite">Re-test in</h2>
              <div className="mt-2 flex items-center gap-3">
                <Segmented
                  label="Re-test"
                  value={d.retestMonths}
                  onChange={(v) => update({ retestMonths: v })}
                  options={[
                    { value: 3, label: "3 mo" },
                    { value: 6, label: "6 mo" },
                    { value: 12, label: "12 mo" },
                  ]}
                />
                <span className="text-[13px] text-graphite">By {shortDate(addMonths(today(), d.retestMonths))}</span>
              </div>
            </>
          )}

          <h2 className="mt-6 text-[15px] font-semibold text-graphite">Note to {patient.first}</h2>
          <textarea value={d.note} onChange={(e) => update({ note: e.target.value })} rows={4} className="mt-2 w-full resize-none rounded-xl border-2 border-line bg-canvas px-3.5 py-3 text-[15px] leading-snug outline-none focus:border-asphalt" />
        </div>

        <div className="border-t border-line px-6 pt-4 pb-[calc(var(--safe-bottom,0px)+16px)]">
          {stop && (
            <button onClick={() => update({ discussed: !d.discussed })} role="checkbox" aria-checked={d.discussed} className="mb-3 flex items-start gap-3 rounded-xl bg-signal-soft px-4 py-3 text-left">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${d.discussed ? "bg-asphalt text-white" : "border-2 border-asphalt/40 bg-white"}`}>{d.discussed && <Check size={16} strokeWidth={3} />}</span>
              <span className="text-[14px] leading-snug">I talked with {patient.first} about this in person. Required before she sees it.</span>
            </button>
          )}
          <SignaturePad signed={!!d.signature} onSigned={(v) => update({ signature: v })} />
          <div className="mt-1.5 text-[13px] text-graphite">
            {specialist.name}, {specialist.credentials}
          </div>
          <Button className="mt-3 w-full" size="md" disabled={!canSign} onClick={sign}>
            Sign and share with {patient.first}
          </Button>
        </div>
      </aside>
    </div>
  );
}

export function Released() {
  const d = useDemo((s) => s.determination);
  const result = useScore();
  if (!d) return null;
  const signed = d.signedAt ? new Date(d.signedAt) : today();
  return (
    <Pane title="Signed and shared" sub={`${timeOf(signed)}, ${shortDate(signed)}`}>
      <div className="grid grid-cols-[1.2fr_1fr] gap-5">
        <Card>
          <div className="flex items-center gap-5 px-6 py-6">
            <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="flex size-14 shrink-0 items-center justify-center rounded-full bg-asphalt text-white">
              <Check size={30} strokeWidth={3} />
            </motion.span>
            <div>
              <div className="font-display text-[26px] font-extrabold">{outcomeCopy[d.outcome].label}</div>
              <div className="text-[16px] text-graphite">
                DriverScore {result.total}
                {d.retestMonths > 0 ? `, re-test by ${shortDate(addMonths(signed, d.retestMonths))}` : ""}
              </div>
            </div>
          </div>
          <div className="divide-y divide-line border-t border-line">
            {[`On ${patient.first}'s phone`, "Saved to her HealthKey record", "Report sent to Dr. Anika Patel"].map((x) => (
              <div key={x} className="flex items-center gap-3 px-6 py-3.5 text-[16px]">
                <Check size={18} strokeWidth={3} className="text-hk" />
                {x}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Plan">
          <div className="divide-y divide-line pb-1">
            {[...d.conditions, ...d.plan].map((p) => (
              <div key={p} className="px-5 py-3 text-[16px]">
                {p}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-5 pt-2 pb-4 text-[13px] text-graphite">
            <HealthKeyLogo height={16} />
          </div>
        </Card>
      </div>
    </Pane>
  );
}
