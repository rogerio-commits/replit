import { Router } from "express";
import { db, taskCommentsTable, tasksTable, membersTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { sendTaskCommentedEmail, sendMentionEmail } from "../lib/email";

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

  const appUser = req.appUser!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, appUser.clerkUserId)).limit(1);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  const [member] = await db.select({ name: membersTable.name })
    .from(membersTable)
    .where(eq(membersTable.email, appUser.email))
    .limit(1);
  const authorName = member?.name ?? appUser.email.split("@")[0];

  const [comment] = await db.insert(taskCommentsTable).values({
    taskId,
    userId: dbUser.id,
    authorName,
    content,
  }).returning();

  // notify task assignee (if different from commenter)
  try {
    const [task] = await db
      .select({ assignedTo: tasksTable.assignedTo, title: tasksTable.title })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (task?.assignedTo) {
      const [assigneeMember] = await db
        .select({ email: membersTable.email, name: membersTable.name })
        .from(membersTable)
        .where(eq(membersTable.id, task.assignedTo))
        .limit(1);

      if (assigneeMember && assigneeMember.email !== appUser.email) {
        const [assigneeUser] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, assigneeMember.email))
          .limit(1);

        if (assigneeUser) {
          await db.insert(notificationsTable).values({
            userId: assigneeUser.id,
            type: "task_commented",
            title: "Novo comentário na sua tarefa",
            body: `${authorName} comentou em "${task.title}"`,
            entityType: "task",
            entityId: taskId,
            read: false,
          });
        }

        // Send email (fire-and-forget)
        sendTaskCommentedEmail({
          toEmail: assigneeMember.email,
          toName: assigneeMember.name,
          taskTitle: task.title,
          taskId,
          authorName,
          commentPreview: content.slice(0, 120),
        }).catch((e) => req.log.warn({ err: e }, "Failed to send comment email"));
      }
    }
  } catch (e) {
    req.log.warn({ err: e }, "Failed to create comment notification");
  }

  // Parse @mentions and notify each mentioned member
  try {
    const [task] = await db
      .select({ title: tasksTable.title })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    const mentionMatches = [...content.matchAll(/@([\w\s]{2,40}?)(?=\s|$)/g)];
    const mentionedNames = [...new Set(mentionMatches.map((m) => m[1].trim()))].filter(Boolean);

    if (mentionedNames.length > 0 && task) {
      const mentionedMembers = await db
        .select({ id: membersTable.id, name: membersTable.name, email: membersTable.email })
        .from(membersTable)
        .where(inArray(membersTable.name, mentionedNames));

      for (const mentioned of mentionedMembers) {
        if (mentioned.email === appUser.email) continue; // skip self

        const [mentionedUser] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, mentioned.email))
          .limit(1);

        if (mentionedUser) {
          await db.insert(notificationsTable).values({
            userId: mentionedUser.id,
            type: "mention",
            title: "Você foi mencionado",
            body: `${authorName} te mencionou em "${task.title}"`,
            entityType: "task",
            entityId: taskId,
            read: false,
          }).onConflictDoNothing();
        }

        sendMentionEmail({
          toEmail: mentioned.email,
          toName: mentioned.name,
          taskTitle: task.title,
          taskId,
          authorName,
          commentPreview: content.slice(0, 120),
        }).catch((e) => req.log.warn({ err: e }, "Failed to send mention email"));
      }
    }
  } catch (e) {
    req.log.warn({ err: e }, "Failed to process mentions");
  }

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
