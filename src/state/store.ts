import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultAnswers } from "../data/demo";
import { outcomeCopy, presets, type ScenarioKey } from "../data/scenarios";
import { score, type Outcome, type Raw } from "../lib/score";

export type Phase =
  | "onboarding"
  | "ready"
  | "checked-in"
  | "record-review"
  | "tablet-tests"
  | "hands-on"
  | "pre-drive"
  | "driving"
  | "post-drive"
  | "uploading"
  | "review"
  | "released";

export const phaseOrder: Phase[] = [
  "onboarding",
  "ready",
  "checked-in",
  "record-review",
  "tablet-tests",
  "hands-on",
  "pre-drive",
  "driving",
  "post-drive",
  "uploading",
  "review",
  "released",
];

export const atLeast = (phase: Phase, min: Phase) => phaseOrder.indexOf(phase) >= phaseOrder.indexOf(min);

export type PatientStep =
  | "welcome"
  | "details"
  | "code"
  | "hk-intro"
  | "hk-connected"
  | "questions"
  | "home"
  | "where"
  | "which-sim"
  | "connecting";

export type HkStep = null | "signin" | "sources" | "share" | "assembling";
export type TabletStep = "handoff" | "trails" | "clock" | "signs" | "colors" | "choice" | "done";
export type Tab = "home" | "record" | "family";

export type Live = {
  trailsSeconds?: number | null;
  trailsErrors?: number;
  clock?: string;
  signs?: number;
  colors?: number;
  choice?: number;
  reactionMs?: number;
};

export type Determination = {
  outcome: Outcome;
  conditions: string[];
  plan: string[];
  retestMonths: number;
  note: string;
  discussed: boolean;
  signature: string | null;
  signedAt: number | null;
};

export type Ride = { dest: string; option: string; status: "choose" | "requested" | "arriving" } | null;

type Data = {
  scenario: ScenarioKey;
  speed: 1 | 2;
  phase: Phase;
  patientStep: PatientStep;
  questionIndex: number;
  hkStep: HkStep;
  tab: Tab;
  textScale: 1 | 1.15 | 1.3;
  hkConnected: boolean;
  hkSources: string[];
  hkShare: Record<string, boolean>;
  answers: Record<string, string | string[]>;
  location: string | null;
  simulator: string | null;
  tabletStep: TabletStep;
  live: Live;
  handsOn: Partial<Raw>;
  preDriveFeeling: string | null;
  postFeel: string | null;
  selfRating: number | null;
  simStart: number | null;
  determination: Determination | null;
  ride: Ride;
  familyShare: Record<string, boolean>;
};

type Actions = {
  set: (p: Partial<Data>) => void;
  setLive: (p: Live) => void;
  go: (phase: Phase, extra?: Partial<Data>) => void;
  startReview: () => void;
  reset: () => void;
  jump: (stage: JumpStage) => void;
};

export type JumpStage = "start" | "healthkey" | "checkin" | "tests" | "drive" | "review" | "results";
export const jumpLabels: Record<JumpStage, string> = {
  start: "Start",
  healthkey: "Health record",
  checkin: "Check in",
  tests: "Tablet tests",
  drive: "Simulator",
  review: "Review and sign",
  results: "Results",
};

const initial: Data = {
  scenario: "clear",
  speed: 1,
  phase: "onboarding",
  patientStep: "welcome",
  questionIndex: 0,
  hkStep: null,
  tab: "home",
  textScale: 1,
  hkConnected: false,
  hkSources: ["lakeview", "granite-eye", "mainst"],
  hkShare: { conditions: true, medicines: true, eyes: true, visits: true, labs: true },
  answers: {},
  location: null,
  simulator: null,
  tabletStep: "handoff",
  live: {},
  handsOn: {},
  preDriveFeeling: null,
  postFeel: null,
  selfRating: null,
  simStart: null,
  determination: null,
  ride: null,
  familyShare: { results: false, rides: true, record: false },
};

