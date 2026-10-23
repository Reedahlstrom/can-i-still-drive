import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useDemo } from "../state/store";
import { DriveDone, DrivePrep, LiveDrive, Upload } from "./Drive";
import { RecordReview, Schedule } from "./Intake";
import { Released, ReviewSign } from "./Review";
import { Rail } from "./Shell";

export function SpecialistApp() {
  const phase = useDemo((s) => s.phase);
  const visit = useDemo((s) => s.visit);

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
      <Rail />
      <div className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${key}-${visit}`}
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
