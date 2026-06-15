import { useMemo } from "react";
import { useListProjects, useListTasks } from "@workspace/api-client-react";
import type { Project, Task } from "@workspace/api-client-react";

export type AlertSeverity = "danger" | "warning" | "info";

export type AlertType =
  | "overdue_installation"
  | "approaching_installation"
  | "overdue_task"
  | "no_installation_date"
  | "stalled_project"
  | "no_assignee";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  href: string;
  projectId?: number;
  taskId?: number;
}

const APPROACHING_DAYS = 7;
const STALLED_DAYS = 30;

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(s: string) {
  return new Date(s.split("T")[0] + "T00:00:00");
}

function daysDiff(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(s: string) {
  return parseDate(s).toLocaleDateString("pt-BR");
}

export function computeAlerts(projects: Project[], tasks: Task[]): Alert[] {
  const t = todayMidnight();
  const alerts: Alert[] = [];

  for (const p of projects) {
    if (p.instalacaoStartDate) {
      const d = parseDate(p.instalacaoStartDate);
      const diff = daysDiff(t, d);
      if (diff < 0 && p.status !== "em_instalacao") {
        alerts.push({
          id: `overdue-inst-${p.id}`,
          type: "overdue_installation",
          severity: "danger",
          title: `Instalação atrasada: ${p.name}`,
          description: `Data estimada ${fmtDate(p.instalacaoStartDate)} já passou.`,
          href: `/projects/${p.id}`,
          projectId: p.id,
        });
      } else if (diff >= 0 && diff <= APPROACHING_DAYS) {
        const label = diff === 0 ? "hoje" : `em ${diff} dia${diff > 1 ? "s" : ""}`;
        alerts.push({
          id: `approaching-inst-${p.id}`,
          type: "approaching_installation",
          severity: "warning",
          title: `Instalação ${label}: ${p.name}`,
          description: `Data estimada ${fmtDate(p.instalacaoStartDate)}.`,
          href: `/projects/${p.id}`,
          projectId: p.id,
        });
      }
    } else if (p.status !== "em_instalacao") {
      alerts.push({
        id: `no-inst-date-${p.id}`,
        type: "no_installation_date",
        severity: "info",
        title: `Sem data de instalação: ${p.name}`,
        description: "Nenhuma data estimada de instalação cadastrada.",
        href: `/projects/${p.id}`,
        projectId: p.id,
      });
    }

    const daysSinceCreated = daysDiff(parseDate(p.createdAt.split("T")[0]), t);
    if (daysSinceCreated >= STALLED_DAYS && p.status === "a_iniciar") {
      alerts.push({
        id: `stalled-${p.id}`,
        type: "stalled_project",
        severity: "warning",
        title: `Projeto parado: ${p.name}`,
        description: `Criado há ${daysSinceCreated} dias e ainda em "A Iniciar".`,
        href: `/projects/${p.id}`,
        projectId: p.id,
      });
    }
  }

  for (const task of tasks) {
    if (task.dueDate && task.status !== "done") {
      const d = parseDate(task.dueDate);
      if (d < t) {
        alerts.push({
          id: `overdue-task-${task.id}`,
          type: "overdue_task",
          severity: "danger",
          title: `Tarefa atrasada: ${task.title}`,
          description: `Prazo ${fmtDate(task.dueDate)} expirou${task.projectName ? ` · ${task.projectName}` : ""}.`,
          href: "/tasks",
          taskId: task.id,
        });
      }
    }

    if (!task.assignedTo && task.status !== "done") {
      alerts.push({
        id: `no-assignee-${task.id}`,
        type: "no_assignee",
        severity: "warning",
        title: `Tarefa sem responsável: ${task.title}`,
        description: `Nenhum membro atribuído${task.projectName ? ` · ${task.projectName}` : ""}.`,
        href: "/tasks",
        taskId: task.id,
      });
    }
  }

  const order: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function useAlerts() {
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();

  return useMemo(
    () => computeAlerts(projects ?? [], tasks ?? []),
    [projects, tasks],
  );
}

export function useAlertCounts() {
  const alerts = useAlerts();
  return {
    danger: alerts.filter((a) => a.severity === "danger").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    total: alerts.filter((a) => a.severity !== "info").length,
  };
}
