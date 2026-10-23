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
    note: "Your vision, thinking, strength and simulator drive all came out well. I found no reason to limit your driving right now.",
    conditions: [],
    plan: ["Yearly eye exam"],
    retestMonths: 12,
  },
  conditions: {
    label: "Drive with conditions",
    title: "You can keep driving, with a few limits.",
    note: "You drove well on familiar roads. Lane changes at highway speed were harder, and the vision in your left eye has dropped since last year. Until your re-test, drive in daylight, stay off highways and stay within 15 miles of home.",
    conditions: ["Daylight only", "No highways", "Within 15 miles of home"],
    plan: ["Eye exam for glare", "Two practice drives on the simulator"],
    retestMonths: 6,
  },
  pause: {
    label: "Pause and reassess",
    title: "Pause driving until your eyes are treated.",
    note: "Your cataract is affecting your vision more than it did in March, and your sleep medicine may be making you drowsy in the morning. Both can be treated. Once they are, we'll test again.",
    conditions: [],
    plan: ["Cataract review", "Sleep medicine review", "Re-test after treatment"],
    retestMonths: 0,
  },
  stop: {
    label: "Time to stop",
    title: "It's time to stop driving.",
    note: "Your memory test and the simulator drive showed that driving isn't safe for you right now. At one left turn you didn't see an oncoming car. We went over this together today. A memory clinic will look into why.",
    conditions: [],
    plan: ["Memory clinic visit", "Ask Sarah to help with rides"],
    retestMonths: 0,
  },
};

/** Who takes care of each plan item, in the patient's words. */
export const planDetail: Record<string, string> = {
  "Yearly eye exam": "Granite Eye Associates will send you a reminder.",
  "Eye exam for glare": "Granite Eye Associates will call you to book.",
  "Cataract review": "Granite Eye Associates will call you this week to book.",
  "Sleep medicine review": "Dana sent Dr. Patel a note. Dr. Patel's office will call you.",
  "Two practice drives on the simulator": "Dana's office will call you to book.",
  "On-road driving check": "Dana's office will call you to book.",
  "Therapy for strength": "Lakeview Rehabilitation will call you to book.",
  "Memory clinic visit": "Dr. Patel's office will call you to book.",
  "Ask Sarah to help with rides": "Only if you want to. You choose what Sarah sees in Family.",
  "Re-test after treatment": "Dana's office will call you once your treatment is done.",
};

export const conditionLibrary = ["Daylight only", "No highways", "Within 15 miles of home", "No passengers", "Spinner knob", "Extra mirrors"];

export const planLibrary = Object.keys(planDetail);

// Shown when the tablet tests were skipped in the demo.
export const sampleClock =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20360%20360%22%3E%3Crect%20width%3D%22360%22%20height%3D%22360%22%20fill%3D%22%23fff%22/%3E%3Cpath%20d%3D%22M333.0%2C180.0%20L333.2%2C193.4%20L331.6%2C206.7%20L328.4%2C219.8%20L323.7%2C232.3%20L317.9%2C244.3%20L311.1%2C255.7%20L303.6%2C266.5%20L295.4%2C276.8%20L286.6%2C286.6%20L277.0%2C295.7%20L266.8%2C303.9%20L255.8%2C311.2%20L244.0%2C317.2%20L231.6%2C321.9%20L218.8%2C325.0%20L205.8%2C326.6%20L192.8%2C326.8%20L180.0%2C326.0%20L167.4%2C324.3%20L155.0%2C322.0%20L142.7%2C319.4%20L130.4%2C316.3%20L118.1%2C312.8%20L105.8%2C308.6%20L93.5%2C303.5%20L81.6%2C297.2%20L70.4%2C289.6%20L60.3%2C280.5%20L51.5%2C270.0%20L44.4%2C258.3%20L39.0%2C245.8%20L35.3%2C232.7%20L33.1%2C219.4%20L32.2%2C206.1%20L32.2%2C192.9%20L33.0%2C180.0%20L34.3%2C167.3%20L36.1%2C154.6%20L38.6%2C142.1%20L41.8%2C129.7%20L46.0%2C117.5%20L51.3%2C105.7%20L57.8%2C94.5%20L65.6%2C84.0%20L74.4%2C74.4%20L84.2%2C65.8%20L94.7%2C58.2%20L105.7%2C51.4%20L117.2%2C45.3%20L129.0%2C39.9%20L141.2%2C35.2%20L153.8%2C31.1%20L166.7%2C28.0%20L180.0%2C26.0%20L193.5%2C25.5%20L207.0%2C26.6%20L220.3%2C29.6%20L233.0%2C34.4%20L244.9%2C40.9%20L255.8%2C48.8%20L265.6%2C57.8%20L274.5%2C67.4%20L282.6%2C77.4%20L290.1%2C87.6%20L297.3%2C97.9%20L304.2%2C108.3%20L310.9%2C119.0%20L317.2%2C130.1%20L322.9%2C141.7%20L327.7%2C154.0%20L331.1%2C166.8%20L333.0%2C180.0%22%20fill%3D%22none%22%20stroke%3D%22%231C2229%22%20stroke-width%3D%224%22%20stroke-linejoin%3D%22round%22/%3E%3Ctext%20x%3D%22239%22%20y%3D%2287%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E1%3C/text%3E%3Ctext%20x%3D%22282%22%20y%3D%22130%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E2%3C/text%3E%3Ctext%20x%3D%22298%22%20y%3D%22189%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E3%3C/text%3E%3Ctext%20x%3D%22282%22%20y%3D%22248%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E4%3C/text%3E%3Ctext%20x%3D%22239%22%20y%3D%22291%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E5%3C/text%3E%3Ctext%20x%3D%22180%22%20y%3D%22307%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E6%3C/text%3E%3Ctext%20x%3D%22121%22%20y%3D%22291%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E7%3C/text%3E%3Ctext%20x%3D%2278%22%20y%3D%22248%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E8%3C/text%3E%3Ctext%20x%3D%2262%22%20y%3D%22189%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E9%3C/text%3E%3Ctext%20x%3D%2278%22%20y%3D%22130%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E10%3C/text%3E%3Ctext%20x%3D%22121%22%20y%3D%2287%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E11%3C/text%3E%3Ctext%20x%3D%22180%22%20y%3D%2271%22%20font-family%3D%22Bradley%20Hand%2C%20Comic%20Sans%20MS%2C%20cursive%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20fill%3D%22%231C2229%22%3E12%3C/text%3E%3Cpath%20d%3D%22M180%20180%20L150%20110%20M180%20180%20L248%20140%22%20stroke%3D%22%231C2229%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22/%3E%3C/svg%3E";
