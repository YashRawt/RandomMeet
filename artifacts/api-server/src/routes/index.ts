import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import sessionsRouter from "./sessions";
import pingsRouter from "./pings";
import safetyRouter from "./safety";
import matchesRouter from "./matches";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(pingsRouter);
router.use(safetyRouter);
router.use(matchesRouter);

export default router;
