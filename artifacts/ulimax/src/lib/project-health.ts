// Farol de projetos: verde/amarelo/vermelho calculado a partir das tarefas e
// datas do projeto. Regras simples e explicáveis — cada cor vem com o motivo
// em linguagem corrente, para o gestor bater o olho e saber onde agir.

export type FarolLevel = "red" | "yellow" | "green";

export interface HealthTask {
  projectId: number;
  status: string;
  dueDate?: string | null;
  createdAt: string;
}

export interface HealthProject {
  id: number;
  status: string;
  endDate?: string | null;
  taskTotal?: number;
  taskDone?: number;
}

export interface ProjectHealth {
  level: FarolLevel;
  reasons: string[];
  overdue: number;
  dueSoon: number;
  stale: number;
}

export const FAROL_META: Record<FarolLevel, { label: string; dot: string; chip: string; emoji: string }> = {
  red:    { label: "Crítico", dot: "bg-red-500",     chip: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",             emoji: "🔴" },
  yellow: { label: "Atenção", dot: "bg-amber-400",   chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40", emoji: "🟡" },
  green:  { label: "Em dia",  dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40", emoji: "🟢" },
};

/** Interpreta uma string de data (YYYY-MM-DD ou ISO) como data local à meia-noite */
export function parseLocalDate(s: string): Date {
  return new Date(s.split("T")[0] + "T00:00:00");
}

/** Dias entre a data e hoje (positivo = futuro), ambos à meia-noite local */
export function daysFromToday(s: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalDate(s).getTime() - today.getTime()) / 86_400_000);
}

const STALE_DAYS = 7;
const DUE_SOON_DAYS = 3;

export function computeProjectHealth(project: HealthProject, projectTasks: HealthTask[]): ProjectHealth {
  if (project.status === "concluido") {
    return { level: "green", reasons: ["projeto concluído"], overdue: 0, dueSoon: 0, stale: 0 };
  }

  const open = projectTasks.filter((t) => t.status !== "done");
  let overdue = 0;
  let dueSoon = 0;
  let stale = 0;
  for (const t of open) {
    if (t.dueDate) {
      const d = daysFromToday(t.dueDate);
      if (d < 0) overdue++;
      else if (d <= DUE_SOON_DAYS) dueSoon++;
    }
    if (t.status === "todo" && -daysFromToday(t.createdAt) >= STALE_DAYS) stale++;
  }

  const reasons: string[] = [];
  let level: FarolLevel = "green";

  const endDays = project.endDate ? daysFromToday(project.endDate) : null;
  const total = project.taskTotal ?? projectTasks.length;
  const done = project.taskDone ?? projectTasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : null;

  if (overdue > 0) {
    level = "red";
    reasons.push(`${overdue} tarefa${overdue > 1 ? "s" : ""} atrasada${overdue > 1 ? "s" : ""}`);
  }
  if (endDays !== null && endDays < 0) {
    level = "red";
    reasons.push(`prazo do projeto vencido há ${Math.abs(endDays)}d`);
  }
  if (level !== "red") {
    if (dueSoon > 0) {
      level = "yellow";
      reasons.push(`${dueSoon} tarefa${dueSoon > 1 ? "s" : ""} vence${dueSoon > 1 ? "m" : ""} em até 3 dias`);
    }
    if (stale > 0) {
      level = "yellow";
      reasons.push(`${stale} tarefa${stale > 1 ? "s" : ""} parada${stale > 1 ? "s" : ""} há ${STALE_DAYS}+ dias`);
    }
    if (endDays !== null && endDays >= 0 && endDays <= 7 && pct !== null && pct < 70) {
      level = "yellow";
      reasons.push(`fim do projeto em ${endDays}d com ${pct}% concluído`);
    }
  }
  if (level === "green") reasons.push("sem pendências críticas");

  return { level, reasons, overdue, dueSoon, stale };
}

/** Calcula o farol de todos os projetos de uma vez (tarefas agrupadas por projeto). */
export function computeHealthMap(projects: HealthProject[], tasks: HealthTask[]): Map<number, ProjectHealth> {
  const byProject = new Map<number, HealthTask[]>();
  for (const t of tasks) {
    const arr = byProject.get(t.projectId);
    if (arr) arr.push(t);
    else byProject.set(t.projectId, [t]);
  }
  const map = new Map<number, ProjectHealth>();
  for (const p of projects) map.set(p.id, computeProjectHealth(p, byProject.get(p.id) ?? []));
  return map;
}
