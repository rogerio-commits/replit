import { db, tasksTable, projectsTable, metricsSnapshotsTable } from "@workspace/db";
import type { Logger } from "pino";
import { spToday } from "./daily-reminders";

/** Mesma definição de "ativo" usada no /dashboard/summary. */
const ACTIVE_PROJECT_STATUSES = [
  "em_projeto",
  "em_aprovacao",
  "em_producao",
  "aguardando_instalacao",
  "em_instalacao",
];

// São Paulo é UTC-3 o ano inteiro (sem horário de verão desde 2019).
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Data (YYYY-MM-DD) de um timestamp no fuso de São Paulo. */
function spDay(d: Date): string {
  return new Date(d.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Grava (ou atualiza) a foto de métricas do dia de hoje. Idempotente pela data:
 * chamadas repetidas no mesmo dia apenas sobrescrevem a linha, então é seguro
 * disparar a cada tick do scheduler ou a cada invocação do cron.
 */
export async function recordDailyMetricsSnapshot(log: Logger): Promise<void> {
  const today = spToday();

  const [projects, tasks] = await Promise.all([
    db.select({ status: projectsTable.status }).from(projectsTable),
    db
      .select({
        status: tasksTable.status,
        dueDate: tasksTable.dueDate,
        completedAt: tasksTable.completedAt,
      })
      .from(tasksTable),
  ]);

  const activeProjects = projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.includes(p.status),
  ).length;
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== "done",
  ).length;
  const tasksCompleted = tasks.filter(
    (t) => t.completedAt && spDay(t.completedAt) === today,
  ).length;

  const row = {
    date: today,
    totalProjects: projects.length,
    activeProjects,
    totalTasks: tasks.length,
    openTasks,
    overdueTasks,
    tasksCompleted,
  };

  await db
    .insert(metricsSnapshotsTable)
    .values(row)
    .onConflictDoUpdate({
      target: metricsSnapshotsTable.date,
      set: {
        totalProjects: row.totalProjects,
        activeProjects: row.activeProjects,
        totalTasks: row.totalTasks,
        openTasks: row.openTasks,
        overdueTasks: row.overdueTasks,
        tasksCompleted: row.tasksCompleted,
      },
    });

  log.info(
    { date: today, overdueTasks, tasksCompleted, openTasks },
    "Snapshot diário de métricas gravado",
  );
}
