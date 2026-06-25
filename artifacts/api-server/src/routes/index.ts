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
import commentsRouter from "./comments";
import notificationsRouter from "./notifications";
import attachmentsRouter from "./attachments";
import storageRouter from "./storage";
import projectActivityRouter from "./project-activity";
import emailDeadlinesRouter from "./email-deadlines";

const router: IRouter = Router();

router.use(healthRouter);

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
router.use(commentsRouter);
router.use(notificationsRouter);
router.use(attachmentsRouter);
router.use(storageRouter);
router.use(projectActivityRouter);
router.use(emailDeadlinesRouter);

export default router;
