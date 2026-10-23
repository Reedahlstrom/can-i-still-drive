// DriverScore v0, following the CISD scoring sheet and the iPad spec's version-0 rules.
// Cognition items total 17 on the sheet; v0 rescales them to 20.
// Missing is not zero: anything not completed leaves the total and is reported as incomplete.

export type Outcome = "clear" | "conditions" | "pause" | "stop";

export const acuityScale = ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/80", "20/100", "20/200"] as const;
export type Acuity = (typeof acuityScale)[number];

export const fieldOptions = [
  { value: 7, label: "Full" },
  { value: 5, label: "1 quadrant" },
  { value: 3, label: "2+ quadrants" },
  { value: 1, label: "Both eyes" },
  { value: 0, label: "Hemianopia" },
] as const;

export type Raw = {
  acuity: Acuity; // best corrected, both eyes
  worseEye: Acuity; // best corrected, worse eye
  ocularRom: number; // 0-4
  pursuits: number; // 0-4
  fields: number; // 7, 5, 3, 1 or 0 (see fieldOptions)
  moca: number; // raw, out of 30
  clock: number; // 0-2
  trailsSeconds?: number | null; // null: not finished; undefined: not taken
  trailsErrors?: number;
  trailsShort?: boolean; // 10-circle tablet form taken live
  signs?: number; // correct of 5; undefined: not taken
  colors?: number; // correct of 6
  choice?: number; // correct of 3
  rom: number; // 0-6
  strength: number; // 0-8
  footTap: number; // 0-2
  proSup: number; // 0-2
  fnf: number; // 0-2
  reactionMs?: number; // undefined: not measured
  rightTurns: [number, number, number]; // each 0-2
  leftTurns: [number, number, number]; // each 0-3
  laneChanges: [number, number, number]; // each 0-4
  fod: number; // 0-5
  driveChoice: number; // 0-5
  collision: boolean;
  missedSignal: boolean;
  completedDrives?: number; // 0-6; undefined means all six were driven
};

export type Item = { id: string; label: string; points: number; max: number; raw: string; done: boolean };
export type Domain = { id: "vision" | "cognition" | "motor" | "simulator"; label: string; patientLabel: string; items: Item[]; points: number; max: number };
export type Finding = { kind: "hardStop" | "flag"; text: string };

export type ScoreResult = {
  total: number;
  possible: number;
  incomplete: boolean;
  domains: Domain[];
  findings: Finding[];
  suggested: Outcome;
};

const acuityIndex = (a: Acuity) => acuityScale.indexOf(a);

export function acuityPoints(a: Acuity) {
  const i = acuityIndex(a);
  if (i <= acuityIndex("20/25")) return 5;
  if (i <= acuityIndex("20/40")) return 4;
  if (i <= acuityIndex("20/70")) return 2;
  if (i <= acuityIndex("20/100")) return 1;
  return 0;
}

export function mocaPoints(m: number) {
  if (m >= 26) return 6;
  if (m >= 23) return 5;
  if (m >= 20) return 4;
  if (m >= 18) return 3;
  if (m >= 15) return 2;
  if (m >= 10) return 1;
  return 0;
}

export function trailsPoints(s: number | null, short = false) {
  if (s === null) return 0;
  const [a, b] = short ? [40, 80] : [90, 180];
  if (s <= a) return 2;
  if (s <= b) return 1;
  return 0;
}

