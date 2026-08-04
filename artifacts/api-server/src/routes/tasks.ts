import { Router } from "express";
import { db, tasksTable, membersTable, projectsTable, projectMembersTable, notificationsTable, usersTable, taskTagsTable, tagsTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { sendTaskAssignedEmail } from "../lib/email";
import { logAudit, diffObjects } from "../lib/audit";
import { runAutomations } from "../lib/automation-engine";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  GetTaskParams,
  ListSubtasksParams,
  CreateSubtaskParams,
  CreateSubtaskBody,
  BulkUpdateTasksBody,
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
    // E-mail vai mesmo sem conta no app; aguardado porque a serverless congela após a resposta.
    await sendTaskAssignedEmail({
      toEmail: assigneeMember.email,
      toName: assigneeMember.name,
      taskTitle,
      taskId,
      projectName,
      assignedByName: actorName,
    }).catch((e) => log.warn({ err: e }, "Failed to send task_assigned email"));
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

type TagRow = { id: number; name: string; color: string; createdAt: string };

function taskRow(
  row: { task: typeof tasksTable.$inferSelect; memberName: string | null; projectName: string | null },
  subtaskCount = 0,
  subtaskDoneCount = 0,
  tags: TagRow[] = []
) {
  return {
    id: row.task.id,
    projectId: row.task.projectId,
    parentId: row.task.parentId ?? null,
    title: row.task.title,
    description: row.task.description ?? null,
    status: row.task.status,
    priority: row.task.priority,
    assignedTo: row.task.assignedTo ?? null,
    assigneeName: row.memberName ?? null,
    projectName: row.projectName ?? null,
    dueDate: row.task.dueDate ?? null,
    startedAt: row.task.startedAt ? row.task.startedAt.toISOString() : null,
    completedAt: row.task.completedAt ? row.task.completedAt.toISOString() : null,
    recurrence: row.task.recurrence ?? "none",
    recurrenceEndDate: row.task.recurrenceEndDate ?? null,
    createdAt: row.task.createdAt.toISOString(),
    subtaskCount,
    subtaskDoneCount,
    tags,
  };
}

async function getTaskTags(taskIds: number[]): Promise<Map<number, TagRow[]>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({ taskId: taskTagsTable.taskId, tag: tagsTable })
    .from(taskTagsTable)
    .innerJoin(tagsTable, eq(taskTagsTable.tagId, tagsTable.id))
    .where(inArray(taskTagsTable.taskId, taskIds));

  const map = new Map<number, TagRow[]>();
  for (const r of rows) {
    const list = map.get(r.taskId) ?? [];
    list.push({ ...r.tag, createdAt: r.tag.createdAt.toISOString() });
    map.set(r.taskId, list);
  }
  return map;
}

async function getSubtaskCounts(taskIds: number[]): Promise<Map<number, { total: number; done: number }>> {
  if (taskIds.length === 0) return new Map();
  const subtasks = await db
    .select({ parentId: tasksTable.parentId, status: tasksTable.status })
    .from(tasksTable)
    .where(sql`${tasksTable.parentId} = ANY(ARRAY[${sql.join(taskIds.map((id) => sql`${id}`), sql`, `)}]::int[])`);

  const map = new Map<number, { total: number; done: number }>();
  for (const s of subtasks) {
    if (s.parentId == null) continue;
    const entry = map.get(s.parentId) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (s.status === "done") entry.done += 1;
    map.set(s.parentId, entry);
  }
  return map;
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
    .where(isNull(tasksTable.parentId))
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

  const ids = filtered.map((r) => r.task.id);
  const [counts, tags] = await Promise.all([getSubtaskCounts(ids), getTaskTags(ids)]);
  return res.json(filtered.map((r) => {
    const c = counts.get(r.task.id);
    return taskRow(r, c?.total ?? 0, c?.done ?? 0, tags.get(r.task.id) ?? []);
  }));
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
      parentId: body.data.parentId ?? null,
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

  await logAudit({ entityType: "task", entityId: task.id, entityName: task.title, action: "created", actorName: actorNamePost, actorEmail: req.appUser!.email }, req.log);

  return res.status(201).json(taskRow(row));
});

