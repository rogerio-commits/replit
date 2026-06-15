import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { requireGestor } from "../middlewares/requireAuth";
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

function projectRow(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    status: p.status,
    priority: p.priority,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    producaoStartDate: p.producaoStartDate ?? null,
    producaoEndDate: p.producaoEndDate ?? null,
    medicaoDate: p.medicaoDate ?? null,
    instalacaoStartDate: p.instalacaoStartDate ?? null,
    materialType: p.materialType ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

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

  return res.json(rows.map(projectRow));
});

router.post("/projects", requireGestor, async (req, res) => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      name: body.data.name,
      description: body.data.description ?? null,
      status: (body.data.status as "a_iniciar" | "em_projeto" | "em_aprovacao" | "em_producao" | "aguardando_instalacao" | "em_instalacao") ?? "a_iniciar",
      priority: (body.data.priority as "low" | "medium" | "high") ?? "medium",
      startDate: body.data.startDate ?? null,
      endDate: body.data.endDate ?? null,
      producaoStartDate: (body.data as Record<string, unknown>).producaoStartDate as string ?? null,
      producaoEndDate: (body.data as Record<string, unknown>).producaoEndDate as string ?? null,
      medicaoDate: (body.data as Record<string, unknown>).medicaoDate as string ?? null,
      instalacaoStartDate: (body.data as Record<string, unknown>).instalacaoStartDate as string ?? null,
      materialType: (body.data as Record<string, unknown>).materialType as "madeira" | "aluminio" ?? null,
    })
    .returning();

  return res.status(201).json(projectRow(project));
});

router.get("/projects/:id", async (req, res) => {
  const params = GetProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) return res.status(404).json({ error: "Not found" });

  return res.json(projectRow(project));
});

router.patch("/projects/:id", requireGestor, async (req, res) => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const raw = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.priority !== undefined) updateData.priority = body.data.priority;
  if (body.data.startDate !== undefined) updateData.startDate = body.data.startDate;
  if (body.data.endDate !== undefined) updateData.endDate = body.data.endDate;
  if (raw.producaoStartDate !== undefined) updateData.producaoStartDate = raw.producaoStartDate;
  if (raw.producaoEndDate !== undefined) updateData.producaoEndDate = raw.producaoEndDate;
  if (raw.medicaoDate !== undefined) updateData.medicaoDate = raw.medicaoDate;
  if (raw.instalacaoStartDate !== undefined) updateData.instalacaoStartDate = raw.instalacaoStartDate;
  if (raw.materialType !== undefined) updateData.materialType = raw.materialType as "madeira" | "aluminio";

  const [project] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) return res.status(404).json({ error: "Not found" });

  return res.json(projectRow(project));
});

router.delete("/projects/:id", requireGestor, async (req, res) => {
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
