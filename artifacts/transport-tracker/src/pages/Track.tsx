import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, MapPin, Navigation } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGetEta, useGetBusLocation } from "@workspace/api-client-react";
import BusMap from "@/components/BusMap";
import { motion } from "framer-motion";

export default function Track() {
  const [location, setLocation] = useLocation();
  const { t, lang } = useLanguage();

  // Parse query params manually since wouter doesn't have a built-in hook for query params
  const searchParams = new URLSearchParams(window.location.search);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  // Fetch ETA Data
  const { data: etaData, isLoading: isLoadingEta } = useGetEta(
    { from, to },
    { query: { enabled: !!from && !!to } }
  );

  // Poll Bus Location every 2 seconds if we have a busId
  const { data: busLocation } = useGetBusLocation(
    { busId: etaData?.busNumber },
    { query: { refetchInterval: 2000, enabled: !!etaData?.busNumber } }
  );

  // Optional: Auto voice announcement when ETA loads
  useEffect(() => {
    if (etaData && "speechSynthesis" in window) {
      const msg = lang === "te" ? etaData.etaTextTelugu : etaData.etaText;
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = lang === "te" ? "te-IN" : "en-IN";
      // window.speechSynthesis.speak(utterance); // Uncomment to auto-speak
    }
  }, [etaData, lang]);

  if (!from || !to) {
    setLocation("/");
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background pb-20">
      
      {/* Top Bar overlay */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 pt-6 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent pointer-events-none">
        <button 
          onClick={() => setLocation("/")}
          className="w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center text-foreground pointer-events-auto active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-muted z-0">
        <BusMap busLocation={busLocation} from={from} to={to} />
      </div>

      {/* Info Card - Bottom Sheet Style */}
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
        className="relative z-10 bg-card rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 -mt-6 border-t border-border"
      >
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />

        {isLoadingEta ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-muted-foreground">Loading route details...</p>
          </div>
        ) : etaData ? (
          <div className="space-y-6">
            
            {/* Route & Bus Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>{from}</span>
                </div>
                <div className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <MapPin className="w-5 h-5 text-secondary" />
                  <span>{to}</span>
                </div>
              </div>
              <div className="bg-primary/10 px-4 py-2 rounded-xl text-center border border-primary/20">
                <div className="text-xs font-bold text-primary uppercase tracking-wider">{t("track.bus_number")}</div>
                <div className="text-2xl font-display font-bold text-foreground">{etaData.busNumber}</div>
              </div>
            </div>

            {/* ETA Big Display */}
            <div className="bg-gradient-to-br from-primary to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-primary/25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/80">{t("track.estimated_time")}</div>
                    <div className="text-3xl font-display font-bold">{etaData.etaMinutes} min</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white/80">{t("track.distance")}</div>
                  <div className="text-2xl font-bold">{etaData.distanceKm} km</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 text-lg font-medium">
                {lang === "te" ? etaData.etaTextTelugu : etaData.etaText}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-3 bg-muted p-4 rounded-xl">
              <div className={`w-4 h-4 rounded-full ${
                etaData.status === 'on_time' ? 'bg-secondary' : 
                etaData.status === 'delayed' ? 'bg-destructive' : 'bg-primary'
              } animate-pulse`} />
              <span className="text-lg font-bold text-foreground capitalize">
                {t(`track.status.${etaData.status}`)}
              </span>
              {busLocation && (
                <span className="ml-auto text-muted-foreground font-medium flex items-center gap-1">
                  <Navigation className="w-4 h-4" />
                  {busLocation.speed} km/h
                </span>
              )}
            </div>

          </div>
        ) : (
          <div className="py-8 text-center text-destructive font-bold text-lg">
            Could not load route data.
          </div>
        )}
      </motion.div>
    </div>
  );
}
