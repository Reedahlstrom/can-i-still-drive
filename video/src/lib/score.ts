// DriverScore v0: scores the simulator drives the specialist assigned. Every drive is out of 10, every
// score carries the measurement and the rule behind it, and the suggestion shows each step of its logic.
// Missing is not zero: drives not completed leave the total and are reported.

import { driveById, sortDrives, type DriveId } from "../data/drives";

export type Outcome = "clear" | "conditions" | "pause" | "stop";

export type DriveRaw = {
  reaction: { trials: number[]; ranRed?: boolean }; // empty: no brake response recorded
  right: { checks: number; missed?: string };
  left: { checks: number; shortestGap: number; collision: boolean };
  lane: { checks: number; missed?: string };
  fod: { spotted: number; avgMs: number };
  night: { spotted: number; drift: number };
  city: { violations: string[]; ranStop?: boolean };
};

export type DriveScore = {
  id: DriveId;
  name: string;
  points: number;
  max: number;
  done: boolean;
  metrics: string;
  rule: string;
  reason: string;
  patient: string;
  hardStop?: string;
};

export type Finding = { kind: "hardStop" | "flag"; text: string };
export type LogicStep = { text: string; pass: boolean };

export type ScoreResult = {
  total: number;
  completed: number;
  assigned: number;
  incomplete: boolean;
  drives: DriveScore[];
  findings: Finding[];
  logic: LogicStep[];
  suggested: Outcome;
  conditions: string[];
};

const s2 = (ms: number) => (ms / 1000).toFixed(2);

