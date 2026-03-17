type Lang = "en" | "te";

interface SpeakOptions {
  loud?: boolean;
  force?: boolean;
}

let _lastText = "";
let _lastTime = 0;
let _announcedNearby = new Set<string>();

const DEBOUNCE_MS = 4500;

function getTeluguVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === "te-IN") ||
    voices.find(v => v.lang.startsWith("te")) ||
    null
  );
}

export function speakTelugu(text: string, opts: SpeakOptions = {}): void {
  if (!("speechSynthesis" in window)) return;

  const now = Date.now();
  if (!opts.force && text === _lastText && now - _lastTime < DEBOUNCE_MS) return;
  _lastText = text;
  _lastTime = now;

  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "te-IN";
  utt.pitch = opts.loud ? 1.15 : 1.0;
  utt.rate = opts.loud ? 0.72 : 0.85;
  utt.volume = 1;

  const voice = getTeluguVoice();
  if (voice) utt.voice = voice;

  window.speechSynthesis.speak(utt);
}

export function speakBilingual(
  textTe: string,
  textEn: string,
  lang: Lang,
  opts: SpeakOptions = {}
): void {
  if (!("speechSynthesis" in window)) return;

  const text = lang === "te" ? textTe : textEn;
  const now = Date.now();
  if (!opts.force && text === _lastText && now - _lastTime < DEBOUNCE_MS) return;
  _lastText = text;
  _lastTime = now;

  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "te" ? "te-IN" : "en-IN";
  utt.pitch = opts.loud ? 1.15 : 1.0;
  utt.rate = opts.loud ? 0.72 : 0.85;
  utt.volume = 1;

  if (lang === "te") {
    const voice = getTeluguVoice();
    if (voice) utt.voice = voice;
  }

  window.speechSynthesis.speak(utt);
}

function queueUtterance(text: string, lang: Lang, delay: number): void {
  setTimeout(() => {
    if (!("speechSynthesis" in window)) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === "te" ? "te-IN" : "en-IN";
    utt.pitch = 1.15;
    utt.rate = 0.72;
    utt.volume = 1;
    if (lang === "te") {
      const voice = getTeluguVoice();
      if (voice) utt.voice = voice;
    }
    window.speechSynthesis.speak(utt);
  }, delay);
}

export function announceRoute(
  fromVillage: string,
  toVillage: string,
  lang: Lang,
  villageFn: (v: string) => string
): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  if (lang === "te") {
    queueUtterance("మార్గం సెట్ అయింది", "te", 0);
    queueUtterance(`బయలుదేరే స్థానం: ${villageFn(fromVillage)}`, "te", 1400);
    queueUtterance(`చేరుకోవాల్సిన స్థానం: ${villageFn(toVillage)}`, "te", 3200);
  } else {
    queueUtterance("Route set", "en", 0);
    queueUtterance(`Starting from: ${fromVillage}`, "en", 900);
    queueUtterance(`Going to: ${toVillage}`, "en", 2200);
  }
}

export function announceApproachingStop(
  stopName: string,
  distanceM: number,
  lang: Lang,
  villageFn: (v: string) => string
): boolean {
  if (distanceM > 300) return false;
  const bucket = Math.floor(distanceM / 50);
  const key = `${stopName}-${bucket}`;
  if (_announcedNearby.has(key)) return false;
  _announcedNearby.add(key);

  const rounded = Math.round(distanceM / 10) * 10;
  speakBilingual(
    `${rounded} మీటర్ల తర్వాత ${villageFn(stopName)} స్టాప్`,
    `${stopName} stop in ${rounded} meters`,
    lang,
    { loud: true, force: true }
  );
  return true;
}

export function announceArrival(destination: string, lang: Lang, villageFn: (v: string) => string): void {
  speakBilingual(
    `మీరు ${villageFn(destination)} కు చేరుకున్నారు`,
    `You have arrived at ${destination}`,
    lang,
    { loud: true, force: true }
  );
}

export function announceEta(eta: string, lang: Lang): void {
  speakBilingual(
    `అంచనా సమయం ${eta}`,
    `Estimated arrival in ${eta}`,
    lang,
    { force: false }
  );
}

export const MSGS = {
  trackingStarted:  { te: "బస్సు ట్రాకింగ్ మొదలైంది",               en: "Tracking started" },
  trackingStopped:  { te: "ట్రాకింగ్ ఆపబడింది",                     en: "Tracking stopped" },
  centerOnBus:      { te: "బస్ ప్రస్తుత స్థానం పైకి తీసుకువస్తున్నాం", en: "Centering on bus" },
  routeHidden:      { te: "మార్గాన్ని దాచారు",                       en: "Route hidden" },
  routeShown:       { te: "మార్గం చూపిస్తున్నాం",                   en: "Route shown" },
  mapReset:         { te: "మ్యాప్ రీసెట్ చేయబడింది",               en: "Map reset" },
  noRoute:          { te: "ముందు మార్గం సెట్ చేయండి",               en: "Set a route first" },
  noTracking:       { te: "ట్రాకింగ్ జరగడం లేదు",                   en: "No active tracking" },
  voiceError:       { te: "మైక్రోఫోన్ లోపం, మళ్ళీ ప్రయత్నించండి",  en: "Mic error, try again" },
  routeSet:         { te: "మార్గం సెట్ అయింది",                     en: "Route set" },
  fromSet:          { te: "బయలుదేరే స్థానం సెట్ అయింది",            en: "Starting point set" },
  toSet:            { te: "గమ్యస్థానం సెట్ అయింది",                 en: "Destination set" },
  helpHint:         { te: "చెప్పండి: మొదలు పెట్టు, ఆపు, లేదా గ్రామం పేరు", en: "Say: start, stop, or a village name" },
} as const;

export function say(key: keyof typeof MSGS, lang: Lang, opts: SpeakOptions = {}): void {
  speakBilingual(MSGS[key].te, MSGS[key].en, lang, opts);
}

export function resetVoiceState(): void {
  _lastText = "";
  _lastTime = 0;
  _announcedNearby.clear();
}
