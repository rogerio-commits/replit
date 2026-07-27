import { Router } from "express";
import { db, projectTemplatesTable, projectTemplateTasksTable, projectsTable, tasksTable } from "@workspace/db";
import { requireGestor } from "../middlewares/requireAuth";
import { eq, count, sql } from "drizzle-orm";
import {
  CreateTemplateBody,
  AddTemplateTaskBody,
  ApplyTemplateBody,
  GetTemplateParams,
  DeleteTemplateParams,
  AddTemplateTaskParams,
  DeleteTemplateTaskParams,
  ApplyTemplateParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/templates", requireGestor, async (_req, res) => {
  const templates = await db.select().from(projectTemplatesTable).orderBy(projectTemplatesTable.createdAt);

  const taskCounts = await db
    .select({ templateId: projectTemplateTasksTable.templateId, total: count() })
    .from(projectTemplateTasksTable)
    .groupBy(projectTemplateTasksTable.templateId);

  const countMap = new Map(taskCounts.map((r) => [r.templateId, r.total]));

  return res.json(templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    priority: t.priority,
    taskCount: countMap.get(t.id) ?? 0,
    createdAt: t.createdAt.toISOString(),
  })));
});

router.post("/templates", requireGestor, async (req, res) => {
  const body = CreateTemplateBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  const [template] = await db
    .insert(projectTemplatesTable)
    .values({ name: body.data.name, description: body.data.description, priority: body.data.priority ?? "medium" })
    .returning();

  return res.status(201).json({ ...template, taskCount: 0, createdAt: template.createdAt.toISOString() });
});

router.get("/templates/:id", requireGestor, async (req, res) => {
  const params = GetTemplateParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [template] = await db.select().from(projectTemplatesTable).where(eq(projectTemplatesTable.id, params.data.id));
  if (!template) return res.status(404).json({ error: "Not found" });

  const tasks = await db
    .select()
    .from(projectTemplateTasksTable)
    .where(eq(projectTemplateTasksTable.templateId, params.data.id))
    .orderBy(projectTemplateTasksTable.offsetDays);

  return res.json({
    ...template,
    createdAt: template.createdAt.toISOString(),
    tasks: tasks.map((t) => ({
      id: t.id,
      templateId: t.templateId,
      title: t.title,
      description: t.description ?? null,
      priority: t.priority,
      offsetDays: t.offsetDays,
    })),
  });
});

router.delete("/templates/:id", requireGestor, async (req, res) => {
  const params = DeleteTemplateParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(projectTemplateTasksTable).where(eq(projectTemplateTasksTable.templateId, params.data.id));
  await db.delete(projectTemplatesTable).where(eq(projectTemplatesTable.id, params.data.id));
  return res.status(204).send();
});

router.post("/templates/:id/tasks", requireGestor, async (req, res) => {
  const params = AddTemplateTaskParams.safeParse({ id: Number(req.params.id) });
  const body = AddTemplateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [template] = await db.select({ id: projectTemplatesTable.id }).from(projectTemplatesTable).where(eq(projectTemplatesTable.id, params.data.id));
  if (!template) return res.status(404).json({ error: "Template not found" });

  const [task] = await db
    .insert(projectTemplateTasksTable)
    .values({
      templateId: params.data.id,
      title: body.data.title,
      description: body.data.description,
      priority: body.data.priority ?? "medium",
      offsetDays: body.data.offsetDays ?? 0,
    })
    .returning();

  return res.status(201).json({
    id: task.id,
    templateId: task.templateId,
    title: task.title,
    description: task.description ?? null,
    priority: task.priority,
    offsetDays: task.offsetDays,
  });
});

