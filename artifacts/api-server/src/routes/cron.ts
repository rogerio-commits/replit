import { Router, type IRouter } from "express";
import { runDailyRemindersIfDue } from "../lib/scheduler";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * GET /cron/daily-reminders
 *
 * Substitui o processo eterno do scheduler quando a aplicação roda em ambiente
 * serverless. A Vercel chama esta rota no horário configurado em vercel.json.
 *
 * A garantia de "no máximo uma vez por dia" continua sendo do banco — a função
 * `runDailyRemindersIfDue` reivindica o dia atomicamente em `scheduler_state`.
 * Chamadas repetidas, portanto, são inofensivas.
 *
 * Fica fora do `requireAuth` porque quem chama é o agendador, não um usuário.
 * A proteção é o header `Authorization: Bearer <CRON_SECRET>`, enviado
 * automaticamente pela Vercel quando a variável CRON_SECRET está definida.
 */
router.get("/cron/daily-reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    logger.error("CRON_SECRET não configurada — rota de cron desabilitada");
    res.status(503).json({ error: "Cron not configured" });
    return;
  }

  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const outcome = await runDailyRemindersIfDue(logger);
    res.json(outcome);
  } catch (err) {
    logger.error({ err }, "Cron: falha ao executar lembretes diários");
    res.status(500).json({ error: "Failed to run daily reminders" });
  }
});

export default router;
