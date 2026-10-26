import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultAnswers, patient } from "../data/demo";
import { recommendDrives, sortDrives, type DriveId } from "../data/drives";
import { draftNote, outcomeCopy, presets, type ScenarioKey } from "../data/scenarios";
import { inLang, setLang, tr, type Lang } from "../i18n";
import { score, type DriveRaw, type Outcome, type ScoreResult } from "../lib/score";

export type Phase = "onboarding" | "ready" | "checked-in" | "record-review" | "pre-drive" | "driving" | "post-drive" | "uploading" | "review" | "released";

export const phaseOrder: Phase[] = ["onboarding", "ready", "checked-in", "record-review", "pre-drive", "driving", "post-drive", "uploading", "review", "released"];

export const atLeast = (phase: Phase, min: Phase) => phaseOrder.indexOf(phase) >= phaseOrder.indexOf(min);

export type PatientStep = "welcome" | "details" | "code" | "hk-intro" | "hk-connected" | "questions" | "home" | "where" | "which-sim" | "connecting";

export type HkStep = null | "signin" | "sources" | "share" | "assembling";
export type Tab = "home" | "record" | "family";

export type Live = { reactionMs?: number };

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
  /** Language of every screen: patient, specialist and simulator. */
  lang: Lang;
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
  /** Drives the specialist assigned, in simulator order. */
  assigned: DriveId[];
  live: Live;
  /** How the drive felt and her own rating: asked in person, recorded by the specialist. */
  postFeel: string | null;
  selfRating: number | null;
  simStart: number | null;
  drivesCompleted: number | null;
  hardStopSeen: boolean;
  determination: Determination | null;
  ride: Ride;
  /** Bumped on every jump or restart so screens drop their local state. */
  visit: number;
  familyShare: Record<string, boolean>;
  hkSharing: boolean;
};

type Actions = {
  set: (p: Partial<Data>) => void;
  setLive: (p: Live) => void;
  go: (phase: Phase, extra?: Partial<Data>) => void;
  /** Assign these drives and start the simulator. */
  startDrives: (assigned: DriveId[]) => void;
  startReview: () => void;
  reset: () => void;
  jump: (stage: JumpStage) => void;
};

export type JumpStage = "start" | "healthkey" | "checkin" | "assign" | "drive" | "review" | "results";
export const jumpLabels: Record<JumpStage, string> = {
  start: "Start",
  healthkey: "Health record",
  checkin: "Check in",
  assign: "Assign drives",
  drive: "Simulator",
  review: "Review and sign",
  results: "Results",
};

/** A ?lang=ja (or ?lang=en) link picks the language. */
const urlLang = (): Lang | null => {
  if (typeof location === "undefined") return null;
  const l = new URLSearchParams(location.search).get("lang");
  return l === "ja" || l === "en" ? l : null;
};

const initial: Data = {
  lang: urlLang() ?? "en",
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
  assigned: [],
  live: {},
  postFeel: null,
  selfRating: null,
  simStart: null,
  drivesCompleted: null,
  hardStopSeen: false,
  determination: null,
  ride: null,
  familyShare: { results: false, rides: false },
  hkSharing: true,
  visit: 0,
};

/** The measured results of every drive for the chosen demo story. Live mode uses the real brake tap. */
export function resultsFor(s: Pick<Data, "scenario" | "live">): DriveRaw {
  if (s.scenario !== "live") return presets[s.scenario];
  const ms = s.live.reactionMs;
  return { ...presets.clear, reaction: { trials: ms === undefined ? [] : [ms] } };
}

/** Drives the record and answers point to; what the specialist starts from. */
export const recommendedFor = (answers: Data["answers"]) => recommendDrives({ cataract: true, sleepMed: true, answers });

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

/** A fresh decision for an outcome. With scores, the limits and note are drafted from the drives themselves. */
export function determinationFor(outcome: Outcome, result?: ScoreResult): Determination {
  const c = outcomeCopy[outcome];
  return {
    outcome,
    reasoning: "",
    conditions: outcome === "conditions" && result ? [...result.conditions] : [...c.conditions],
    plan: [...c.plan],
    retestMonths: c.retestMonths,
    note: result ? draftNote(outcome, result) : tr(c.note),
    discussed: false,
    signature: null,
    signedAt: null,
  };
}

