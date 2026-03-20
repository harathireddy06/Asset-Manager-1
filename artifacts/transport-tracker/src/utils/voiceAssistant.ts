type Lang = "en" | "te";

interface SpeakOptions {
  loud?: boolean;
  force?: boolean;
}

// ─── State ─────────────────────────────────────────────────────────────────

let _voices: SpeechSynthesisVoice[] = [];
let _currentLang: Lang = "en";
let _lastText = "";
let _lastTime = 0;
let _lastActionAt = 0;
let _announcedNearby = new Set<string>();
let _globalCleanup: (() => void) | null = null;
let _currentAudio: HTMLAudioElement | null = null;
let _proxySeq = 0; // increments on every new speak; lets proxyQueue detect interruption

const DEBOUNCE_MS = 4500;
const ACTION_GUARD_MS = 300;

// ─── Voice loading (eager + reactive) ─────────────────────────────────────

function loadVoices(): void {
  const v = window.speechSynthesis.getVoices();
  if (v.length) _voices = v;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// ─── Voice selection ────────────────────────────────────────────────────────

function getTeluguVoice(): SpeechSynthesisVoice | null {
  return (
    _voices.find(v => v.lang === "te-IN") ||
    _voices.find(v => v.lang.startsWith("te")) ||
    null
  );
}

// ─── Telugu via proxy TTS (Google Translate, server-side proxy) ─────────────
// Used when no native te-IN voice is installed in the browser.
// Returns a Promise that resolves when the audio finishes (or on error),
// so callers can chain multiple phrases sequentially.

function speakTeluguViaProxy(text: string): Promise<void> {
  _proxySeq++;
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio = null;
  }

  return new Promise<void>(resolve => {
    const url = `/api/tts?lang=te&text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    _currentAudio = audio;
    audio.onended = () => resolve();
    audio.onerror = (e) => {
      console.warn("[voice] proxy TTS error:", e);
      resolve();
    };
    audio.play().catch(e => {
      console.warn("[voice] proxy TTS play() rejected:", e);
      resolve();
    });
  });
}

// Play an array of Telugu phrases one after the other via proxy.
// Stops if another speak() call interrupts the chain (_proxySeq changes).
async function proxyQueue(phrases: string[]): Promise<void> {
  const seq = _proxySeq;
  for (const phrase of phrases) {
    if (_proxySeq !== seq) break; // interrupted — stop the chain
    await new Promise<void>(resolve => {
      if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
      const url = `/api/tts?lang=te&text=${encodeURIComponent(phrase)}`;
      const audio = new Audio(url);
      _currentAudio = audio;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }
}

// ─── Core speak ─────────────────────────────────────────────────────────────
// Priority:
//   Telugu mode + native te-IN voice  → Web Speech API (best quality)
//   Telugu mode + no native voice     → Proxy TTS (Google Translate, actual Telugu)
//   English mode                      → Web Speech API with en-IN

function speak(textTe: string, textEn: string, lang: Lang, opts: SpeakOptions): void {
  if (typeof window === "undefined") return;

  if (lang === "te") {
    const teVoice = getTeluguVoice();

    if (teVoice) {
      // Native te-IN voice available — use Web Speech API
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }

        const utt    = new SpeechSynthesisUtterance(textTe);
        utt.lang     = "te-IN";
        utt.voice    = teVoice;
        utt.pitch    = opts.loud ? 1.15 : 1.0;
        utt.rate     = opts.loud ? 0.72 : 0.85;
        utt.volume   = 1;
        window.speechSynthesis.speak(utt);
      }
    } else {
      // No native Telugu voice — use server-side proxy TTS for real Telugu audio
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      speakTeluguViaProxy(textTe);
    }
    return;
  }

  // English mode
  if (!("speechSynthesis" in window)) return;
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  window.speechSynthesis.cancel();

  const doSpeak = () => {
    const utt    = new SpeechSynthesisUtterance(textEn);
    utt.lang     = "en-IN";
    utt.pitch    = opts.loud ? 1.15 : 1.0;
    utt.rate     = opts.loud ? 0.72 : 0.85;
    utt.volume   = 1;
    window.speechSynthesis.speak(utt);
  };

  // Small delay if voices haven't loaded yet
  if (_voices.length === 0) {
    setTimeout(() => { loadVoices(); doSpeak(); }, 250);
  } else {
    doSpeak();
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function setVoiceLang(lang: Lang): void {
  _currentLang = lang;
}

export function speakTelugu(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!opts.force && text === _lastText && now - _lastTime < DEBOUNCE_MS) return;
  _lastText = text;
  _lastTime = now;
  _lastActionAt = now;
  speak(text, text, "te", opts);
}

export function speakBilingual(
  textTe: string,
  textEn: string,
  lang: Lang,
  opts: SpeakOptions = {}
): void {
  if (typeof window === "undefined") return;
  const text = lang === "te" ? textTe : textEn;
  const now  = Date.now();
  if (!opts.force && text === _lastText && now - _lastTime < DEBOUNCE_MS) return;
  _lastText = text;
  _lastTime = now;
  _lastActionAt = now;
  speak(textTe, textEn, lang, opts);
}

function queueUtterance(textTe: string, textEn: string, lang: Lang, delay: number): void {
  setTimeout(() => {
    if (typeof window === "undefined") return;
    speak(textTe, textEn, lang, { loud: true });
  }, delay);
}

export function announceRoute(
  fromVillage: string,
  toVillage: string,
  lang: Lang,
  villageFn: (v: string) => string
): void {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  _lastActionAt = Date.now();

  const useProxy = lang === "te" && !getTeluguVoice();

  if (useProxy) {
    // Chain phrases sequentially — each one starts only after the previous finishes.
    proxyQueue([
      "మార్గం సెట్ అయింది",
      `బయలుదేరే స్థానం: ${villageFn(fromVillage)}`,
      `చేరుకోవాల్సిన స్థానం: ${villageFn(toVillage)}`,
    ]);
  } else {
    // Web Speech API queues utterances automatically — push all three at once.
    const enqueue = (textTe: string, textEn: string) => {
      const text = lang === "te" ? textTe : textEn;
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = lang === "te" ? "te-IN" : "en-IN";
      utt.pitch  = 1.15;
      utt.rate   = 0.72;
      utt.volume = 1;
      if (lang === "te") {
        const v = getTeluguVoice();
        if (v) utt.voice = v;
      }
      window.speechSynthesis.speak(utt);
    };
    enqueue("మార్గం సెట్ అయింది", "Route set");
    enqueue(`బయలుదేరే స్థానం: ${villageFn(fromVillage)}`, `Starting from: ${fromVillage}`);
    enqueue(`చేరుకోవాల్సిన స్థానం: ${villageFn(toVillage)}`, `Going to: ${toVillage}`);
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
  trackingStarted: { te: "బస్సు ట్రాకింగ్ మొదలైంది",                   en: "Tracking started" },
  trackingStopped: { te: "ట్రాకింగ్ ఆపబడింది",                         en: "Tracking stopped" },
  centerOnBus:     { te: "బస్ ప్రస్తుత స్థానం పైకి తీసుకువస్తున్నాం",  en: "Centering on bus" },
  routeHidden:     { te: "మార్గాన్ని దాచారు",                           en: "Route hidden" },
  routeShown:      { te: "మార్గం చూపిస్తున్నాం",                       en: "Route shown" },
  mapReset:        { te: "మ్యాప్ రీసెట్ చేయబడింది",                   en: "Map reset" },
  noRoute:         { te: "ముందు మార్గం సెట్ చేయండి",                   en: "Set a route first" },
  noTracking:      { te: "ట్రాకింగ్ జరగడం లేదు",                       en: "No active tracking" },
  voiceError:      { te: "మైక్రోఫోన్ లోపం, మళ్ళీ ప్రయత్నించండి",      en: "Mic error, try again" },
  routeSet:        { te: "మార్గం సెట్ అయింది",                         en: "Route set" },
  fromSet:         { te: "బయలుదేరే స్థానం సెట్ అయింది",                en: "Starting point set" },
  toSet:           { te: "గమ్యస్థానం సెట్ అయింది",                     en: "Destination set" },
  helpHint:        { te: "చెప్పండి: మొదలు పెట్టు, ఆపు, లేదా గ్రామం పేరు", en: "Say: start, stop, or a village name" },
} as const;

export function say(key: keyof typeof MSGS, lang: Lang, opts: SpeakOptions = {}): void {
  speakBilingual(MSGS[key].te, MSGS[key].en, lang, opts);
}

// ─── Global button-click voice ──────────────────────────────────────────────

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
  if (typeof window === "undefined") return () => {};

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
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
}
