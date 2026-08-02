import { Router, type IRouter } from "express";
import { fetchOpenChaseItems } from "../lib/chase-items";

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

export default router;
