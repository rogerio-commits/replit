import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import membersRouter from "./members";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireAuth);

router.use(projectsRouter);
router.use(tasksRouter);
router.use(membersRouter);
router.use(dashboardRouter);
router.use(usersRouter);

export default router;
