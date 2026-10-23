// Captures crisp app screens from the running dev server for the video.
// Usage: node capture.mjs [baseUrl]   (default http://localhost:5181)
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:5181";
const OUT = fileURLToPath(new URL("./public/shots/", import.meta.url));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
// One context so the phone and iPad tabs share the visit (they sync over BroadcastChannel).
const ctx = await browser.newContext({ deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.removeItem("driverscore-demo-v2"));

const phone = await ctx.newPage();
await phone.setViewportSize({ width: 393, height: 852 });
await phone.goto(`${BASE}/#/capture-phone`);
await phone.waitForFunction(() => !!window.__demo);
const ipad = await ctx.newPage();
await ipad.setViewportSize({ width: 1180, height: 820 });
await ipad.goto(`${BASE}/#/capture-ipad`);
await ipad.waitForFunction(() => !!window.__demo);
await phone.evaluate(() => document.fonts.ready);
await ipad.evaluate(() => document.fonts.ready);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Put the shared visit into a state. Runs on the page given (state syncs to the other tab).
async function state(page, stage, extra = {}, scenario = "clear") {
  await page.evaluate(
    ([stage, extra, scenario]) => {
      const d = window.__demo;
      d.setState({ scenario, speed: 1, textScale: 1 });
      d.getState().jump(stage);
      d.setState(extra);
    },
    [stage, extra, scenario],
  );
}

async function shot(page, name, settle = 900) {
  await wait(settle);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("shot", name);
}

async function clickText(page, text, exact = true) {
  await page.getByText(text, { exact }).first().click();
}

async function scrollMain(page, y) {
  await page.evaluate((y) => {
    const els = [...document.querySelectorAll(".overflow-y-auto")].filter((e) => e.scrollHeight > e.clientHeight + 4);
    const el = els.sort((a, b) => b.clientHeight - a.clientHeight)[0];
    if (el) el.scrollTop = y;
  }, y);
}

const meta = {};

// ---------- Phone: at home ----------
await state(phone, "start");
await shot(phone, "p-welcome", 1400);
await state(phone, "start", { patientStep: "details" });
await shot(phone, "p-details");
await state(phone, "healthkey");
await shot(phone, "p-hk-intro");
await state(phone, "healthkey", { hkStep: "signin" });
await shot(phone, "p-hk-signin", 1100);
await state(phone, "healthkey", { hkStep: "sources" });
await shot(phone, "p-hk-sources", 1100);
await state(phone, "healthkey", { hkStep: "share" });
await shot(phone, "p-hk-share", 1100);
await state(phone, "healthkey", { hkStep: "assembling" });
await shot(phone, "p-hk-gather-1", 1300);
await shot(phone, "p-hk-gather-2", 1400);
await state(phone, "healthkey", { patientStep: "hk-connected", hkConnected: true, hkStep: null });
await shot(phone, "p-hk-connected", 1200);
await state(phone, "healthkey", { patientStep: "questions", questionIndex: 0, hkConnected: true, answers: { driving: "Yes, most days" } });
await shot(phone, "p-q1");
await state(phone, "healthkey", { patientStep: "questions", questionIndex: 1, hkConnected: true, answers: { driving: "Yes, most days", avoid: ["Driving at night", "Highways"] } });
await shot(phone, "p-q2");

// ---------- Phone: at the hospital ----------
await state(phone, "checkin");
await shot(phone, "p-home");
await state(phone, "checkin", { patientStep: "where" });
await shot(phone, "p-checkin");
await state(phone, "checkin", { patientStep: "connecting", location: "lakeview", simulator: "sim1" });
await shot(phone, "p-connecting", 700);
await state(phone, "checkin", { phase: "checked-in", patientStep: "home", location: "lakeview", simulator: "sim1" });
await shot(phone, "p-checked-in");
await shot(ipad, "i-arrived", 300);
await state(ipad, "checkin", { phase: "record-review", location: "lakeview", simulator: "sim1" });
await shot(ipad, "i-record-review");

// ---------- iPad: tests ----------
await state(ipad, "tests");
await shot(ipad, "i-handoff");
await state(ipad, "tests", { tabletStep: "trails" });
await wait(500);
await clickText(ipad, "Start");
await wait(400);
for (const l of ["1", "A", "2", "B", "3"]) {
  await ipad.locator(`button[aria-label="${l}"]`).click();
  await wait(120);
}
await shot(ipad, "i-trails", 500);
await state(ipad, "tests", { tabletStep: "clock" });
await wait(500);
await clickText(ipad, "Start");
await wait(500);
await ipad.evaluate(() => {
  const c = document.querySelector('canvas[aria-label="Drawing area"]');
  const r = c.getBoundingClientRect();
  const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height, pointerId: 1 }));
  const stroke = (pts) => {
    ev("pointerdown", ...pts[0]);
    for (const p of pts.slice(1)) ev("pointermove", ...p);
    ev("pointerup", ...pts[pts.length - 1]);
  };
  const circle = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    circle.push([0.5 + 0.38 * Math.cos(a) + Math.sin(i * 1.3) * 0.004, 0.5 + 0.38 * Math.sin(a) + Math.cos(i) * 0.003]);
  }
  stroke(circle);
  // numbers as small hand-drawn strokes
  const digits = { 1: [[0, -1], [0, 1]], 2: [[-1, -1], [1, -1], [1, 0], [-1, 0], [-1, 1], [1, 1]], 3: [[-1, -1], [1, -1], [0, 0], [1, 1], [-1, 1]], 4: [[-1, -1], [-1, 0], [1, 0], [1, -1], [1, 1]], 5: [[1, -1], [-1, -1], [-1, 0], [1, 0], [1, 1], [-1, 1]], 6: [[1, -1], [-1, -1], [-1, 1], [1, 1], [1, 0], [-1, 0]], 7: [[-1, -1], [1, -1], [-0.2, 1]], 8: [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, -1]], 9: [[1, 0], [-1, 0], [-1, -1], [1, -1], [1, 1]] };
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const cx = 0.5 + 0.3 * Math.cos(a);
    const cy = 0.5 + 0.3 * Math.sin(a);
    const parts = String(h).split("");
    parts.forEach((d, k) => {
      const ox = (k - (parts.length - 1) / 2) * 0.03;
      const oval = Array.from({ length: 13 }, (_, j) => [Math.sin((j / 12) * Math.PI * 2) * 0.8, -Math.cos((j / 12) * Math.PI * 2)]);
      const pts = d === "0" ? oval : digits[d] ?? digits[1];
      stroke(pts.map(([x, y]) => [cx + ox + x * 0.01, cy + y * 0.018]));
    });
  }
  stroke([[0.5, 0.5], [0.44, 0.33]]);
  stroke([[0.5, 0.5], [0.66, 0.44]]);
});
await shot(ipad, "i-clock", 400);
await state(ipad, "tests", { tabletStep: "signs" });
await wait(500);
await clickText(ipad, "Start");
await shot(ipad, "i-signs", 700);
await state(ipad, "tests", { tabletStep: "colors" });
await wait(500);
await clickText(ipad, "Start");
await shot(ipad, "i-colors", 700);
await state(ipad, "tests", { phase: "hands-on", tabletStep: "done" });
await shot(ipad, "i-hands-on");

