import { Router, type IRouter } from "express";
import { requireGestor } from "../middlewares/requireAuth";
import { runDailyRemindersIfDue } from "../lib/scheduler";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/reminders/run — dispara a cobrança automática agora (somente gestor).
router.post("/reminders/run", requireGestor, async (_req, res) => {
  const outcome = await runDailyRemindersIfDue(logger, { force: true });
  res.json(outcome);
});

export default router;
