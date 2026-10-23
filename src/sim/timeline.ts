import { useEffect, useState } from "react";
import { driveById, sortDrives, type DriveId } from "../data/drives";
import type { DriveRaw, DriveScore } from "../lib/score";

// Each drive plays an 8-second stretch (at 1x) in its own simulator scene; an assigned set of
// drives plays back to back.
export const SEG = 8;

// Moments within a drive, in seconds from that drive's start.
export const REACTION = { yellow: 1.4, red: 2.2, green: 6.3, /** When running the red, the car crosses the stop line. */ ranRed: 3.6 };
export const LEFT_CRASH = 4.4;
export const CITY_STOP = 4.2;
export const FOD_TARGETS = [0.7, 1.55, 2.4, 3.25, 4.1, 4.95, 5.8, 6.65];
export const NIGHT_HAZARDS = [1.2, 2.7, 4.2, 5.7, 7.0];
/** Seconds into a drive when its score is published; stopping after this counts the drive as done. */
export const SCORE_AT = SEG - 0.2;

export const driveLength = (count: number) => count * SEG;

export function driveSeconds(simStart: number | null, speed: number, length: number, now = Date.now()) {
  if (!simStart) return 0;
  return Math.max(0, Math.min(length, ((now - simStart) / 1000) * speed));
}

export type Segment = { index: number; count: number; id: DriveId; local: number; world: number; night: boolean };

export function segmentAt(t: number, assigned: DriveId[]): Segment {
  const ids = sortDrives(assigned);
  const count = Math.max(1, ids.length);
  const index = Math.min(count - 1, Math.floor(t / SEG));
  const id = ids[index] ?? "reaction";
  const local = Math.min(SEG, t - index * SEG);
  const def = driveById[id];
  return { index, count, id, local, world: def.world + local, night: !!def.night };
}

export function useDriveClock(simStart: number | null, speed: number, length: number, hz = 8) {
  const [t, setT] = useState(() => driveSeconds(simStart, speed, length));
  useEffect(() => {
    setT(driveSeconds(simStart, speed, length));
    if (!simStart) return;
    const id = setInterval(() => setT(driveSeconds(simStart, speed, length)), 1000 / hz);
    return () => clearInterval(id);
  }, [simStart, speed, length, hz]);
  return t;
}

export type DriveEvent = { at: number; text: string; points?: string; alert?: boolean };

/** Seconds into a drive when its hard-stop event happens, if these results contain one. */
export function hardStopAt(id: DriveId, raw: DriveRaw): number | null {
  if (id === "reaction" && raw.reaction.ranRed) return REACTION.ranRed;
  if (id === "left" && raw.left.collision) return LEFT_CRASH;
  if (id === "city" && raw.city.ranStop) return CITY_STOP;
  return null;
}

const hardStopText: Partial<Record<DriveId, string>> = { reaction: "Ran the red light", left: "Collision during left turn 2", city: "Rolled through a stop sign" };

/** What the specialist sees come in as each assigned drive finishes. */
export function driveEvents(assigned: DriveId[], scores: DriveScore[], raw: DriveRaw): DriveEvent[] {
  const ids = sortDrives(assigned);
  const ev: DriveEvent[] = [];
  ids.forEach((id, i) => {
    const start = i * SEG;
    const hs = hardStopAt(id, raw);
    if (hs !== null) ev.push({ at: start + hs, text: hardStopText[id] ?? "Hard stop", alert: true });
    const s = scores.find((x) => x.id === id);
    if (s && s.done) ev.push({ at: start + SCORE_AT, text: s.name, points: `${s.points} of 10` });
  });
  return ev.sort((a, b) => a.at - b.at);
}

/** Which of the eight on-screen objects the driver caught, given how many were spotted. */
export function fodCaught(spotted: number) {
  return new Set([0, 3, 5, 1, 6, 2, 7, 4].slice(0, spotted));
}
