import { Router } from "express";
import { db, tasksTable, taskCommentsTable, membersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

interface ActivityItem {
  id: string;
  type: "task_created" | "task_completed" | "task_commented";
  actorName: string;
  description: string;
  entityId: number;
  entityTitle: string;
  createdAt: string;
}

router.get("/projects/:id/activity", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });

  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      assignedTo: tasksTable.assignedTo,
      createdAt: tasksTable.createdAt,
      completedAt: tasksTable.completedAt,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));

  const memberIds = [...new Set(tasks.map((t) => t.assignedTo).filter((id): id is number => id !== null))];
  const memberMap = new Map<number, string>();
  if (memberIds.length > 0) {
    const members = await db
      .select({ id: membersTable.id, name: membersTable.name })
      .from(membersTable)
      .where(inArray(membersTable.id, memberIds));
    for (const m of members) memberMap.set(m.id, m.name);
  }

  const activity: ActivityItem[] = [];

  for (const t of tasks) {
    const assigneeName = t.assignedTo ? (memberMap.get(t.assignedTo) ?? "Responsável") : "Sistema";
    activity.push({
      id: `task-created-${t.id}`,
      type: "task_created",
      actorName: assigneeName,
      description: `Tarefa criada: "${t.title}"`,
      entityId: t.id,
      entityTitle: t.title,
      createdAt: t.createdAt.toISOString(),
    });
    if (t.completedAt) {
      activity.push({
        id: `task-completed-${t.id}`,
        type: "task_completed",
        actorName: assigneeName,
        description: `Tarefa concluída: "${t.title}"`,
        entityId: t.id,
        entityTitle: t.title,
        createdAt: t.completedAt.toISOString(),
      });
    }
  }

  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length > 0) {
    const comments = await db
      .select({
        id: taskCommentsTable.id,
        taskId: taskCommentsTable.taskId,
        authorName: taskCommentsTable.authorName,
        content: taskCommentsTable.content,
        createdAt: taskCommentsTable.createdAt,
      })
      .from(taskCommentsTable)
      .where(inArray(taskCommentsTable.taskId, taskIds));

    const taskTitleMap = new Map(tasks.map((t) => [t.id, t.title]));
    for (const c of comments) {
      const taskTitle = taskTitleMap.get(c.taskId) ?? "tarefa";
      activity.push({
        id: `comment-${c.id}`,
        type: "task_commented",
        actorName: c.authorName,
        description: `Comentou em "${taskTitle}": ${c.content.slice(0, 60)}${c.content.length > 60 ? "…" : ""}`,
        entityId: c.taskId,
        entityTitle: taskTitle,
        createdAt: c.createdAt.toISOString(),
      });
    }
  }

  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(activity.slice(0, 40));
});

export default router;
