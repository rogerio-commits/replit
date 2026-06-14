import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListProjectsQueryParams,
  CreateProjectBody,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  GetProjectParams,
  GetProjectStatsParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/projects", async (req, res) => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  let rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);

  if (query.data.status) {
    rows = rows.filter((p) => p.status === query.data.status);
  }
  if (query.data.priority) {
    rows = rows.filter((p) => p.priority === query.data.priority);
  }

  return res.json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      status: p.status,
      priority: p.priority,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      name: body.data.name,
      description: body.data.description ?? null,
      status: (body.data.status as "a_iniciar" | "em_projeto" | "em_producao" | "aguardando_instalacao" | "em_instalacao") ?? "a_iniciar",
      priority: (body.data.priority as "low" | "medium" | "high") ?? "medium",
      startDate: body.data.startDate ?? null,
      endDate: body.data.endDate ?? null,
    })
    .returning();

  return res.status(201).json({
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate ?? null,
    endDate: project.endDate ?? null,
    createdAt: project.createdAt.toISOString(),
  });
});

router.get("/projects/:id", async (req, res) => {
  const params = GetProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate ?? null,
    endDate: project.endDate ?? null,
    createdAt: project.createdAt.toISOString(),
  });
});

router.patch("/projects/:id", async (req, res) => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.priority !== undefined) updateData.priority = body.data.priority;
  if (body.data.startDate !== undefined) updateData.startDate = body.data.startDate;
  if (body.data.endDate !== undefined) updateData.endDate = body.data.endDate;

  const [project] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate ?? null,
    endDate: project.endDate ?? null,
    createdAt: project.createdAt.toISOString(),
  });
});

router.delete("/projects/:id", async (req, res) => {
  const params = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  return res.status(204).send();
});

router.get("/projects/:id/stats", async (req, res) => {
  const params = GetProjectStatsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const { tasksTable } = await import("@workspace/db");
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.projectId, params.data.id));

  const now = new Date();
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
  ).length;

  return res.json({
    projectId: params.data.id,
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue,
  });
});

export default router;
