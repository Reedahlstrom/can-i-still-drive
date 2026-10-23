import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { patient, referringDoctor, specialist } from "../data/demo";
import { conditionLibrary, outcomeCopy, planLibrary } from "../data/scenarios";
import { addMonths, shortDate, timeOf, today } from "../lib/dates";
import type { Domain, Outcome } from "../lib/score";
import { determinationFor, useDemo, useScore, type Determination } from "../state/store";
import { HealthKeyLogo } from "../ui/Brand";
import { Button, Segmented } from "../ui/primitives";
import { Gauge } from "../ui/Road";
import { useAttention } from "./Intake";
import { Card, Pane } from "./Shell";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const outcomes: Outcome[] = ["clear", "conditions", "pause", "stop"];

function DomainRow({ d }: { d: Domain }) {
  const [open, setOpen] = useState(false);
  const low = d.max > 0 && d.points < d.max / 2;
  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-3.5 text-left">
        <span className="w-28 text-[16px] font-semibold">{d.label}</span>
        <span className={`h-2 flex-1 overflow-hidden rounded-full ${low ? "bg-alert-tint" : "bg-mist"}`}>
          <span className={`block h-full rounded-full ${low ? "bg-alert" : "bg-asphalt"}`} style={{ width: `${d.max ? (d.points / d.max) * 100 : 0}%` }} />
        </span>
        <span className="w-28 text-right font-display text-[16px] font-bold tnum">
          {d.max ? (
            <>
              {fmt(d.points)} <span className="font-normal text-graphite">/ {fmt(d.max)}</span>
            </>
          ) : (
            <span className="font-sans text-[14px] font-normal text-graphite">Not completed</span>
          )}
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
                  <span className="w-12 text-right font-display font-bold tnum">{it.done ? `${it.points}/${it.max}` : "—"}</span>
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

function SignaturePad({ onSigned, value }: { onSigned: (v: string | null) => void; value: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const moved = useRef(0);
  const signed = !!value;
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
  // Keep the ink in step with the stored signature (cleared by edits, restored after reload or in another tab).
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    if (!value) {
      ctx.clearRect(0, 0, c.width, c.height);
      return;
    }
    if (drawing.current || !value.startsWith("data:image")) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = value;
  }, [value]);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * e.currentTarget.width, ((e.clientY - r.top) / r.height) * e.currentTarget.height];
  };
  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="h-[76px] w-full touch-none rounded-xl border-2 border-dashed border-line-strong bg-canvas"
        aria-label="Signature"
        onPointerDown={(e) => {
          drawing.current = true;
          moved.current = 0;
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
          moved.current += 1;
        }}
        onPointerUp={(e) => {
          if (!drawing.current) return;
          drawing.current = false;
          // The first stroke must be a real one; after that every stroke is kept.
          if (moved.current > 3 || signed) onSigned(e.currentTarget.toDataURL());
        }}
        onPointerCancel={() => (drawing.current = false)}
      />
      {!signed && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] text-graphite">Sign here</span>}
      {signed && (
        <button onClick={() => onSigned(null)} className="absolute top-2 right-2 rounded-lg bg-white px-2.5 py-1 text-[13px] font-semibold text-graphite shadow-sm">
          Clear
        </button>
      )}
    </div>
  );
}

const label = "text-[15px] font-semibold text-graphite";

