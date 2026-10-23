import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { patient, record, shareCategories, sources } from "../data/demo";
import { useT } from "../i18n/useT";
import { useDemo } from "../state/store";
import { Avatar, HealthKeyLogo, initialsOf } from "../ui/Brand";
import { Button, Group, Toggle } from "../ui/primitives";
import { Lead, Screen, Title } from "./Screen";

export function HkIntro() {
  const set = useDemo((s) => s.set);
  const t = useT();
  const lead = t("Your specialist needs to see your conditions, medicines and eye exams. HealthKey gathers them from your doctors and pharmacy.");
  return (
    <Screen
      speech={`${t("Connect your health record")}. ${lead} ${t("You decide what's shared.")}`}
      footer={
        <>
          <Button variant="hk" onClick={() => set({ hkStep: "signin" })}>
            {t("Connect with HealthKey")}
          </Button>
          <Button variant="quiet" onClick={() => set({ patientStep: "questions", questionIndex: 0 })}>
            {t("Not now")}
          </Button>
        </>
      }
    >
      <div className="mb-7 pt-1">
        <HealthKeyLogo height={34} />
      </div>
      <Title>{t("Connect your health record")}</Title>
      <Lead>{lead}</Lead>
      <Lead>{t("You decide what's shared.")}</Lead>
    </Screen>
  );
}

export function HkConnected() {
  const set = useDemo((s) => s.set);
  const hkShare = useDemo((s) => s.hkShare);
  const t = useT();
  const rows = [
    { id: "conditions", label: "Conditions", n: record.conditions.length },
    { id: "medicines", label: "Medicines", n: record.medicines.length },
    { id: "eyes", label: "Eye exams", n: record.eyes.length },
    { id: "visits", label: "Visit notes", n: 23 },
    { id: "labs", label: "Lab results", n: record.labs.length },
  ].filter((r) => hkShare[r.id]);
  return (
    <Screen
      speech={`${t("Your record is connected")}. ${t("Your driving specialist will see these during your visit.")}`}
      footer={<Button onClick={() => set({ patientStep: "questions", questionIndex: 0 })}>{t("Continue")}</Button>}
    >
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="mb-6 flex size-16 items-center justify-center rounded-full bg-hk text-white">
        <Check size={34} strokeWidth={3} />
      </motion.div>
      <Title>{t("Your record is connected")}</Title>
      <Lead>{t("Your driving specialist will see what you shared.")}</Lead>
      <Group className="mt-7">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-5 py-4 text-[20px]">
            <span>{t(r.label)}</span>
            <span className="font-display font-bold tnum">{r.n}</span>
          </div>
        ))}
      </Group>
      <div className="mt-5 flex items-center gap-2 px-1 text-[16px] text-graphite">
        <span>{t("From")}</span>
        <HealthKeyLogo height={20} />
      </div>
    </Screen>
  );
}

function SheetBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col"
    >
      {children}
    </motion.div>
  );
}

