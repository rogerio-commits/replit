import { Router } from "express";
import { db, tasksTable, membersTable, projectsTable, projectMembersTable, notificationsTable, usersTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
import { sendTaskAssignedEmail } from "../lib/email";
import { logAudit, diffObjects } from "../lib/audit";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  GetTaskParams,
} from "@workspace/api-zod";

const router = Router();

async function notifyTaskAssigned(
  taskId: number,
  taskTitle: string,
  assignedTo: number,
  actorEmail: string,
  projectName: string,
  actorName: string,
  log: { warn: (obj: object, msg: string) => void }
) {
  try {
    const [assigneeMember] = await db.select({ email: membersTable.email, name: membersTable.name })
      .from(membersTable).where(eq(membersTable.id, assignedTo)).limit(1);
    if (!assigneeMember || assigneeMember.email === actorEmail) return;
    const [assigneeUser] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, assigneeMember.email)).limit(1);
    if (!assigneeUser) return;
    await db.insert(notificationsTable).values({
      userId: assigneeUser.id,
      type: "task_assigned",
      title: "Nova tarefa atribuída a você",
      body: `Você foi atribuído à tarefa "${taskTitle}"`,
      entityType: "task",
      entityId: taskId,
      read: false,
    });
    // Send email (fire-and-forget — never block the response)
    sendTaskAssignedEmail({
      toEmail: assigneeMember.email,
      toName: assigneeMember.name,
      taskTitle,
      taskId,
      projectName,
      assignedByName: actorName,
    }).catch((e) => log.warn({ err: e }, "Failed to send task_assigned email"));
  } catch (e) {
    log.warn({ err: e }, "Failed to create task_assigned notification");
  }
}

async function isExecutorParticipant(email: string, projectId: number): Promise<boolean> {
  const [member] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.email, email))
    .limit(1);
  if (!member) return false;

  const [pm] = await db
    .select({ id: projectMembersTable.id })
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.memberId, member.id)
      )
    )
    .limit(1);

  return !!pm;
}

function taskRow(row: { task: typeof tasksTable.$inferSelect; memberName: string | null; projectName: string | null }) {
  return {
    id: row.task.id,
    projectId: row.task.projectId,
    title: row.task.title,
    description: row.task.description ?? null,
    status: row.task.status,
    priority: row.task.priority,
    assignedTo: row.task.assignedTo ?? null,
    assigneeName: row.memberName ?? null,
    projectName: row.projectName ?? null,
    dueDate: row.task.dueDate ?? null,
    completedAt: row.task.completedAt ? row.task.completedAt.toISOString() : null,
    createdAt: row.task.createdAt.toISOString(),
  };
}

router.get("/tasks", async (req, res) => {
  const query = ListTasksQueryParams.safeParse({
    projectId: req.query.projectId ? Number(req.query.projectId) : undefined,
    status: req.query.status,
    priority: req.query.priority,
    assignedTo: req.query.assignedTo ? Number(req.query.assignedTo) : undefined,
  });

  if (!query.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  const rows = await db
    .select({
      task: tasksTable,
      memberName: membersTable.name,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .orderBy(tasksTable.createdAt);

  let filtered = rows;
  if (query.data.projectId) {
    filtered = filtered.filter((r) => r.task.projectId === query.data.projectId);
  }
  if (query.data.status) {
    filtered = filtered.filter((r) => r.task.status === query.data.status);
  }
  if (query.data.priority) {
    filtered = filtered.filter((r) => r.task.priority === query.data.priority);
  }
  if (query.data.assignedTo) {
    filtered = filtered.filter((r) => r.task.assignedTo === query.data.assignedTo);
  }

  return res.json(filtered.map(taskRow));
});

router.post("/tasks", requireExecutorOrGestor, async (req, res) => {
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, body.data.projectId);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      projectId: body.data.projectId,
      title: body.data.title,
      description: body.data.description ?? null,
      status: (body.data.status as "todo" | "in_progress" | "review" | "done") ?? "todo",
      priority: (body.data.priority as "low" | "medium" | "high") ?? "medium",
      assignedTo: body.data.assignedTo ?? null,
      dueDate: body.data.dueDate ?? null,
    })
    .returning();

  const [row] = await db
    .select({
      task: tasksTable,
      memberName: membersTable.name,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.id, task.id));

  const projName = row?.projectName ?? "";
  const actorMemberPost = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorNamePost = actorMemberPost[0]?.name ?? req.appUser!.email.split("@")[0];

  if (task.assignedTo) {
    await notifyTaskAssigned(task.id, task.title, task.assignedTo, req.appUser!.email, projName, actorNamePost, req.log);
  }

  logAudit({ entityType: "task", entityId: task.id, entityName: task.title, action: "created", actorName: actorNamePost, actorEmail: req.appUser!.email }, req.log);

  return res.status(201).json(taskRow(row));
});

