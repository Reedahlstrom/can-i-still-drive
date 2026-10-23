# DriverScore demo video

Remotion project for the walkthrough video. App screens come from the running prototype; the simulator scenes use the app's own 3D renderer (copied into `src/sim`, `src/data`, `src/lib`), which needs WebGL, hence `--gl=angle`.

```bash
# 1. App dev server (from the repo root)
npx vite --port 5181 --strictPort
# 2. Capture app screens (writes public/shots/)
cd video && npm run capture
# 3. Render
npx remotion render src/index.ts DriverScoreDemo out/DriverScore-demo.mp4 --codec h264 --crf 16 --gl=angle --port 3917
```

Voiceover: `script.json` lines, generated per scene with Kokoro (af_heart) into `public/vo/`, with lengths in `public/vo/durations.json`. Scene timing follows those lengths (`src/timing.ts`).
