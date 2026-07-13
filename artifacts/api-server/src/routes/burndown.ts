import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const router = Router();

router.get("/projects/:id/burndown", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid id" });

  const tasks = await db
    .select({
      id: tasksTable.id,
      status: tasksTable.status,
      createdAt: tasksTable.createdAt,
      completedAt: tasksTable.completedAt,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));

  const now = new Date();
  const NUM_WEEKS = 12;

  const weeks = Array.from({ length: NUM_WEEKS }, (_, i) => {
    const ref = subWeeks(now, NUM_WEEKS - 1 - i);
    return {
      start: startOfWeek(ref, { weekStartsOn: 1 }),
      end: endOfWeek(ref, { weekStartsOn: 1 }),
      shortLabel: format(ref, "dd/MM"),
      label: format(ref, "'Sem.' w", { locale: ptBR }),
    };
  });

  const points = weeks.map(w => {
    const created = tasks.filter(t =>
      isWithinInterval(new Date(t.createdAt), { start: w.start, end: w.end })
    ).length;

    const completed = tasks.filter(t =>
      t.completedAt &&
      isWithinInterval(new Date(t.completedAt), { start: w.start, end: w.end })
    ).length;

    return {
      label: w.shortLabel,
      fullLabel: w.label,
      created,
      completed,
    };
  });

  return res.json(points);
});

export default router;
