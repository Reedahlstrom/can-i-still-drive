import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { speak, stopSpeaking } from "../lib/speech";
import { atLeast, useDemo, type Phase, type PatientStep } from "../state/store";
import { RoadProgress } from "../ui/Road";
import { HkConnected, HkIntro, HkSheet } from "./HealthKey";
import { Code, Details, Welcome } from "./Onboarding";
import { Questions } from "./Questions";
import { Result, RideSheet } from "./Result";
import { SpeechContext } from "./Screen";
import { FamilyTab, RecordTab, TabBar } from "./Tabs";
import { Connecting, Driving, Home, PostDrive, PreDrive, VisitStatus, Where, WhichSim } from "./Visit";

const STEPS = ["Account", "Health record", "Questions", "Check in", "Tests", "Drive", "Results"];

function progressIndex(phase: Phase, step: PatientStep) {
  if (phase === "onboarding") {
    if (step === "questions") return 2;
    if (step.startsWith("hk")) return 1;
    return 0;
  }
  if (phase === "ready") return 3;
  if (atLeast(phase, "uploading")) return 6;
  if (atLeast(phase, "pre-drive")) return 5;
  return 4;
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
    if (patientStep === "which-sim") return { key: "which-sim", node: <WhichSim />, tabs: false, progress: true, chrome: true, back: () => set({ patientStep: "where" }) };
    if (patientStep === "connecting") return { key: "connecting", node: <Connecting />, tabs: false, progress: true, chrome: true };
  }

  if (phase === "pre-drive" && !s.preDriveFeeling) return { key: "pre-drive", node: <PreDrive />, tabs: false, progress: true, chrome: true };
  if (phase === "driving") return { key: "driving", node: <Driving />, tabs: false, progress: false, chrome: false };
  if (phase === "post-drive" && (!s.postFeel || s.selfRating === null))
    return { key: `post-${s.postFeel ? 2 : 1}`, node: <PostDrive />, tabs: false, progress: true, chrome: true };

  if (tab === "record") return { key: "record", node: <RecordTab />, tabs: true, progress: false, chrome: true };
  if (tab === "family") return { key: "family", node: <FamilyTab />, tabs: true, progress: false, chrome: true };
  if (phase === "ready") return { key: "home", node: <Home />, tabs: true, progress: true, chrome: true };
  if (phase === "released") return { key: `result-${s.determination?.outcome}-${s.determination?.signedAt}`, node: <Result />, tabs: true, progress: true, chrome: true };
  return { key: "visit", node: <VisitStatus />, tabs: true, progress: true, chrome: true };
}

export function PatientApp() {
  const view = useView();
  const phase = useDemo((s) => s.phase);
  const patientStep = useDemo((s) => s.patientStep);
  const textScale = useDemo((s) => s.textScale);
  const set = useDemo((s) => s.set);
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
                <button onClick={view.back} aria-label="Back" className="-ml-1 flex size-12 items-center justify-center rounded-full hover:bg-mist">
                  <ChevronLeft size={30} strokeWidth={2.4} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">{view.progress && <RoadProgress steps={STEPS} current={progressIndex(phase, patientStep)} />}</div>
            <div className="flex shrink-0 items-center">
              <button onClick={cycleText} aria-label={`Text size ${Math.round(textScale * 100)} percent`} className="flex size-12 items-center justify-center rounded-full hover:bg-mist">
                <span className="font-display font-bold leading-none" style={{ fontSize: 15 + (textScale - 1) * 30 }}>
                  Aa
                </span>
              </button>
              <button onClick={toggleSpeech} aria-label={speaking ? "Stop reading" : "Read aloud"} aria-pressed={speaking} className={`flex size-12 items-center justify-center rounded-full ${speaking ? "bg-asphalt text-white" : "hover:bg-mist"}`}>
                {speaking ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </header>
        )}
        <main className="relative min-h-0 flex-1" style={{ zoom: textScale, ...(view.tabs ? ({ "--safe-bottom": "0px" } as React.CSSProperties) : {}) }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view.key}
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
