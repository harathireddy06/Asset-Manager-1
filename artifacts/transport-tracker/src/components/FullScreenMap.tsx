import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import { BusLocation } from "@workspace/api-client-react/src/generated/api.schemas";
import { VILLAGE_NAMES_TE, type Language } from "@/contexts/LanguageContext";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const busIcon = new L.DivIcon({
  html: `
    <div style="position:relative;width:52px;height:52px;">
      <div style="
        width:48px;height:48px;
        background:linear-gradient(135deg,#f97316,#ea580c);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:24px;
        box-shadow:0 4px 14px rgba(249,115,22,0.55);
        border:3px solid white;
      ">🚌</div>
      <div style="
        position:absolute;top:0px;right:0px;
        width:14px;height:14px;
        background:#22c55e;border-radius:50%;
        border:2px solid white;
        animation:pulse 1.5s infinite;
      "></div>
    </div>
  `,
  className: "",
  iconSize: [52, 52],
  iconAnchor: [26, 26],
  popupAnchor: [0, -30],
});

const fromIcon = new L.DivIcon({
  html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(34,197,94,0.4);border:2px solid white;color:white;font-weight:bold;font-size:13px;">A</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const toIcon = new L.DivIcon({
  html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(239,68,68,0.4);border:2px solid white;color:white;font-weight:bold;font-size:13px;">B</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

function MapReadyHandler({ onMapReady }: { onMapReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => { onMapReady(map); }, [map, onMapReady]);
  return null;
}

interface FullScreenMapProps {
  busLocation?: BusLocation | null;
  displayPos: [number, number] | null;
  busHistory: [number, number][];
  showRoute: boolean;
  fromCoord?: [number, number];
  toCoord?: [number, number];
  fromLabel?: string;
  toLabel?: string;
  onMapReady: (map: LeafletMap) => void;
  lang: Language;
}

export default function FullScreenMap({
  busLocation,
  displayPos,
  busHistory,
  showRoute,
  fromCoord,
  toCoord,
  fromLabel,
  toLabel,
  onMapReady,
  lang,
}: FullScreenMapProps) {
  const center: [number, number] = [17.385, 78.4867];

  const vn = (name: string) => lang === "te" ? (VILLAGE_NAMES_TE[name] || name) : name;

  const routeLine: [number, number][] = fromCoord && toCoord
    ? [fromCoord, ...(displayPos ? [displayPos] : []), toCoord]
    : [];

  const statusLabel =
    busLocation?.status === "on_time"
      ? (lang === "te" ? "నడుస్తోంది ✓" : "Running ✓")
      : busLocation?.status === "delayed"
      ? (lang === "te" ? "ఆలస్యం ⚠" : "Delayed ⚠")
      : (lang === "te" ? "చేరుకుంది ✓" : "Arrived ✓");

  const statusColor =
    busLocation?.status === "on_time" ? "#22c55e"
    : busLocation?.status === "delayed" ? "#ef4444"
    : "#3b82f6";

  const labels = {
    busId:    lang === "te" ? "బస్ ID"      : "Bus ID",
    status:   lang === "te" ? "స్థితి"       : "Status",
    speed:    lang === "te" ? "వేగం"        : "Speed",
    nextStop: lang === "te" ? "తదుపరి స్టాప్" : "Next Stop",
    start:    lang === "te" ? "🟢 ప్రారంభం"  : "🟢 Start",
    dest:     lang === "te" ? "🔴 గమ్యం"     : "🔴 Destination",
  };

  const busPos = displayPos ?? (busLocation ? [busLocation.lat, busLocation.lng] as [number, number] : null);

  return (
    <MapContainer
      center={center}
      zoom={8}
      zoomControl={false}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      className="z-0"
    >
      <MapReadyHandler onMapReady={onMapReady} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <ZoomControl position="bottomright" />

      {showRoute && routeLine.length >= 2 && (
        <Polyline positions={routeLine} color="#3b82f6" weight={4} opacity={0.5} dashArray="12 8" />
      )}

      {showRoute && busHistory.length >= 2 && (
        <Polyline positions={busHistory} color="#f97316" weight={5} opacity={0.85} />
      )}

      {fromCoord && (
        <Marker position={fromCoord} icon={fromIcon}>
          <Popup>
            <div style={{ fontFamily: "system-ui", fontWeight: 700, fontSize: 14, color: "#15803d" }}>
              {labels.start}: {fromLabel}
            </div>
          </Popup>
        </Marker>
      )}

      {toCoord && (
        <Marker position={toCoord} icon={toIcon}>
          <Popup>
            <div style={{ fontFamily: "system-ui", fontWeight: 700, fontSize: 14, color: "#dc2626" }}>
              {labels.dest}: {toLabel}
            </div>
          </Popup>
        </Marker>
      )}

      {busPos && busLocation && (
        <Marker position={busPos} icon={busIcon}>
          <Popup autoClose={false}>
            <div style={{ fontFamily: "system-ui", minWidth: 165, padding: "4px 2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🚌</span>
                <strong style={{ fontSize: 15, color: "#1e293b" }}>Bus {busLocation.busNumber}</strong>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#64748b", paddingBottom: 4 }}>{labels.busId}</td>
                    <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "right", paddingBottom: 4 }}>{busLocation.busId}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b", paddingBottom: 4 }}>{labels.status}</td>
                    <td style={{ fontWeight: 700, color: statusColor, textAlign: "right", paddingBottom: 4 }}>{statusLabel}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b", paddingBottom: 4 }}>{labels.speed}</td>
                    <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "right", paddingBottom: 4 }}>{busLocation.speed} km/h</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b" }}>{labels.nextStop}</td>
                    <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "right" }}>{vn(busLocation.to)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
