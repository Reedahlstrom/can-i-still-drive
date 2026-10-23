// Prints scene start frames.
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("public/vo/durations.json", "utf8"));
const order = ["open","problem","solution","home","checkin","tests","drive","record","review","clear","stop","outcomes","trust","close"];
const extra = { open: 2.2, problem: 0.4, solution: 0.6, drive: 1.6, clear: 1.4, stop: 0.6, outcomes: 1.0, trust: 0.4, close: 3.2 };
let f = 0; const out = {};
for (const id of order) { const len = Math.ceil((0.5 + d[id] + 0.9 + (extra[id] ?? 0)) * 30); out[id] = [f, len]; f += len - 20; }
console.log(JSON.stringify(out), "total", f + 20);