// ---------- Drive ----------
await state(phone, "drive", { preDriveFeeling: null });
await wait(400);
await clickText(phone, "I feel fine");
await shot(phone, "p-before-drive", 500);
await state(ipad, "drive");
await shot(ipad, "i-drive-prep");
await state(ipad, "drive", { phase: "driving", simStart: Date.now() - 20500 });
await ipad.waitForSelector('canvas[aria-label="Simulator view"]', { timeout: 8000 }).catch(async () => {
  console.log("state now", await ipad.evaluate(() => window.__demo.getState().phase));
});
await wait(600);
meta.liveCanvas = await ipad.evaluate(() => {
  const r = document.querySelector('canvas[aria-label="Simulator view"]').getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await shot(ipad, "i-live-drive", 100);
await shot(phone, "p-driving", 100);
await state(ipad, "drive", { phase: "post-drive", postFeel: "Comfortable", selfRating: 4 });
await shot(ipad, "i-drive-done");
await state(ipad, "drive", { phase: "uploading", postFeel: "Comfortable", selfRating: 4 });
await shot(ipad, "i-upload-1", 700);
await shot(ipad, "i-upload-2", 900);

// ---------- Review and sign ----------
async function sign(page) {
  await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Signature"]');
    const r = c.getBoundingClientRect();
    const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height, pointerId: 7 }));
    ev("pointerdown", 0.14, 0.62);
    for (let i = 1; i <= 60; i++) {
      const t = i / 60;
      ev("pointermove", 0.14 + 0.72 * t, 0.58 + 0.2 * Math.sin(t * 15) * (1 - t * 0.6) - 0.1 * t);
    }
    ev("pointerup", 0.86, 0.5);
  });
}
await state(ipad, "review", {}, "clear");
await shot(ipad, "i-review-blank", 2600);
await ipad.locator('button[role="radio"]', { hasText: "Clear" }).click();
await shot(ipad, "i-review-chosen", 700);
await sign(ipad);
await shot(ipad, "i-review-signed", 500);
await clickText(ipad, "Sign and share with Margaret");
await shot(ipad, "i-released", 1000);
await phone.evaluate(() => window.__demo.setState({ tab: "home" }));
await shot(phone, "p-result-clear", 2600);
await scrollMain(phone, 420);
await shot(phone, "p-result-clear-score", 2400);
await scrollMain(phone, 900);
await shot(phone, "p-result-clear-steps", 600);

// Time to stop path.
await state(ipad, "review", {}, "stop");
await wait(900);
await ipad.locator('button[role="radio"]', { hasText: "Time to stop" }).click();
await wait(500);
await ipad.locator('button[role="checkbox"]', { hasText: "in person" }).click();
await sign(ipad);
await shot(ipad, "i-review-stop-signed", 600);
await clickText(ipad, "Sign and share with Margaret");
await wait(800);
await phone.evaluate(() => window.__demo.setState({ tab: "home" }));
await shot(phone, "p-result-stop", 1600);
await scrollMain(phone, 470);
await shot(phone, "p-result-stop-rides", 600);
await phone.evaluate(() => window.__demo.setState({ ride: { dest: "", option: "family", when: "later", status: "choose" } }));
await wait(800);
await clickText(phone, "Sarah's house");
await shot(phone, "p-ride-choose", 600);
await clickText(phone, "Text Sarah");
await shot(phone, "p-ride-asked", 900);
await shot(phone, "p-ride-yes", 3200);
await phone.evaluate(() => window.__demo.setState({ ride: null, tab: "record" }));
await shot(phone, "p-record", 1000);
await phone.evaluate(() => window.__demo.setState({ tab: "family" }));
await shot(phone, "p-family", 1000);

await writeFile(`${OUT}meta.json`, JSON.stringify(meta, null, 1));
await browser.close();
console.log("done");
