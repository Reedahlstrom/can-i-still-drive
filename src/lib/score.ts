// DriverScore v0, following the CISD scoring sheet and the iPad spec's version-0 rules.
// Cognition items total 17 on the sheet; v0 rescales them to 20.

export type Outcome = "clear" | "conditions" | "pause" | "stop";

export const acuityScale = ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/80", "20/100", "20/200"] as const;
export type Acuity = (typeof acuityScale)[number];

export type Raw = {
  acuity: Acuity; // best corrected, both eyes
  worseEye: Acuity;
  ocularRom: number; // 0-4
  pursuits: number; // 0-4
  fields: number; // 0-7 (points rule already applied by the clinician)
  moca: number; // raw, out of 30
  clock: number; // 0-2
  trailsSeconds: number | null; // null: not finished within the time limit
  trailsShort?: boolean; // short demo form taken live
  signs: number; // correct of 5
  colors: number; // correct of 6
  choice: number; // correct of 3
  rom: number; // 0-6
  strength: number; // 0-8
  footTap: number; // 0-2
  proSup: number; // 0-2
  fnf: number; // 0-2
  reactionMs: number;
  rightTurns: [number, number, number]; // each 0-2
  leftTurns: [number, number, number]; // each 0-3
  laneChanges: [number, number, number]; // each 0-4
  fod: number; // 0-5
  driveChoice: number; // 0-5
  collision: boolean;
  missedSignal: boolean;
};

export type Item = { id: string; label: string; points: number; max: number; raw: string };
export type Domain = { id: "vision" | "cognition" | "motor" | "simulator"; label: string; patientLabel: string; items: Item[]; points: number; max: number };
export type Finding = { kind: "hardStop" | "flag"; text: string };

export type ScoreResult = {
  total: number;
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

export function score(r: Raw): ScoreResult {
  const vision: Item[] = [
    { id: "acuity", label: "Acuity", points: acuityPoints(r.acuity), max: 5, raw: `${r.acuity} both eyes` },
    { id: "ocularRom", label: "Ocular range of motion", points: r.ocularRom, max: 4, raw: `${r.ocularRom} of 4 directions full` },
    { id: "pursuits", label: "Pursuits", points: r.pursuits, max: 4, raw: r.pursuits === 4 ? "Smooth in both planes" : "Some jerky tracking" },
    { id: "fields", label: "Visual fields", points: r.fields, max: 7, raw: r.fields === 7 ? "Full" : r.fields >= 5 ? "One quadrant missed, one eye" : "Several quadrants missed" },
  ];

  const signPts = Math.round((3 * r.signs) / 5);
  const colorPts = Math.round((2 * r.colors) / 6);
  const choicePts = Math.round((2 * r.choice) / 3);
  const cognitionItems: Item[] = [
    { id: "moca", label: "MoCA", points: mocaPoints(r.moca), max: 6, raw: `${r.moca} of 30` },
    { id: "clock", label: "Clock drawing", points: r.clock, max: 2, raw: `${r.clock} of 2` },
    {
      id: "trails",
      label: r.trailsShort ? "Trails B (short form)" : "Trails B",
      points: trailsPoints(r.trailsSeconds, r.trailsShort),
      max: 2,
      raw: r.trailsSeconds === null ? "Not finished in 300 s" : `${r.trailsSeconds} s`,
    },
    { id: "signs", label: "Signs, colors, choices", points: signPts + colorPts + choicePts, max: 7, raw: `Signs ${r.signs}/5, colors ${r.colors}/6, choices ${r.choice}/3` },
  ];
  const cognitionRaw = sum(cognitionItems.map((i) => i.points));

  const motor: Item[] = [
    { id: "rom", label: "Range of motion", points: r.rom, max: 6, raw: `${r.rom} of 6` },
    { id: "strength", label: "Strength", points: r.strength, max: 8, raw: `${r.strength} of 8` },
    { id: "footTap", label: "Foot tap", points: r.footTap, max: 2, raw: `${r.footTap} of 2` },
    { id: "proSup", label: "Pronation and supination", points: r.proSup, max: 2, raw: `${r.proSup} of 2` },
    { id: "fnf", label: "Finger to nose", points: r.fnf, max: 2, raw: `${r.fnf} of 2` },
  ];

  const simulator: Item[] = [
    { id: "reaction", label: "Reaction time", points: reactionPoints(r.reactionMs), max: 3, raw: `${(r.reactionMs / 1000).toFixed(2)} s` },
    { id: "right", label: "Right turns", points: sum(r.rightTurns), max: 6, raw: r.rightTurns.join(", ") },
    { id: "left", label: "Left turns", points: sum(r.leftTurns), max: 9, raw: r.leftTurns.join(", ") + (r.collision ? ", collision" : "") },
    { id: "lane", label: "Lane changes", points: sum(r.laneChanges), max: 12, raw: r.laneChanges.join(", ") },
    { id: "fod", label: "Object detection", points: r.fod, max: 5, raw: `${r.fod} of 5` },
    { id: "choice", label: "Drive of choice", points: r.driveChoice, max: 5, raw: `${r.driveChoice} of 5` },
  ];

  const domains: Domain[] = [
    { id: "vision", label: "Vision", patientLabel: "Vision", items: vision, points: sum(vision.map((i) => i.points)), max: 20 },
    { id: "cognition", label: "Cognition", patientLabel: "Thinking and memory", items: cognitionItems, points: round1((cognitionRaw * 20) / 17), max: 20 },
    { id: "motor", label: "Motor", patientLabel: "Strength and movement", items: motor, points: sum(motor.map((i) => i.points)), max: 20 },
    { id: "simulator", label: "Simulator", patientLabel: "Simulator drive", items: simulator, points: sum(simulator.map((i) => i.points)), max: 40 },
  ];

  const total = Math.round(sum(domains.map((d) => d.points)));

  const findings: Finding[] = [];
  if (acuityIndex(r.acuity) > acuityIndex("20/100")) findings.push({ kind: "hardStop", text: `Acuity ${r.acuity}, worse than 20/100` });
  if (r.fields === 0) findings.push({ kind: "hardStop", text: "Half the visual field missed in both eyes" });
  if (r.trailsSeconds === null) findings.push({ kind: "hardStop", text: "Trails B not finished in 300 seconds" });
  if (r.collision) findings.push({ kind: "hardStop", text: "Driver-caused collision in a scored drive" });
  if (r.missedSignal) findings.push({ kind: "hardStop", text: "Missed a red light or stop sign" });
  if (acuityIndex(r.worseEye) > acuityIndex("20/40")) findings.push({ kind: "flag", text: `One eye ${r.worseEye}, worse than 20/40` });
  if (r.moca <= 18) findings.push({ kind: "flag", text: `MoCA ${r.moca}, at or below 18` });
  if (r.trailsSeconds !== null && !r.trailsShort && r.trailsSeconds > 180) findings.push({ kind: "flag", text: `Trails B ${r.trailsSeconds} s, over 180` });
  for (const d of domains) if (d.points < d.max / 2) findings.push({ kind: "flag", text: `${d.label} below half its points` });

  const hardStops = findings.filter((f) => f.kind === "hardStop");
  let suggested: Outcome;
  if (hardStops.length) {
    const visionOnly = hardStops.every((f) => f.text.startsWith("Acuity") || f.text.startsWith("Half the visual"));
    suggested = visionOnly ? "pause" : "stop";
  } else if (total >= 85 && findings.length === 0) suggested = "clear";
  else if (total >= 70) suggested = "conditions";
  else if (total >= 55) suggested = "pause";
  else suggested = "stop";

  return { total, domains, findings, suggested };
}
