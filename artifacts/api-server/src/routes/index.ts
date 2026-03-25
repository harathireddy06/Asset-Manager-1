import { Router, type IRouter } from "express";
import healthRouter from "./health";
import villagesRouter from "./villages";
import busesRouter from "./buses";
import etaRouter from "./eta";
import notificationsRouter from "./notifications";
import ttsRouter from "./tts";

const router: IRouter = Router();

router.use("/health", healthRouter);
router.use(villagesRouter);
router.use(busesRouter);
router.use(etaRouter);
router.use(notificationsRouter);
router.use("/tts", ttsRouter);

export default router;
