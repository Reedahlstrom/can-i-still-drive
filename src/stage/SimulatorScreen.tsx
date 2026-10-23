import { Suspense, lazy, useEffect } from "react";
import { prepareDrives } from "../sim/prepare";
import { driveLength, driveSeconds, useDriveClock } from "../sim/timeline";
import { useDemo, useResults } from "../state/store";
import { DriverScoreWordmark } from "../ui/Brand";
import { SteeringWheel } from "../ui/Road";

const SimCanvas = lazy(() => import("../sim/SimCanvas").then((m) => ({ default: m.SimCanvas })));

export function SimulatorScreen() {
  const phase = useDemo((s) => s.phase);
  const simStart = useDemo((s) => s.simStart);
  const speed = useDemo((s) => s.speed);
  const scenario = useDemo((s) => s.scenario);
  const live = useDemo((s) => s.live);
  const raw = useResults();
  const assigned = useDemo((s) => s.assigned);
  const length = driveLength(assigned.length);
  const setLive = useDemo((s) => s.setLive);
  const go = useDemo((s) => s.go);
  const t = useDriveClock(simStart, speed, length, 4);
  const isLive = scenario === "live";
  // Build the assigned drives' scenes while the simulator waits, so the first frame is ready.
  useEffect(() => (phase === "pre-drive" ? prepareDrives(assigned) : undefined), [phase, assigned]);

  useEffect(() => {
    // Read the clock fresh so a new drive never inherits the last drive's elapsed time.
    if (phase === "driving" && driveSeconds(simStart, speed, length) >= length) go("post-drive");
  }, [phase, t, go, simStart, speed, length]);

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
      <Suspense fallback={null}>
        <SimCanvas
          simStart={simStart}
          speed={speed}
          assigned={assigned}
          raw={raw}
          liveReaction={{ live: isLive, measured: isLive ? live.reactionMs ?? null : null }}
          onBrake={(ms) => setLive({ reactionMs: ms })}
        />
      </Suspense>
    </div>
  );
}
