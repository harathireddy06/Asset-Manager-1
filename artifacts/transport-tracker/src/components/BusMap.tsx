import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { BusLocation } from "@workspace/api-client-react/src/generated/api.schemas";

// Fix missing marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const busIcon = new L.DivIcon({
  html: '<div class="bus-marker">🚌</div>',
  className: '', // removed default classes
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

const villageIcon = new L.DivIcon({
  html: '<div class="village-marker" style="width: 16px; height: 16px;"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface BusMapProps {
  busLocation?: BusLocation | null;
  from?: string;
  to?: string;
}

export default function BusMap({ busLocation, from, to }: BusMapProps) {
  // Telangana center
  const defaultCenter: [number, number] = [17.385, 78.4867];
  const center: [number, number] = busLocation 
    ? [busLocation.lat, busLocation.lng] 
    : defaultCenter;

  // Mock route path for visuals
  const mockPath: [number, number][] = busLocation ? [
    [busLocation.lat - 0.05, busLocation.lng - 0.05],
    [busLocation.lat, busLocation.lng],
    [busLocation.lat + 0.05, busLocation.lng + 0.05],
  ] : [];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-border/50 bg-muted">
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />

        {/* Route Line */}
        {mockPath.length > 0 && (
          <Polyline 
            positions={mockPath} 
            color="hsl(var(--primary))" 
            weight={6} 
            opacity={0.6}
            dashArray="10, 10" 
          />
        )}

        {/* Start/End Markers Mock */}
        {busLocation && (
          <>
            <Marker position={[busLocation.lat - 0.05, busLocation.lng - 0.05]} icon={villageIcon}>
              <Popup><div className="text-lg font-bold">{from || busLocation.from}</div></Popup>
            </Marker>
            <Marker position={[busLocation.lat + 0.05, busLocation.lng + 0.05]} icon={villageIcon}>
              <Popup><div className="text-lg font-bold">{to || busLocation.to}</div></Popup>
            </Marker>
          </>
        )}

        {/* Bus Marker */}
        {busLocation && (
          <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon}>
            <Popup className="rounded-xl overflow-hidden">
              <div className="p-1 text-center">
                <div className="font-display font-bold text-lg text-primary">Bus {busLocation.busNumber}</div>
                <div className="text-sm font-medium text-muted-foreground">{busLocation.speed} km/h</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
