import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useDemo } from "../state/store";
import { DriveDone, DrivePrep, LiveDrive, Upload } from "./Drive";
import { HandsOn } from "./HandsOn";
import { RecordReview, Schedule } from "./Intake";
import { Released, ReviewSign } from "./Review";
import { Rail } from "./Shell";
import { Handoff, PatientMode } from "./TabletTests";

export function SpecialistApp() {
  const phase = useDemo((s) => s.phase);
  const tabletStep = useDemo((s) => s.tabletStep);

  const patientMode = phase === "tablet-tests" && tabletStep !== "handoff";
  let key: string = phase;
  let node: ReactNode;
  switch (phase) {
    case "onboarding":
    case "ready":
    case "checked-in":
      key = "schedule";
      node = <Schedule />;
      break;
    case "record-review":
      node = <RecordReview />;
      break;
    case "tablet-tests":
      key = patientMode ? "patient-mode" : "handoff";
      node = patientMode ? <PatientMode /> : <Handoff />;
      break;
    case "hands-on":
      node = <HandsOn />;
      break;
    case "pre-drive":
      node = <DrivePrep />;
      break;
    case "driving":
      node = <LiveDrive />;
      break;
    case "post-drive":
      node = <DriveDone />;
      break;
    case "uploading":
      node = <Upload />;
      break;
    case "review":
      node = <ReviewSign />;
      break;
    case "released":
      node = <Released />;
      break;
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas text-asphalt">
      {!patientMode && <Rail />}
      <div className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            className="absolute inset-0 flex"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {node}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
