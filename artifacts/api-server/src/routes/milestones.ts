import { Router } from "express";
import { db } from "@workspace/db";
import { milestonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateMilestoneBody } from "@workspace/api-zod";

const router = Router();

router.get("/projects/:id/milestones", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.projectId, projectId))
    .orderBy(milestonesTable.dueDate);

  return res.json(
    rows.map(r => ({
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      dueDate: r.dueDate,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/projects/:id/milestones", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid id" });

  const parsed = CreateMilestoneBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { title, dueDate } = parsed.data;

  const [row] = await db
    .insert(milestonesTable)
    .values({ projectId, title, dueDate })
    .returning();

  return res.status(201).json({
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    dueDate: row.dueDate,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  });
});

router.patch("/milestones/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [current] = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.id, id))
    .limit(1);

  if (!current) return res.status(404).json({ error: "Not found" });

  const completedAt = current.completedAt ? null : new Date();

  const [updated] = await db
    .update(milestonesTable)
    .set({ completedAt })
    .where(eq(milestonesTable.id, id))
    .returning();

  return res.json({
    id: updated.id,
    projectId: updated.projectId,
    title: updated.title,
    dueDate: updated.dueDate,
    completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/milestones/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(milestonesTable).where(eq(milestonesTable.id, id));
  return res.status(204).send();
});

export default router;
