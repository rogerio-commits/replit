import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import membersRouter from "./members";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import installationEventsRouter from "./installation-events";
import invitationsRouter from "./invitations";
import assistenciaTecnicaRouter from "./assistencia-tecnica";
import sampleControlsRouter from "./sample-controls";
import adminResetRouter from "./admin-reset";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminResetRouter);

router.use(requireAuth);

router.use(projectsRouter);
router.use(tasksRouter);
router.use(membersRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(installationEventsRouter);
router.use(invitationsRouter);
router.use(assistenciaTecnicaRouter);
router.use(sampleControlsRouter);

export default router;