router.post("/tasks/bulk-update", requireExecutorOrGestor, async (req, res) => {
  const body = BulkUpdateTasksBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  const { ids, status, priority, assignedTo } = body.data;
  if (!ids || ids.length === 0) return res.status(400).json({ error: "ids is required" });

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) {
    updateData.status = status;
    if (status === "done") updateData.completedAt = new Date();
    else updateData.completedAt = null;
    // Registra o início na primeira saída de "todo", sem sobrescrever o já marcado.
    if (status !== "todo") {
      updateData.startedAt = sql`COALESCE(${tasksTable.startedAt}, now())`;
    }
  }
  if (priority !== undefined) updateData.priority = priority;
  if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

  if (Object.keys(updateData).length === 0) return res.json({ updated: 0 });

  // Estado anterior, para avisar só quem de fato ganhou tarefa nova.
  const previousRows = assignedTo
    ? await db
        .select({ id: tasksTable.id, title: tasksTable.title, assignedTo: tasksTable.assignedTo, projectName: projectsTable.name })
        .from(tasksTable)
        .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
        .where(inArray(tasksTable.id, ids))
    : [];

  await db.update(tasksTable).set(updateData).where(inArray(tasksTable.id, ids));

  if (assignedTo) {
    const [actorMember] = await db.select({ name: membersTable.name })
      .from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
    const actorName = actorMember?.name ?? req.appUser!.email.split("@")[0];
    for (const prev of previousRows) {
      if (prev.assignedTo === assignedTo) continue;
      await notifyTaskAssigned(prev.id, prev.title, assignedTo, req.appUser!.email, prev.projectName ?? "", actorName, req.log);
    }
  }

  return res.json({ updated: ids.length });
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

  const taskTags = await getTaskTags([params.data.id]);
  return res.json(taskRow(row, 0, 0, taskTags.get(params.data.id) ?? []));
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
  if (body.data.recurrence !== undefined) updateData.recurrence = body.data.recurrence;
  if (body.data.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = body.data.recurrenceEndDate;

  const [previousTask] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .limit(1);
  if (!previousTask) return res.status(404).json({ error: "Not found" });
  const previousAssignee = previousTask.assignedTo;

  // Marca o início real do trabalho na primeira vez que a tarefa sai de "todo".
  // Preserva o valor original em reaberturas — o tempo de ciclo conta do começo.
  if (
    body.data.status !== undefined &&
    body.data.status !== "todo" &&
    previousTask.startedAt == null
  ) {
    updateData.startedAt = new Date();
  }

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
    void runAutomations("task_assigned", {
      taskId: task.id,
      taskTitle: task.title,
      taskAssignedTo: task.assignedTo,
      projectId: task.projectId,
      projectName: projNamePatch,
    }, req.log);
  }

  if (body.data.status !== undefined) {
    const projNameForAuto = row?.projectName ?? "";
    if (body.data.status === "done") {
      void runAutomations("task_completed", {
        taskId: task.id,
        taskTitle: task.title,
        taskAssignedTo: task.assignedTo ?? null,
        projectId: task.projectId,
        projectName: projNameForAuto,
      }, req.log);
    } else {
      void runAutomations("task_status_changed", {
        taskId: task.id,
        taskTitle: task.title,
        taskAssignedTo: task.assignedTo ?? null,
        projectId: task.projectId,
        projectName: projNameForAuto,
        newStatus: body.data.status,
      }, req.log);
    }
  }

  const patchChanges = diffObjects(previousTask as unknown as Record<string, unknown>, updateData, ["status", "priority", "assignedTo", "dueDate", "title"]);
  await logAudit({ entityType: "task", entityId: task.id, entityName: task.title, action: patchChanges.length === 1 && patchChanges[0].field === "status" ? "status_changed" : "updated", actorName: actorNamePatch, actorEmail: req.appUser!.email, changes: patchChanges.length > 0 ? patchChanges : undefined }, req.log);

  if (body.data.status === "done" && task.recurrence && task.recurrence !== "none" && task.dueDate) {
    const currentDue = new Date(task.dueDate);
    let nextDue = new Date(currentDue);
    if (task.recurrence === "daily")   nextDue.setDate(nextDue.getDate() + 1);
    else if (task.recurrence === "weekly")  nextDue.setDate(nextDue.getDate() + 7);
    else if (task.recurrence === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);
    else if (task.recurrence === "yearly")  nextDue.setFullYear(nextDue.getFullYear() + 1);

    const nextDueStr = nextDue.toISOString().slice(0, 10);
    const endOk = !task.recurrenceEndDate || nextDueStr <= task.recurrenceEndDate;
    if (endOk) {
      await db.insert(tasksTable).values({
        projectId: task.projectId,
        parentId: task.parentId ?? undefined,
        title: task.title,
        description: task.description ?? undefined,
        status: "todo",
        priority: task.priority,
        assignedTo: task.assignedTo ?? undefined,
        dueDate: nextDueStr,
        recurrence: task.recurrence,
        recurrenceEndDate: task.recurrenceEndDate ?? undefined,
      });
    }
  }

  return res.json(taskRow(row));
});

router.get("/tasks/:id/subtasks", async (req, res) => {
  const params = ListSubtasksParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select({
      task: tasksTable,
      memberName: membersTable.name,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.parentId, params.data.id))
    .orderBy(tasksTable.createdAt);

  return res.json(rows.map((r) => taskRow(r)));
});

router.post("/tasks/:id/subtasks", requireExecutorOrGestor, async (req, res) => {
  const params = CreateSubtaskParams.safeParse({ id: Number(req.params.id) });
  const body = CreateSubtaskBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [parent] = await db
    .select({ projectId: tasksTable.projectId })
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .limit(1);

  if (!parent) return res.status(404).json({ error: "Parent task not found" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, parent.projectId);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      projectId: parent.projectId,
      parentId: params.data.id,
      title: body.data.title,
      status: "todo",
      priority: "medium",
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

  const actorMember = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorName = actorMember[0]?.name ?? req.appUser!.email.split("@")[0];
  await logAudit({ entityType: "task", entityId: task.id, entityName: task.title, action: "created", actorName, actorEmail: req.appUser!.email }, req.log);

  return res.status(201).json(taskRow(row));
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
    await logAudit({ entityType: "task", entityId: params.data.id, entityName: taskToDelete.title, action: "deleted", actorName: actorNameDel, actorEmail: req.appUser!.email }, req.log);
  }
  return res.status(204).send();
});

export default router;
