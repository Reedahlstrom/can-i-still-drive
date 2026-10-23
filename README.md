# Can I Still Drive

Live demo: https://can-i-still-drive.reedahlstrom.workers.dev

Clickable prototype of DriverScore: a driving assessment done as part of a doctor's visit. The patient connects their health record through HealthKey, checks in at the hospital, takes tablet tests and a simulator drive, and gets a result their specialist has signed.

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

## Demo controls

Press the sliders button in the bottom-right corner of the stage (or the backtick key) to:

- choose the result: Clear, With conditions, Pause, Time to stop, or Live (scores the tablet tests and brake reaction as they're taken)
- jump to any step
- run animations at 2x
- start over

## Flow

1. Patient: welcome, confirm details, verify phone
2. Patient: connect health record with HealthKey (sources, sharing, gather)
3. Patient: five driving questions
4. Patient: check in at the hospital and pick a simulator
5. Specialist: review record and answers, flags first
6. Patient on the iPad: trails, clock drawing, signs, colors, driving questions
7. Specialist: hands-on vision, cognition and motor scoring
8. Simulator: six scored drives, live on the iPad
9. Specialist: results saved to the record, review DriverScore v0, choose the outcome, sign
10. Patient: signed result, next steps, health record, family sharing, and ride booking when it's time to stop

## Scoring

DriverScore v0 follows the CISD scoring sheet: vision 20, cognition 17 rescaled to 20, motor 20, simulator 40. Hard stops (very poor acuity, half the visual field missing, Trails B not finished, a collision or missed signal) override the total. The specialist chooses one of four outcomes; the score only suggests one. See `src/lib/score.ts`.

All people, places and records in the demo are fictional.

## Demo video

`video/` is a Remotion project that renders a narrated walkthrough from real captures of the app (see `video/README.md`). With the dev server running on port 5181:

```bash
cd video && node capture.mjs && npx remotion render src/index.ts DriverScoreDemo out/DriverScore-demo-draft-1.mp4 --codec h264 --crf 16
```

The presenter's click path is in `DEMO.md`.

## Deploy

Hosted on Cloudflare Workers (static assets). `npm run deploy` builds and publishes with Wrangler.

## Stack

Vite, React, TypeScript, Tailwind CSS, Motion. No backend: state lives in the browser and syncs between tabs. Works offline once loaded (PWA).
