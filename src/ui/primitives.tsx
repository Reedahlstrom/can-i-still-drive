import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "signal" | "hk" | "light";
  size?: "lg" | "md" | "sm";
  icon?: ReactNode;
};

const variants = {
  primary: "bg-asphalt text-white hover:bg-asphalt-2",
  secondary: "bg-mist text-asphalt hover:bg-line",
  quiet: "bg-transparent text-asphalt hover:bg-mist",
  signal: "bg-signal text-asphalt hover:brightness-95",
  hk: "bg-hk text-white hover:bg-hk-deep",
  light: "bg-white text-asphalt hover:bg-canvas",
};

const sizes = {
  lg: "h-[60px] px-6 text-[20px] rounded-2xl",
  md: "h-12 px-5 text-[17px] rounded-xl",
  sm: "h-10 px-4 text-[15px] rounded-lg",
};

export function Button({ variant = "primary", size = "lg", icon, className = "", children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`inline-flex select-none items-center justify-center gap-2.5 font-semibold transition-[background-color,transform,opacity] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function ChoiceList({
  options,
  value,
  multi = false,
  onChange,
}: {
  options: string[];
  value: string | string[] | undefined;
  multi?: boolean;
  onChange: (v: string | string[]) => void;
}) {
  const selected = (o: string) => (multi ? Array.isArray(value) && value.includes(o) : value === o);
  const toggle = (o: string) => {
    if (!multi) return onChange(o);
    const cur = Array.isArray(value) ? value : [];
    if (o === "None of these") return onChange(cur.includes(o) ? [] : [o]);
    const next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur.filter((x) => x !== "None of these"), o];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2.5" role={multi ? "group" : "radiogroup"}>
      {options.map((o) => {
        const on = selected(o);
        return (
          <button
            key={o}
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => toggle(o)}
            className={`flex min-h-[66px] items-center justify-between gap-4 rounded-2xl border-2 px-5 text-left text-[20px] transition-colors duration-150 ${
              on ? "border-asphalt bg-paper" : "border-transparent bg-paper hover:border-line-strong"
            }`}
          >
            <span className="py-3 leading-snug">{o}</span>
            <span
              className={`flex size-7 shrink-0 items-center justify-center transition-colors ${multi ? "rounded-lg" : "rounded-full"} ${
                on ? "bg-asphalt text-white" : "border-2 border-line-strong"
              }`}
            >
              {on && <Check size={18} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label, tone = "asphalt" }: { on: boolean; onChange: (v: boolean) => void; label: string; tone?: "asphalt" | "hk" }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[34px] w-[58px] shrink-0 rounded-full transition-colors duration-200 ${on ? (tone === "hk" ? "bg-hk" : "bg-asphalt") : "bg-line-strong"}`}
    >
      <motion.span
        className="absolute top-[3px] left-[3px] size-7 rounded-full bg-white shadow-[0_1px_3px_rgba(28,34,41,0.25)]"
        animate={{ x: on ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
      />
    </button>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  wrap = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "md" | "sm";
  wrap?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-xl bg-mist p-1 ${wrap ? "flex-wrap" : ""}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`relative rounded-lg font-semibold whitespace-nowrap transition-colors ${size === "md" ? "h-10 min-w-11 px-3.5 text-[16px]" : "h-8 min-w-9 px-2.5 text-[14px]"} ${
              on ? "text-asphalt" : "text-graphite hover:text-asphalt"
            }`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(28,34,41,0.12)]"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative tnum">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Group({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line overflow-hidden rounded-2xl bg-paper ${className}`}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 px-1 text-[17px] font-semibold text-graphite">{children}</h3>;
}

export function CheckDot({ done, size = 28 }: { done: boolean; size?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-colors ${done ? "bg-asphalt text-white" : "border-2 border-line-strong"}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {done && <Check size={size * 0.6} strokeWidth={3} />}
    </span>
  );
}
