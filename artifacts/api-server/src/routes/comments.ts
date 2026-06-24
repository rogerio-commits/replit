import { Router } from "express";
import { db, taskCommentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
const router = Router();

router.get("/tasks/:id/comments", async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task id" });

  const comments = await db
    .select()
    .from(taskCommentsTable)
    .where(eq(taskCommentsTable.taskId, taskId))
    .orderBy(taskCommentsTable.createdAt);

  return res.json(comments.map((c) => ({
    id: c.id,
    taskId: c.taskId,
    userId: c.userId,
    authorName: c.authorName,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/tasks/:id/comments", async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task id" });

  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) return res.status(400).json({ error: "Content is required" });
  const parsed = { data: { content } };

  const appUser = req.appUser!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, appUser.clerkUserId)).limit(1);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  const [comment] = await db.insert(taskCommentsTable).values({
    taskId,
    userId: dbUser.id,
    authorName: appUser.email,
    content: parsed.data.content,
  }).returning();

  return res.status(201).json({
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  });
});

router.delete("/tasks/:id/comments/:commentId", async (req, res) => {
  const taskId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  if (isNaN(taskId) || isNaN(commentId)) return res.status(400).json({ error: "Invalid ids" });

  const appUser = req.appUser!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, appUser.clerkUserId)).limit(1);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  const isGestor = appUser.role === "gestor";

  const [existing] = await db.select().from(taskCommentsTable)
    .where(and(eq(taskCommentsTable.id, commentId), eq(taskCommentsTable.taskId, taskId)))
    .limit(1);

  if (!existing) return res.status(404).json({ error: "Comment not found" });
  if (!isGestor && existing.userId !== dbUser.id) return res.status(403).json({ error: "Forbidden" });

  await db.delete(taskCommentsTable).where(eq(taskCommentsTable.id, commentId));
  return res.status(204).send();
});

export default router;
