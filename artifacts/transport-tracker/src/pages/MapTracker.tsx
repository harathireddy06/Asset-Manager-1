import { useState, useEffect, useRef, useCallback } from "react";
import { useGetVillages, useGetBusLocation } from "@workspace/api-client-react";
import { Navigation, MapPin, RotateCcw, Route, Square, Play, ChevronDown, Bus, Grip } from "lucide-react";
import FullScreenMap from "@/components/FullScreenMap";
import type { Map as LeafletMap } from "leaflet";

const VILLAGE_COORDS: Record<string, [number, number]> = {
  "Suryapet": [17.1415, 79.6216],
  "Kodad": [16.9997, 79.9667],
  "Huzurnagar": [16.8971, 79.8835],
  "Miryalaguda": [16.8725, 79.5671],
  "Nalgonda": [17.0566, 79.2672],
  "Choutuppal": [17.2482, 78.9166],
  "Bhongir": [17.5128, 78.8972],
  "Warangal": [17.9784, 79.5941],
  "Hanamkonda": [18.0139, 79.5529],
  "Khammam": [17.2473, 80.1514],
  "Bhadrachalam": [17.6688, 80.8894],
  "Mahabubabad": [17.5996, 80.0006],
  "Kothagudem": [17.5533, 80.6194],
  "Jangaon": [17.7245, 79.1523],
  "Nagarjuna Sagar": [16.5741, 79.3196],
  "Devarakonda": [16.6892, 78.9152],
  "Pochampally": [17.3366, 78.8608],
  "Madhira": [17.0581, 80.3695],
  "Yellandu": [17.5999, 80.3275],
  "Paloncha": [17.5973, 80.7024],
};

export default function MapTracker() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [showRoute, setShowRoute] = useState(true);
  const [busHistory, setBusHistory] = useState<[number, number][]>([]);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [routeExpanded, setRouteExpanded] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, panelX: 0, panelY: 0 });
  const [panelPos, setPanelPos] = useState({ x: 16, y: -1 });

  const { data: villagesData } = useGetVillages();

  const { data: busLocation } = useGetBusLocation(
    { busId: "bus-1" },
    { query: { refetchInterval: isTracking ? 2000 : false, enabled: isTracking } }
  );

  useEffect(() => {
    if (busLocation && isTracking) {
      setBusHistory(prev => {
        const next: [number, number][] = [...prev, [busLocation.lat, busLocation.lng]];
        return next.slice(-100);
      });
    }
  }, [busLocation, isTracking]);

  const handleStartTracking = useCallback(() => {
    setBusHistory([]);
    setIsTracking(true);
  }, []);

  const handleStopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const handleCenterOnBus = useCallback(() => {
    if (mapInstance && busLocation) {
      mapInstance.setView([busLocation.lat, busLocation.lng], 14, { animate: true });
    }
  }, [mapInstance, busLocation]);

  const handleShowRoute = useCallback(() => {
    setShowRoute(v => !v);
  }, []);

  const handleReset = useCallback(() => {
    setIsTracking(false);
    setBusHistory([]);
    setFrom("");
    setTo("");
    if (mapInstance) {
      mapInstance.setView([17.385, 78.4867], 8, { animate: true });
    }
  }, [mapInstance]);

  const fromCoord = from ? VILLAGE_COORDS[from] : undefined;
  const toCoord = to ? VILLAGE_COORDS[to] : undefined;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      panelX: rect.left,
      panelY: rect.top,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - 220, dragState.current.panelX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, dragState.current.panelY + dy));
    setPanelPos({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    dragState.current.isDragging = false;
  };

  const statusColor = busLocation?.status === "on_time"
    ? "bg-green-500"
    : busLocation?.status === "delayed"
    ? "bg-red-500"
    : "bg-blue-500";

  const statusLabel = busLocation?.status === "on_time"
    ? "Running"
    : busLocation?.status === "delayed"
    ? "Delayed"
    : "Arrived";

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">

      <FullScreenMap
        busLocation={busLocation}
        busHistory={showRoute ? busHistory : []}
        showRoute={showRoute}
        fromCoord={fromCoord}
        toCoord={toCoord}
        fromLabel={from}
        toLabel={to}
        onMapReady={setMapInstance}
      />

      {/* Top Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="p-3 flex flex-col gap-2">

          {/* Title pill */}
          <div className="self-center pointer-events-auto">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md shadow-lg rounded-full px-4 py-2 border border-white/60">
              <Bus className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-gray-800 tracking-wide">Telangana Bus Tracker</span>
              {isTracking && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
          </div>

          {/* Route Selector */}
          <div className="pointer-events-auto">
            <button
              onClick={() => setRouteExpanded(v => !v)}
              className="w-full flex items-center gap-3 bg-white/95 backdrop-blur-md shadow-lg rounded-2xl px-4 py-3 border border-white/60 text-left transition-all hover:bg-white active:scale-[0.99]"
            >
              <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                {from && to ? (
                  <span className="text-sm font-semibold text-gray-800 truncate block">
                    {from} → {to}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Select route (From → To)</span>
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
                    <option value="" disabled>From Village</option>
                    {villagesData?.villages.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                  <select
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400 text-gray-700 font-medium"
                  >
                    <option value="" disabled>To Village</option>
                    {villagesData?.villages.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setRouteExpanded(false)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl py-2 transition-colors"
                >
                  Apply Route
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Bus Info Card — shows when tracking */}
      {isTracking && busLocation && (
        <div className="absolute top-[8.5rem] right-3 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border border-white/60 p-3 w-44">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚌</span>
              <span className="font-bold text-sm text-gray-800">{busLocation.busNumber}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold flex items-center gap-1 ${busLocation.status === "on_time" ? "text-green-600" : busLocation.status === "delayed" ? "text-red-600" : "text-blue-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse`} />
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Speed</span>
                <span className="font-semibold text-gray-800">{busLocation.speed} km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">From</span>
                <span className="font-semibold text-gray-800 truncate max-w-[80px] text-right">{busLocation.from}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">To</span>
                <span className="font-semibold text-gray-800 truncate max-w-[80px] text-right">{busLocation.to}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Control Panel */}
      <div
        ref={panelRef}
        className="absolute z-[1000]"
        style={
          panelPos.y === -1
            ? { left: panelPos.x, bottom: 24 }
            : { left: panelPos.x, top: panelPos.y }
        }
      >
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/60 overflow-hidden w-52">
          {/* Drag handle */}
          <div
            className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing bg-gray-50/80 border-b border-gray-100 select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <Grip className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium ml-1.5">Controls</span>
          </div>

          <div className="p-2 flex flex-col gap-1.5">
            {/* Start / Stop Tracking */}
            {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-green-200"
              >
                <Play className="w-4 h-4" />
                Start Tracking
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-red-200"
              >
                <Square className="w-4 h-4" />
                Stop Tracking
              </button>
            )}

            <button
              onClick={handleCenterOnBus}
              disabled={!busLocation}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:cursor-not-allowed active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Navigation className="w-4 h-4" />
              Center on Bus
            </button>

            <button
              onClick={handleShowRoute}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm ${showRoute ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-400 hover:bg-gray-500"}`}
            >
              <Route className="w-4 h-4" />
              {showRoute ? "Hide Route" : "Show Route"}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-gray-700 hover:bg-gray-800 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