function scoreDrive(id: DriveId, r: DriveRaw): Omit<DriveScore, "id" | "name" | "max" | "done"> {
  switch (id) {
    case "reaction": {
      const n = r.reaction.trials.length;
      const ms = n ? r.reaction.trials.reduce((a, b) => a + b, 0) / n : 0;
      const avg = s2(ms);
      const metrics = n === 0 ? "No brake response recorded." : n === 1 ? `One trial: ${avg} s.` : `${n} trials: ${r.reaction.trials.map(s2).join(", ")} s. Average ${avg} s.`;
      const rule = "10 at 0.75 s or faster, 8 to 0.90 s, 6 to 1.10 s, 4 to 1.30 s, 2 if slower. Running the red light is a hard stop.";
      if (r.reaction.ranRed) return { points: 0, metrics, rule, reason: "Ran the red light.", patient: "In the brake reaction drive you went through the red light.", hardStop: "Ran the red light in the brake reaction drive" };
      const points = ms <= 750 ? 10 : ms <= 900 ? 8 : ms <= 1100 ? 6 : ms <= 1300 ? 4 : 2;
      const band = ms <= 750 ? "fast" : ms <= 900 ? "normal" : ms <= 1100 ? "slower than normal" : "slow";
      const patient = ms <= 900 ? `You braked quickly: ${avg} seconds on average.` : ms <= 1100 ? `Your braking was a little slow: ${avg} seconds on average.` : `Your braking was slow: ${avg} seconds on average.`;
      return { points, metrics, rule, reason: `Average ${avg} s, ${band}.`, patient };
    }
    case "right": {
      const points = Math.round((r.right.checks / 9) * 10);
      return {
        points,
        metrics: `3 turns, 3 checks each: full stop, look both ways, under 15 mph. Passed ${r.right.checks} of 9.${r.right.missed ? ` Missed: ${r.right.missed}.` : ""}`,
        rule: "Checks passed out of 9, scaled to 10.",
        reason: `${r.right.checks} of 9 checks.`,
        patient: r.right.checks >= 8 ? "Your right turns were careful." : `You missed some checks on right turns: ${r.right.missed?.toLowerCase() ?? "stops and scanning"}.`,
      };
    }
    case "left": {
      const g = r.left.shortestGap.toFixed(1);
      const metrics = `3 turns. Checks passed ${r.left.checks} of 9. Shortest gap accepted ${g} s.`;
      const rule = "Checks out of 9, scaled to 10. Minus 2 for taking a gap under 4 s. A collision is a hard stop and scores 0.";
      if (r.left.collision)
        return { points: 0, metrics, rule, reason: `Turned into an oncoming car at turn 2 (gap ${g} s).`, patient: "At one left turn you turned in front of an oncoming car.", hardStop: "Collision during left turn 2" };
      const unsafe = r.left.shortestGap < 4;
      const points = Math.max(0, Math.round((r.left.checks / 9) * 10) - (unsafe ? 2 : 0));
      const close = r.left.shortestGap < 4.5;
      const patient = unsafe
        ? "On one left turn you took a gap that was too short."
        : r.left.checks < 8
          ? `On left turns you missed some checks${close ? ", and one gap was close" : ""}.`
          : close
            ? "Your left turns were mostly safe, though one gap was close."
            : "You waited for safe gaps on left turns.";
      return {
        points,
        metrics,
        rule,
        reason: `${r.left.checks} of 9 checks. ${unsafe ? `Took a ${g} s gap, under the 4 s rule.` : `Shortest gap ${g} s, above the 4 s rule.`}`,
        patient,
      };
    }
    case "lane": {
      const points = Math.round((r.lane.checks / 12) * 10);
      return {
        points,
        metrics: `3 changes, 4 checks each: mirror, signal, blind spot, 2 s gap. Passed ${r.lane.checks} of 12.${r.lane.missed ? ` Missed: ${r.lane.missed}.` : ""}`,
        rule: "Checks passed out of 12, scaled to 10.",
        reason: `${r.lane.checks} of 12 checks.`,
        patient: r.lane.checks >= 10 ? "Your lane changes were smooth and well checked." : `Lane changes were harder: ${r.lane.missed?.toLowerCase() ?? "some checks were missed"}.`,
      };
    }
    case "fod": {
      const slow = r.fod.avgMs > 1200;
      const points = Math.max(0, Math.round((r.fod.spotted / 8) * 10) - (slow ? 1 : 0));
      return {
        points,
        metrics: `${r.fod.spotted} of 8 objects spotted at the edges of the screen. Average response ${s2(r.fod.avgMs)} s.`,
        rule: "Spotted out of 8, scaled to 10. Minus 1 if the average response is slower than 1.2 s.",
        reason: `${r.fod.spotted} of 8 spotted${slow ? ", slow responses" : ""}.`,
        patient: r.fod.spotted >= 7 ? "You spotted almost everything at the edges of your vision." : `You missed ${8 - r.fod.spotted} of 8 objects at the edges of your vision.`,
      };
    }
    case "night": {
      const drift = r.night.drift > 1.5;
      const points = Math.max(0, Math.round((r.night.spotted / 5) * 10) - (drift ? 1 : 0));
      return {
        points,
        metrics: `${r.night.spotted} of 5 hazards spotted under oncoming glare. Lane drift up to ${r.night.drift.toFixed(1)} ft.`,
        rule: "Spotted out of 5, scaled to 10. Minus 1 if lane drift is over 1.5 ft.",
        reason: `${r.night.spotted} of 5 hazards spotted${drift ? ", drifted in the lane" : ""}.`,
        patient: r.night.spotted >= 4 ? "At night you spotted hazards well, even with glare." : `At night, glare made it hard to see: you spotted ${r.night.spotted} of 5 hazards.`,
      };
    }
    case "city": {
      const v = r.city.violations;
      const metrics = v.length ? `Errors: ${v.join("; ")}.` : "No errors. Signs, signals and speed all followed.";
      const rule = "Starts at 10, minus 2 per error. Running a stop sign or red light is a hard stop.";
      if (r.city.ranStop) return { points: 0, metrics, rule, reason: "Rolled through a stop sign.", patient: "In town you rolled through a stop sign.", hardStop: "Rolled through a stop sign in the city drive" };
      return {
        points: Math.max(0, 10 - 2 * v.length),
        metrics,
        rule,
        reason: v.length ? `${v.length} ${v.length === 1 ? "error" : "errors"}.` : "No errors.",
        patient: v.length ? `In town: ${v[0].charAt(0).toLowerCase()}${v[0].slice(1)}.` : "Your city driving followed every sign and signal.",
      };
    }
  }
}

const outcomeName: Record<Outcome, string> = { clear: "Clear", conditions: "Drive with conditions", pause: "Pause and reassess", stop: "Time to stop" };

