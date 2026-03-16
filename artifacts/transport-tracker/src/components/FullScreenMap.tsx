import { useEffect, useRef } from "react";
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

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const busIcon = new L.DivIcon({
  html: `
    <div style="
      width:48px;height:48px;
      background:linear-gradient(135deg,#f97316,#ea580c);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:24px;
      box-shadow:0 4px 12px rgba(249,115,22,0.5);
      border:3px solid white;
    ">🚌</div>
    <div style="
      position:absolute;top:-4px;right:-4px;
      width:14px;height:14px;
      background:#22c55e;border-radius:50%;
      border:2px solid white;
      animation:pulse 1.5s infinite;
    "></div>
  `,
  className: "",
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -28],
});

const fromIcon = new L.DivIcon({
  html: `
    <div style="
      width:32px;height:32px;
      background:linear-gradient(135deg,#22c55e,#16a34a);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 2px 8px rgba(34,197,94,0.4);
      border:2px solid white;
      color:white;font-weight:bold;font-size:13px;
    ">A</div>
  `,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const toIcon = new L.DivIcon({
  html: `
    <div style="
      width:32px;height:32px;
      background:linear-gradient(135deg,#ef4444,#dc2626);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 2px 8px rgba(239,68,68,0.4);
      border:2px solid white;
      color:white;font-weight:bold;font-size:13px;
    ">B</div>
  `,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

function SmoothMarkerMover({ position }: { position: [number, number] }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng(position);
  }, [position]);

  return null;
}

function MapReadyHandler({ onMapReady }: { onMapReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

interface FullScreenMapProps {
  busLocation?: BusLocation | null;
  busHistory: [number, number][];
  showRoute: boolean;
  fromCoord?: [number, number];
  toCoord?: [number, number];
  fromLabel?: string;
  toLabel?: string;
  onMapReady: (map: LeafletMap) => void;
}

export default function FullScreenMap({
  busLocation,
  busHistory,
  showRoute,
  fromCoord,
  toCoord,
  fromLabel,
  toLabel,
  onMapReady,
}: FullScreenMapProps) {
  const center: [number, number] = [17.385, 78.4867];

  const routeLine: [number, number][] = fromCoord && toCoord
    ? [fromCoord, ...(busLocation ? [[busLocation.lat, busLocation.lng] as [number, number]] : []), toCoord]
    : [];

  const statusLabel =
    busLocation?.status === "on_time" ? "Running ✓" :
    busLocation?.status === "delayed" ? "Delayed ⚠" : "Arrived ✓";

  const statusColor =
    busLocation?.status === "on_time" ? "#22c55e" :
    busLocation?.status === "delayed" ? "#ef4444" : "#3b82f6";

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

      {/* Planned route line (from → to) */}
      {showRoute && routeLine.length >= 2 && (
        <Polyline
          positions={routeLine}
          color="#3b82f6"
          weight={4}
          opacity={0.5}
          dashArray="12 8"
        />
      )}

      {/* Travelled path (bus history) */}
      {showRoute && busHistory.length >= 2 && (
        <Polyline
          positions={busHistory}
          color="#f97316"
          weight={5}
          opacity={0.85}
        />
      )}

      {/* From marker */}
      {fromCoord && (
        <Marker position={fromCoord} icon={fromIcon}>
          <Popup className="custom-popup">
            <div style={{ fontFamily: "system-ui", fontWeight: 700, fontSize: 14, color: "#15803d" }}>
              🟢 Start: {fromLabel}
            </div>
          </Popup>
        </Marker>
      )}

      {/* To marker */}
      {toCoord && (
        <Marker position={toCoord} icon={toIcon}>
          <Popup className="custom-popup">
            <div style={{ fontFamily: "system-ui", fontWeight: 700, fontSize: 14, color: "#dc2626" }}>
              🔴 Destination: {toLabel}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Bus marker */}
      {busLocation && (
        <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon}>
          <Popup className="custom-popup" autoClose={false}>
            <div style={{ fontFamily: "system-ui", minWidth: 160, padding: "4px 2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🚌</span>
                <strong style={{ fontSize: 15, color: "#1e293b" }}>Bus {busLocation.busNumber}</strong>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#64748b", paddingBottom: 4 }}>Bus ID</td>
                    <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "right", paddingBottom: 4 }}>{busLocation.busId}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b", paddingBottom: 4 }}>Status</td>
                    <td style={{ fontWeight: 700, color: statusColor, textAlign: "right", paddingBottom: 4 }}>{statusLabel}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b", paddingBottom: 4 }}>Speed</td>
                    <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "right", paddingBottom: 4 }}>{busLocation.speed} km/h</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b" }}>Next Stop</td>
                    <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "right" }}>{busLocation.to}</td>
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