function stageState(stage: JumpStage, keep: Pick<Data, "scenario" | "speed" | "textScale" | "lang">): Data {
  const base: Data = { ...initial, ...keep };
  if (stage === "start") return base;
  const healthkey: Data = { ...base, patientStep: "hk-intro" };
  if (stage === "healthkey") return healthkey;
  const checkin: Data = { ...healthkey, hkConnected: true, answers: { ...defaultAnswers }, phase: "ready", patientStep: "home" };
  if (stage === "checkin") return checkin;
  const assign: Data = { ...checkin, location: "lakeview", simulator: "sim1", phase: "record-review" };
  if (stage === "assign") return assign;
  const assigned = sortDrives(recommendedFor(defaultAnswers).map((r) => r.id));
  const drive: Data = { ...assign, phase: "pre-drive", assigned };
  if (stage === "drive") return drive;
  const review: Data = { ...drive, phase: "review", postFeel: "Comfortable", selfRating: 4, determination: { ...blankDetermination } };
  if (stage === "review") return review;
  const result = score(resultsFor(drive), assigned);
  const det = determinationFor(result.suggested, result);
  return { ...review, phase: "released", determination: { ...det, discussed: true, signature: "demo", signedAt: Date.now() } };
}

export const useDemo = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (p) => set(p),
      setLive: (p) => set({ live: { ...get().live, ...p } }),
      go: (phase, extra) => set({ phase, ...extra }),
      startDrives: (assigned) => set({ phase: "driving", assigned, simStart: Date.now(), drivesCompleted: null, hardStopSeen: false, live: { ...get().live, reactionMs: undefined } }),
      startReview: () => set({ phase: "review", determination: { ...blankDetermination } }),
      reset: () => set({ ...initial, scenario: get().scenario, speed: get().speed, lang: get().lang, visit: get().visit + 1 }),
      jump: (stage) => {
        const s = get();
        set({ ...stageState(stage, { scenario: s.scenario, speed: s.speed, textScale: s.textScale, lang: s.lang }), visit: s.visit + 1 });
      },
    }),
    {
      name: "driverscore-demo-v3",
      // Version 2: the drive check-ins moved from the patient's phone to the specialist's iPad.
      version: 2,
      migrate: (old) => ({ ...initial, lang: (old as Partial<Data>)?.lang ?? initial.lang }),
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { set: _a, setLive: _b, go: _c, startDrives: _g, startReview: _d, reset: _e, jump: _f, ...data } = s;
        return data;
      },
    },
  ),
);

// The language follows the store everywhere, including text built outside components.
setLang(useDemo.getState().lang);
useDemo.subscribe((s, prev) => {
  if (s.lang === prev.lang) return;
  setLang(s.lang);
  // Keep ?lang= in the address in step, so reloading keeps the language.
  if (typeof location !== "undefined" && new URLSearchParams(location.search).has("lang")) {
    const url = new URL(location.href);
    url.searchParams.set("lang", s.lang);
    history.replaceState(history.state, "", url);
  }
  // A drafted note nobody has edited follows the language too.
  const d = s.determination;
  if (!d?.outcome) return;
  const result = score(resultsFor(s), s.assigned, s.drivesCompleted ?? undefined, s.hardStopSeen);
  if (d.note === inLang(prev.lang, () => draftNote(d.outcome!, result))) useDemo.setState({ determination: { ...d, note: draftNote(d.outcome, result) } });
});

// Keep every open tab (patient, specialist, simulator) on the same visit.
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("driverscore-demo-v3") : null;
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

// ?lang= in the address picks the language, here and in every tab already open.
{
  const fromUrl = urlLang();
  if (fromUrl && useDemo.getState().lang !== fromUrl) useDemo.setState({ lang: fromUrl });
}

export const useResults = () => {
  const scenario = useDemo((s) => s.scenario);
  const live = useDemo((s) => s.live);
  return resultsFor({ scenario, live });
};

export const useScore = () => {
  const raw = useResults();
  const assigned = useDemo((s) => s.assigned);
  const drivesCompleted = useDemo((s) => s.drivesCompleted);
  const hardStopSeen = useDemo((s) => s.hardStopSeen);
  return score(raw, assigned, drivesCompleted ?? undefined, hardStopSeen);
};
