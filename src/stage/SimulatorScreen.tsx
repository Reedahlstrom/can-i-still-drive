import { useEffect } from "react";
import { SimCanvas } from "../sim/SimCanvas";
import { DRIVE, useDriveClock } from "../sim/timeline";
import { rawFor, useDemo } from "../state/store";
import { DriverScoreWordmark } from "../ui/Brand";
import { SteeringWheel } from "../ui/Road";

export function SimulatorScreen() {
  const phase = useDemo((s) => s.phase);
  const simStart = useDemo((s) => s.simStart);
  const speed = useDemo((s) => s.speed);
  const scenario = useDemo((s) => s.scenario);
  const live = useDemo((s) => s.live);
  const handsOn = useDemo((s) => s.handsOn);
  const setLive = useDemo((s) => s.setLive);
  const go = useDemo((s) => s.go);
  const t = useDriveClock(simStart, speed, 4);
  const isLive = scenario === "live";

  useEffect(() => {
    if (phase === "driving" && t >= DRIVE) go("post-drive");
  }, [phase, t, go]);

  if (phase !== "driving")
    return (
      <div className="dark-surface flex h-full flex-col items-center justify-center gap-8 bg-asphalt text-white">
        <SteeringWheel size={140} light />
        <div className="text-center">
          <div className="font-display text-[34px] font-extrabold">Simulator 1</div>
          <div className="mt-1 text-[18px] text-white/60">Waiting for the specialist to start</div>
        </div>
        <div className="absolute bottom-8 left-8">
          <DriverScoreWordmark size={26} light />
        </div>
      </div>
    );

  return (
    <div className="h-full bg-asphalt">
      <SimCanvas
        simStart={simStart}
        speed={speed}
        raw={rawFor({ scenario, live, handsOn })}
        liveReaction={{ live: isLive, measured: isLive ? live.reactionMs ?? null : null }}
        onBrake={(ms) => setLive({ reactionMs: ms })}
      />
    </div>
  );
}