export function ReviewSign() {
  const d = useDemo((s) => s.determination);
  const set = useDemo((s) => s.set);
  const postFeel = useDemo((s) => s.postFeel);
  const selfRating = useDemo((s) => s.selfRating);
  const result = useScore();
  const attention = useAttention();
  const [more, setMore] = useState(false);
  if (!d) return null;

  // Any change after signing voids the signature.
  const update = (p: Partial<Determination>) => set({ determination: { ...d, ...p, signature: "signature" in p ? (p.signature ?? null) : null } });
  const pickOutcome = (o: Outcome) => {
    const edited = d.outcome ? d.note !== outcomeCopy[d.outcome].note : d.note.trim() !== "";
    const next = determinationFor(o);
    set({ determination: { ...next, note: edited ? d.note : next.note, noteFor: edited ? (d.noteFor ?? d.outcome) : o, reasoning: d.reasoning, signature: null } });
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const hardStops = result.findings.filter((f) => f.kind === "hardStop");
  const flags = result.findings.filter((f) => f.kind === "flag");
  const sim = result.domains.find((x) => x.id === "simulator")!;
  const needsTalk = d.outcome === "stop" || d.outcome === "pause";
  const differs = d.outcome !== null && d.outcome !== result.suggested;
  const canSign = d.outcome !== null && !!d.signature && (!needsTalk || d.discussed) && (!differs || d.reasoning.trim().length > 0) && d.note.trim().length > 0;

  const sign = () => set({ phase: "released", tab: "home", determination: { ...d, signedAt: Date.now() } });

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="min-w-0 flex-1">
        <Pane title="Review and sign" sub={`${patient.first} ${patient.last}, ${shortDate(today())}`}>
          {(hardStops.length > 0 || flags.length > 0) && (
            <Card title="Needs attention" className="mb-5">
              <div className="divide-y divide-line pb-1">
                {hardStops.map((f) => (
                  <div key={f.text} className="flex items-center gap-3 px-5 py-3">
                    <span className="shrink-0 rounded-md bg-alert px-2 py-0.5 text-[12px] font-bold text-white">Hard stop</span>
                    <span className="text-[16px] font-semibold">{f.text}</span>
                  </div>
                ))}
                {flags.map((f) => (
                  <div key={f.text} className="flex items-center gap-3 px-5 py-3">
                    <span className="shrink-0 rounded-md bg-signal-soft px-2 py-0.5 text-[12px] font-bold text-signal-ink">Flag</span>
                    <span className="text-[16px]">{f.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <div className="flex items-center gap-6 px-5 pt-4 pb-2">
              <Gauge value={result.total} max={result.possible} size={150} delay={0.1} />
              <div>
                <div className="font-display text-[22px] font-extrabold">
                  DriverScore {result.total}
                  {result.incomplete && <span className="font-normal text-graphite"> of {result.possible}</span>}
                </div>
                <div className="text-[14px] text-graphite">Version 0, not yet validated. It suggests an outcome; you decide.</div>
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
                {selfRating ? `${patient.first} rated her drive ${selfRating} of 5` : "Not given yet"}
                {postFeel ? `, felt ${postFeel.toLowerCase()}.` : "."} Simulator: {sim.points} of {sim.max}.
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
          <h2 className={label}>Your decision</h2>
          <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Outcome">
            {outcomes.map((o) => {
              const on = d.outcome === o;
              return (
                <button key={o} role="radio" aria-checked={on} onClick={() => pickOutcome(o)} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors ${on ? "border-asphalt bg-asphalt text-white" : "border-line hover:border-line-strong"}`}>
                  <span className="text-[16px] font-semibold">{outcomeCopy[o].label}</span>
                  {result.suggested === o && <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${on ? "bg-white/15 text-white" : "bg-signal-soft text-signal-ink"}`}>Suggested</span>}
                </button>
              );
            })}
          </div>

          {d.outcome === null ? (
            <p className="mt-5 text-[15px] leading-snug text-graphite">Choose the outcome. The plan and note fill in, and you can change anything before signing.</p>
          ) : (
            <>
              {d.outcome === "conditions" && (
                <>
                  <h2 className={`mt-6 ${label}`}>Conditions</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {conditionLibrary.map((c) => (
                      <Chip key={c} label={c} on={d.conditions.includes(c)} onClick={() => update({ conditions: toggle(d.conditions, c) })} />
                    ))}
                  </div>
                </>
              )}

              <h2 className={`mt-6 ${label}`}>Plan</h2>
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

              {(d.outcome === "clear" || d.outcome === "conditions") && (
                <>
                  <h2 className={`mt-6 ${label}`}>Re-test in</h2>
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

              <h2 className={`mt-6 ${label}`}>Note to {patient.first}</h2>
              <p className="text-[13px] text-graphite">She sees this under your name.</p>
              {d.noteFor && d.noteFor !== d.outcome && (
                <p className="mt-1 rounded-lg bg-signal-soft px-3 py-2 text-[13px] font-semibold text-signal-ink">Written for {outcomeCopy[d.noteFor].label}. Reread before signing.</p>
              )}
              <textarea value={d.note} onChange={(e) => update({ note: e.target.value, noteFor: d.outcome })} rows={5} className="mt-2 w-full resize-none rounded-xl border-2 border-line bg-canvas px-3.5 py-3 text-[15px] leading-snug outline-none focus:border-asphalt" />

              <h2 className={`mt-5 ${label}`}>Reasoning for the record</h2>
              <p className="text-[13px] text-graphite">
                Goes to the record and {referringDoctor.name}, not to {patient.first}.{differs ? " Required: your decision differs from the suggestion." : ""}
              </p>
              <textarea value={d.reasoning} onChange={(e) => update({ reasoning: e.target.value })} rows={3} className={`mt-2 w-full resize-none rounded-xl border-2 bg-canvas px-3.5 py-3 text-[15px] leading-snug outline-none focus:border-asphalt ${differs && !d.reasoning.trim() ? "border-signal" : "border-line"}`} />
            </>
          )}
        </div>

        <div className="border-t border-line px-6 pt-4 pb-[calc(var(--safe-bottom,0px)+16px)]">
          {d.outcome && (
            <div className="mb-3 text-[14px] leading-snug">
              <span className="text-graphite">{patient.first} will see: </span>
              <span className="font-semibold">{outcomeCopy[d.outcome].title}</span>
              <span className="text-graphite"> Then your note, next steps, and DriverScore {result.total} with four section scores.</span>
            </div>
          )}
          {needsTalk && (
            <button onClick={() => update({ discussed: !d.discussed })} role="checkbox" aria-checked={d.discussed} className="mb-3 flex items-start gap-3 rounded-xl bg-signal-soft px-4 py-3 text-left">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${d.discussed ? "bg-asphalt text-white" : "border-2 border-asphalt/40 bg-white"}`}>{d.discussed && <Check size={16} strokeWidth={3} />}</span>
              <span className="text-[14px] leading-snug">I talked with {patient.first} about this in person.</span>
            </button>
          )}
          <SignaturePad value={d.signature} onSigned={(v) => update({ signature: v })} />
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
  if (!d || !d.outcome) return null;
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
                {result.incomplete ? ` of ${result.possible}` : ""}
                {d.retestMonths > 0 ? `, re-test by ${shortDate(addMonths(signed, d.retestMonths))}` : ""}
              </div>
            </div>
          </div>
          <div className="divide-y divide-line border-t border-line">
            {[`On ${patient.first}'s phone`, "Saved to her HealthKey record", `Report sent to ${referringDoctor.name}`, "Not sent to the DMV"].map((x) => (
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
