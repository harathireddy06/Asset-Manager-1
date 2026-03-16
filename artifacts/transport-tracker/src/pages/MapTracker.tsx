import { useState, useEffect, useRef, useCallback } from "react";
import { useGetVillages, useGetBusLocation } from "@workspace/api-client-react";
import {
  Navigation, MapPin, RotateCcw, Route as RouteIcon,
  Square, Play, ChevronDown, Grip, Mic, MicOff, Globe,
} from "lucide-react";
import FullScreenMap from "@/components/FullScreenMap";
import { useLanguage, VILLAGE_NAMES_TE } from "@/contexts/LanguageContext";
import type { Map as LeafletMap } from "leaflet";

const VILLAGE_COORDS: Record<string, [number, number]> = {
  "Suryapet":        [17.1415, 79.6216],
  "Kodad":           [16.9997, 79.9667],
  "Huzurnagar":      [16.8971, 79.8835],
  "Miryalaguda":     [16.8725, 79.5671],
  "Nalgonda":        [17.0566, 79.2672],
  "Choutuppal":      [17.2482, 78.9166],
  "Bhongir":         [17.5128, 78.8972],
  "Warangal":        [17.9784, 79.5941],
  "Hanamkonda":      [18.0139, 79.5529],
  "Khammam":         [17.2473, 80.1514],
  "Bhadrachalam":    [17.6688, 80.8894],
  "Mahabubabad":     [17.5996, 80.0006],
  "Kothagudem":      [17.5533, 80.6194],
  "Jangaon":         [17.7245, 79.1523],
  "Nagarjuna Sagar": [16.5741, 79.3196],
  "Devarakonda":     [16.6892, 78.9152],
  "Pochampally":     [17.3366, 78.8608],
  "Madhira":         [17.0581, 80.3695],
  "Yellandu":        [17.5999, 80.3275],
  "Paloncha":        [17.5973, 80.7024],
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function speak(text: string, lang: "en" | "te") {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "te" ? "te-IN" : "en-IN";
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

export default function MapTracker() {
  const { lang, setLang, toggleLang, t, villageName } = useLanguage();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [showRoute, setShowRoute] = useState(true);
  const [busHistory, setBusHistory] = useState<[number, number][]>([]);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [routeExpanded, setRouteExpanded] = useState(false);

  const [displayPos, setDisplayPos] = useState<[number, number] | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevPosRef = useRef<[number, number] | null>(null);
  const animStartRef = useRef<number>(0);
  const ANIM_DURATION = 5000;

  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stopAlert, setStopAlert] = useState<{ village: string } | null>(null);
  const arrivedAtRef = useRef<Set<string>>(new Set());

  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, panelX: 0, panelY: 0 });
  const [panelPos, setPanelPos] = useState({ x: 16, y: -1 });

  const { data: villagesData } = useGetVillages();
  const { data: busLocation } = useGetBusLocation(
    { busId: "bus-1" },
    { query: { refetchInterval: isTracking ? 60000 : false, enabled: isTracking } }
  );

  useEffect(() => {
    if (!busLocation || !isTracking) return;

    const newPos: [number, number] = [busLocation.lat, busLocation.lng];
    const startPos = prevPosRef.current ?? newPos;
    prevPosRef.current = newPos;
    animStartRef.current = performance.now();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    function animate(now: number) {
      const elapsed = now - animStartRef.current;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const lat = startPos[0] + (newPos[0] - startPos[0]) * eased;
      const lng = startPos[1] + (newPos[1] - startPos[1]) * eased;
      setDisplayPos([lat, lng]);
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
    }
    animFrameRef.current = requestAnimationFrame(animate);

    setBusHistory(prev => [...prev.slice(-100), newPos]);

    if (to && VILLAGE_COORDS[to]) {
      const [tLat, tLng] = VILLAGE_COORDS[to];
      const dist = haversineMeters(busLocation.lat, busLocation.lng, tLat, tLng);
      if (dist < 2000 && !arrivedAtRef.current.has(to)) {
        arrivedAtRef.current.add(to);
        const msg = lang === "te"
          ? `మీరు స్టాప్‌కు చేరుకున్నారు.`
          : `You have reached the stop.`;
        speak(msg, lang);
        setStopAlert({ village: to });
        setTimeout(() => setStopAlert(null), 6000);
      }
    }

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [busLocation]);

  const showVoiceFeedback = useCallback((key: string) => {
    const text = t("voice.prefix") + t(key);
    setVoiceFeedback(text);
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    voiceTimerRef.current = setTimeout(() => setVoiceFeedback(""), 3500);
  }, [t]);

  const handleStartTracking = useCallback(() => {
    setBusHistory([]);
    prevPosRef.current = null;
    arrivedAtRef.current = new Set();
    setIsTracking(true);
  }, []);

  const handleStopTracking = useCallback(() => setIsTracking(false), []);

  const handleCenterOnBus = useCallback(() => {
    if (mapInstance && displayPos) {
      mapInstance.setView(displayPos, 14, { animate: true });
    }
  }, [mapInstance, displayPos]);

  const handleShowRoute = useCallback(() => setShowRoute(v => !v), []);

  const handleReset = useCallback(() => {
    setIsTracking(false);
    setBusHistory([]);
    setDisplayPos(null);
    prevPosRef.current = null;
    setFrom("");
    setTo("");
    arrivedAtRef.current = new Set();
    if (mapInstance) mapInstance.setView([17.385, 78.4867], 8, { animate: true });
  }, [mapInstance]);

  const startVoiceAssistant = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showVoiceFeedback("voice.cmd.unknown");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = lang === "te" ? "te-IN" : "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    rec.onresult = (e: any) => {
      const transcripts: string[] = [];
      for (let i = 0; i < e.results[0].length; i++) {
        transcripts.push(e.results[0][i].transcript.toLowerCase().trim());
      }
      const text = transcripts.join(" ");

      if (text.includes("start") || text.includes("ప్రారంభించు") || text.includes("ప్రారంభ")) {
        handleStartTracking();
        showVoiceFeedback("voice.cmd.start");
      } else if (text.includes("stop") || text.includes("ఆపు") || text.includes("ఆపండి")) {
        handleStopTracking();
        showVoiceFeedback("voice.cmd.stop");
      } else if (text.includes("center") || text.includes("చూపించు") || text.includes("బస్సు")) {
        handleCenterOnBus();
        showVoiceFeedback("voice.cmd.center");
      } else if (text.includes("route") || text.includes("మార్గం")) {
        handleShowRoute();
        showVoiceFeedback("voice.cmd.route");
      } else if (text.includes("telugu") || text.includes("తెలుగు")) {
        setLang("te");
        showVoiceFeedback("voice.cmd.lang_te");
      } else if (text.includes("english") || text.includes("ఇంగ్లీష్")) {
        setLang("en");
        showVoiceFeedback("voice.cmd.lang_en");
      } else {
        showVoiceFeedback("voice.cmd.unknown");
      }
    };

    rec.start();
  }, [lang, handleStartTracking, handleStopTracking, handleCenterOnBus, handleShowRoute, showVoiceFeedback, setLang]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragState.current = { isDragging: true, startX: e.clientX, startY: e.clientY, panelX: rect.left, panelY: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPanelPos({
      x: Math.max(0, Math.min(window.innerWidth - 220, dragState.current.panelX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 100, dragState.current.panelY + dy)),
    });
  };

  const handlePointerUp = () => { dragState.current.isDragging = false; };

  const fromCoord = from ? VILLAGE_COORDS[from] : undefined;
  const toCoord = to ? VILLAGE_COORDS[to] : undefined;

  const statusKey = busLocation?.status === "on_time" ? "status.on_time"
    : busLocation?.status === "delayed" ? "status.delayed"
    : "status.arrived";
  const statusColor = busLocation?.status === "on_time" ? "text-green-600"
    : busLocation?.status === "delayed" ? "text-red-600"
    : "text-blue-600";
  const statusDot = busLocation?.status === "on_time" ? "bg-green-500"
    : busLocation?.status === "delayed" ? "bg-red-500"
    : "bg-blue-500";

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      <FullScreenMap
        busLocation={busLocation}
        displayPos={displayPos}
        busHistory={showRoute ? busHistory : []}
        showRoute={showRoute}
        fromCoord={fromCoord}
        toCoord={toCoord}
        fromLabel={villageName(from)}
        toLabel={villageName(to)}
        onMapReady={setMapInstance}
        lang={lang}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="p-3 flex flex-col gap-2">

          {/* Title + Language + Mic row */}
          <div className="flex items-center justify-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md shadow-lg rounded-full pl-4 pr-2 py-1.5 border border-white/60">
              <span className="text-lg">🚌</span>
              <span className="text-sm font-bold text-gray-800 tracking-wide">{t("app.title")}</span>
              {isTracking && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full ml-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {t("live")}
                </span>
              )}

              <button
                onClick={toggleLang}
                title="Switch Language"
                className="ml-1 flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full transition-colors"
              >
                <Globe className="w-3 h-3" />
                {t("btn.language")}
              </button>

              <button
                onClick={startVoiceAssistant}
                title={t("voice.btn")}
                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                  isListening
                    ? "bg-red-100 text-red-700 animate-pulse"
                    : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                }`}
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                {isListening ? t("voice.listening") : t("voice.btn")}
              </button>
            </div>
          </div>

          {/* Route selector */}
          <div className="pointer-events-auto">
            <button
              onClick={() => setRouteExpanded(v => !v)}
              className="w-full flex items-center gap-3 bg-white/95 backdrop-blur-md shadow-lg rounded-2xl px-4 py-3 border border-white/60 text-left transition-all hover:bg-white active:scale-[0.99]"
            >
              <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                {from && to ? (
                  <span className="text-sm font-semibold text-gray-800 truncate block">
                    {villageName(from)} → {villageName(to)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">{t("route.select")}</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${routeExpanded ? "rotate-180" : ""}`} />
            </button>

            {routeExpanded && (
              <div className="mt-1 bg-white/97 backdrop-blur-md shadow-xl rounded-2xl border border-white/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                  <select
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400 text-gray-700 font-medium"
                  >
                    <option value="" disabled>{t("route.from")}</option>
                    {villagesData?.villages.map(v => (
                      <option key={v} value={v}>{villageName(v)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                  <select
                    value={to}
                    onChange={e => { setTo(e.target.value); arrivedAtRef.current = new Set(); }}
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400 text-gray-700 font-medium"
                  >
                    <option value="" disabled>{t("route.to")}</option>
                    {villagesData?.villages.map(v => (
                      <option key={v} value={v}>{villageName(v)}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setRouteExpanded(false)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl py-2 transition-colors"
                >
                  {t("btn.apply_route")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice feedback toast */}
      {voiceFeedback && (
        <div className="absolute top-[9rem] left-1/2 -translate-x-1/2 z-[1100] pointer-events-none">
          <div className="flex items-center gap-2 bg-purple-700/90 backdrop-blur text-white text-sm font-semibold px-4 py-2 rounded-full shadow-xl">
            <Mic className="w-4 h-4" />
            {voiceFeedback}
          </div>
        </div>
      )}

      {/* Stop arrival notification */}
      {stopAlert && (
        <div className="absolute top-[9rem] left-1/2 -translate-x-1/2 z-[1100] pointer-events-none">
          <div className="bg-green-600/95 backdrop-blur text-white rounded-2xl shadow-2xl px-5 py-3 text-center">
            <div className="font-bold text-base">{t("stop.reached.title")} 🎉</div>
            <div className="text-sm mt-0.5 opacity-90">{t("stop.village")}: {villageName(stopAlert.village)}</div>
            <div className="text-xs mt-1 opacity-80">{t("stop.reached.msg")}</div>
          </div>
        </div>
      )}

      {/* Live bus info card */}
      {isTracking && busLocation && (
        <div className="absolute top-[8.5rem] right-3 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border border-white/60 p-3 w-44">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚌</span>
              <span className="font-bold text-sm text-gray-800">{busLocation.busNumber}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("info.status")}</span>
                <span className={`font-semibold flex items-center gap-1 ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
                  {t(statusKey)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("info.speed")}</span>
                <span className="font-semibold text-gray-800">{busLocation.speed} km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("info.next_stop")}</span>
                <span className="font-semibold text-gray-800 truncate max-w-[80px] text-right">
                  {villageName(busLocation.to)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Control Panel */}
      <div
        ref={panelRef}
        className="absolute z-[1000]"
        style={panelPos.y === -1 ? { left: panelPos.x, bottom: 24 } : { left: panelPos.x, top: panelPos.y }}
      >
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/60 overflow-hidden w-52">
          <div
            className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing bg-gray-50/80 border-b border-gray-100 select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <Grip className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium ml-1.5">{t("controls.title")}</span>
          </div>

          <div className="p-2 flex flex-col gap-1.5">
            {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-green-200"
              >
                <Play className="w-4 h-4" />
                {t("btn.start")}
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-red-200"
              >
                <Square className="w-4 h-4" />
                {t("btn.stop")}
              </button>
            )}

            <button
              onClick={handleCenterOnBus}
              disabled={!displayPos}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:cursor-not-allowed active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Navigation className="w-4 h-4" />
              {t("btn.center")}
            </button>

            <button
              onClick={handleShowRoute}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm ${showRoute ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-400 hover:bg-gray-500"}`}
            >
              <RouteIcon className="w-4 h-4" />
              {showRoute ? t("btn.hide_route") : t("btn.show_route")}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-gray-700 hover:bg-gray-800 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {t("btn.reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
