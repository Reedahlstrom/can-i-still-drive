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

Voiceover: the lines in `script.json`, read as one take in ElevenLabs (Reed's voice), one paragraph per scene. `voice.py` cuts the take into `public/vo/<scene>.wav` at the pauses, levels it, and writes `durations.json` and `cues.json` (when each word starts). Scene lengths follow the clips, and `at(scene, phrase)` in `src/timing.ts` puts on-screen moments on the spoken word.

```bash
python3 voice.py --model path/to/ggml-base.en.bin take1.mp3 [take2.mp3 --use outcomes=2]
```
