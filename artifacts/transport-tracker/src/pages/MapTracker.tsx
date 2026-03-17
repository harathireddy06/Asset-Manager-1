import { useState, useEffect, useRef, useCallback } from "react";
import { useGetVillages } from "@workspace/api-client-react";
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

const UPDATE_INTERVAL_MS = 60_000;
const SPEED_KMH = 40;
const ANIM_DURATION_MS = 8_000;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatEta(remainingMinutes: number, lang: "en" | "te"): string {
  if (remainingMinutes <= 0) return lang === "te" ? "చేరుకున్నారు" : "Arrived";
  const h = Math.floor(remainingMinutes / 60);
  const m = remainingMinutes % 60;
  if (lang === "te") {
    if (h > 0 && m > 0) return `${h} గం ${m} నిమి`;
    if (h > 0) return `${h} గంటలు`;
    return `${m} నిమిషాలు`;
  }
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${m} min`;
}

function getIntermediateStops(from: string, to: string): string[] {
  const fromCoord = VILLAGE_COORDS[from];
  const toCoord = VILLAGE_COORDS[to];
  if (!fromCoord || !toCoord) return [];
  const [lat1, lng1] = fromCoord;
  const [lat2, lng2] = toCoord;
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return [];

  const stops: { name: string; t: number }[] = [];
  for (const [name, coord] of Object.entries(VILLAGE_COORDS)) {
    if (name === from || name === to) continue;
    const [lat, lng] = coord;
    const t = ((lat - lat1) * dx + (lng - lng1) * dy) / lenSq;
    if (t <= 0.05 || t >= 0.95) continue;
    const projLat = lat1 + t * dx;
    const projLng = lng1 + t * dy;
    const perpDistKm = haversineKm(lat, lng, projLat, projLng);
    if (perpDistKm <= 35) stops.push({ name, t });
  }
  return stops.sort((a, b) => a.t - b.t).map(s => s.name);
}

function speak(text: string, lang: "en" | "te") {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "te" ? "te-IN" : "en-IN";
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

interface SimBusInfo {
  busNumber: string;
  busId: string;
  speed: number;
  status: "on_time" | "delayed" | "arrived";
  from: string;
  to: string;
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
  const [busInfo, setBusInfo] = useState<SimBusInfo | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [remainingKm, setRemainingKm] = useState<number | null>(null);
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]);
  const [passedStopCount, setPassedStopCount] = useState(0);
  const [stopsExpanded, setStopsExpanded] = useState(true);

  const animFrameRef = useRef<number | null>(null);
  const currentPosRef = useRef<[number, number] | null>(null);
  const lastHistoryRef = useRef<[number, number] | null>(null);
  const arrivedRef = useRef(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stopAlert, setStopAlert] = useState<{ village: string } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, panelX: 0, panelY: 0 });
  const [panelPos, setPanelPos] = useState({ x: 16, y: -1 });

  const { data: villagesData } = useGetVillages();

  const fromCoord = from ? VILLAGE_COORDS[from] : undefined;
  const toCoord = to ? VILLAGE_COORDS[to] : undefined;

  useEffect(() => {
    if (!isTracking || !fromCoord || !toCoord) return;

    arrivedRef.current = false;
    lastHistoryRef.current = null;

    const distKm = haversineKm(fromCoord[0], fromCoord[1], toCoord[0], toCoord[1]);
    const totalMinutes = Math.max(1, Math.ceil((distKm / SPEED_KMH) * 60));
    let step = 0;

    const stops = getIntermediateStops(from, to);
    setIntermediateStops(stops);
    setPassedStopCount(0);

    setBusInfo({
      busNumber: "TS01-1234",
      busId: "bus-sim-1",
      speed: Math.round(SPEED_KMH + (Math.random() * 10 - 5)),
      status: "on_time",
      from,
      to,
    });

    currentPosRef.current = fromCoord;
    setDisplayPos(fromCoord);
    setBusHistory([fromCoord]);
    setEta(formatEta(totalMinutes, lang));
    setRemainingKm(parseFloat(distKm.toFixed(1)));

    function animateTo(fromPos: [number, number], toPos: [number, number]) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const start = performance.now();
      function frame(now: number) {
        const t = Math.min((now - start) / ANIM_DURATION_MS, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const lat = fromPos[0] + (toPos[0] - fromPos[0]) * ease;
        const lng = fromPos[1] + (toPos[1] - fromPos[1]) * ease;
        const pos: [number, number] = [lat, lng];
        currentPosRef.current = pos;
        setDisplayPos(pos);
        if (t < 1) animFrameRef.current = requestAnimationFrame(frame);
      }
      animFrameRef.current = requestAnimationFrame(frame);
    }

    function tick() {
      step += 1;
      const progress = Math.min(step / totalMinutes, 1);
      const newLat = fromCoord![0] + (toCoord![0] - fromCoord![0]) * progress;
      const newLng = fromCoord![1] + (toCoord![1] - fromCoord![1]) * progress;
      const newPos: [number, number] = [newLat, newLng];

      animateTo(currentPosRef.current ?? fromCoord!, newPos);

      setBusHistory(prev => [...prev.slice(-200), newPos]);
      lastHistoryRef.current = newPos;

      const remaining = Math.max(0, totalMinutes - step);
      setEta(formatEta(remaining, lang));
      setRemainingKm(parseFloat((distKm * (1 - progress)).toFixed(1)));

      const passed = stops.filter((_, i) => {
        const stopT = (i + 1) / (stops.length + 1);
        return progress >= stopT;
      }).length;
      setPassedStopCount(passed);

      const isNearEnd = progress >= 0.95;
      setBusInfo(prev => prev ? {
        ...prev,
        speed: isNearEnd ? Math.max(20, Math.round(prev.speed * 0.6)) : Math.round(SPEED_KMH + (Math.random() * 10 - 5)),
        status: isNearEnd ? "arrived" : "on_time",
      } : prev);

      if (isNearEnd && !arrivedRef.current) {
        arrivedRef.current = true;
        const msg = lang === "te"
          ? "మీరు స్టాప్‌కు చేరుకున్నారు."
          : "You have reached the stop.";
        speak(msg, lang);
        setStopAlert({ village: to! });
        setTimeout(() => setStopAlert(null), 6000);
      }

      if (progress >= 1) {
        clearInterval(intervalId);
        animateTo(newPos, toCoord!);
        setIsTracking(false);
      }
    }

    const intervalId = setInterval(tick, UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isTracking]);

  const showVoiceFeedback = useCallback((key: string) => {
    const text = t("voice.prefix") + t(key);
    setVoiceFeedback(text);
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    voiceTimerRef.current = setTimeout(() => setVoiceFeedback(""), 3500);
  }, [t]);

  const handleStartTracking = useCallback(() => {
    if (!from || !to) return;
    setBusHistory([]);
    setDisplayPos(null);
    arrivedRef.current = false;
    setIsTracking(true);
  }, [from, to]);

  const handleStopTracking = useCallback(() => {
    setIsTracking(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleCenterOnBus = useCallback(() => {
    if (mapInstance && displayPos) {
      mapInstance.setView(displayPos, 12, { animate: true });
    }
  }, [mapInstance, displayPos]);

  const handleShowRoute = useCallback(() => setShowRoute(v => !v), []);

  const handleReset = useCallback(() => {
    setIsTracking(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setBusHistory([]);
    setDisplayPos(null);
    setBusInfo(null);
    setEta(null);
    setRemainingKm(null);
    setIntermediateStops([]);
    setPassedStopCount(0);
    setFrom("");
    setTo("");
    arrivedRef.current = false;
    currentPosRef.current = null;
    if (mapInstance) mapInstance.setView([17.385, 78.4867], 8, { animate: true });
  }, [mapInstance]);

  const handleAnnounceEta = useCallback(() => {
    if (!eta) { speak(lang === "te" ? "ట్రాకింగ్ ప్రారంభమైంది లేదు" : "No active tracking", lang); return; }
    const msg = lang === "te" ? `అంచనా సమయం ${eta}` : `Estimated arrival in ${eta}`;
    speak(msg, lang);
    showVoiceFeedback("voice.cmd.eta");
  }, [eta, lang, showVoiceFeedback]);

  const startVoiceAssistant = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showVoiceFeedback("voice.cmd.error"); return; }

    const rec = new SR();
    rec.lang = lang === "te" ? "te-IN" : "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => { setIsListening(false); showVoiceFeedback("voice.cmd.error"); };

    rec.onresult = (e: any) => {
      const alternatives: string[] = Array.from(
        { length: e.results[0].length },
        (_, i) => e.results[0][i].transcript.trim()
      );
      const combined = alternatives.join(" ").toLowerCase();

      const villages = Object.keys(VILLAGE_COORDS);

      const teToEn: Record<string, string> = Object.fromEntries(
        Object.entries(VILLAGE_NAMES_TE).map(([en, te]) => [te, en])
      );

      const findVillage = (text: string): string | undefined => {
        const lower = text.toLowerCase();
        return (
          villages.find(v => lower.includes(v.toLowerCase())) ||
          Object.entries(teToEn).find(([te]) => text.includes(te))?.[1]
        );
      };

      const teFromWords = ["నుండి", "నుంచి"];
      const teToWords = ["కు", "కి", "వరకు"];

      const fromToPatternEn = alternatives.find(t => /from .+ to .+/i.test(t));
      const fromToPatternTe = alternatives.find(t =>
        teFromWords.some(fw => t.includes(fw)) && teToWords.some(tw => t.includes(tw))
      );

      if (fromToPatternEn) {
        const m = fromToPatternEn.match(/from (.+?) to (.+)/i);
        if (m) {
          const fv = findVillage(m[1]);
          const tv = findVillage(m[2]);
          if (fv && tv && fv !== tv) {
            setFrom(fv); setTo(tv);
            speak(lang === "te" ? `మార్గం సెట్ అయింది: ${villageName(fv)} నుండి ${villageName(tv)} కు` : `Route set from ${fv} to ${tv}`, lang);
            showVoiceFeedback("voice.cmd.route_set"); return;
          }
        }
      }

      if (fromToPatternTe) {
        const text = fromToPatternTe;
        const fromWord = teFromWords.find(w => text.includes(w)) || "నుండి";
        const toWord = teToWords.find(w => text.includes(w)) || "కు";
        const beforeFrom = text.split(fromWord)[0];
        const afterFrom = text.split(fromWord)[1]?.split(toWord)[0] || "";
        const afterTo = text.split(toWord).slice(-1)[0] || "";
        const fv = findVillage(beforeFrom) || findVillage(afterFrom);
        const tv = findVillage(afterTo);
        if (fv && tv && fv !== tv) {
          setFrom(fv); setTo(tv);
          speak(`మార్గం సెట్ అయింది: ${villageName(fv)} నుండి ${villageName(tv)} కు`, lang);
          showVoiceFeedback("voice.cmd.route_set"); return;
        }
      }

      const fromPatternEn = alternatives.find(t => /\bfrom\b/i.test(t));
      const fromPatternTe = alternatives.find(t => teFromWords.some(w => t.includes(w)));
      const fromPattern = fromPatternEn || fromPatternTe;
      if (fromPattern) {
        const fv = findVillage(fromPattern);
        if (fv) {
          setFrom(fv);
          speak(lang === "te" ? `ప్రారంభ స్థానం: ${villageName(fv)}` : `Starting from ${fv}`, lang);
          showVoiceFeedback("voice.cmd.from_set"); return;
        }
      }

      const toPatternEn = alternatives.find(t => /\bto\b/i.test(t));
      const toPatternTe = alternatives.find(t => teToWords.some(w => t.includes(w)));
      const toPattern = toPatternEn || toPatternTe;
      if (toPattern) {
        const tv = findVillage(toPattern);
        if (tv) {
          setTo(tv);
          speak(lang === "te" ? `గమ్యస్థానం: ${villageName(tv)}` : `Destination set to ${tv}`, lang);
          showVoiceFeedback("voice.cmd.to_set"); return;
        }
      }

      const mentionedVillages = villages.filter(v =>
        alternatives.some(t => t.toLowerCase().includes(v.toLowerCase()))
      );
      const mentionedTeVillages = Object.entries(teToEn)
        .filter(([te]) => alternatives.some(t => t.includes(te)))
        .map(([, en]) => en)
        .filter(v => !mentionedVillages.includes(v));
      const allMentioned = [...new Set([...mentionedVillages, ...mentionedTeVillages])];

      if (allMentioned.length >= 2) {
        setFrom(allMentioned[0]); setTo(allMentioned[1]);
        speak(lang === "te" ? `మార్గం సెట్ అయింది: ${villageName(allMentioned[0])} నుండి ${villageName(allMentioned[1])} కు` : `Route set from ${allMentioned[0]} to ${allMentioned[1]}`, lang);
        showVoiceFeedback("voice.cmd.route_set"); return;
      }
      if (allMentioned.length === 1) {
        if (!from) { setFrom(allMentioned[0]); showVoiceFeedback("voice.cmd.from_set"); }
        else { setTo(allMentioned[0]); showVoiceFeedback("voice.cmd.to_set"); }
        speak(villageName(allMentioned[0]), lang); return;
      }

      if (/\b(start|track|begin|go)\b/.test(combined) || alternatives.some(t => t.includes("ప్రారంభించు") || t.includes("ట్రాక్"))) {
        handleStartTracking(); speak(lang === "te" ? "ట్రాకింగ్ ప్రారంభమైంది" : "Tracking started", lang); showVoiceFeedback("voice.cmd.start");
      } else if (/\b(stop|pause|cancel)\b/.test(combined) || alternatives.some(t => t.includes("ఆపు") || t.includes("ఆపండి"))) {
        handleStopTracking(); speak(lang === "te" ? "ట్రాకింగ్ ఆపారు" : "Tracking stopped", lang); showVoiceFeedback("voice.cmd.stop");
      } else if (/\b(eta|time|arrival|how long|when)\b/.test(combined) || alternatives.some(t => t.includes("అంచనా") || t.includes("సమయం") || t.includes("ఎంత సేపు"))) {
        handleAnnounceEta();
      } else if (/\b(center|find|locate|where|bus)\b/.test(combined) || alternatives.some(t => t.includes("బస్సు") || t.includes("చూపించు") || t.includes("ఎక్కడ"))) {
        handleCenterOnBus(); speak(lang === "te" ? "బస్సుపై కేంద్రీకరిస్తోంది" : "Centering on bus", lang); showVoiceFeedback("voice.cmd.center");
      } else if (/\b(route|path|show|hide)\b/.test(combined) || alternatives.some(t => t.includes("మార్గం") || t.includes("చూపు") || t.includes("దాచు"))) {
        handleShowRoute(); speak(lang === "te" ? "మార్గం మారింది" : "Route toggled", lang); showVoiceFeedback("voice.cmd.route");
      } else if (/\b(reset|clear|restart)\b/.test(combined) || alternatives.some(t => t.includes("రీసెట్") || t.includes("మళ్ళీ") || t.includes("క్లియర్"))) {
        handleReset(); speak(lang === "te" ? "మ్యాప్ రీసెట్ అయింది" : "Map reset", lang); showVoiceFeedback("voice.cmd.reset");
      } else if (/\b(telugu)\b/.test(combined) || alternatives.some(t => t.includes("తెలుగు"))) {
        setLang("te"); speak("తెలుగుకు మారింది", "te"); showVoiceFeedback("voice.cmd.lang_te");
      } else if (/\b(english)\b/.test(combined) || alternatives.some(t => t.includes("ఇంగ్లీష్"))) {
        setLang("en"); speak("Switched to English", "en"); showVoiceFeedback("voice.cmd.lang_en");
      } else {
        speak(lang === "te" ? "ప్రయత్నించండి: ప్రారంభించు, ఆపు, లేదా గ్రామం పేరు" : "Say: start, stop, eta, reset, or a village name", lang);
        showVoiceFeedback("voice.cmd.unknown");
      }
    };
    rec.start();
  }, [lang, from, villageName, handleStartTracking, handleStopTracking, handleCenterOnBus, handleShowRoute, handleAnnounceEta, handleReset, showVoiceFeedback, setLang, setFrom, setTo]);

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

  const statusKey = busInfo?.status === "on_time" ? "status.on_time"
    : busInfo?.status === "delayed" ? "status.delayed"
    : "status.arrived";
  const statusColor = busInfo?.status === "on_time" ? "text-green-600"
    : busInfo?.status === "delayed" ? "text-red-600"
    : "text-blue-600";
  const statusDot = busInfo?.status === "on_time" ? "bg-green-500"
    : busInfo?.status === "delayed" ? "bg-red-500"
    : "bg-blue-500";

  const canStartTracking = !!from && !!to && from !== to;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      <FullScreenMap
        displayPos={displayPos}
        busInfo={busInfo}
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
                className="ml-1 flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full transition-colors"
              >
                <Globe className="w-3 h-3" />
                {t("btn.language")}
              </button>
              <button
                onClick={startVoiceAssistant}
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
                    onChange={e => { setFrom(e.target.value); setIsTracking(false); setDisplayPos(null); }}
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
                    onChange={e => { setTo(e.target.value); setIsTracking(false); setDisplayPos(null); }}
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400 text-gray-700 font-medium"
                  >
                    <option value="" disabled>{t("route.to")}</option>
                    {villagesData?.villages.map(v => (
                      <option key={v} value={v}>{villageName(v)}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setRouteExpanded(false);
                    if (from && to) {
                      const msg = lang === "te"
                        ? `మార్గం ఎంచుకున్నారు: ${villageName(from)} నుండి ${villageName(to)} కు`
                        : `Route selected: from ${from} to ${to}`;
                      speak(msg, lang);
                    }
                  }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl py-2 transition-colors"
                >
                  {t("btn.apply_route")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {voiceFeedback && (
        <div className="absolute top-[9rem] left-1/2 -translate-x-1/2 z-[1100] pointer-events-none">
          <div className="flex items-center gap-2 bg-purple-700/90 backdrop-blur text-white text-sm font-semibold px-4 py-2 rounded-full shadow-xl">
            <Mic className="w-4 h-4" />
            {voiceFeedback}
          </div>
        </div>
      )}

      {stopAlert && (
        <div className="absolute top-[9rem] left-1/2 -translate-x-1/2 z-[1100] pointer-events-none">
          <div className="bg-green-600/95 backdrop-blur text-white rounded-2xl shadow-2xl px-5 py-3 text-center">
            <div className="font-bold text-base">{t("stop.reached.title")} 🎉</div>
            <div className="text-sm mt-0.5 opacity-90">{t("stop.village")}: {villageName(stopAlert.village)}</div>
            <div className="text-xs mt-1 opacity-80">{t("stop.reached.msg")}</div>
          </div>
        </div>
      )}

      {isTracking && busInfo && (
        <div className="absolute top-[8.5rem] right-3 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border border-white/60 p-3 w-52">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚌</span>
              <span className="font-bold text-sm text-gray-800">{busInfo.busNumber}</span>
            </div>

            {/* ETA Highlight */}
            {eta && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">{t("info.eta")}</div>
                  <div className="text-base font-bold text-orange-700 leading-tight">{eta}</div>
                </div>
                {remainingKm !== null && (
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t("info.remaining")}</div>
                    <div className="text-sm font-bold text-gray-700">{remainingKm} km</div>
                  </div>
                )}
              </div>
            )}

            {/* Stops list */}
            <div className="mb-2">
              <button
                className="pointer-events-auto w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1.5"
                onClick={() => setStopsExpanded(v => !v)}
              >
                <span>{t("info.stops")} ({intermediateStops.length > 0 ? intermediateStops.length + 2 : 2})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${stopsExpanded ? "rotate-180" : ""}`} />
              </button>
              {stopsExpanded && (
                <div className="space-y-0.5 max-h-40 overflow-y-auto pr-0.5">
                  {/* Origin */}
                  <div className="flex items-center gap-2 text-xs py-0.5">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className="font-semibold text-green-700 truncate">{villageName(from)}</span>
                  </div>
                  {/* Intermediate stops */}
                  {intermediateStops.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs py-0.5 pl-1.5">
                      <div className="w-0.5 h-4 bg-gray-200 ml-[5px]" />
                      <span className="text-gray-400 italic text-[10px]">{t("info.direct")}</span>
                    </div>
                  ) : (
                    intermediateStops.map((stop, i) => {
                      const isPassed = i < passedStopCount;
                      const isNext = i === passedStopCount;
                      return (
                        <div key={stop}>
                          <div className="flex items-center gap-0 ml-[7px]">
                            <div className={`w-0.5 h-2.5 ${isPassed ? "bg-green-400" : isNext ? "bg-orange-300" : "bg-gray-200"}`} />
                          </div>
                          <div className="flex items-center gap-2 text-xs py-0.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isPassed ? "bg-green-400" : isNext ? "bg-orange-400 ring-2 ring-orange-200" : "bg-gray-200"
                            }`}>
                              {isPassed
                                ? <span className="text-white text-[8px] font-bold">✓</span>
                                : <div className={`w-1.5 h-1.5 rounded-full ${isNext ? "bg-white animate-pulse" : "bg-gray-400"}`} />
                              }
                            </div>
                            <span className={`truncate font-medium ${
                              isPassed ? "text-gray-400 line-through" : isNext ? "text-orange-700 font-bold" : "text-gray-600"
                            }`}>
                              {villageName(stop)}
                            </span>
                            {isNext && <span className="ml-auto text-[9px] text-orange-500 font-bold shrink-0">NEXT</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {/* Connector to destination */}
                  <div className="flex items-center gap-0 ml-[7px]">
                    <div className={`w-0.5 h-2.5 ${passedStopCount >= intermediateStops.length ? "bg-green-400" : "bg-gray-200"}`} />
                  </div>
                  {/* Destination */}
                  <div className="flex items-center gap-2 text-xs py-0.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      busInfo.status === "arrived" ? "bg-blue-500" : "bg-red-400"
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className={`font-semibold truncate ${busInfo.status === "arrived" ? "text-blue-700" : "text-red-600"}`}>
                      {villageName(to)}
                    </span>
                    {busInfo.status === "arrived" && <span className="ml-auto text-[9px] text-blue-500 font-bold shrink-0">✓</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("info.status")}</span>
                <span className={`font-semibold flex items-center gap-1 ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
                  {t(statusKey)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("info.speed")}</span>
                <span className="font-semibold text-gray-800">{busInfo.speed} km/h</span>
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
                disabled={!canStartTracking}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-200 disabled:cursor-not-allowed active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-green-200"
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