router.delete("/templates/:id/tasks/:taskId", requireGestor, async (req, res) => {
  const params = DeleteTemplateTaskParams.safeParse({ id: Number(req.params.id), taskId: Number(req.params.taskId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  await db.delete(projectTemplateTasksTable).where(eq(projectTemplateTasksTable.id, params.data.taskId));
  return res.status(204).send();
});

router.post("/templates/:id/apply", requireGestor, async (req, res) => {
  const params = ApplyTemplateParams.safeParse({ id: Number(req.params.id) });
  const body = ApplyTemplateBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [template] = await db.select().from(projectTemplatesTable).where(eq(projectTemplatesTable.id, params.data.id));
  if (!template) return res.status(404).json({ error: "Not found" });

  const templateTasks = await db
    .select()
    .from(projectTemplateTasksTable)
    .where(eq(projectTemplateTasksTable.templateId, params.data.id));

  const [project] = await db
    .insert(projectsTable)
    .values({
      name: body.data.name,
      description: body.data.description,
      status: "a_iniciar",
      priority: template.priority,
      startDate: body.data.startDate,
    })
    .returning();

  if (templateTasks.length > 0) {
    const startDate = new Date(body.data.startDate);
    await db.insert(tasksTable).values(
      templateTasks.map((t) => {
        const due = new Date(startDate);
        due.setDate(due.getDate() + t.offsetDays);
        return {
          projectId: project.id,
          title: t.title,
          description: t.description ?? undefined,
          status: "todo" as const,
          priority: t.priority,
          dueDate: due.toISOString().slice(0, 10),
        };
      })
    );
  }

  return res.status(201).json({
    ...project,
    createdAt: project.createdAt.toISOString(),
  });
});

const DEFAULT_TEMPLATE_NAME = "Modelo padrão Ulimax";
const DEFAULT_TEMPLATE_TASKS: { title: string; description?: string; priority: "low" | "medium" | "high"; offsetDays: number }[] = [
  { title: "Medição na obra", description: "Conferir medidas no local e registrar fotos.", priority: "high", offsetDays: 2 },
  { title: "Projeto executivo e detalhamento", description: "Desenhos finais para produção.", priority: "high", offsetDays: 7 },
  { title: "Aprovação do cliente", description: "Enviar projeto e colher aprovação.", priority: "high", offsetDays: 10 },
  { title: "Pedido de materiais", description: "Comprar chapas, ferragens e insumos.", priority: "medium", offsetDays: 12 },
  { title: "Produção — corte e usinagem", priority: "medium", offsetDays: 20 },
  { title: "Produção — montagem e acabamento", priority: "medium", offsetDays: 30 },
  { title: "Conferência de qualidade", description: "Checar peças antes de sair da fábrica.", priority: "high", offsetDays: 32 },
  { title: "Agendar instalação com o cliente", priority: "medium", offsetDays: 33 },
  { title: "Instalação", priority: "high", offsetDays: 38 },
  { title: "Vistoria final e entrega", description: "Checklist de entrega assinado pelo cliente.", priority: "high", offsetDays: 40 },
];

router.post("/templates/install-default", requireGestor, async (_req, res) => {
  const result = await db.transaction(async (tx) => {
    // Trava transacional: evita template duplicado em requisições simultâneas
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('ulimax-install-default-template'))`);

    const [existing] = await tx
      .select()
      .from(projectTemplatesTable)
      .where(eq(projectTemplatesTable.name, DEFAULT_TEMPLATE_NAME));

    if (existing) {
      return { installed: false, templateId: existing.id };
    }

    const [template] = await tx
      .insert(projectTemplatesTable)
      .values({
        name: DEFAULT_TEMPLATE_NAME,
        description: "Fluxo típico Ulimax: medição → projeto → aprovação → produção → instalação → entrega.",
        priority: "medium",
      })
      .returning();

    await tx.insert(projectTemplateTasksTable).values(
      DEFAULT_TEMPLATE_TASKS.map((t) => ({
        templateId: template.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        offsetDays: t.offsetDays,
      }))
    );

    return { installed: true, templateId: template.id };
  });

  return res.json(result);
});

export default router;
