type Lang = "en" | "te";

interface SpeakOptions {
  loud?: boolean;
  force?: boolean;
}

let _lastText = "";
let _lastTime = 0;
let _lastActionAt = 0;
let _currentLang: Lang = "te";
let _announcedNearby = new Set<string>();
let _globalCleanup: (() => void) | null = null;
let _cachedVoices: SpeechSynthesisVoice[] = [];

const DEBOUNCE_MS = 4500;
const ACTION_GUARD_MS = 300;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const loadVoices = () => {
    _cachedVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getTeluguVoice(): SpeechSynthesisVoice | null {
  const voices = _cachedVoices.length ? _cachedVoices : window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === "te-IN") ||
    voices.find(v => v.lang.startsWith("te")) ||
    null
  );
}

function hasTeluguVoice(): boolean {
  return getTeluguVoice() !== null;
}

function buildUtterance(
  textTe: string,
  textEn: string,
  lang: Lang,
  opts: SpeakOptions
): SpeechSynthesisUtterance {
  const text = lang === "te" ? textTe : textEn;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "te" ? "te-IN" : "en-IN";
  utt.pitch = opts.loud ? 1.15 : 1.0;
  utt.rate = opts.loud ? 0.72 : 0.85;
  utt.volume = 1;
  if (lang === "te") {
    const voice = getTeluguVoice();
    if (voice) utt.voice = voice;
  }
  return utt;
}

export function setVoiceLang(lang: Lang): void {
  _currentLang = lang;
}

