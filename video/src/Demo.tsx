import { fade } from "@remotion/transitions/fade";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { useEffect, useState, type ComponentType } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile } from "remotion";
import { Checkin, Clear, Close, Drive, Home, Open, Outcomes, Problem, Record, Review, Solution, Stop, Tests, Trust } from "./scenes";
import { FPS } from "./theme";
import { LEAD, ORDER, TOTAL, TRANS, sceneFrames, sceneStarts, voSeconds, type SceneId } from "./timing";

const scenes: Record<SceneId, ComponentType> = {
  open: Open, problem: Problem, solution: Solution, home: Home, checkin: Checkin, tests: Tests, drive: Drive,
  record: Record, review: Review, clear: Clear, stop: Stop, outcomes: Outcomes, trust: Trust, close: Close,
};

// Frames where the narrator is speaking, so the music bed can sit lower under the voice.
const voice = ORDER.map((id) => [sceneStarts[id] + LEAD * FPS, sceneStarts[id] + (LEAD + voSeconds(id)) * FPS] as const);

function padVolume(f: number) {
  let duck = 0;
  for (const [a, b] of voice) {
    const d = interpolate(f, [a - 12, a, b, b + 18], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    duck = Math.max(duck, d);
  }
  const fadeIn = interpolate(f, [0, 45], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [TOTAL - 75, TOTAL - 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (0.16 - 0.095 * duck) * fadeIn * fadeOut;
}

function useFonts() {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load('800 80px "Overpass Variable"'),
      document.fonts.load('700 30px "Overpass Variable"'),
      document.fonts.load('400 30px "Atkinson Hyperlegible Next Variable"'),
      document.fonts.load('700 30px "Atkinson Hyperlegible Next Variable"'),
    ]).then(() => continueRender(handle));
  }, [handle]);
}

export function Demo() {
  useFonts();
  return (
    <AbsoluteFill style={{ background: "#14191E" }}>
      <TransitionSeries>
        {ORDER.flatMap((id, i) => {
          const S = scenes[id];
          const seq = (
            <TransitionSeries.Sequence key={id} durationInFrames={sceneFrames(id)}>
              <S />
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          return [<TransitionSeries.Transition key={`${id}-t`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANS })} />, seq];
        })}
      </TransitionSeries>
      <Audio src={staticFile("pad.wav")} volume={padVolume} />
    </AbsoluteFill>
  );
}
