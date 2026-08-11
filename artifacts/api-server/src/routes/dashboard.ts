import { Router } from "express";
import { db, projectsTable, tasksTable, membersTable, auditLogsTable, metricsSnapshotsTable, siteVisitsTable } from "@workspace/db";
import { eq, gte, asc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const projects = await db.select().from(projectsTable);
  const tasks = await db.select().from(tasksTable);
  const members = await db.select().from(membersTable);

  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
  ).length;

  return res.json({
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => ["em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"].includes(p.status)).length,
    completedProjects: projects.filter((p) => p.status === "em_instalacao").length,
    totalTasks: tasks.length,
    doneTasks: tasks.filter((t) => t.status === "done").length,
    overdueTasks,
    totalMembers: members.length,
    projectsByStatus: {
      a_iniciar: projects.filter((p) => p.status === "a_iniciar").length,
      em_projeto: projects.filter((p) => p.status === "em_projeto").length,
      em_aprovacao: projects.filter((p) => p.status === "em_aprovacao").length,
      em_producao: projects.filter((p) => p.status === "em_producao").length,
      aguardando_instalacao: projects.filter((p) => p.status === "aguardando_instalacao").length,
      em_instalacao: projects.filter((p) => p.status === "em_instalacao").length,
    },
    tasksByStatus: {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    },
    tasksByPriority: {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
    },
  });
});

router.get("/dashboard/recent-activity", async (_req, res) => {
  // Pulso do que aconteceu — cada evento carrega a data em que DE FATO ocorreu
  // (conclusão, início, aprovação), não a data de criação do registro.
  const { eq, desc, isNotNull, and, ne } = await import("drizzle-orm");
  const LIMITE = 12;

  type Evento = {
    id: number;
    kind: string;
    title: string;
    projectName: string | null;
    actorName: string | null;
    at: string;
  };

  const [feitas, iniciadas, criadas, projetos, decisoes, visitas] = await Promise.all([
    db.select({ task: tasksTable, projectName: projectsTable.name })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(isNotNull(tasksTable.completedAt))
      .orderBy(desc(tasksTable.completedAt))
      .limit(LIMITE),
    db.select({ task: tasksTable, projectName: projectsTable.name })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(and(isNotNull(tasksTable.startedAt), ne(tasksTable.status, "done")))
      .orderBy(desc(tasksTable.startedAt))
      .limit(LIMITE),
    db.select({ task: tasksTable, projectName: projectsTable.name })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .orderBy(desc(tasksTable.createdAt))
      .limit(LIMITE),
    db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt)).limit(LIMITE),
    db.select().from(projectsTable)
      .where(isNotNull(projectsTable.approvalAt))
      .orderBy(desc(projectsTable.approvalAt))
      .limit(LIMITE),
    db.select({ visit: siteVisitsTable, projectName: projectsTable.name, memberName: membersTable.name })
      .from(siteVisitsTable)
      .leftJoin(projectsTable, eq(siteVisitsTable.projectId, projectsTable.id))
      .leftJoin(membersTable, eq(siteVisitsTable.responsibleId, membersTable.id))
      .orderBy(desc(siteVisitsTable.createdAt))
      .limit(LIMITE),
  ]);

  const eventos: Evento[] = [
    ...feitas.map((r) => ({
      id: r.task.id, kind: "task_done", title: r.task.title,
      projectName: r.projectName ?? null, actorName: null,
      at: r.task.completedAt!.toISOString(),
    })),
    ...iniciadas.map((r) => ({
      id: r.task.id, kind: "task_started", title: r.task.title,
      projectName: r.projectName ?? null, actorName: null,
      at: r.task.startedAt!.toISOString(),
    })),
    ...criadas.map((r) => ({
      id: r.task.id, kind: "task_created", title: r.task.title,
      projectName: r.projectName ?? null, actorName: null,
      at: r.task.createdAt.toISOString(),
    })),
    ...projetos.map((p) => ({
      id: p.id, kind: "project_created", title: p.name,
      projectName: null, actorName: null,
      at: p.createdAt.toISOString(),
    })),
    ...decisoes.map((p) => ({
      id: p.id,
      kind: p.approvalStatus === "rejected" ? "project_rejected" : "project_approved",
      title: p.name, projectName: null, actorName: null,
      at: p.approvalAt!.toISOString(),
    })),
    ...visitas.map((r) => ({
      id: r.visit.id, kind: "visit_registered",
      title: r.visit.objective || "Visita na obra",
      projectName: r.projectName ?? null,
      actorName: r.memberName ?? null,
      at: r.visit.createdAt.toISOString(),
    })),
  ];

  // Uma tarefa concluída não precisa reaparecer como "criada" no mesmo feed.
  const jaVisto = new Set<string>();
  const feed = eventos
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .filter((e) => {
      const chave = `${e.kind.startsWith("task") ? "task" : e.kind.split("_")[0]}-${e.id}`;
      if (jaVisto.has(chave)) return false;
      jaVisto.add(chave);
      return true;
    })
    .slice(0, 10);

  return res.json(feed);
});

