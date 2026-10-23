import { MotionConfig } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import { PatientApp } from "./patient/PatientApp";
import { SpecialistApp } from "./specialist/SpecialistApp";
import { SimulatorScreen } from "./stage/SimulatorScreen";
import { Stage } from "./stage/Stage";

type Route = "stage" | "phone" | "ipad" | "simulator" | "capture-phone" | "capture-ipad";

function readRoute(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  if (h === "phone" || h === "ipad" || h === "simulator" || h === "stage" || h === "capture-phone" || h === "capture-ipad") return h;
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
        {/* Device screens at exact size, with the insets a real device frame leaves. Used to capture footage. */}
        {route === "capture-phone" && (
          <div style={{ width: 393, height: 852, "--safe-top": "54px", "--safe-bottom": "26px" } as CSSProperties} className="relative overflow-hidden">
            <PatientApp />
          </div>
        )}
        {route === "capture-ipad" && (
          <div style={{ width: 1180, height: 820, "--safe-top": "24px", "--safe-bottom": "16px" } as CSSProperties} className="relative overflow-hidden">
            <SpecialistApp />
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
