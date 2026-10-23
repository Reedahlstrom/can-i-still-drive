import type { DriveId } from "../data/drives";

/** Load the simulator and build the scenes for these drives in the background, one per idle moment.
 * Returns a function that stops any building still queued, for when the drive starts or the view goes. */
export function prepareDrives(assigned: DriveId[]) {
  let cancel: (() => void) | null = null;
  let stopped = false;
  if (assigned.length)
    void Promise.all([import("./engine/engine"), import("./engine/drives")]).then(([engine, drives]) => {
      if (!stopped) cancel = engine.prepare(assigned.map((id) => drives.setOf[id]));
    });
  return () => {
    stopped = true;
    cancel?.();
  };
}