router.get("/dashboard/yesterday", async (_req, res) => {
  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  const yesterdayStr = dayFmt.format(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  // Janela de 48h cobre todo o dia de ontem no fuso de São Paulo
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const logs = await db.select().from(auditLogsTable).where(gte(auditLogsTable.createdAt, since));
  const yesterdayLogs = logs.filter((l) => dayFmt.format(l.createdAt) === yesterdayStr);

  type Change = { field?: string; to?: unknown };
  const completed = yesterdayLogs.filter(
    (l) =>
      l.entityType === "task" &&
      (l.action === "status_changed" || l.action === "updated") &&
      Array.isArray(l.changes) &&
      (l.changes as Change[]).some((c) => c.field === "status" && c.to === "done")
  );
  const tasksCreated = yesterdayLogs.filter((l) => l.entityType === "task" && l.action === "created").length;
  const projectsChanged = new Set(
    yesterdayLogs.filter((l) => l.entityType === "project").map((l) => l.entityId)
  ).size;

  const byPerson = new Map<string, number>();
  for (const l of completed) {
    const name = l.actorName || "—";
    byPerson.set(name, (byPerson.get(name) ?? 0) + 1);
  }

  return res.json({
    date: yesterdayStr,
    tasksCompleted: completed.length,
    tasksCreated,
    projectsChanged,
    completedByPerson: Array.from(byPerson.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  });
});

router.get("/dashboard/member-productivity", async (_req, res) => {
  const members = await db.select().from(membersTable);
  const tasks = await db.select().from(tasksTable);
  const now = new Date();

  const stats = members.map((m) => {
    const memberTasks = tasks.filter((t) => t.assignedTo === m.id);
    const doneTasks = memberTasks.filter((t) => t.status === "done").length;
    const openTasks = memberTasks.filter((t) => t.status !== "done").length;
    const overdueTasks = memberTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
    ).length;
    return {
      memberId: m.id,
      memberName: m.name,
      email: m.email,
      role: m.role,
      totalTasks: memberTasks.length,
      doneTasks,
      openTasks,
      overdueTasks,
    };
  });

  return res.json(stats);
});

const ACTIVE_PROJECT_STATUSES = [
  "em_projeto",
  "em_aprovacao",
  "em_producao",
  "aguardando_instalacao",
  "em_instalacao",
];
const TREND_WINDOW_DAYS = 30;

/**
 * Série histórica de métricas (últimos 30 dias) + valores atuais ao vivo.
 *
 * O histórico vem dos snapshots diários; o `current` é computado na hora para
 * o dashboard mostrar o valor de agora e comparar com a foto de ~7 dias atrás
 * ("vencidas: 23, era 15"). O gráfico de vazão usa `tasksCompleted` da série.
 */
router.get("/dashboard/trends", async (_req, res) => {
  const since = new Date(Date.now() - TREND_WINDOW_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);

  const [snapshots, projects, tasks] = await Promise.all([
    db
      .select()
      .from(metricsSnapshotsTable)
      .where(gte(metricsSnapshotsTable.date, since))
      .orderBy(asc(metricsSnapshotsTable.date)),
    db.select({ status: projectsTable.status }).from(projectsTable),
    db
      .select({ status: tasksTable.status, dueDate: tasksTable.dueDate })
      .from(tasksTable),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const current = {
    openTasks: tasks.filter((t) => t.status !== "done").length,
    overdueTasks: tasks.filter(
      (t) => t.dueDate && t.dueDate < today && t.status !== "done",
    ).length,
    activeProjects: projects.filter((p) =>
      ACTIVE_PROJECT_STATUSES.includes(p.status),
    ).length,
  };

  const points = snapshots.map((s) => ({
    date: s.date,
    openTasks: s.openTasks,
    overdueTasks: s.overdueTasks,
    tasksCompleted: s.tasksCompleted,
    activeProjects: s.activeProjects,
  }));

  return res.json({ points, current });
});

export default router;
