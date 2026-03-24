import { Router, type IRouter } from "express";
import { GetVillagesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const villages = [
  "Suryapet", "Kodad", "Huzurnagar", "Miryalaguda", "Nalgonda",
  "Choutuppal", "Bhongir", "Devarakonda", "Nagarjuna Sagar", "Chivvemla",
  "Tungaturthi", "Nakrekal", "Nereducherla", "Garidepally", "Penpahad",
  "Mothkur", "Alair", "Atmakur", "Bibinagar", "Valigonda",
  "Ramannapet", "Pochampally", "Mothey", "Munagala", "Mellacheruvu",
  "Mattampally", "Palakeedu", "Thipparthi", "Damaracherla", "Anumula",
  "Nidamanur", "Chandur", "Kattangur", "Narayanpur", "Munugode",
  "Chityal", "Thorrur", "Mahabubabad", "Kesamudram", "Dornakal",
  "Maripeda", "Narsimhulapet", "Kuravi", "Bayyaram", "Gudur",
  "Mulugu", "Eturnagaram", "Mangapet", "Venkatapuram", "Govindaraopet",
  "Tadvai", "Parkal", "Atmakur Warangal", "Shayampet", "Geesugonda",
  "Sangem", "Hasanparthy", "Dharmasagar", "Kazipet", "Hanamkonda",
  "Warangal", "Jangaon", "Palakurthi", "Raghunathpally", "Zaffergadh",
  "Bachannapet", "Devaruppula", "Narmetta", "Ghanpur Station", "Chilpur",
  "Kadipikonda", "Hunter Road", "Balasamudram", "Kothagudem", "Yellandu",
  "Manuguru", "Paloncha", "Bhadrachalam", "Aswaraopeta", "Dammapeta",
  "Burgampahad", "Chandrugonda", "Dummugudem", "Karepalli", "Sathupalli",
  "Vemsoor", "Madhira", "Wyra", "Thallada", "Nelakondapally",
  "Kusumanchi", "Khammam", "Bonakal", "Enkoor", "Julurupadu",
  "Penuballi", "Kallur", "Tekulapally", "Illandu"
];

router.get("/villages", (_req, res) => {
  
  res.json(villages);
});

export default router;
export { villages };