export function rawFor(s: Pick<Data, "scenario" | "live" | "handsOn">): Raw {
  if (s.scenario !== "live") return { ...presets[s.scenario], ...s.handsOn };
  const base = { ...presets.clear };
  const l = s.live;
  if (l.trailsSeconds !== undefined) {
    base.trailsSeconds = l.trailsSeconds;
    base.trailsShort = true;
  }
  if (l.signs !== undefined) base.signs = l.signs;
  if (l.colors !== undefined) base.colors = l.colors;
  if (l.choice !== undefined) base.choice = l.choice;
  if (l.reactionMs !== undefined) base.reactionMs = l.reactionMs;
  return { ...base, ...s.handsOn };
}

export function determinationFor(outcome: Outcome): Determination {
  const c = outcomeCopy[outcome];
  return {
    outcome,
    conditions: [...c.conditions],
    plan: [...c.plan],
    retestMonths: c.retestMonths,
    note: c.note,
    discussed: false,
    signature: null,
    signedAt: null,
  };
}

function stageState(stage: JumpStage, keep: Pick<Data, "scenario" | "speed" | "textScale">): Data {
  const base: Data = { ...initial, ...keep };
  if (stage === "start") return base;
  const healthkey: Data = { ...base, patientStep: "hk-intro" };
  if (stage === "healthkey") return healthkey;
  const checkin: Data = { ...healthkey, hkConnected: true, answers: { ...defaultAnswers }, phase: "ready", patientStep: "home" };
  if (stage === "checkin") return checkin;
  const tests: Data = { ...checkin, location: "lakeview", simulator: "sim1", phase: "tablet-tests", tabletStep: "handoff" };
  if (stage === "tests") return tests;
  const drive: Data = { ...tests, phase: "pre-drive", tabletStep: "done", preDriveFeeling: "I feel fine" };
  if (stage === "drive") return drive;
  const outcome = score(rawFor(drive)).suggested;
  const review: Data = { ...drive, phase: "review", postFeel: "Comfortable", selfRating: 4, determination: determinationFor(outcome) };
  if (stage === "review") return review;
  const det = review.determination!;
  return {
    ...review,
    phase: "released",
    determination: { ...det, discussed: true, signature: "demo", signedAt: Date.now() },
    familyShare: { ...review.familyShare, results: det.plan.some((p) => p.startsWith("Sarah added")) },
  };
}

export const useDemo = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (p) => set(p),
      setLive: (p) => set({ live: { ...get().live, ...p } }),
      go: (phase, extra) => set({ phase, ...extra }),
      startReview: () => {
        const s = get();
        const outcome = score(rawFor(s)).suggested;
        set({ phase: "review", determination: determinationFor(outcome) });
      },
      reset: () => set({ ...initial, scenario: get().scenario, speed: get().speed }),
      jump: (stage) => {
        const s = get();
        set(stageState(stage, { scenario: s.scenario, speed: s.speed, textScale: s.textScale }));
      },
    }),
    {
      name: "driverscore-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { set: _a, setLive: _b, go: _c, startReview: _d, reset: _e, jump: _f, ...data } = s;
        return data;
      },
    },
  ),
);

// Keep every open tab (patient, specialist, simulator) on the same visit.
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("driverscore-demo") : null;
let applyingRemote = false;
if (channel) {
  useDemo.subscribe((s) => {
    if (applyingRemote) return;
    const { set: _a, setLive: _b, go: _c, startReview: _d, reset: _e, jump: _f, ...data } = s;
    channel.postMessage(data);
  });
  channel.onmessage = (e: MessageEvent<Partial<Data>>) => {
    applyingRemote = true;
    useDemo.setState(e.data);
    applyingRemote = false;
  };
}

export const useScore = () => {
  const scenario = useDemo((s) => s.scenario);
  const live = useDemo((s) => s.live);
  const handsOn = useDemo((s) => s.handsOn);
  return score(rawFor({ scenario, live, handsOn }));
};
