import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const RESET_SECRET = process.env.RESET_SECRET ?? "";

router.post("/admin/reset-db", async (req, res) => {
  const key = req.headers["x-reset-key"];
  if (!RESET_SECRET || key !== RESET_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  await db.execute(sql`
    TRUNCATE TABLE
      project_phase_history,
      project_observations,
      project_members,
      site_visits,
      checklist_items,
      sample_controls,
      assistencia_tecnica,
      installation_events,
      tasks,
      projects,
      invites,
      members
    RESTART IDENTITY CASCADE
  `);
  res.json({ ok: true });
});

export default router;
