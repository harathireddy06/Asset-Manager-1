import { Router, type IRouter } from "express";
import { GetEtaResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const AVERAGE_SPEED_KMH = 40;

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
const BUS_NUMBERS = ["TS05-2345", "TS09-1122", "TS12-3344", "TS07-8899", "TS04-5566"];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get("/eta", (req, res) => {
  const { from, to, busId } = req.query as { from: string; to: string; busId?: string };

  const fromCoord = VILLAGE_COORDS[from] || DEFAULT_COORD;
  const toCoord = VILLAGE_COORDS[to] || DEFAULT_COORD;

  const distanceKm = Math.round(haversineDistance(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng) * 10) / 10;
  const etaMinutes = Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60);

  const busNumber = busId
    ? BUS_NUMBERS.find((b) => busId.includes(b.split("-")[1])) || BUS_NUMBERS[0]
    : BUS_NUMBERS[Math.floor(Math.random() * BUS_NUMBERS.length)];

  const etaText = etaMinutes <= 1 ? "Arriving now" : `${etaMinutes} minutes`;
  const etaTextTelugu =
    etaMinutes <= 1
      ? "ఇప్పుడు వస్తుంది"
      : `${etaMinutes} నిమిషాల్లో వస్తుంది`;

  const status: "on_time" | "delayed" | "arrived" =
    etaMinutes === 0 ? "arrived" : etaMinutes > 30 ? "delayed" : "on_time";

  const data = GetEtaResponse.parse({
    busNumber,
    from,
    to,
    distanceKm,
    etaMinutes,
    etaText,
    etaTextTelugu,
    status,
  });

  res.json(data);
});

export default router;
