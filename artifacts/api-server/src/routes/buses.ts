import { Router, type IRouter } from "express";
import { GetBusLocationResponse, GetBusesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

interface BusState {
  busId: string;
  busNumber: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  from: string;
  to: string;
  status: "on_time" | "delayed" | "arrived";
  lastUpdated: string;
  targetLat: number;
  targetLng: number;
  progress: number;
}

const VILLAGE_COORDS: Record<string, { lat: number; lng: number }> = {
  "Suryapet": { lat: 17.1415, lng: 79.6216 },
  "Kodad": { lat: 16.9997, lng: 79.9667 },
  "Huzurnagar": { lat: 16.8971, lng: 79.8835 },
  "Miryalaguda": { lat: 16.8725, lng: 79.5671 },
  "Nalgonda": { lat: 17.0566, lng: 79.2672 },
  "Choutuppal": { lat: 17.2482, lng: 78.9166 },
  "Bhongir": { lat: 17.5128, lng: 78.8972 },
  "Warangal": { lat: 17.9784, lng: 79.5941 },
  "Hanamkonda": { lat: 18.0139, lng: 79.5529 },
  "Khammam": { lat: 17.2473, lng: 80.1514 },
  "Bhadrachalam": { lat: 17.6688, lng: 80.8894 },
  "Mahabubabad": { lat: 17.5996, lng: 80.0006 },
  "Kothagudem": { lat: 17.5533, lng: 80.6194 },
  "Jangaon": { lat: 17.7245, lng: 79.1523 },
  "Nagarjuna Sagar": { lat: 16.5741, lng: 79.3196 },
  "Devarakonda": { lat: 16.6892, lng: 78.9152 },
  "Pochampally": { lat: 17.3366, lng: 78.8608 },
  "Madhira": { lat: 17.0581, lng: 80.3695 },
  "Yellandu": { lat: 17.5999, lng: 80.3275 },
  "Paloncha": { lat: 17.5973, lng: 80.7024 },
};

const DEFAULT_COORD = { lat: 17.385, lng: 78.4867 };

function getCoord(village: string) {
  return VILLAGE_COORDS[village] || DEFAULT_COORD;
}

const buses: BusState[] = [
  {
    busId: "bus-1",
    busNumber: "TS05-2345",
    lat: 17.1415,
    lng: 79.6216,
    speed: 40,
    heading: 45,
    from: "Suryapet",
    to: "Nalgonda",
    status: "on_time",
    lastUpdated: new Date().toISOString(),
    targetLat: 17.0566,
    targetLng: 79.2672,
    progress: 0,
  },
  {
    busId: "bus-2",
    busNumber: "TS09-1122",
    lat: 17.5128,
    lng: 78.8972,
    speed: 35,
    heading: 90,
    from: "Bhongir",
    to: "Warangal",
    status: "on_time",
    lastUpdated: new Date().toISOString(),
    targetLat: 17.9784,
    targetLng: 79.5941,
    progress: 0,
  },
  {
    busId: "bus-3",
    busNumber: "TS12-3344",
    lat: 17.2473,
    lng: 80.1514,
    speed: 30,
    heading: 135,
    from: "Khammam",
    to: "Bhadrachalam",
    status: "delayed",
    lastUpdated: new Date().toISOString(),
    targetLat: 17.6688,
    targetLng: 80.8894,
    progress: 0,
  },
];

function simulateBusMovement() {
  for (const bus of buses) {
    const fromCoord = getCoord(bus.from);
    const toCoord = getCoord(bus.to);
    bus.progress = (bus.progress + 0.005) % 1;

    const t = bus.progress;
    bus.lat = fromCoord.lat + (toCoord.lat - fromCoord.lat) * t + (Math.random() - 0.5) * 0.001;
    bus.lng = fromCoord.lng + (toCoord.lng - fromCoord.lng) * t + (Math.random() - 0.5) * 0.001;
    bus.lastUpdated = new Date().toISOString();

    if (bus.progress > 0.95) {
      bus.status = "arrived";
    } else if (bus.progress > 0.5 && bus.busId === "bus-3") {
      bus.status = "delayed";
    }
  }
}

setInterval(simulateBusMovement, 2000);

router.get("/bus-location", (req, res) => {
  const { busId } = req.query;
  let bus = buses[0];
  if (busId) {
    const found = buses.find((b) => b.busId === busId);
    if (found) bus = found;
  }
  const data = GetBusLocationResponse.parse({
    busId: bus.busId,
    busNumber: bus.busNumber,
    lat: bus.lat,
    lng: bus.lng,
    speed: bus.speed,
    heading: bus.heading,
    from: bus.from,
    to: bus.to,
    status: bus.status,
    lastUpdated: bus.lastUpdated,
  });
  res.json(data);
});

router.get("/buses", (_req, res) => {
  const data = GetBusesResponse.parse({
    buses: buses.map((bus) => ({
      busId: bus.busId,
      busNumber: bus.busNumber,
      lat: bus.lat,
      lng: bus.lng,
      speed: bus.speed,
      heading: bus.heading,
      from: bus.from,
      to: bus.to,
      status: bus.status,
      lastUpdated: bus.lastUpdated,
    })),
  });
  res.json(data);
});

export default router;
export { buses, VILLAGE_COORDS };
