import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "te";

interface Translations {
  [key: string]: {
    en: string;
    te: string;
  };
}

const translations: Translations = {
  "app.title": { en: "Telangana Bus Tracker", te: "తెలంగాణ బస్ ట్రాకర్" },
  "app.subtitle": { en: "Find your bus in real-time", te: "మీ బస్సును సులభంగా ట్రాక్ చేయండి" },
  "nav.home": { en: "Home", te: "హోమ్" },
  "nav.track": { en: "Track", te: "ట్రాక్" },
  "nav.alerts": { en: "Alerts", te: "అలర్ట్స్" },
  "form.from": { en: "From", te: "నుండి" },
  "form.to": { en: "To", te: "కు" },
  "form.select_village": { en: "Select Village", te: "గ్రామం ఎంచుకోండి" },
  "btn.track_bus": { en: "Track Bus", te: "బస్ ట్రాక్ చేయండి" },
  "voice.search": { en: "Voice Search", te: "వాయిస్ శోధన" },
  "voice.listening": { en: "Listening...", te: "వింటున్నాను..." },
  "track.bus_location": { en: "Bus Location", te: "బస్ స్థానం" },
  "track.estimated_time": { en: "Estimated Time", te: "అంచనా సమయం" },
  "track.bus_number": { en: "Bus Number", te: "బస్ నంబర్" },
  "track.distance": { en: "Distance Remaining", te: "మిగిలిన దూరం" },
  "track.status.on_time": { en: "On Time", te: "సమయానికి" },
  "track.status.delayed": { en: "Delayed", te: "ఆలస్యం" },
  "track.status.arrived": { en: "Arrived", te: "చేరుకుంది" },
  "alerts.title": { en: "Notifications", te: "నోటిఫికేషన్లు" },
  "alerts.empty": { en: "No new notifications", te: "కొత్త నోటిఫికేషన్లు లేవు" },
};

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("te"); // Default to Telugu for rural users

  const toggleLang = () => {
    setLang((prev) => (prev === "en" ? "te" : "en"));
  };

  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation key missing: ${key}`);
      return key;
    }
    return translations[key][lang];
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
