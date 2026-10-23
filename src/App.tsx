import { MotionConfig } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import { PatientApp } from "./patient/PatientApp";
import { SpecialistApp } from "./specialist/SpecialistApp";
import { SimulatorScreen } from "./stage/SimulatorScreen";
import { Stage } from "./stage/Stage";

type Route = "stage" | "phone" | "ipad" | "simulator";

function readRoute(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  if (h === "phone" || h === "ipad" || h === "simulator" || h === "stage") return h;
  return window.innerWidth < 760 ? "phone" : "stage";
}

const fullBleed = { "--safe-top": "env(safe-area-inset-top, 0px)", "--safe-bottom": "env(safe-area-inset-bottom, 0px)" } as CSSProperties;

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-full w-full" style={fullBleed}>
        {route === "stage" && <Stage />}
        {route === "phone" && <PatientApp />}
        {route === "ipad" && <SpecialistApp />}
        {route === "simulator" && <SimulatorScreen />}
      </div>
    </MotionConfig>
  );
}
