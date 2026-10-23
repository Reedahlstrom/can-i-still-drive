# Can I Still Drive (DriverScore prototype)

Demo prototype for partner presentations. Product name in the UI is DriverScore; the patient's question "Can I still drive?" is the welcome headline.

## Rules

- The assessment happens as part of a doctor's visit at a hospital or clinic, not a pharmacy.
- No tablet or paper tests. The specialist reviews the record and assigns simulator drives; the patient drives only those. Every score shows what was measured, the rule and the result.
- Four outcomes, never pass/fail: Clear, Drive with conditions, Pause and reassess, Time to stop. The specialist chooses; the score suggests.
- "Time to stop" leads with getting around (rides), score further down, and requires the in-person discussion checkbox before signing.
- DriverScore is labeled "Version 0, not yet validated" wherever the number appears.
- All people, organizations and records are fictional. Do not use real hospital, pharmacy or store names. HealthKey is the real partner brand.
- Copy: plain, short, sentence case, no taglines or filler. Every word must help someone use the screen.
- Older users: body text 19px or more, 60px primary buttons, one main action per screen.

## Layout

- `src/patient` patient phone app
- `src/specialist` specialist iPad app (record review and drive assignment, live drive, review and sign)
- `src/data/drives.ts` the simulator drives and why each is recommended
- `src/sim` simulator renderer and drive timeline
- `src/stage` presenter stage, device frames, demo controls, full-screen simulator
- `src/state/store.ts` shared visit state (zustand, synced across tabs)
- `src/lib/score.ts` DriverScore v0
- `docs/source` source documents, confidential, gitignored