router.get("/tasks/:id", async (req, res) => {
  const params = GetTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db
    .select({
      task: tasksTable,
      memberName: membersTable.name,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.id, params.data.id));

  if (!row) return res.status(404).json({ error: "Not found" });

  return res.json(taskRow(row));
});

router.patch("/tasks/:id", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateTaskParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (req.appUser!.role === "executor") {
    const [existing] = await db
      .select({ projectId: tasksTable.projectId })
      .from(tasksTable)
      .where(eq(tasksTable.id, params.data.id))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const ok = await isExecutorParticipant(req.appUser!.email, existing.projectId);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });

    if (body.data.projectId !== undefined && body.data.projectId !== existing.projectId) {
      const okDest = await isExecutorParticipant(req.appUser!.email, body.data.projectId);
      if (!okDest) return res.status(403).json({ error: "Você não é participante do projeto de destino" });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.status !== undefined) {
    updateData.status = body.data.status;
    if (body.data.status === "done") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
  }
  if (body.data.priority !== undefined) updateData.priority = body.data.priority;
  if (body.data.assignedTo !== undefined) updateData.assignedTo = body.data.assignedTo;
  if (body.data.dueDate !== undefined) updateData.dueDate = body.data.dueDate;
  if (body.data.projectId !== undefined) updateData.projectId = body.data.projectId;

  const previousAssignee = body.data.assignedTo !== undefined ? (
    await db.select({ assignedTo: tasksTable.assignedTo }).from(tasksTable).where(eq(tasksTable.id, params.data.id)).limit(1)
  ).at(0)?.assignedTo : undefined;

  const [task] = await db
    .update(tasksTable)
    .set(updateData)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) return res.status(404).json({ error: "Not found" });

  const [row] = await db
    .select({
      task: tasksTable,
      memberName: membersTable.name,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.id, task.id));

  const actorMemberPatch = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorNamePatch = actorMemberPatch[0]?.name ?? req.appUser!.email.split("@")[0];

  if (task.assignedTo && task.assignedTo !== previousAssignee) {
    const projNamePatch = row?.projectName ?? "";
    await notifyTaskAssigned(task.id, task.title, task.assignedTo, req.appUser!.email, projNamePatch, actorNamePatch, req.log);
  }

  const patchAction = body.data.status !== undefined && body.data.status !== (await db.select({ status: tasksTable.status }).from(tasksTable).where(eq(tasksTable.id, params.data.id)).limit(1)).at(0)?.status
    ? "status_changed" as const
    : "updated" as const;
  const patchChanges = diffObjects(body.data as Record<string, unknown>, updateData, ["status", "priority", "assignedTo", "dueDate", "title"]);
  logAudit({ entityType: "task", entityId: task.id, entityName: task.title, action: patchChanges.length === 1 && patchChanges[0].field === "status" ? "status_changed" : "updated", actorName: actorNamePatch, actorEmail: req.appUser!.email, changes: patchChanges.length > 0 ? patchChanges : undefined }, req.log);

  return res.json(taskRow(row));
});

router.delete("/tasks/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  if (req.appUser!.role === "executor") {
    const [existing] = await db
      .select({ projectId: tasksTable.projectId })
      .from(tasksTable)
      .where(eq(tasksTable.id, params.data.id))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const ok = await isExecutorParticipant(req.appUser!.email, existing.projectId);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [taskToDelete] = await db.select({ title: tasksTable.title }).from(tasksTable).where(eq(tasksTable.id, params.data.id)).limit(1);
  const actorMemberDel = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorNameDel = actorMemberDel[0]?.name ?? req.appUser!.email.split("@")[0];

  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));

  if (taskToDelete) {
    logAudit({ entityType: "task", entityId: params.data.id, entityName: taskToDelete.title, action: "deleted", actorName: actorNameDel, actorEmail: req.appUser!.email }, req.log);
  }
  return res.status(204).send();
});

export default router;
