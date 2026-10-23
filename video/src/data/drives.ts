// The simulator drives a specialist can assign. Each runs on its own stretch of the simulator world.
import { tr } from "../i18n";

export type DriveId = "reaction" | "right" | "left" | "lane" | "fod" | "night" | "city";

export type DriveDef = {
  id: DriveId;
  name: string;
  measures: string;
  minutes: number;
  /** Start of this drive's stretch in the simulator world, in drive seconds. */
  world: number;
  night?: boolean;
};

export const DRIVES: DriveDef[] = [
  { id: "reaction", name: "Brake reaction", measures: "Reaction time and braking", minutes: 3, world: 0 },
  { id: "right", name: "Right turns", measures: "Stopping, scanning and speed at intersections", minutes: 5, world: 8 },
  { id: "left", name: "Left turns across traffic", measures: "Judging gaps in oncoming traffic", minutes: 6, world: 16 },
  { id: "lane", name: "Lane changes", measures: "Mirror checks, signals and gaps at speed", minutes: 6, world: 24 },
  { id: "fod", name: "Spotting objects", measures: "Side vision and attention while driving", minutes: 5, world: 32 },
  { id: "night", name: "Night drive", measures: "Seeing hazards in low light", minutes: 7, world: 40, night: true },
  { id: "city", name: "City drive", measures: "Signs, signals and speed in town", minutes: 8, world: 40 },
];

export const driveById = Object.fromEntries(DRIVES.map((d) => [d.id, d])) as Record<DriveId, DriveDef>;

/** Order drives run in on the simulator. */
export const sortDrives = (ids: DriveId[]) => DRIVES.map((d) => d.id).filter((id) => ids.includes(id));

export type Recommendation = { id: DriveId; reasons: string[]; patientReason: string };

/** Which drives the record and answers point to, with the reason for each, in the demo's language. */
export function recommendDrives(input: { cataract: boolean; sleepMed: boolean; answers: Record<string, string | string[]> }): Recommendation[] {
  const avoid = (input.answers.avoid as string[] | undefined) ?? [];
  const incident = input.answers.incidents as string | undefined;
  const recs: Recommendation[] = [];
  const add = (id: DriveId, reasons: string[], patientReason: string) => recs.push({ id, reasons: reasons.map((r) => tr(r)), patientReason: tr(patientReason) });

  add(
    "reaction",
    ["Baseline for every visit", ...(input.sleepMed ? ["Zolpidem started 5 weeks ago can slow next-morning reactions"] : [])],
    input.sleepMed ? "Checks your reactions, since your sleep medicine can slow them" : "Checks how quickly you brake",
  );
  add(
    "left",
    ["A common crash type for older drivers", ...(incident && incident !== "No" ? [incident === "A crash" ? "Reports a crash in the past year" : "Reports a close call in the past year"] : [])],
    "Left turns across traffic are where most close calls happen",
  );
  if (input.cataract || avoid.includes("Driving at night"))
    add(
      "night",
      [...(input.cataract ? ["Cataract, left eye: 20/50 in March"] : []), ...(avoid.includes("Driving at night") ? ["She avoids driving at night"] : [])],
      "Because of your cataract and night driving",
    );
  if (input.cataract) add("fod", ["Cataract can narrow side vision"], "Checks your side vision");
  if (avoid.includes("Highways")) add("lane", ["She avoids highways"], "Because you avoid highways");
  add("city", ["Overall driving for every visit"], "Your everyday driving, in town");
  return recs;
}
