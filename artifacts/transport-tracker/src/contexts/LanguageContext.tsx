import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "te";

const translations: Record<string, { en: string; te: string }> = {
  "app.title":              { en: "TrackIt",                    te: "ట్రాకిట్" },
  "app.subtitle":           { en: "Real-Time Bus Tracking",     te: "రియల్-టైమ్ బస్ ట్రాకింగ్" },
  "btn.start":              { en: "Start Tracking",             te: "ట్రాకింగ్ ప్రారంభించు" },
  "btn.stop":               { en: "Stop Tracking",              te: "ట్రాకింగ్ ఆపు" },
  "btn.center":             { en: "Center on Bus",              te: "బస్సు చూపించు" },
  "btn.show_route":         { en: "Show Route",                 te: "మార్గం చూపు" },
  "btn.hide_route":         { en: "Hide Route",                 te: "మార్గం దాచు" },
  "btn.reset":              { en: "Reset Map",                  te: "మ్యాప్ రీసెట్" },
  "btn.apply_route":        { en: "Apply Route",                te: "మార్గం వర్తించు" },
  "btn.language":           { en: "తెలుగు",                     te: "English" },
  "controls.title":         { en: "Controls",                   te: "నియంత్రణలు" },
  "route.select":           { en: "Select route (From → To)",   te: "మార్గం ఎంచుకోండి" },
  "route.from":             { en: "From Village",               te: "నుండి గ్రామం" },
  "route.to":               { en: "To Village",                 te: "కు గ్రామం" },
  "info.status":            { en: "Status",                     te: "స్థితి" },
  "info.speed":             { en: "Speed",                      te: "వేగం" },
  "info.from":              { en: "From",                       te: "నుండి" },
  "info.to":                { en: "To",                         te: "కు" },
  "info.next_stop":         { en: "Next Stop",                  te: "తదుపరి స్టాప్" },
  "info.eta":               { en: "ETA",                        te: "అంచనా సమయం" },
  "info.remaining":         { en: "Remaining",                  te: "మిగిలింది" },
  "status.on_time":         { en: "Running",                    te: "నడుస్తోంది" },
  "status.delayed":         { en: "Delayed",                    te: "ఆలస్యం" },
  "status.arrived":         { en: "Arrived",                    te: "చేరుకుంది" },
  "live":                   { en: "LIVE",                       te: "లైవ్" },
  "voice.btn":              { en: "Voice",                      te: "వాయిస్" },
  "voice.listening":        { en: "Listening...",               te: "వింటున్నాను..." },
  "voice.prefix":           { en: "Voice: ",                    te: "వాయిస్: " },
  "voice.cmd.start":        { en: "Tracking started",           te: "ట్రాకింగ్ ప్రారంభమైంది" },
  "voice.cmd.stop":         { en: "Tracking stopped",           te: "ట్రాకింగ్ ఆపారు" },
  "voice.cmd.center":       { en: "Centering on bus",           te: "బస్సుపై కేంద్రీకరిస్తోంది" },
  "voice.cmd.route":        { en: "Route toggled",              te: "మార్గం మారింది" },
  "voice.cmd.lang_te":      { en: "Switched to Telugu",        te: "తెలుగుకు మారింది" },
  "voice.cmd.lang_en":      { en: "Switched to English",       te: "ఇంగ్లీష్‌కు మారింది" },
  "voice.cmd.unknown":      { en: "Command not recognized",     te: "ఆదేశం అర్థం కాలేదు" },
  "stop.reached.title":     { en: "Stop Reached",               te: "స్టాప్ చేరుకున్నారు" },
  "stop.reached.msg":       { en: "You have reached the stop.", te: "మీరు స్టాప్‌కు చేరుకున్నారు." },
  "stop.village":           { en: "Village",                    te: "గ్రామం" },
};

export const VILLAGE_NAMES_TE: Record<string, string> = {
  "Suryapet":        "సూర్యాపేట",
  "Kodad":           "కోదాడ",
  "Huzurnagar":      "హుజూర్‌నగర్",
  "Miryalaguda":     "మిర్యాలగూడ",
  "Nalgonda":        "నల్లగొండ",
  "Choutuppal":      "చౌటుప్పల్",
  "Bhongir":         "భువనగిరి",
  "Warangal":        "వరంగల్",
  "Hanamkonda":      "హనుమకొండ",
  "Khammam":         "ఖమ్మం",
  "Bhadrachalam":    "భద్రాచలం",
  "Mahabubabad":     "మహబూబాబాద్",
  "Kothagudem":      "కొత్తగూడెం",
  "Jangaon":         "జనగాం",
  "Nagarjuna Sagar": "నాగార్జున సాగర్",
  "Devarakonda":     "దేవరకొండ",
  "Pochampally":     "పోచంపల్లి",
  "Madhira":         "మాధిర",
  "Yellandu":        "ఎల్లందు",
  "Paloncha":        "పాలొంచ",
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  villageName: (name: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  const toggleLang = () => setLang(prev => prev === "en" ? "te" : "en");

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang];
  };

  const villageName = (name: string): string => {
    if (lang === "te") return VILLAGE_NAMES_TE[name] || name;
    return name;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, villageName }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