function Assembling({ onDone }: { onDone: () => void }) {
  const speed = useDemo((s) => s.speed);
  const t = useT();
  const [done, setDone] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const t = (ms: number) => ms / speed;
    const timers = sources.map((_, i) => setTimeout(() => setDone(i + 1), t(900 + i * 850)));
    const end = setTimeout(() => useDemo.getState().hkStep === "assembling" && doneRef.current(), t(900 + sources.length * 850 + 700));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [speed]);
  return (
    <SheetBody>
      <h2 className="font-display text-[28px] leading-tight font-extrabold">{t("Gathering your records")}</h2>
      <div className="mt-6 flex flex-col gap-3">
        {sources.map((s, i) => {
          const state = i < done ? "done" : i === done ? "working" : "waiting";
          return (
            <div key={s.id} className="relative overflow-hidden rounded-2xl bg-hk-tint px-5 py-4">
              {state === "working" && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-hk/12"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.85 / speed, ease: "easeInOut" }}
                />
              )}
              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <div className="text-[19px] font-semibold">{t(s.name)}</div>
                  <div className="text-[16px] text-graphite">{state === "done" ? t(s.counts) : t(s.kind)}</div>
                </div>
                <span className={`flex size-8 items-center justify-center rounded-full transition-colors ${state === "done" ? "bg-hk text-white" : "bg-white"}`}>
                  {state === "done" ? <Check size={18} strokeWidth={3} /> : state === "working" ? <Spinner /> : null}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SheetBody>
  );
}

function Spinner() {
  return (
    <motion.span
      className="block size-5 rounded-full border-[2.5px] border-hk border-t-transparent"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function HkSheet() {
  const hkStep = useDemo((s) => s.hkStep);
  const set = useDemo((s) => s.set);
  const hkSources = useDemo((s) => s.hkSources);
  const hkShare = useDemo((s) => s.hkShare);
  const textScale = useDemo((s) => s.textScale);
  const account = useDemo((s) => s.account);
  const t = useT();
  const finish = () => set({ hkStep: null, hkConnected: true, patientStep: "hk-connected" });

  return (
    <AnimatePresence>
      {hkStep && (
        <motion.div className="absolute inset-0 z-40 flex flex-col justify-end" initial="hidden" animate="shown" exit="hidden">
          <motion.div
            className="absolute inset-0 bg-asphalt/45"
            variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
            onClick={() => hkStep !== "assembling" && set({ hkStep: null })}
          />
          <motion.div
            role="dialog"
            aria-label="HealthKey"
            className="relative flex h-[88%] flex-col rounded-t-[28px] bg-white px-6 pt-5 pb-[calc(var(--safe-bottom,0px)+18px)]"
            style={{ zoom: textScale }}
            variants={{ hidden: { y: "100%" }, shown: { y: 0 } }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-6 flex items-center justify-between">
              <HealthKeyLogo height={28} />
              {hkStep !== "assembling" && (
                <button className="h-10 rounded-lg px-2 text-[17px] font-semibold text-hk" onClick={() => set({ hkStep: null })}>
                  {t("Cancel")}
                </button>
              )}
            </div>
            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait">
                {hkStep === "signin" && (
                  <SheetBody key="signin">
                    <h2 className="font-display text-[28px] leading-tight font-extrabold">{t("Sign in to HealthKey")}</h2>
                    <div className="mt-6 flex items-center gap-4 rounded-2xl bg-hk-tint px-5 py-4">
                      <Avatar initials={initialsOf(`${patient.first} ${patient.last}`)} size={52} tone="hk" />
                      <div>
                        <div className="text-[20px] font-semibold">{t(account.name)}</div>
                        <div className="text-[16px] text-graphite">{t("{phone}, verified", { phone: account.phone })}</div>
                      </div>
                    </div>
                    <p className="mt-5 text-[18px] leading-relaxed text-graphite">{t("Your records are private and never sold.")}</p>
                    <div className="mt-auto">
                      <Button variant="hk" className="w-full" onClick={() => set({ hkStep: "sources" })}>
                        {t("Continue as {name}", { name: t(account.name.split(" ")[0]) })}
                      </Button>
                    </div>
                  </SheetBody>
                )}
                {hkStep === "sources" && (
                  <SheetBody key="sources">
                    <h2 className="font-display text-[28px] leading-tight font-extrabold">{t("We found your records")}</h2>
                    <div className="mt-6 flex flex-col gap-2.5">
                      {sources.map((s) => {
                        const on = hkSources.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => set({ hkSources: on ? hkSources.filter((x) => x !== s.id) : [...hkSources, s.id] })}
                            className="flex items-center justify-between gap-4 rounded-2xl bg-hk-tint px-5 py-4 text-left"
                          >
                            <div>
                              <div className="text-[19px] font-semibold">{t(s.name)}</div>
                              <div className="text-[16px] text-graphite">{t(s.kind)}</div>
                            </div>
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${on ? "bg-hk text-white" : "border-2 border-line-strong bg-white"}`}>
                              {on && <Check size={18} strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-auto">
                      <Button variant="hk" className="w-full" disabled={!hkSources.length} onClick={() => set({ hkStep: "share" })}>
                        {hkSources.length === 1 ? t("Connect 1 source") : t("Connect {n} sources", { n: hkSources.length })}
                      </Button>
                    </div>
                  </SheetBody>
                )}
                {hkStep === "share" && (
                  <SheetBody key="share">
                    <h2 className="font-display text-[28px] leading-tight font-extrabold">{t("Share with DriverScore")}</h2>
                    <p className="mt-3 text-[18px] leading-relaxed text-graphite">{t("Only your driving specialist and Dr. Patel see this, for this assessment. You can stop sharing in your health record.")}</p>
                    <div className="mt-5 divide-y divide-line rounded-2xl bg-hk-tint">
                      {shareCategories.map((c) => (
                        <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                          <span className="text-[19px]">{t(c.label)}</span>
                          <Toggle tone="hk" label={t(c.label)} on={!!hkShare[c.id]} onChange={(v) => set({ hkShare: { ...hkShare, [c.id]: v } })} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4">
                      <Button variant="hk" className="w-full" onClick={() => set({ hkStep: "assembling" })}>
                        {t("Share")}
                      </Button>
                    </div>
                  </SheetBody>
                )}
                {hkStep === "assembling" && <Assembling key="assembling" onDone={finish} />}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

