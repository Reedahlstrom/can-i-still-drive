// Prints scene start frames.
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("public/vo/durations.json", "utf8"));
const order = ["open","problem","solution","home","checkin","assign","drive","record","review","clear","outcomes","stop","trust","close"];
const minimum = { drive: 15 };
const extra = { open: 2.2, problem: 0.4, solution: 0.8, assign: 0.6, drive: 1.5, review: 1.4, clear: 1.4, stop: 0.6, outcomes: 1.0, trust: 0.4, close: 3.2 };
let f = 0; const out = {};
for (const id of order) { const len = Math.ceil(Math.max(0.5 + d[id] + 0.9 + (extra[id] ?? 0), minimum[id] ?? 0) * 30); out[id] = [f, len]; f += len - 20; }
console.log(JSON.stringify(out), "total", f + 20);
