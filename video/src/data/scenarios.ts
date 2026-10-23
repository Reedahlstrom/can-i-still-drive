import { list, tr } from "../i18n";
import type { DriveId } from "./drives";
import type { DriveRaw, Outcome, ScoreResult } from "../lib/score";

export type ScenarioKey = "live" | Outcome;

export const scenarioLabels: Record<ScenarioKey, string> = {
  live: "Live",
  clear: "Clear",
  conditions: "With conditions",
  pause: "Pause",
  stop: "Time to stop",
};

export const presets: Record<Outcome, DriveRaw> = {
  clear: {
    reaction: { trials: [610, 660, 650] },
    right: { checks: 9 },
    left: { checks: 8, shortestGap: 6.2, collision: false },
    lane: { checks: 11, missed: "Late signal on change 3" },
    fod: { spotted: 7, avgMs: 850 },
    night: { spotted: 4, drift: 0.6 },
    city: { violations: [] },
  },
  conditions: {
    reaction: { trials: [820, 900, 860] },
    right: { checks: 8, missed: "No full stop at turn 2" },
    left: { checks: 7, shortestGap: 4.6, collision: false },
    lane: { checks: 7, missed: "Mirror check on changes 1 and 3, blind spot on change 2" },
    fod: { spotted: 6, avgMs: 1100 },
    night: { spotted: 3, drift: 1.2 },
    city: { violations: ["Drifted 6 mph over the limit once"] },
  },
  pause: {
    reaction: { trials: [1020, 1100, 1080] },
    right: { checks: 7, missed: "Rolled the stop at turns 1 and 3" },
    left: { checks: 7, shortestGap: 4.2, collision: false },
    lane: { checks: 8, missed: "Mirror check on change 2, gap under 2 s on change 3" },
    fod: { spotted: 4, avgMs: 1400 },
    night: { spotted: 2, drift: 2.1 },
    city: { violations: ["Slow to notice a pedestrian at a crosswalk"] },
  },
  stop: {
    reaction: { trials: [1300, 1380, 1290] },
    right: { checks: 6, missed: "No full stop at turn 1, did not look right at turn 3" },
    left: { checks: 4, shortestGap: 2.3, collision: true },
    lane: { checks: 7, missed: "Mirror checks on all three changes" },
    fod: { spotted: 5, avgMs: 1300 },
    night: { spotted: 3, drift: 2.0 },
    city: { violations: ["Rolled through a stop sign", "Ended in the wrong lane after a turn"], ranStop: true },
  },
};

export const outcomeCopy: Record<
  Outcome,
  { label: string; title: string; note: string; conditions: string[]; plan: string[]; retestMonths: number }
> = {
  clear: {
    label: "Clear",
    title: "You're clear to drive.",
    note: "Your braking, turns, lane changes and city driving all went well, and you spotted hazards in the night drive. I found no reason to limit your driving right now.",
    conditions: [],
    plan: ["Yearly eye exam"],
    retestMonths: 12,
  },
  conditions: {
    label: "Drive with conditions",
    title: "You can keep driving, with a few limits.",
    note: "Your braking, turns and city driving went well. In the night drive, low light made it harder to spot hazards, and on lane changes you missed some mirror and blind-spot checks. Keep to the limits below until your re-test.",
    conditions: ["Daylight only", "No highways", "Within 15 miles of home"],
    plan: ["Eye exam for your left eye", "Two practice drives on the simulator"],
    retestMonths: 6,
  },
  pause: {
    label: "Pause and reassess",
    title: "Pause driving until you're treated and re-tested.",
    note: "In the night drive and when spotting objects, you missed hazards at the edges of your vision, and your braking was slower than usual. Your eye doctor and Dr. Patel will look at your cataract and your sleep medicine. Once they have, we'll test again.",
    conditions: [],
    plan: ["Cataract review", "Sleep medicine review", "Re-test after treatment"],
    retestMonths: 0,
  },
  stop: {
    label: "Time to stop",
    title: "It's time to stop driving.",
    note: "On the simulator you turned left into the path of an oncoming car, rolled through a stop sign, and braked slowly. That tells me driving isn't safe for you now. We went over this together today. A memory clinic will look into the cause. If they find something that can be treated, I'll test you again.",
    conditions: [],
    plan: ["Memory clinic visit", "Ask Sarah to help with rides"],
    retestMonths: 0,
  },
};

const strengths: Record<DriveId, string> = {
  reaction: "braking",
  right: "right turns",
  left: "left turns",
  lane: "lane changes",
  fod: "side vision",
  night: "night driving",
  city: "city driving",
};

const closing: Record<Outcome, string> = {
  clear: "I found no reason to limit your driving right now.",
  conditions: "Keep to the limits below until your re-test.",
  pause: "Your eye doctor and Dr. Patel will look at your cataract and your sleep medicine. Once they have, we'll test again.",
  stop: "That tells me driving isn't safe for you now. We went over this together today. A memory clinic will look into the cause. If they find something that can be treated, I'll test you again.",
};

/** The specialist's draft note to the patient, built only from the drives that were scored, in the demo's language. */
export function draftNote(outcome: Outcome, result: ScoreResult) {
  const scored = result.drives.filter((d) => d.done);
  const good = scored.filter((d) => !d.hardStop && d.points >= 8).map((d) => tr(strengths[d.id]));
  const weak = scored
    .filter((d) => d.hardStop || d.points < 7)
    .sort((a, b) => Number(!!b.hardStop) - Number(!!a.hardStop) || a.points - b.points)
    .slice(0, 3)
    .map((d) => d.patient);
  const parts: string[] = [];
  if (good.length && outcome !== "stop") parts.push(tr("Your {list} went well.", { list: list(good) }));
  parts.push(...weak, tr(closing[outcome]));
  return parts.join(tr(" "));
}

/** Who takes care of each plan item, in the patient's words, with a fallback if the call never comes. */
export const planDetail: Record<string, string> = {
  "Yearly eye exam": "Book with your eye doctor before this time next year.",
  "Eye exam for your left eye": "Dr. Patel gets your report and will refer you to Granite Eye Associates. No call within a week? Call (801) 555-0100.",
  "Cataract review": "Dr. Patel gets your report and will refer you to Granite Eye Associates. No call within a week? Call (801) 555-0100.",
  "Sleep medicine review": "Dana sent Dr. Patel a note. Dr. Patel's office will call you. No call within a week? Call (801) 555-0100.",
  "Two practice drives on the simulator": "Dana's office will call you to book. No call within a week? Call (801) 555-0204.",
  "On-road driving check": "Dana's office will call you to book. No call within a week? Call (801) 555-0204.",
  "Therapy for strength": "Dana's office will refer you to Lakeview Rehabilitation. No call within a week? Call (801) 555-0204.",
  "Memory clinic visit": "Dr. Patel's office will call you to book. No call within a week? Call (801) 555-0100.",
  "Ask Sarah to help with rides": "Only if you want to. Tap Ride with Sarah when you need one.",
  "Re-test after treatment": "Dr. Patel's office tells Dana when your treatment is done. Then Dana's office calls you to book.",
};

export const conditionLibrary = ["Daylight only", "No highways", "Within 15 miles of home", "No passengers", "Spinner knob", "Extra mirrors"];

export const planLibrary = Object.keys(planDetail);
