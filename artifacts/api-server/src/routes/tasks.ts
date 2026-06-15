import { Router } from "express";
import { db, tasksTable, membersTable, projectsTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  GetTaskParams,
} from "@workspace/api-zod";

const router = Router();

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

  return res.json(
    filtered.map((r) => ({
      id: r.task.id,
      projectId: r.task.projectId,
      title: r.task.title,
      description: r.task.description ?? null,
      status: r.task.status,
      priority: r.task.priority,
      assignedTo: r.task.assignedTo ?? null,
      assigneeName: r.memberName ?? null,
      projectName: r.projectName ?? null,
      dueDate: r.task.dueDate ?? null,
      createdAt: r.task.createdAt.toISOString(),
    }))
  );
});

router.post("/tasks", requireExecutorOrGestor, async (req, res) => {
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

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

  return res.status(201).json({
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
    createdAt: row.task.createdAt.toISOString(),
  });
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

  return res.json({
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
    createdAt: row.task.createdAt.toISOString(),
  });
});

router.patch("/tasks/:id", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateTaskParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.priority !== undefined) updateData.priority = body.data.priority;
  if (body.data.assignedTo !== undefined) updateData.assignedTo = body.data.assignedTo;
  if (body.data.dueDate !== undefined) updateData.dueDate = body.data.dueDate;
  if (body.data.projectId !== undefined) updateData.projectId = body.data.projectId;

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

  return res.json({
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
    createdAt: row.task.createdAt.toISOString(),
  });
});

router.delete("/tasks/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
