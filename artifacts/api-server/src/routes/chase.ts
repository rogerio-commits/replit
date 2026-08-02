import { Router, type IRouter } from "express";
import { fetchOpenChaseItems } from "../lib/chase-items";
import { fetchActionPlanSummaryByProject } from "../lib/action-plan-summary";

const router: IRouter = Router();

/**
 * GET /chase-items
 *
 * Lista agregada, cross-obra, das "cobranças" em aberto do gestor de obras:
 * itens de plano de ação e follow-ups de visita ainda não concluídos. Alimenta
 * a tela "Minhas Cobranças" e os alertas do cliente. O e-mail do responsável
 * é usado só na cobrança por e-mail (servidor) e não é exposto aqui.
 */
router.get("/chase-items", async (_req, res) => {
  const items = await fetchOpenChaseItems();
  const sanitized = items.map(({ responsibleEmail: _drop, ...rest }) => rest);
  return res.json(sanitized);
});

/**
 * GET /action-plans/by-project
 *
 * Planos de ação consolidados por projeto: progresso, itens abertos, vencidos e
 * o próximo vencimento. Serve à visão do gestor de obras de cobrar o plano por
 * obra, não item por item.
 */
router.get("/action-plans/by-project", async (_req, res) => {
  return res.json(await fetchActionPlanSummaryByProject());
});

export default router;