export function speakTelugu(text: string, opts: SpeakOptions = {}): void {
  if (!("speechSynthesis" in window)) return;

  const now = Date.now();
  if (!opts.force && text === _lastText && now - _lastTime < DEBOUNCE_MS) return;
  _lastText = text;
  _lastTime = now;
  _lastActionAt = now;

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
  _lastActionAt = now;

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

function queueUtterance(textTe: string, textEn: string, lang: Lang, delay: number): void {
  setTimeout(() => {
    if (!("speechSynthesis" in window)) return;
    const utt = buildUtterance(textTe, textEn, lang, { loud: true });
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
  _lastActionAt = Date.now();

  queueUtterance("మార్గం సెట్ అయింది", "Route set", lang, 0);
  queueUtterance(
    `బయలుదేరే స్థానం: ${villageFn(fromVillage)}`,
    `Starting from: ${fromVillage}`,
    lang,
    lang === "te" ? 1400 : 900
  );
  queueUtterance(
    `చేరుకోవాల్సిన స్థానం: ${villageFn(toVillage)}`,
    `Going to: ${toVillage}`,
    lang,
    lang === "te" ? 3200 : 2200
  );
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
  trackingStarted:  { te: "బస్సు ట్రాకింగ్ మొదలైంది",                  en: "Tracking started" },
  trackingStopped:  { te: "ట్రాకింగ్ ఆపబడింది",                        en: "Tracking stopped" },
  centerOnBus:      { te: "బస్ ప్రస్తుత స్థానం పైకి తీసుకువస్తున్నాం", en: "Centering on bus" },
  routeHidden:      { te: "మార్గాన్ని దాచారు",                          en: "Route hidden" },
  routeShown:       { te: "మార్గం చూపిస్తున్నాం",                      en: "Route shown" },
  mapReset:         { te: "మ్యాప్ రీసెట్ చేయబడింది",                  en: "Map reset" },
  noRoute:          { te: "ముందు మార్గం సెట్ చేయండి",                  en: "Set a route first" },
  noTracking:       { te: "ట్రాకింగ్ జరగడం లేదు",                      en: "No active tracking" },
  voiceError:       { te: "మైక్రోఫోన్ లోపం, మళ్ళీ ప్రయత్నించండి",     en: "Mic error, try again" },
  routeSet:         { te: "మార్గం సెట్ అయింది",                        en: "Route set" },
  fromSet:          { te: "బయలుదేరే స్థానం సెట్ అయింది",               en: "Starting point set" },
  toSet:            { te: "గమ్యస్థానం సెట్ అయింది",                    en: "Destination set" },
  helpHint:         { te: "చెప్పండి: మొదలు పెట్టు, ఆపు, లేదా గ్రామం పేరు", en: "Say: start, stop, or a village name" },
} as const;

export function say(key: keyof typeof MSGS, lang: Lang, opts: SpeakOptions = {}): void {
  speakBilingual(MSGS[key].te, MSGS[key].en, lang, opts);
}

const BUTTON_TEXT_MAP: Record<string, { te: string; en: string }> = {
  "stop tracking":           { te: "ట్రాకింగ్ ఆపబడింది",                        en: "Tracking stopped" },
  "start tracking":          { te: "బస్సు ట్రాకింగ్ మొదలైంది",                  en: "Tracking started" },
  "track bus":               { te: "బస్సు ట్రాకింగ్ మొదలైంది",                  en: "Tracking started" },
  "center on bus":           { te: "బస్ ప్రస్తుత స్థానం పైకి తీసుకువస్తున్నాం", en: "Centering on bus" },
  "hide route":              { te: "మార్గాన్ని దాచారు",                          en: "Route hidden" },
  "show route":              { te: "మార్గం చూపిస్తున్నాం",                      en: "Route shown" },
  "reset map":               { te: "మ్యాప్ రీసెట్ చేయబడింది",                  en: "Map reset" },
  "apply route":             { te: "మార్గం సెట్ అయింది",                        en: "Route applied" },
  "track":                   { te: "బస్సు ట్రాకింగ్ మొదలైంది",                  en: "Tracking started" },
  "route":                   { te: "మార్గం ఎంచుకోండి",                          en: "Select route" },
  "stops":                   { te: "స్టాప్‌లు చూపిస్తున్నాం",                   en: "Showing stops" },
  "en":                      { te: "",                                              en: "" },
  "తె":                      { te: "",                                              en: "" },
  "voice":                   { te: "",                                              en: "" },
  "listening...":            { te: "",                                              en: "" },
  "ట్రాకింగ్ ప్రారంభించు":  { te: "బస్సు ట్రాకింగ్ మొదలైంది",                  en: "Tracking started" },
  "ట్రాకింగ్ ఆపు":          { te: "ట్రాకింగ్ ఆపబడింది",                        en: "Tracking stopped" },
  "బస్సు చూపించు":          { te: "బస్ ప్రస్తుత స్థానం పైకి తీసుకువస్తున్నాం", en: "Centering on bus" },
  "మార్గం చూపు":            { te: "మార్గం చూపిస్తున్నాం",                      en: "Route shown" },
  "మార్గం దాచు":            { te: "మార్గాన్ని దాచారు",                          en: "Route hidden" },
  "మ్యాప్ రీసెట్":          { te: "మ్యాప్ రీసెట్ చేయబడింది",                  en: "Map reset" },
  "మార్గం వర్తించు":        { te: "మార్గం సెట్ అయింది",                        en: "Route applied" },
  "వాయిస్":                 { te: "",                                              en: "" },
  "వింటున్నాను...":          { te: "",                                              en: "" },
};

export function getTeluguMessage(buttonText: string): { te: string; en: string } | null {
  const normalized = buttonText.toLowerCase().trim();
  if (!normalized) return null;

  const exact = BUTTON_TEXT_MAP[normalized];
  if (exact) return exact.te || exact.en ? exact : null;

  for (const [key, val] of Object.entries(BUTTON_TEXT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val.te || val.en ? val : null;
    }
  }
  return null;
}

export function attachGlobalButtonVoice(): () => void {
  if (!("speechSynthesis" in window)) return () => {};

  if (_globalCleanup) _globalCleanup();

  const handler = (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest("button");
    if (!button) return;

    const now = Date.now();
    if (now - _lastActionAt < ACTION_GUARD_MS) return;

    const rawText = button.innerText.trim();
    if (!rawText) return;

    const mapped = getTeluguMessage(rawText);
    if (!mapped) return;

    const text = _currentLang === "te" ? mapped.te : mapped.en;
    if (!text) return;

    speakBilingual(mapped.te, mapped.en, _currentLang);
  };

  document.addEventListener("click", handler, false);
  _globalCleanup = () => document.removeEventListener("click", handler, false);
  return _globalCleanup;
}

export function resetVoiceState(): void {
  _lastText = "";
  _lastTime = 0;
  _lastActionAt = 0;
  _announcedNearby.clear();
}
