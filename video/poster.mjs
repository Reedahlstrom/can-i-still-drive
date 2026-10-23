// Renders stills at chosen frames for review: node stills.mjs 120 900 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "out", "stills");
await mkdir(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "DriverScoreDemo", port: 3918 });
console.log("duration", composition.durationInFrames, "frames", (composition.durationInFrames / composition.fps).toFixed(1), "s");
for (const f of process.argv.slice(2).map(Number)) {
  await renderStill({ composition, serveUrl, port: 3918, frame: f, output: path.join(out, `f${String(f).padStart(5, "0")}.png`), scale: 1 });
  console.log("still", f);
}
