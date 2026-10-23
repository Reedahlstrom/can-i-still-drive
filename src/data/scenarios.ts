import type { Outcome, Raw } from "../lib/score";

export type ScenarioKey = "live" | Outcome;

export const scenarioLabels: Record<ScenarioKey, string> = {
  live: "Live",
  clear: "Clear",
  conditions: "With conditions",
  pause: "Pause",
  stop: "Time to stop",
};

export const presets: Record<Outcome, Raw> = {
  clear: {
    acuity: "20/30", worseEye: "20/30", ocularRom: 4, pursuits: 3, fields: 7,
    moca: 27, clock: 2, trailsSeconds: 72, signs: 4, colors: 5, choice: 2,
    rom: 6, strength: 7, footTap: 2, proSup: 2, fnf: 2,
    reactionMs: 640, rightTurns: [2, 2, 2], leftTurns: [3, 3, 2], laneChanges: [4, 3, 3], fod: 3, driveChoice: 5,
    collision: false, missedSignal: false,
  },
  conditions: {
    acuity: "20/40", worseEye: "20/50", ocularRom: 4, pursuits: 3, fields: 5,
    moca: 24, clock: 2, trailsSeconds: 128, signs: 4, colors: 4, choice: 2,
    rom: 6, strength: 6, footTap: 2, proSup: 1, fnf: 2,
    reactionMs: 880, rightTurns: [2, 2, 1], leftTurns: [2, 2, 2], laneChanges: [3, 3, 2], fod: 3, driveChoice: 4,
    collision: false, missedSignal: false,
  },
  pause: {
    acuity: "20/70", worseEye: "20/100", ocularRom: 4, pursuits: 3, fields: 5,
    moca: 23, clock: 2, trailsSeconds: 140, signs: 3, colors: 4, choice: 2,
    rom: 6, strength: 5, footTap: 2, proSup: 1, fnf: 2,
    reactionMs: 1050, rightTurns: [2, 1, 1], leftTurns: [2, 2, 1], laneChanges: [2, 2, 2], fod: 2, driveChoice: 3,
    collision: false, missedSignal: false,
  },
  stop: {
    acuity: "20/50", worseEye: "20/70", ocularRom: 3, pursuits: 2, fields: 5,
    moca: 17, clock: 1, trailsSeconds: null, signs: 2, colors: 3, choice: 1,
    rom: 5, strength: 5, footTap: 1, proSup: 1, fnf: 2,
    reactionMs: 1400, rightTurns: [1, 1, 1], leftTurns: [1, 0, 1], laneChanges: [2, 1, 1], fod: 1, driveChoice: 2,
    collision: true, missedSignal: false,
  },
};

export const outcomeCopy: Record<
  Outcome,
  { label: string; title: string; note: string; conditions: string[]; plan: string[]; retestMonths: number }
> = {
  clear: {
    label: "Clear",
    title: "You're clear to drive.",
    note: "Your vision, thinking and reactions are all where they need to be. Keep your eye exams up to date and come back next year.",
    conditions: [],
    plan: ["Yearly eye exam"],
    retestMonths: 12,
  },
  conditions: {
    label: "Drive with conditions",
    title: "You can keep driving, with a few limits.",
    note: "You drove well on familiar roads. Lane changes at speed and glare were harder, so stay off highways and drive in daylight for now.",
    conditions: ["Daylight only", "No highways", "Within 15 miles of home"],
    plan: ["Eye exam for glare", "Two practice drives on the simulator"],
    retestMonths: 6,
  },
  pause: {
    label: "Pause and reassess",
    title: "Let's pause driving for now.",
    note: "Your cataract is affecting your vision more than in March, and your sleep medicine may be adding to it. Both can be treated. Once they are, we'll test again.",
    conditions: [],
    plan: ["Cataract review with Granite Eye Associates", "Ask Dr. Patel about your sleep medicine", "Re-test after treatment"],
    retestMonths: 3,
  },
  stop: {
    label: "Time to stop",
    title: "It's time to stop driving.",
    note: "We talked about this today. Your plan below makes sure you can still get everywhere you need to go.",
    conditions: [],
    plan: ["Memory clinic referral", "Sarah added as your support person"],
    retestMonths: 0,
  },
};

export const conditionLibrary = ["Daylight only", "No highways", "Within 15 miles of home", "No passengers", "Spinner knob", "Extra mirrors"];

export const planLibrary = [
  "Yearly eye exam",
  "Eye exam for glare",
  "Cataract review with Granite Eye Associates",
  "Ask Dr. Patel about your sleep medicine",
  "Two practice drives on the simulator",
  "On-road evaluation with a CDRS",
  "Occupational therapy for strength",
  "Memory clinic referral",
  "Sarah added as your support person",
  "Re-test after treatment",
];