export function score(raw: DriveRaw, assignedIds: DriveId[], completed?: number, hardStopSeen = false): ScoreResult {
  const assigned = sortDrives(assignedIds);
  const done = Math.min(completed ?? assigned.length, assigned.length);

  const drives: DriveScore[] = assigned.map((id, i) => {
    const base = { id, name: driveById[id].name, max: 10 };
    if (id === "reaction" && raw.reaction.trials.length === 0 && !raw.reaction.ranRed)
      return { ...base, done: false, points: 0, max: 0, metrics: "No brake response recorded", rule: "", reason: "No brake response recorded", patient: "Not completed" };
    if (i < done) return { ...base, done: true, ...scoreDrive(id, raw) };
    // A hard stop already seen before the drive was stopped still counts.
    if (i === done && hardStopSeen) {
      const s = scoreDrive(id, raw);
      if (s.hardStop) return { ...base, done: true, ...s };
    }
    return { ...base, done: false, points: 0, max: 0, metrics: "Not completed", rule: "", reason: "Not completed", patient: "Not completed" };
  });

  const scored = drives.filter((d) => d.done);
  const total = scored.length ? Math.round((scored.reduce((a, d) => a + d.points, 0) / (scored.length * 10)) * 100) : 0;
  const incomplete = scored.length < assigned.length;

  const findings: Finding[] = [];
  for (const d of scored) if (d.hardStop) findings.push({ kind: "hardStop", text: d.hardStop });
  if (done < assigned.length) findings.push({ kind: "flag", text: `Stopped during drive ${done + 1} of ${assigned.length}. The score covers the ${scored.length} ${scored.length === 1 ? "drive" : "drives"} with results.` });
  if (drives.some((d) => d.id === "reaction" && !d.done && assigned.indexOf("reaction") < done)) findings.push({ kind: "flag", text: "Brake reaction: no response recorded. Left out of the score." });
  for (const d of scored) if (!d.hardStop && d.points < 6) findings.push({ kind: "flag", text: `${d.name}: ${d.points} of 10. ${d.reason}` });

  const byId = Object.fromEntries(scored.map((d) => [d.id, d])) as Partial<Record<DriveId, DriveScore>>;
  const hard = scored.filter((d) => d.hardStop);
  const visionDrives = scored.filter((d) => d.id === "night" || d.id === "fod");
  const visionLow = visionDrives.filter((d) => d.points < 5);
  const anyBelow6 = scored.some((d) => d.points < 6);

  const logic: LogicStep[] = [];
  let suggested: Outcome;
  // A hard stop decides on its own, even when the drive ended early.
  logic.push(hard.length ? { text: `Hard stop: ${hard.map((d) => d.hardStop).join("; ")}`, pass: false } : { text: "No hard stops", pass: true });
  if (hard.length) suggested = "stop";
  else if (scored.length < 3) {
    logic.push({ text: `${scored.length} of ${assigned.length} ${assigned.length === 1 ? "drive" : "drives"} completed: at least 3 needed to decide`, pass: false });
    suggested = "pause";
  } else {
    if (visionDrives.length)
      logic.push(visionLow.length ? { text: `Vision drives below 5: ${visionLow.map((d) => `${d.name} ${d.points}`).join(", ")}`, pass: false } : { text: "Vision drives at 5 or above", pass: true });
    if (visionLow.length) suggested = "pause";
    else if (total >= 85 && !anyBelow6) suggested = "clear";
    else if (total >= 70) suggested = "conditions";
    else if (total >= 55) suggested = "pause";
    else suggested = "stop";
    if (!visionLow.length) {
      const band =
        total >= 85 && !anyBelow6 ? "85 or higher, no drive below 6" : total >= 85 ? "85 or higher, but a drive is below 6" : total >= 70 ? "70 to 84" : total >= 55 ? "55 to 69" : "below 55";
      logic.push({ text: `DriverScore ${total}: ${band}`, pass: suggested === "clear" });
    }
  }
  logic.push({ text: `Suggests ${outcomeName[suggested]}`, pass: suggested === "clear" });

  const conditions: string[] = [];
  if ((byId.night?.points ?? 10) < 7) conditions.push("Daylight only");
  if ((byId.lane?.points ?? 10) < 7) conditions.push("No highways");
  if ((byId.left?.points ?? 10) < 7 || (byId.city?.points ?? 10) < 8) conditions.push("Within 15 miles of home");

  return { total, completed: scored.length, assigned: assigned.length, incomplete, drives, findings, logic, suggested, conditions };
}
