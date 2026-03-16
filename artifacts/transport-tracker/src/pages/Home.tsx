import { useState } from "react";
import { useLocation } from "wouter";
import { Mic, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGetVillages } from "@workspace/api-client-react";
import { useVoiceAssistant } from "@/hooks/use-voice";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { t, lang } = useLanguage();
  const { data: villagesData, isLoading } = useGetVillages();
  const { listen, isListening, speak } = useVoiceAssistant();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handleTrack = () => {
    if (!from || !to) {
      speak(lang === "te" ? "దయచేసి ఊరు ఎంచుకోండి" : "Please select villages");
      return;
    }
    setLocation(`/track?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  };

  const handleVoiceSearch = () => {
    listen((transcript) => {
      // Very basic parsing for demo
      // In real life, NLP would parse "Hyderabad to Warangal"
      speak(lang === "te" ? "వెతుకుతున్నాను" : "Searching...");
      if (villagesData?.villages.length) {
        // Randomly select for demo if not perfectly matched
        setFrom(villagesData.villages[0]);
        setTo(villagesData.villages[1]);
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="relative pt-6 pb-12 px-4 flex flex-col items-center justify-center overflow-hidden bg-primary/5 rounded-b-[3rem] border-b border-primary/10">
        <div className="absolute inset-0 opacity-10 mix-blend-multiply pointer-events-none">
          <img 
            src={`${import.meta.env.BASE_URL}images/pattern.png`} 
            alt="Decorative Pattern" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt="Rural Landscape"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mask-image-gradient"
          style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }}
        />

        <div className="relative z-10 max-w-md w-full mx-auto space-y-6 mt-4">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-6 rounded-3xl shadow-xl shadow-black/5 border border-border/50 space-y-5"
          >
            <div className="space-y-4">
              {/* FROM Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-16 pl-16 pr-4 bg-muted/50 border-2 border-transparent focus:border-primary/50 focus:bg-background rounded-2xl text-lg font-bold text-foreground appearance-none outline-none transition-all"
                >
                  <option value="" disabled>{t("form.from")} ({t("form.select_village")})</option>
                  {isLoading ? (
                    <option>Loading...</option>
                  ) : (
                    villagesData?.villages.map(v => <option key={v} value={v}>{v}</option>)
                  )}
                </select>
              </div>

              {/* TO Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <MapPin className="w-5 h-5" />
                </div>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-16 pl-16 pr-4 bg-muted/50 border-2 border-transparent focus:border-secondary/50 focus:bg-background rounded-2xl text-lg font-bold text-foreground appearance-none outline-none transition-all"
                >
                  <option value="" disabled>{t("form.to")} ({t("form.select_village")})</option>
                  {isLoading ? (
                    <option>Loading...</option>
                  ) : (
                    villagesData?.villages.map(v => <option key={v} value={v}>{v}</option>)
                  )}
                </select>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full h-16 text-xl rounded-2xl bg-gradient-to-r from-primary to-orange-500"
              onClick={handleTrack}
            >
              <Search className="w-6 h-6 mr-2" />
              {t("btn.track_bus")}
            </Button>
          </motion.div>

          <div className="flex justify-center">
            <button
              onClick={handleVoiceSearch}
              className={`
                group flex flex-col items-center justify-center gap-3 p-6 rounded-3xl transition-all
                ${isListening ? 'bg-primary/20 scale-105 shadow-xl shadow-primary/30' : 'bg-card hover:bg-muted shadow-lg shadow-black/5'}
              `}
            >
              <div className={`
                w-20 h-20 rounded-full flex items-center justify-center
                ${isListening ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-primary/10 text-primary'}
              `}>
                <Mic className="w-10 h-10" />
              </div>
              <span className="text-lg font-bold text-foreground">
                {isListening ? t("voice.listening") : t("voice.search")}
              </span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
