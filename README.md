# Can I Still Drive

Live demo: https://can-i-still-drive.reedahlstrom.workers.dev

Clickable prototype of DriverScore: a driving assessment done as part of a doctor's visit. The patient connects their health record through HealthKey and checks in at the hospital. The specialist reviews the record and assigns simulator drives, the patient drives them, and each drive comes back scored with what was measured and the rule behind it. The specialist decides, signs, and the patient gets the result.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. On a laptop you get the presenter stage: the patient's phone and the specialist's iPad side by side, kept in sync. On a phone you get the patient app.

| URL | Shows |
| --- | --- |
| `/#/stage` | Phone and iPad side by side |
| `/#/phone` | Patient app, full screen |
| `/#/ipad` | Specialist app, full screen |
| `/#/simulator` | Simulator view, full screen (for a second display) |

Tabs opened in the same browser stay on the same visit, so the phone, iPad and simulator views can run on separate windows or displays.

## Language

The demo runs in English or Japanese. Switch with the language toggle on the stage, or open any URL with `?lang=ja` (for example `/?lang=ja#/stage`). In Japanese, distances and speeds are in km and km/h, heights in cm, visual acuity in decimal, and times in 24-hour form. UI text goes through `tr()` / `useT()` in `src/i18n`; the Japanese strings are in `src/i18n/ja.ts`, keyed by the English text.

## Demo controls

Press the sliders button in the bottom-right corner of the stage (or the backtick key) to:

- choose the result: Clear, With conditions, Pause, Time to stop, or Live (measures your own brake tap at the red light)
- jump to any step
- run animations at 2x
- start over

## Flow

1. Patient: welcome, confirm details, verify phone
2. Patient: connect health record with HealthKey (sources, sharing, gather)
3. Patient: driving questions
4. Patient: check in at the hospital and pick a simulator
5. Specialist: review the record and answers, flags first, and assign drives. The drives the record points to come pre-selected, each with its reason.
6. Patient: sees which drives were chosen and why, says how she feels
7. Simulator: the assigned drives, each scored live on the iPad as it finishes
8. Specialist: results saved to the record; each drive's score with the measurement, rule and result; the logic behind the suggestion; choose the outcome, sign
9. Patient: signed result with each drive explained, next steps, health record, family sharing, and ride booking when it's time to stop

## Scoring

DriverScore v0 scores only the drives the specialist assigned. Each drive is out of 10 and carries what was measured, the rule applied and the result; the total is their average, out of 100. Drives not completed are left out and reported, never counted as zero.

The suggestion is worked out in order, and every step is shown to the specialist:

1. A hard stop (ran the red light, a collision, rolled through a stop sign) suggests Time to stop.
2. Fewer than 3 drives completed is too little to decide: Pause and reassess.
3. A vision drive (spotting objects, night drive) below 5 suggests Pause and reassess.
4. Otherwise 85 or higher with no drive below 6 suggests Clear, 70 to 84 Drive with conditions, 55 to 69 Pause, below 55 Time to stop.

Conditions come from the drives: a weak night drive suggests daylight only, weak lane changes no highways, weak left turns or city driving staying within 15 miles of home. The specialist chooses the outcome; the score only suggests one. See `src/lib/score.ts` and `src/data/drives.ts`.

## Simulator view

The live drive is a 3D scene drawn with three.js (`src/sim/engine`). Each drive plays an 8-second highlight in its own place: an arterial with a signal (brake reaction), a residential all-way stop (right turns), a signalled left turn across oncoming traffic, a three-lane boulevard (lane changes), a country road (spotting objects) and downtown by day and by night. Everything on screen, the car, traffic, people and signals, is a function of drive time and the scenario's results, so the iPad and the full-screen simulator always agree, and the moments that matter (running a red, a collision, rolling a stop sign) happen when the scoring says they did. `dev/simlab.html` on the dev server renders single frames for checking a drive moment by moment.

All people, places and records in the demo are fictional.

## Demo video

`video/` is a Remotion project that renders a narrated walkthrough from real captures of the app (see `video/README.md`). With the dev server running on port 5181:

```bash
cd video && node capture.mjs && npm run render
```

For the Japanese video, capture with `node capture.mjs --lang ja` and render with `--props='{"lang":"ja"}'`.

The presenter's click path is in `DEMO.md`.

## Deploy

Hosted on Cloudflare Workers (static assets). `npm run deploy` builds and publishes with Wrangler.

## Stack

Vite, React, TypeScript, Tailwind CSS, Motion. No backend: state lives in the browser and syncs between tabs. Works offline once loaded (PWA).
