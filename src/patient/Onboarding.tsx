import { useAnimationFrame, useReducedMotion, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/useT";
import { useDemo } from "../state/store";
import { DriverScoreWordmark } from "../ui/Brand";
import { Button } from "../ui/primitives";
import { Lead, Screen, Title, useReadAloud } from "./Screen";

const DASHES = 9;

function DrivingRoad() {
  const reduce = useReducedMotion();
  const refs = useRef<(SVGPolygonElement | null)[]>([]);
  const draw = (phase: number) => {
    for (let i = 0; i < DASHES; i++) {
      const el = refs.current[i];
      if (!el) continue;
      const d0 = ((i + phase) % DASHES) / DASHES;
      const d1 = Math.min(1, d0 + 0.45 / DASHES);
      const y0 = 30 + 370 * Math.pow(d0, 2.4);
      const y1 = 30 + 370 * Math.pow(d1, 2.4);
      const w0 = 0.6 + 9 * Math.pow(d0, 1.8);
      const w1 = 0.6 + 9 * Math.pow(d1, 1.8);
      el.setAttribute("points", `${200 - w0},${y0} ${200 + w0},${y0} ${200 + w1},${y1} ${200 - w1},${y1}`);
      el.setAttribute("opacity", String(Math.min(1, d0 * 5)));
    }
  };
  useEffect(() => draw(0.3), []);
  useAnimationFrame((t) => {
    if (!reduce) draw((t / 900) % DASHES);
  });
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="roadfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A323B" stopOpacity="0" />
          <stop offset="0.3" stopColor="#2A323B" />
        </linearGradient>
      </defs>
      <polygon points="196,30 204,30 470,400 -70,400" fill="url(#roadfade)" />
      <path d="M195 30 -40 400M205 30 440 400" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {Array.from({ length: DASHES }, (_, i) => (
        <polygon key={i} ref={(el) => void (refs.current[i] = el)} fill="#F4B400" />
      ))}
    </svg>
  );
}

export function Welcome() {
  const set = useDemo((s) => s.set);
  const t = useT();
  const lead = t("A few simulator drives, chosen for you by a driving specialist. You'll leave with a result and a plan, shared only with you and your doctor.");
  useReadAloud(`${t("Can I still drive?")} ${lead}`);
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-asphalt text-white">
      <div className="absolute inset-x-0 top-[17%] bottom-0">
        <DrivingRoad />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b from-asphalt/0 via-asphalt/85 to-asphalt" />
      <div className="relative px-6 pt-[calc(var(--safe-top,0px)+14px)]">
        <DriverScoreWordmark size={30} light />
      </div>
      <div className="relative mt-auto px-6 pb-[calc(var(--safe-bottom,0px)+18px)]">
        <h1 className="font-display text-[46px] leading-[1.02] font-extrabold tracking-[-0.02em]">{t("Can I still drive?")}</h1>
        <p className="mt-4 text-[20px] leading-[1.45] text-white/75">{lead}</p>
        <Button variant="signal" className="mt-8 w-full" onClick={() => set({ patientStep: "details" })}>
          {t("Get started")}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[17px] font-semibold text-graphite">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[62px] w-full rounded-2xl border-2 border-transparent bg-paper px-5 text-[21px] text-asphalt outline-none transition-colors focus:border-asphalt"
      />
    </label>
  );
}

export function Details() {
  const set = useDemo((s) => s.set);
  const account = useDemo((s) => s.account);
  const t = useT();
  return (
    <Screen
      speech={`${t("Confirm your details")}. ${t("Dr. Patel's office sent your invitation. Check that everything is right.")}`}
      footer={<Button onClick={() => set({ patientStep: "code" })}>{t("Send code")}</Button>}
    >
      <Title>{t("Confirm your details")}</Title>
      <Lead>{t("Dr. Patel's office sent your invitation. Check that everything is right.")}</Lead>
      <div className="mt-7 flex flex-col gap-5">
        <Field label={t("Name")} value={t(account.name)} onChange={(v) => set({ account: { ...account, name: v } })} />
        <Field label={t("Date of birth")} value={t(account.dob)} onChange={(v) => set({ account: { ...account, dob: v } })} />
        <Field label={t("Mobile number")} value={account.phone} onChange={(v) => set({ account: { ...account, phone: v } })} />
      </div>
    </Screen>
  );
}

const CODE = "482916";

export function Code() {
  const set = useDemo((s) => s.set);
  const phone = useDemo((s) => s.account.phone);
  const speed = useDemo((s) => s.speed);
  const t = useT();
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = (ms: number) => ms / speed;
    const timers = Array.from({ length: 6 }, (_, i) => setTimeout(() => setN(i + 1), t(700 + i * 140)));
    const done = setTimeout(() => useDemo.getState().patientStep === "code" && set({ patientStep: "hk-intro" }), t(700 + 6 * 140 + 650));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [set, speed]);
  return (
    <Screen speech={`${t("Enter the code")}. ${t("We texted a 6-digit code to {phone}.", { phone })}`}>
      <Title>{t("Enter the code")}</Title>
      <Lead>{t("We texted a 6-digit code to {phone}.", { phone })}</Lead>
      <div className="mt-8 flex justify-between gap-2" aria-label={t("Verification code")}>
        {CODE.split("").map((c, i) => (
          <div
            key={i}
            className={`flex h-[70px] flex-1 items-center justify-center rounded-2xl border-2 bg-paper font-display text-[32px] font-bold transition-colors ${
              i === n && n < 6 ? "border-asphalt" : "border-transparent"
            }`}
          >
            {i < n && (
              <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="tnum">
                {c}
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </Screen>
  );
}