export function reactionPoints(ms: number) {
  if (ms <= 750) return 3;
  if (ms <= 1000) return 2;
  if (ms <= 1300) return 1;
  return 0;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const fieldLabel = (v: number) => fieldOptions.find((f) => f.value === v)?.label ?? `${v} of 7`;

export function score(r: Raw): ScoreResult {
  const vision: Item[] = [
    { id: "acuity", label: "Acuity", points: acuityPoints(r.acuity), max: 5, raw: `${r.acuity} both eyes, ${r.worseEye} worse eye`, done: true },
    { id: "ocularRom", label: "Ocular range of motion", points: r.ocularRom, max: 4, raw: `${r.ocularRom} of 4 directions full`, done: true },
    { id: "pursuits", label: "Pursuits", points: r.pursuits, max: 4, raw: `${r.pursuits} of 4`, done: true },
    { id: "fields", label: "Visual fields", points: r.fields, max: 7, raw: fieldLabel(r.fields), done: true },
  ];

  // Signs 3, colors 2, choices 2; a part not taken leaves the item's maximum.
  const parts = [
    { v: r.signs, of: 5, pts: 3, name: "Signs" },
    { v: r.colors, of: 6, pts: 2, name: "colors" },
    { v: r.choice, of: 3, pts: 2, name: "choices" },
  ];
  const taken = parts.filter((p) => p.v !== undefined);
  const trailsLabel = r.trailsShort ? "Trails, 10-circle tablet form" : "Trails B";
  const trailsTaken = r.trailsSeconds !== undefined;
  const cognitionItems: Item[] = [
    { id: "moca", label: "MoCA", points: mocaPoints(r.moca), max: 6, raw: `${r.moca} of 30`, done: true },
    { id: "clock", label: "Clock drawing", points: r.clock, max: 2, raw: `${r.clock} of 2`, done: true },
    {
      id: "trails",
      label: trailsLabel,
      points: trailsTaken ? trailsPoints(r.trailsSeconds ?? null, r.trailsShort) : 0,
      max: trailsTaken ? 2 : 0,
      raw: !trailsTaken ? "Not completed" : r.trailsSeconds === null ? "Not finished" : `${r.trailsSeconds} s${r.trailsErrors !== undefined ? `, ${r.trailsErrors} ${r.trailsErrors === 1 ? "error" : "errors"}` : ""}`,
      done: trailsTaken,
    },
    {
      id: "signs",
      label: "Signs, colors, choices",
      points: sum(taken.map((p) => Math.round((p.pts * (p.v as number)) / p.of))),
      max: sum(taken.map((p) => p.pts)),
      raw: taken.length ? parts.map((p) => `${p.name} ${p.v === undefined ? "not taken" : `${p.v}/${p.of}`}`).join(", ") : "Not completed",
      done: taken.length > 0,
    },
  ];
  const cognitionRaw = sum(cognitionItems.map((i) => i.points));
  const cognitionMax = sum(cognitionItems.map((i) => i.max));

  const motor: Item[] = [
    { id: "rom", label: "Range of motion", points: r.rom, max: 6, raw: `${r.rom} of 6`, done: true },
    { id: "strength", label: "Strength", points: r.strength, max: 8, raw: `${r.strength} of 8`, done: true },
    { id: "footTap", label: "Foot tap", points: r.footTap, max: 2, raw: `${r.footTap} of 2`, done: true },
    { id: "proSup", label: "Pronation and supination", points: r.proSup, max: 2, raw: `${r.proSup} of 2`, done: true },
    { id: "fnf", label: "Finger to nose", points: r.fnf, max: 2, raw: `${r.fnf} of 2`, done: true },
  ];

  const driven = r.completedDrives ?? 6;
  const sim = (i: number, item: Omit<Item, "done">): Item => (i < driven ? { ...item, done: true } : { ...item, points: 0, max: 0, raw: "Not completed", done: false });
  const simulator: Item[] = [
    r.reactionMs === undefined
      ? { id: "reaction", label: "Reaction time", points: 0, max: 0, raw: "No brake response recorded", done: false }
      : sim(0, { id: "reaction", label: "Reaction time", points: reactionPoints(r.reactionMs), max: 3, raw: `${(r.reactionMs / 1000).toFixed(2)} s` }),
    sim(1, { id: "right", label: "Right turns", points: sum(r.rightTurns), max: 6, raw: r.rightTurns.join(", ") }),
    sim(2, { id: "left", label: "Left turns", points: sum(r.leftTurns), max: 9, raw: r.leftTurns.join(", ") + (r.collision ? ", collision" : "") }),
    sim(3, { id: "lane", label: "Lane changes", points: sum(r.laneChanges), max: 12, raw: r.laneChanges.join(", ") }),
    sim(4, { id: "fod", label: "Object detection", points: r.fod, max: 5, raw: `${r.fod} of 5` }),
    sim(5, { id: "choice", label: "Drive of choice", points: r.driveChoice, max: 5, raw: `${r.driveChoice} of 5` }),
  ];

  const domains: Domain[] = [
    { id: "vision", label: "Vision", patientLabel: "Vision", items: vision, points: sum(vision.map((i) => i.points)), max: 20 },
    { id: "cognition", label: "Cognition", patientLabel: "Thinking and memory", items: cognitionItems, points: round1((cognitionRaw * 20) / 17), max: round1((cognitionMax * 20) / 17) },
    { id: "motor", label: "Motor", patientLabel: "Strength and movement", items: motor, points: sum(motor.map((i) => i.points)), max: 20 },
    { id: "simulator", label: "Simulator", patientLabel: "Simulator drive", items: simulator, points: sum(simulator.map((i) => i.points)), max: sum(simulator.map((i) => i.max)) },
  ];

  const total = Math.round(sum(domains.map((d) => d.points)));
  const possible = Math.round(sum(domains.map((d) => d.max)));
  const incomplete = possible < 100;
  const missing = [...cognitionItems, ...simulator].filter((i) => !i.done).map((i) => i.label.toLowerCase());

  const findings: Finding[] = [];
  const collisionCounts = r.collision && driven > 2;
  if (acuityIndex(r.acuity) > acuityIndex("20/100")) findings.push({ kind: "hardStop", text: `Acuity ${r.acuity} both eyes, worse than 20/100` });
  if (r.fields === 0) findings.push({ kind: "hardStop", text: "Hemianopia: half the visual field missed in both eyes" });
  if (r.trailsSeconds === null) findings.push({ kind: "hardStop", text: `${trailsLabel} not finished` });
  if (collisionCounts) findings.push({ kind: "hardStop", text: "Collision during left turn 2" });
  if (r.missedSignal) findings.push({ kind: "hardStop", text: "Missed a red light or stop sign" });
  if (driven < 6) findings.push({ kind: "flag", text: `Drive stopped after ${driven} of 6 drives` });
  if (incomplete) findings.push({ kind: "flag", text: `Not completed: ${missing.join(", ")}. Score is out of ${possible}.` });
  if (acuityIndex(r.acuity) > acuityIndex("20/40") && acuityIndex(r.acuity) <= acuityIndex("20/100")) findings.push({ kind: "flag", text: `Acuity ${r.acuity} both eyes, worse than 20/40` });
  if (acuityIndex(r.worseEye) > acuityIndex("20/40")) findings.push({ kind: "flag", text: `Worse eye ${r.worseEye}, worse than 20/40` });
  if (r.moca <= 18) findings.push({ kind: "flag", text: `MoCA ${r.moca}, at or below 18` });
  if (typeof r.trailsSeconds === "number" && !r.trailsShort && r.trailsSeconds > 180) findings.push({ kind: "flag", text: `Trails B ${r.trailsSeconds} s, over 180` });

  const hardStops = findings.filter((f) => f.kind === "hardStop");
  const pct = possible > 0 ? (total / possible) * 100 : 0;
  let suggested: Outcome;
  if (hardStops.length) {
    // Poor acuity alone is often treatable (cataract, new glasses), so it suggests a pause.
    const acuityOnly = hardStops.every((f) => f.text.startsWith("Acuity"));
    suggested = acuityOnly ? "pause" : "stop";
  } else if (pct >= 85 && findings.length === 0) suggested = "clear";
  else if (pct >= 70) suggested = "conditions";
  else if (pct >= 55) suggested = "pause";
  else suggested = "stop";

  return { total, possible, incomplete, domains, findings, suggested };
}
