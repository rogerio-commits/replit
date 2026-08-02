import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import cronRouter from "./cron";
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
import remindersRouter from "./reminders";
import assistantRouter from "./assistant";
import auditLogsRouter from "./audit-logs";
import searchRouter from "./search";
import tagsRouter from "./tags";
import taskDependenciesRouter from "./task-dependencies";
import templatesRouter from "./templates";
import timeEntriesRouter from "./time-entries";
import automationRulesRouter from "./automation-rules";
import obraDiaryRouter from "./obra-diary";
import projectMaterialsRouter from "./project-materials";
import customFieldsRouter from "./custom-fields";
import milestonesRouter from "./milestones";
import burndownRouter from "./burndown";
import chaseRouter from "./chase";

const router: IRouter = Router();

// O health check é montado direto no app, antes do clerkMiddleware (ver app.ts),
// para responder mesmo quando a autenticação está indisponível.
// Chamada pelo agendador da plataforma, autenticada por CRON_SECRET — precisa
// ficar antes do requireAuth, que exige uma sessão de usuário.
router.use(cronRouter);

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
router.use(remindersRouter);
router.use(assistantRouter);
router.use(auditLogsRouter);
router.use(searchRouter);
router.use(tagsRouter);
router.use(taskDependenciesRouter);
router.use(templatesRouter);
router.use(timeEntriesRouter);
router.use(automationRulesRouter);
router.use(obraDiaryRouter);
router.use(projectMaterialsRouter);
router.use(customFieldsRouter);
router.use(milestonesRouter);
router.use(burndownRouter);
router.use(chaseRouter);

export default router;
