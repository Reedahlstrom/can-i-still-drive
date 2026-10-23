import { motion, useReducedMotion } from "motion/react";
import type { DriveScore } from "../lib/score";

/** Each drive's score with a plain sentence about how it went. Used on the patient's result. */
export function DriveResults({ drives, delay = 0.4 }: { drives: DriveScore[]; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-6">
      {drives.map((d, i) => (
        <div key={d.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-[19px] font-semibold leading-snug">{d.name}</span>
            <span className="shrink-0 font-display text-[19px] font-bold tnum">
              {d.done ? (
                <>
                  {d.points}
                  <span className="font-normal text-graphite"> of 10</span>
                </>
              ) : (
                <span className="font-sans text-[17px] font-normal text-graphite">Not completed</span>
              )}
            </span>
          </div>
          {d.done && (
            <>
              <div className="h-2.5 overflow-hidden rounded-full bg-mist">
                <motion.div
                  className="h-full rounded-full bg-asphalt"
                  initial={{ width: reduce ? `${d.points * 10}%` : "0%" }}
                  animate={{ width: `${d.points * 10}%` }}
                  transition={{ duration: 0.9, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-2 text-[17px] leading-snug text-graphite">{d.patient}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
