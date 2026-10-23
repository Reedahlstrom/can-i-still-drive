import "@fontsource-variable/overpass";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/noto-sans-jp";
import { Composition } from "remotion";
import { Demo } from "./Demo";
import { FPS, H, W } from "./theme";
import { TOTAL } from "./timing";

export const Root = () => (
  <Composition id="DriverScoreDemo" component={Demo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
