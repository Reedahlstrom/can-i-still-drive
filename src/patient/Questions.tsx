import { AnimatePresence, motion } from "motion/react";
import { questions } from "../data/demo";
import { useT } from "../i18n/useT";
import { useDemo } from "../state/store";
import { Button, ChoiceList } from "../ui/primitives";
import { Meta, Screen, Title } from "./Screen";

export function Questions() {
  const i = useDemo((s) => s.questionIndex);
  const answers = useDemo((s) => s.answers);
  const set = useDemo((s) => s.set);
  const t = useT();
  const q = questions[i];
  const value = answers[q.id];
  const answered = q.multi ? Array.isArray(value) && value.length > 0 : !!value;
  const last = i === questions.length - 1;

  const next = () => {
    if (last) set({ phase: "ready", patientStep: "home" });
    else set({ questionIndex: i + 1 });
  };

  return (
    <Screen
      speech={`${t(q.prompt)} ${q.multi ? t("Choose all that apply.") : ""} ${q.options.map((o) => t(o)).join(". ")}.`}
      footer={
        <Button disabled={!answered} onClick={next}>
          {last ? t("Done") : t("Continue")}
        </Button>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <Meta className="mb-3">{t("Question {n} of {total}", { n: i + 1, total: questions.length })}</Meta>
          <Title>{t(q.prompt)}</Title>
          {q.multi && <p className="mt-2 text-[18px] text-graphite">{t("Choose all that apply.")}</p>}
          <div className="mt-7">
            <ChoiceList options={q.options} multi={q.multi} value={value} onChange={(v) => set({ answers: { ...answers, [q.id]: v } })} />
          </div>
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}
