import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultAnswers, patient } from "../data/demo";
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
  outcome: Outcome | null;
  noteFor?: Outcome | null;
  reasoning: string;
  conditions: string[];
  plan: string[];
  retestMonths: number;
  note: string;
  discussed: boolean;
  signature: string | null;
  signedAt: number | null;
};

export type Ride = { dest: string; other?: string; option: string; when: "now" | "later"; status: "choose" | "requested" | "arriving" } | null;

export type Account = { name: string; dob: string; phone: string };

type Data = {
  account: Account;
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
  drivesCompleted: number | null;
  collisionSeen: boolean;
  determination: Determination | null;
  ride: Ride;
  familyShare: Record<string, boolean>;
  hkSharing: boolean;
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
  account: { name: `${patient.first} ${patient.last}`, dob: patient.dob, phone: patient.phone },
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
  hkShare: { conditions: true, medicines: true, eyes: true, visits: false, labs: false },
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
  drivesCompleted: null,
  collisionSeen: false,
  determination: null,
  ride: null,
  familyShare: { results: false, rides: false },
  hkSharing: true,
};

export function rawFor(s: Pick<Data, "scenario" | "live" | "handsOn"> & { drivesCompleted?: number | null; collisionSeen?: boolean }): Raw {
  const completedDrives = s.drivesCompleted ?? undefined;
  const collisionSeen = !!s.collisionSeen;
  if (s.scenario !== "live") return { ...presets[s.scenario], ...s.handsOn, completedDrives, collisionSeen };
  const l = s.live;
  const base: Raw = {
    ...presets.clear,
    completedDrives,
    collisionSeen,
    trailsSeconds: l.trailsSeconds === undefined ? undefined : l.trailsSeconds,
    trailsErrors: l.trailsErrors,
    trailsShort: true,
    signs: l.signs,
    colors: l.colors,
    choice: l.choice,
    reactionMs: l.reactionMs,
  };
  return { ...base, ...s.handsOn };
}

export const blankDetermination: Determination = {
  outcome: null,
  reasoning: "",
  conditions: [],
  plan: [],
  retestMonths: 0,
  note: "",
  discussed: false,
  signature: null,
  signedAt: null,
};

export function determinationFor(outcome: Outcome): Determination {
  const c = outcomeCopy[outcome];
  return {
    outcome,
    reasoning: "",
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
  const review: Data = { ...drive, phase: "review", postFeel: "Comfortable", selfRating: 4, determination: { ...blankDetermination } };
  if (stage === "review") return review;
  const det = determinationFor(score(rawFor(drive)).suggested);
  return {
    ...review,
    phase: "released",
    determination: { ...det, discussed: true, signature: "demo", signedAt: Date.now() },
  };
}

export const useDemo = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (p) => set(p),
      setLive: (p) => set({ live: { ...get().live, ...p } }),
      go: (phase, extra) => set({ phase, ...extra }),
      startReview: () => set({ phase: "review", determination: { ...blankDetermination } }),
      reset: () => set({ ...initial, scenario: get().scenario, speed: get().speed }),
      jump: (stage) => {
        const s = get();
        set(stageState(stage, { scenario: s.scenario, speed: s.speed, textScale: s.textScale }));
      },
    }),
    {
      name: "driverscore-demo-v2",
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
  useDemo.subscribe((s, prev) => {
    if (applyingRemote) return;
    const changed: Record<string, unknown> = {};
    for (const k of Object.keys(s) as (keyof typeof s)[]) {
      if (typeof s[k] === "function") continue;
      if (s[k] !== prev[k]) changed[k] = s[k];
    }
    if (Object.keys(changed).length) channel.postMessage(changed);
  });
  channel.onmessage = (e: MessageEvent<Partial<Data>>) => {
    applyingRemote = true;
    useDemo.setState(e.data);
    applyingRemote = false;
  };
}

export const useRaw = () => {
  const scenario = useDemo((s) => s.scenario);
  const live = useDemo((s) => s.live);
  const handsOn = useDemo((s) => s.handsOn);
  const drivesCompleted = useDemo((s) => s.drivesCompleted);
  const collisionSeen = useDemo((s) => s.collisionSeen);
  return rawFor({ scenario, live, handsOn, drivesCompleted, collisionSeen });
};

export const useScore = () => score(useRaw());
