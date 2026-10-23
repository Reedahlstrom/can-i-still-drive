import { tr } from "../i18n";

type MarkProps = { size?: number; className?: string };

export function DriverScoreMark({ size = 28, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="15" fill="#1C2229" />
      <path d="M28.5 13 15 53M35.5 13 49 53" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M32 16v4.5M32 27v7M32 41.5v10" stroke="#F4B400" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

export function DriverScoreWordmark({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="DriverScore">
      <DriverScoreMark size={size} />
      <span
        className={`font-display font-extrabold tracking-[-0.01em] ${light ? "text-white" : "text-asphalt"}`}
        style={{ fontSize: size * 0.72, lineHeight: 1 }}
      >
        DriverScore
      </span>
    </span>
  );
}

export function HealthKeyTile({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? "#4A6650" : "#ffffff";
  const fg = inverted ? "#ffffff" : "#4A6650";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect x="0.5" y="0.5" width="47" height="47" rx="10" fill={bg} stroke={inverted ? "none" : "#D5DDD7"} />
      <path d="M24 13v22M13 24h22" stroke={fg} strokeWidth="4.2" />
    </svg>
  );
}

export function HealthKeyLogo({ height = 26, light = false }: { height?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: height * 0.38 }} aria-label="HealthKey">
      <HealthKeyTile size={height} inverted={!light} />
      <img
        src={`${import.meta.env.BASE_URL}${light ? "healthkey-wordmark-white.png" : "healthkey-wordmark-ink.png"}`}
        alt=""
        style={{ height: height * 0.62, width: "auto" }}
        draggable={false}
      />
    </span>
  );
}

/** Initials for a person: two letters of an English name, or the first character of a Japanese family name. */
export function initialsOf(name: string) {
  const local = tr(name);
  return /[\u4e00-\u9fff]/.test(local) ? local[0] : name.split(" ").map((w) => w[0]).join("");
}

export function Avatar({ initials, size = 48, tone = "asphalt" }: { initials: string; size?: number; tone?: "asphalt" | "signal" | "hk" | "mist" }) {
  const tones = {
    asphalt: "bg-asphalt text-white",
    signal: "bg-signal text-asphalt",
    hk: "bg-hk text-white",
    mist: "bg-mist text-asphalt",
  } as const;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: size * (initials.length === 1 ? 0.44 : 0.36), paddingTop: size * 0.04 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
