import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * TEMPORÁRIO — diagnóstico de conectividade com o banco.
 *
 * Executa um SELECT trivial e devolve o erro do driver quando falha. Existe
 * porque, em produção, os erros de conexão só apareciam como "500" genérico e
 * ler o log da plataforma estava inviável.
 *
 * Não expõe credenciais: apenas o código e a mensagem do driver. Ainda assim,
 * REMOVER assim que a conexão estiver confirmada.
 */
router.get("/healthz/db", async (_req, res) => {
  const started = Date.now();
  try {
    const result = await pool.query("select 1 as ok");
    res.json({
      ok: true,
      rows: result.rowCount,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    res.status(500).json({
      ok: false,
      name: e.name,
      code: e.code ?? null,
      message: String(e.message).slice(0, 300),
      elapsedMs: Date.now() - started,
    });
  }
});

export default router;
