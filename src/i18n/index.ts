import { ja } from "./ja";

// The demo runs in English or Japanese. Text is written in English where it is used and looked up
// in the Japanese dictionary when needed; {name} placeholders are filled from vars.

export type Lang = "en" | "ja";
type Vars = Record<string, string | number>;

let current: Lang = "en";
export const setLang = (lang: Lang) => {
  current = lang;
  if (typeof document !== "undefined") document.documentElement.lang = lang;
};
export const getLang = () => current;

/** Runs fn with another language active, for comparing text across languages. */
export function inLang<T>(lang: Lang, fn: () => T): T {
  const was = current;
  current = lang;
  try {
    return fn();
  } finally {
    current = was;
  }
}

const missing = new Set<string>();

/** "context::text" keys tell apart words that translate differently in different places; English shows the text. */
export function tr(en: string, vars?: Vars, lang: Lang = current) {
  const cut = en.indexOf("::");
  let s = cut >= 0 ? en.slice(cut + 2) : en;
  if (lang === "ja") {
    const hit = ja[en];
    if (hit === undefined) {
      if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && !missing.has(en)) {
        missing.add(en);
        console.warn(`[i18n] missing ja: ${JSON.stringify(en)}`);
      }
    } else s = hit;
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Joins a short list the way each language does: "a, b and c" or 「a、b、c」. */
export function list(items: string[], lang: Lang = current) {
  if (lang === "ja") return items.join("、");
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Speeds and distances in the units each audience reads naturally. */
export const units = {
  speed: (mph: number, lang: Lang = current) => (lang === "ja" ? `${Math.round(mph * 1.609)}` : `${Math.round(mph)}`),
  speedUnit: (lang: Lang = current) => (lang === "ja" ? "km/h" : "mph"),
  feetAsText: (ft: number, lang: Lang = current) => (lang === "ja" ? `${Math.round(ft * 30.48)} cm` : `${ft.toFixed(1)} ft`),
};
