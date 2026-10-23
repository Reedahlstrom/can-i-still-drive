import { useCallback } from "react";
import { useDemo } from "../state/store";
import { tr } from "./index";

/** The translate function for the demo's current language; components re-render when it changes. */
export function useT() {
  const lang = useDemo((s) => s.lang);
  return useCallback((en: string, vars?: Record<string, string | number>) => tr(en, vars, lang), [lang]);
}
