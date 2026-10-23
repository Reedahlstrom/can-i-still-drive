import { Minus, Plus } from "lucide-react";
import { patient } from "../data/demo";
import { acuityScale, type Acuity, type Raw } from "../lib/score";
import { rawFor, useDemo, useScore } from "../state/store";
import { Button, Segmented } from "../ui/primitives";
import { Card, Pane } from "./Shell";

const pts = (n: number) => Array.from({ length: n + 1 }, (_, i) => ({ value: i, label: String(i) }));

function ItemRow({ label, hint, stack = false, children }: { label: string; hint?: string; stack?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex gap-x-4 gap-y-2.5 px-5 py-3.5 ${stack ? "flex-col" : "items-center justify-between"}`}>
      <div className="min-w-0">
        <div className="text-[16px] font-semibold leading-snug">{label}</div>
        {hint && <div className="text-[13px] text-graphite">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-[16px] font-semibold">{label}</span>
      <span className="text-[15px] text-graphite tnum">{value}</span>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function HandsOn() {
  const scenario = useDemo((s) => s.scenario);
  const live = useDemo((s) => s.live);
  const handsOn = useDemo((s) => s.handsOn);
  const set = useDemo((s) => s.set);
  const go = useDemo((s) => s.go);
  const raw = rawFor({ scenario, live, handsOn });
  const result = useScore();
  const dom = Object.fromEntries(result.domains.map((d) => [d.id, d]));
  const put = <K extends keyof Raw>(k: K, v: Raw[K]) => set({ handsOn: { ...handsOn, [k]: v } });
  const sub = (id: string) => (
    <span className="font-display text-[15px] font-bold tnum">
      {fmt(dom[id].points)} <span className="font-normal text-graphite">of {dom[id].max}</span>
    </span>
  );

  return (
    <Pane
      title="Hands-on checks"
      sub={`Score as you go. ${patient.first}'s tablet results are already in.`}
      actions={<Button size="md" onClick={() => go("pre-drive")}>Continue to simulator</Button>}
    >
      <div className="grid grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <Card title="Vision" aside={sub("vision")}>
            <div className="divide-y divide-line pb-1">
              <ItemRow stack label={`Acuity ${raw.acuity}`} hint="Best corrected, both eyes">
                <Segmented
                  size="sm"
                  label="Acuity"
                  value={raw.acuity}
                  onChange={(v) => put("acuity", v as Acuity)}
                  options={acuityScale.filter((a) => a !== "20/80").map((a) => ({ value: a, label: a.slice(3) }))}
                />
              </ItemRow>
              <ItemRow label="Ocular range of motion" hint="Directions with full movement">
                <Segmented size="sm" label="Ocular range" value={raw.ocularRom} onChange={(v) => put("ocularRom", v)} options={pts(4)} />
              </ItemRow>
              <ItemRow label="Pursuits" hint="Smooth tracking">
                <Segmented size="sm" label="Pursuits" value={raw.pursuits} onChange={(v) => put("pursuits", v)} options={pts(4)} />
              </ItemRow>
              <ItemRow label="Visual fields" hint="Quadrants missed">
                <Segmented
                  size="sm"
                  label="Fields"
                  value={raw.fields}
                  onChange={(v) => put("fields", v)}
                  options={[
                    { value: 7, label: "None" },
                    { value: 5, label: "1" },
                    { value: 3, label: "2+" },
                    { value: 1, label: "Both" },
                    { value: 0, label: "Half" },
                  ]}
                />
              </ItemRow>
            </div>
          </Card>
          <Card title="Motor" aside={sub("motor")}>
            <div className="divide-y divide-line pb-1">
              <ItemRow stack label="Range of motion" hint="Neck, arms, hip, ankle">
                <Segmented size="sm" label="Range of motion" value={raw.rom} onChange={(v) => put("rom", v)} options={pts(6)} />
              </ItemRow>
              <ItemRow stack label="Strength" hint="Hands, shoulders, ankle, hip">
                <Segmented size="sm" label="Strength" value={raw.strength} onChange={(v) => put("strength", v)} options={pts(8)} />
              </ItemRow>
              <ItemRow label="Foot tap">
                <Segmented size="sm" label="Foot tap" value={raw.footTap} onChange={(v) => put("footTap", v)} options={pts(2)} />
              </ItemRow>
              <ItemRow label="Pronation and supination">
                <Segmented size="sm" label="Pro-supination" value={raw.proSup} onChange={(v) => put("proSup", v)} options={pts(2)} />
              </ItemRow>
              <ItemRow label="Finger to nose">
                <Segmented size="sm" label="Finger to nose" value={raw.fnf} onChange={(v) => put("fnf", v)} options={pts(2)} />
              </ItemRow>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card title="Cognition" aside={sub("cognition")}>
            <div className="divide-y divide-line pb-1">
              <ItemRow label="MoCA" hint="Paper form, out of 30">
                <div className="flex items-center gap-1 rounded-xl bg-mist p-1">
                  <button aria-label="Lower MoCA" onClick={() => put("moca", Math.max(0, raw.moca - 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-white">
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-display text-[18px] font-bold tnum">{raw.moca}</span>
                  <button aria-label="Raise MoCA" onClick={() => put("moca", Math.min(30, raw.moca + 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-white">
                    <Plus size={16} />
                  </button>
                </div>
              </ItemRow>
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="size-[88px] shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                  {live.clock ? <img src={live.clock} alt="Clock drawing" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-[12px] text-graphite">No drawing</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold">Clock drawing</div>
                  <div className="text-[13px] text-graphite">Numbers, placement, hands at 11:10</div>
                </div>
                <Segmented size="sm" label="Clock" value={raw.clock} onChange={(v) => put("clock", v)} options={pts(2)} />
              </div>
            </div>
          </Card>
          <Card title="From the tablet">
            <div className="divide-y divide-line pb-1">
              <Readout
                label={raw.trailsShort ? "Trails B (short form)" : "Trails B"}
                value={raw.trailsSeconds === null ? "Not finished" : `${raw.trailsSeconds} s${live.trailsErrors !== undefined && scenario === "live" ? `, ${live.trailsErrors} errors` : ""}`}
              />
              <Readout label="Signs" value={`${raw.signs} of 5`} />
              <Readout label="Colors" value={`${raw.colors} of 6`} />
              <Readout label="Driving questions" value={`${raw.choice} of 3`} />
            </div>
          </Card>
        </div>
      </div>
    </Pane>
  );
}
