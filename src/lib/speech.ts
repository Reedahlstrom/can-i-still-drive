let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (voice || typeof speechSynthesis === "undefined") return voice;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  voice =
    voices.find((v) => /Samantha|Ava|Allison|Google US English/.test(v.name)) ??
    voices.find((v) => v.lang === "en-US") ??
    voices[0] ??
    null;
  return voice;
}

export function speak(text: string, onEnd?: () => void) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 0.92;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
