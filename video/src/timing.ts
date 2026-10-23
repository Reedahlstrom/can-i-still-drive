import durations from "../public/vo/durations.json";
import script from "../script.json";
import { FPS } from "./theme";

export type SceneId =
  | "open" | "problem" | "solution" | "home" | "checkin" | "assign" | "drive"
  | "record" | "review" | "clear" | "stop" | "outcomes" | "trust" | "close";

export const ORDER: SceneId[] = ["open", "problem", "solution", "home", "checkin", "assign", "drive", "record", "review", "clear", "stop", "outcomes", "trust", "close"];

/** Seconds of silence before the voice starts in each scene, and after it ends. */
export const LEAD = 0.5;
export const TAIL = 0.9;
/** Frames two neighbouring scenes overlap during a transition. */
export const TRANS = 20;

const extra: Partial<Record<SceneId, number>> = { open: 2.2, problem: 0.4, solution: 0.8, assign: 0.6, drive: 1.5, review: 1.4, clear: 1.4, stop: 0.6, outcomes: 1.0, trust: 0.4, close: 3.2 };

/** Scenes whose pictures need longer than their line, in seconds. The drive scene shows six drives. */
const minimum: Partial<Record<SceneId, number>> = { drive: 16 };

const dur = durations as Record<SceneId, number>;
const text = Object.fromEntries((script as { id: SceneId; text: string }[]).map((s) => [s.id, s.text])) as Record<SceneId, string>;

export const voSeconds = (id: SceneId) => dur[id];
export const sceneFrames = (id: SceneId) => Math.ceil(Math.max(LEAD + dur[id] + TAIL + (extra[id] ?? 0), minimum[id] ?? 0) * FPS);

/** Frame within a scene where a phrase is spoken (proportional to its position in the line). */
export function at(id: SceneId, phrase: string, offset = 0) {
  const t = text[id];
  const i = t.indexOf(phrase);
  if (i < 0) throw new Error(`Phrase not found in ${id}: ${phrase}`);
  return Math.round((LEAD + (dur[id] * i) / t.length + offset) * FPS);
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
