import { motion, useReducedMotion } from "motion/react";
import type { Domain } from "../lib/score";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function DomainBars({ domains, patient = false, delay = 0.4 }: { domains: Domain[]; patient?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-5">
      {domains.map((d, i) => {
        const frac = d.points / d.max;
        const low = frac < 0.5;
        return (
          <div key={d.id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className={patient ? "text-[19px] font-semibold" : "text-[16px] font-semibold"}>{patient ? d.patientLabel : d.label}</span>
              <span className={`font-display font-bold tnum ${patient ? "text-[19px]" : "text-[16px]"}`}>
                {fmt(d.points)}
                <span className="font-normal text-graphite"> of {d.max}</span>
              </span>
            </div>
            <div className={`h-2.5 overflow-hidden rounded-full ${low ? "bg-alert-tint" : "bg-mist"}`}>
              <motion.div
                className={`h-full rounded-full ${low ? "bg-alert" : "bg-asphalt"}`}
                initial={{ width: reduce ? `${frac * 100}%` : "0%" }}
                animate={{ width: `${frac * 100}%` }}
                transition={{ duration: 0.9, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
