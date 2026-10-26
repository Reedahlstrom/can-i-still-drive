import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "../i18n/useT";
import { speak, stopSpeaking } from "../lib/speech";
import { useDemo, type Phase, type PatientStep } from "../state/store";
import { RoadProgress } from "../ui/Road";
import { HkConnected, HkIntro, HkSheet } from "./HealthKey";
import { Code, Details, Welcome } from "./Onboarding";
import { Questions } from "./Questions";
import { Result, RideSheet } from "./Result";
import { SpeechContext } from "./Screen";
import { FamilyTab, RecordTab, TabBar } from "./Tabs";
import { Connecting, Home, VisitStatus, Where } from "./Visit";

const STEPS = ["Your details", "Health record", "Questions", "Check in"];

function progressIndex(phase: Phase, step: PatientStep) {
  if (phase === "onboarding") {
    if (step === "questions") return 2;
    if (step.startsWith("hk")) return 1;
    return 0;
  }
  return 3;
}

type View = { key: string; node: ReactNode; tabs: boolean; back?: () => void; progress: boolean; chrome: boolean };

function useView(): View {
  const s = useDemo();
  const { phase, patientStep, tab, set } = s;

  if (phase === "onboarding") {
    switch (patientStep) {
      case "welcome":
        return { key: "welcome", node: <Welcome />, tabs: false, progress: false, chrome: false };
      case "details":
        return { key: "details", node: <Details />, tabs: false, progress: true, chrome: true, back: () => set({ patientStep: "welcome" }) };
      case "code":
        return { key: "code", node: <Code />, tabs: false, progress: true, chrome: true, back: () => set({ patientStep: "details" }) };
      case "hk-intro":
        return { key: "hk-intro", node: <HkIntro />, tabs: false, progress: true, chrome: true, back: () => set({ patientStep: "details" }) };
      case "hk-connected":
        return { key: "hk-connected", node: <HkConnected />, tabs: false, progress: true, chrome: true };
      default:
        return {
          key: "questions",
          node: <Questions />,
          tabs: false,
          progress: true,
          chrome: true,
          back: () => (s.questionIndex > 0 ? set({ questionIndex: s.questionIndex - 1 }) : set({ patientStep: s.hkConnected ? "hk-connected" : "hk-intro" })),
        };
    }
  }

  if (phase === "ready") {
    if (patientStep === "where") return { key: "where", node: <Where />, tabs: false, progress: true, chrome: true, back: () => set({ patientStep: "home" }) };
    if (patientStep === "connecting") return { key: "connecting", node: <Connecting />, tabs: false, progress: true, chrome: true };
  }

  if (tab === "record") return { key: "record", node: <RecordTab />, tabs: true, progress: false, chrome: true };
  if (tab === "family") return { key: "family", node: <FamilyTab />, tabs: true, progress: false, chrome: true };
  if (phase === "ready") return { key: "home", node: <Home />, tabs: true, progress: false, chrome: true };
  if (phase === "released") return { key: `result-${s.determination?.outcome}-${s.determination?.signedAt}`, node: <Result />, tabs: true, progress: false, chrome: true };
  return { key: "visit", node: <VisitStatus />, tabs: true, progress: false, chrome: true };
}

export function PatientApp() {
  const view = useView();
  const phase = useDemo((s) => s.phase);
  const visit = useDemo((s) => s.visit);
  const patientStep = useDemo((s) => s.patientStep);
  const textScale = useDemo((s) => s.textScale);
  const set = useDemo((s) => s.set);
  const t = useT();
  const [speaking, setSpeaking] = useState(false);
  const speechText = useRef("");
  const setSpeech = useCallback((t: string) => {
    speechText.current = t;
  }, []);

  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [view.key]);

  const toggleSpeech = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else if (speechText.current) {
      setSpeaking(true);
      speak(speechText.current, () => setSpeaking(false));
    }
  };

  const cycleText = () => set({ textScale: textScale === 1 ? 1.15 : textScale === 1.15 ? 1.3 : 1 });

  return (
    <SpeechContext.Provider value={setSpeech}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-canvas text-asphalt">
        {view.chrome && (
          <header className="relative z-10 flex items-center gap-3 bg-canvas px-4 pt-[calc(var(--safe-top,0px)+6px)] pb-2">
            <div className="w-12 shrink-0">
              {view.back && (
                <button onClick={view.back} aria-label={t("Back")} className="-ml-1 flex size-12 items-center justify-center rounded-full hover:bg-mist">
                  <ChevronLeft size={30} strokeWidth={2.4} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {view.progress && (
                <>
                  <RoadProgress steps={STEPS.map((x) => t(x))} current={progressIndex(phase, patientStep)} />
                  <div className="-mt-0.5 text-[13px] font-semibold text-graphite">
                    {t("Step {n} of {total}: {name}", { n: progressIndex(phase, patientStep) + 1, total: STEPS.length, name: t(STEPS[progressIndex(phase, patientStep)]) })}
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={cycleText} aria-label={t("Text size {n} percent", { n: Math.round(textScale * 100) })} className="flex h-[60px] w-[74px] flex-col items-center justify-center gap-0.5 rounded-xl hover:bg-mist">
                <span className="font-display font-bold leading-none" style={{ fontSize: 18 + (textScale - 1) * 20 }}>
                  Aa
                </span>
                <span className="text-[15px] leading-tight font-semibold text-graphite">{t("Text size")}</span>
              </button>
              <button onClick={toggleSpeech} aria-label={speaking ? t("Stop reading") : t("Read aloud")} aria-pressed={speaking} className={`flex h-[60px] w-[62px] flex-col items-center justify-center gap-0.5 rounded-xl ${speaking ? "bg-asphalt text-white" : "hover:bg-mist"}`}>
                {speaking ? <VolumeX size={22} /> : <Volume2 size={22} />}
                <span className={`text-[15px] leading-tight font-semibold ${speaking ? "text-white" : "text-graphite"}`}>{speaking ? t("Stop") : t("Listen")}</span>
              </button>
            </div>
          </header>
        )}
        <main className="relative min-h-0 flex-1" style={{ zoom: textScale, ...(view.tabs ? ({ "--safe-bottom": "0px" } as React.CSSProperties) : {}) }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${view.key}-${visit}`}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {view.node}
            </motion.div>
          </AnimatePresence>
        </main>
        {view.tabs && <TabBar />}
        <HkSheet />
        <RideSheet />
      </div>
    </SpeechContext.Provider>
  );
}
