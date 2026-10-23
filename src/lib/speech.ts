import { getLang } from "../i18n";

const voices: Partial<Record<string, SpeechSynthesisVoice | null>> = {};

function pickVoice(lang: "en" | "ja") {
  if (voices[lang] || typeof speechSynthesis === "undefined") return voices[lang] ?? null;
  const all = speechSynthesis.getVoices().filter((v) => v.lang.startsWith(lang));
  voices[lang] =
    lang === "ja"
      ? (all.find((v) => /Kyoko|O-ren|Google 日本語/.test(v.name)) ?? all[0] ?? null)
      : (all.find((v) => /Samantha|Ava|Allison|Google US English/.test(v.name)) ?? all.find((v) => v.lang === "en-US") ?? all[0] ?? null);
  return voices[lang] ?? null;
}

export function speak(text: string, onEnd?: () => void) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const lang = getLang();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ja" ? "ja-JP" : "en-US";
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = 0.92;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
