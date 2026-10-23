// Dev-only: renders single simulator frames on demand, for checking the drives frame by frame.
// Open /dev/simlab.html on the dev server and call window.shot(drive, seconds, scenario).
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/overpass";
import type { DriveId } from "../data/drives";
import { presets } from "../data/scenarios";
import type { Outcome } from "../lib/score";
import { render } from "./SimCanvas";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

Object.assign(window, {
  shot(drive: DriveId, t: number, scenario: Outcome = "clear", W = 1280, H = 720) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const t0 = performance.now();
    render(ctx, W, H, t, [drive], presets[scenario], { live: false, measured: null });
    const ms = performance.now() - t0;
    return { url: canvas.toDataURL("image/jpeg", 0.88), ms };
  },
});

import { getEngine } from "./engine/engine";
Object.assign(window, { engine: () => getEngine() });
