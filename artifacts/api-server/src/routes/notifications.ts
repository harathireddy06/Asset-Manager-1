import { Router, type IRouter } from "express";
import { GetNotificationsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const notifications = [
  {
    id: "notif-1",
    type: "arriving" as const,
    message: "Bus TS05-2345 arriving in 5 minutes at Nalgonda",
    messageTelugu: "బస్ TS05-2345 నాల్గొండలో 5 నిమిషాల్లో వస్తుంది",
    busNumber: "TS05-2345",
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: "notif-2",
    type: "delayed" as const,
    message: "Bus TS12-3344 is delayed by 15 minutes",
    messageTelugu: "బస్ TS12-3344 15 నిమిషాలు ఆలస్యమైంది",
    busNumber: "TS12-3344",
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: "notif-3",
    type: "arrived" as const,
    message: "Bus TS09-1122 has reached Warangal",
    messageTelugu: "బస్ TS09-1122 వరంగల్ చేరుకుంది",
    busNumber: "TS09-1122",
    timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: "notif-4",
    type: "route_change" as const,
    message: "Route change: Bus TS07-8899 now via Khammam bypass",
    messageTelugu: "మార్గం మార్పు: బస్ TS07-8899 ఇప్పుడు ఖమ్మం బైపాస్ మీదుగా వెళ్ళుతుంది",
    busNumber: "TS07-8899",
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: "notif-5",
    type: "arriving" as const,
    message: "Bus TS04-5566 arriving in 3 minutes at Suryapet",
    messageTelugu: "బస్ TS04-5566 సూర్యాపేటలో 3 నిమిషాల్లో వస్తుంది",
    busNumber: "TS04-5566",
    timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
  },
];

router.get("/notifications", (_req, res) => {
  const data = GetNotificationsResponse.parse({ notifications });
  res.json(data);
});

export default router;
