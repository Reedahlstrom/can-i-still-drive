import cuesEn from "../public/vo/cues.json";
import durationsEn from "../public/vo/durations.json";
import cuesJa from "../public/vo-ja/cues.json";
import durationsJa from "../public/vo-ja/durations.json";
import scriptEn from "../script.json";
import scriptJa from "../script.ja.json";
import { LANG } from "./lang";
import { FPS } from "./theme";

const ja = LANG === "ja";
const script = ja ? scriptJa : scriptEn;
const durations = ja ? durationsJa : durationsEn;
const cues = ja ? cuesJa : cuesEn;

/** Scenes cue on English phrases; in Japanese each maps to the words where that moment is spoken. */
const CUES_JA: Partial<Record<SceneId, Record<string, string>>> = {
  open: { "Can I still drive?": "まだ運転できる" },
  problem: {
    "fifty-two million": "アメリカでは",
    "Yet only a few hundred": "しかし",
    "And the evidence": "さらに",
    "in the doctor's notes": "医師の記録",
    "at the pharmacy": "薬局",
    "in last year's eye exam": "昨年の眼科検査",
    "So decisions come late": "そのため",
  },
  solution: {
    "brings it together": "一つの記録にまとめます",
    "her health record": "本人の健康記録",
    "her own answers": "本人の回答",
    "simulator drives chosen": "そして本人のために",
    "A clinician reviews": "医療専門職が",
    "signs one plan": "一つのプランに署名",
  },
  home: { "connects her health record": "ヘルスキーで", "chooses exactly what to share": "何を共有するか", "four short questions": "運転について" },
  checkin: { "she checks in": "スマートフォンで", "On the clinician's iPad": "医療専門職のアイパッド", "what matters most": "大事なことから" },
  assign: {
    "assigns the drives": "必要な走行を",
    "Brake reaction": "新しい睡眠薬があるので",
    "A night drive in low light": "白内障があるので",
    "Left turns, where": "そして、ヒヤリとしやすい",
    "Margaret sees which drives": "佐藤さんにも",
  },
  review: {
    "what was measured": "測定した内容",
    "DriverScore drafts": "ドライバースコアは",
    "shows its reasoning": "その理由",
    "The clinician makes the decision": "判断するのは",
    "edits the note": "メッセージを直して",
    "and signs": "署名します",
  },
  clear: { "She's clear to drive": "運転を続けて大丈夫", "Each drive is explained": "各走行の結果", "her next steps": "次にすること" },
  outcomes: {
    "Clear.": "運転可。",
    "Drive with conditions": "日中のみなどの",
    "Pause and reassess": "治療できる問題",
    "And time to stop": "そして、運転中止",
    "Many causes can be treated": "原因の多くは",
  },
  stop: { "explains why, in person": "対面で", "Then her plan leads": "そのうえで", "trains and buses": "電車やバス" },
  trust: { "The clinician always decides": "判断するのは常に", "Margaret controls what she shares": "共有する内容", "her records are never sold": "記録が販売", "DriverScore never reports": "ドライバースコアがみずから" },
  close: { "One clinician-signed plan": "すべての高齢ドライバー" },
};

export type SceneId =
  | "open" | "problem" | "solution" | "home" | "checkin" | "assign" | "drive"
  | "record" | "review" | "clear" | "stop" | "outcomes" | "trust" | "close";

export const ORDER: SceneId[] = ["open", "problem", "solution", "home", "checkin", "assign", "drive", "record", "review", "clear", "outcomes", "stop", "trust", "close"];

/** Seconds of silence before the voice starts in each scene, and after it ends. */
export const LEAD = 0.5;
export const TAIL = 0.9;
/** Frames two neighbouring scenes overlap during a transition. */
export const TRANS = 20;

const extra: Partial<Record<SceneId, number>> = { open: 2.2, problem: 0.4, solution: 0.8, assign: 0.6, drive: 1.5, review: 1.4, clear: 1.4, stop: 0.6, outcomes: 1.0, trust: 0.4, close: 3.2 };

/** Scenes whose pictures need longer than their line, in seconds. The drive scene shows six drives. */
const minimum: Partial<Record<SceneId, number>> = { drive: 15 };

const dur = durations as Record<SceneId, number>;
const text = Object.fromEntries((script as { id: SceneId; text: string }[]).map((s) => [s.id, s.text])) as Record<SceneId, string>;

export const voSeconds = (id: SceneId) => dur[id];
export const sceneFrames = (id: SceneId) => Math.ceil(Math.max(LEAD + dur[id] + TAIL + (extra[id] ?? 0), minimum[id] ?? 0) * FPS);

/** When each word starts in its voice clip: [character index in the line, seconds]. Measured from the recording. */
const wordStarts = cues as Record<SceneId, [number, number][]>;

/** Frame within a scene where a phrase is spoken. */
export function at(id: SceneId, english: string, offset = 0) {
  const t = text[id];
  const phrase = ja ? CUES_JA[id]?.[english] : english;
  const i = phrase ? t.indexOf(phrase) : -1;
  if (i < 0) throw new Error(`Phrase not found in ${id}: ${english}${ja ? ` (${phrase})` : ""}`);
  const words = wordStarts[id];
  // The word the phrase starts on; without measured cues, estimate from its position in the line.
  const hit = words?.filter(([c]) => c <= i).pop();
  const sec = hit ? hit[1] : (dur[id] * i) / t.length;
  return Math.round((LEAD + sec + offset) * FPS);
}

export const sceneStarts = (() => {
  const starts: Record<string, number> = {};
  let f = 0;
  for (const id of ORDER) {
    starts[id] = f;
    f += sceneFrames(id) - TRANS;
  }
  return starts as Record<SceneId, number>;
})();

export const TOTAL = ORDER.reduce((a, id) => a + sceneFrames(id), 0) - TRANS * (ORDER.length - 1);
