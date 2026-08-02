import { pgTable, date, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Foto diária das métricas-chave, gravada 1x/dia pelo agendador. Alimenta a
 * visão de tendência do dashboard ("vencidas: 23, era 15 na semana passada") e
 * o gráfico de vazão — que exigem histórico, algo que o estado atual não guarda.
 *
 * A chave é a data (fuso de São Paulo) e a gravação é um upsert idempotente:
 * rodar várias vezes no mesmo dia apenas atualiza a linha do dia.
 */
export const metricsSnapshotsTable = pgTable("metrics_snapshots", {
  date: date("date").primaryKey(),
  totalProjects: integer("total_projects").notNull(),
  activeProjects: integer("active_projects").notNull(),
  totalTasks: integer("total_tasks").notNull(),
  openTasks: integer("open_tasks").notNull(),
  overdueTasks: integer("overdue_tasks").notNull(),
  tasksCompleted: integer("tasks_completed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MetricsSnapshot = typeof metricsSnapshotsTable.$inferSelect;
