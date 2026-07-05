import { Router } from "express";
import { db, tagsTable, taskTagsTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
import {
  CreateTagBody,
  DeleteTagParams,
  AddTagToTaskParams,
  AddTagToTaskBody,
  RemoveTagFromTaskParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/tags", async (_req, res) => {
  const tags = await db.select().from(tagsTable).orderBy(tagsTable.name);
  return res.json(tags.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

router.post("/tags", requireExecutorOrGestor, async (req, res) => {
  const body = CreateTagBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  const [tag] = await db.insert(tagsTable).values({
    name: body.data.name,
    color: body.data.color,
  }).returning();

  return res.status(201).json({ ...tag, createdAt: tag.createdAt.toISOString() });
});

router.delete("/tags/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteTagParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(tagsTable).where(eq(tagsTable.id, params.data.id));
  return res.status(204).send();
});

router.post("/tasks/:id/tags", requireExecutorOrGestor, async (req, res) => {
  const params = AddTagToTaskParams.safeParse({ id: Number(req.params.id) });
  const body = AddTagToTaskBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const existing = await db
    .select()
    .from(taskTagsTable)
    .where(and(eq(taskTagsTable.taskId, params.data.id), eq(taskTagsTable.tagId, body.data.tagId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(taskTagsTable).values({ taskId: params.data.id, tagId: body.data.tagId });
  }

  return res.status(201).send();
});

router.delete("/tasks/:id/tags/:tagId", requireExecutorOrGestor, async (req, res) => {
  const params = RemoveTagFromTaskParams.safeParse({ id: Number(req.params.id), tagId: Number(req.params.tagId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  await db.delete(taskTagsTable).where(
    and(eq(taskTagsTable.taskId, params.data.id), eq(taskTagsTable.tagId, params.data.tagId))
  );
  return res.status(204).send();
});

export default router;
