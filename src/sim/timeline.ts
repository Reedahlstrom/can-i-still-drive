import { useEffect, useState } from "react";
import type { Raw } from "../lib/score";

export const SCENARIOS = [
  { id: "reaction", label: "Reaction time", max: 3 },
  { id: "right", label: "Right turns", max: 6 },
  { id: "left", label: "Left turns", max: 9 },
  { id: "lane", label: "Lane changes", max: 12 },
  { id: "fod", label: "Object detection", max: 5 },
  { id: "choice", label: "Drive of choice", max: 5 },
] as const;

export const SEG = 8; // seconds per scenario at 1x
export const DRIVE = SEG * SCENARIOS.length;

// Moments inside the drive, in drive seconds.
export const LIGHT_RED_AT = 2.2;
export const STOP_AT = 3.4;
export const GO_AT = 5.0;
export const RIGHT_TURNS = [9.2, 11.7, 14.2];
export const LEFT_TURNS = [17.2, 19.7, 22.2];
export const LANE_CHANGES = [25.0, 27.6, 30.2];
export const FOD_TARGETS = [33.0, 34.4, 35.8, 37.2, 38.6];
export const TURN_LEN = 1.4;

export function driveSeconds(simStart: number | null, speed: number, now = Date.now()) {
  if (!simStart) return 0;
  return Math.max(0, Math.min(DRIVE, ((now - simStart) / 1000) * speed));
}

export function scenarioAt(t: number) {
  return Math.min(SCENARIOS.length - 1, Math.floor(t / SEG));
}

export function useDriveClock(simStart: number | null, speed: number, hz = 8) {
  const [t, setT] = useState(() => driveSeconds(simStart, speed));
  useEffect(() => {
    setT(driveSeconds(simStart, speed));
    if (!simStart) return;
    const id = setInterval(() => setT(driveSeconds(simStart, speed)), 1000 / hz);
    return () => clearInterval(id);
  }, [simStart, speed, hz]);
  return t;
}

export type DriveEvent = { at: number; scenario: number; text: string; points?: string; alert?: boolean };

export function driveEvents(raw: Raw, liveReactionMs?: number): DriveEvent[] {
  const rt = liveReactionMs ?? raw.reactionMs;
  const ev: DriveEvent[] = [{ at: STOP_AT, scenario: 0, text: "Brake reaction", points: `${(rt / 1000).toFixed(2)} s` }];
  RIGHT_TURNS.forEach((at, i) => ev.push({ at: at + TURN_LEN, scenario: 1, text: `Right turn ${i + 1}`, points: `${raw.rightTurns[i]} of 2` }));
  LEFT_TURNS.forEach((at, i) => {
    if (raw.collision && i === 1) ev.push({ at: at + 0.7, scenario: 2, text: "Collision with oncoming car", alert: true });
    ev.push({ at: at + TURN_LEN, scenario: 2, text: `Left turn ${i + 1}`, points: `${raw.leftTurns[i]} of 3` });
  });
  LANE_CHANGES.forEach((at, i) => ev.push({ at: at + 1.6, scenario: 3, text: `Lane change ${i + 1}`, points: `${raw.laneChanges[i]} of 4` }));
  ev.push({ at: 39.6, scenario: 4, text: "Objects spotted", points: `${raw.fod} of 5` });
  ev.push({ at: 47.4, scenario: 5, text: "City drive", points: `${raw.driveChoice} of 5` });
  return ev.sort((a, b) => a.at - b.at);
}

/** Which FOD targets the driver caught, given how many of 5 were spotted. */
export function fodCaught(spotted: number) {
  const order = [0, 2, 4, 1, 3];
  return new Set(order.slice(0, spotted));
}
