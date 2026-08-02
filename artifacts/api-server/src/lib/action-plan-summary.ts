import {
  db,
  projectActionItemsTable,
  projectActionPlansTable,
  projectsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

// São Paulo é UTC-3 o ano inteiro.
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
function spToday(): string {
  return new Date(Date.now() - SP_OFFSET_MS).toISOString().slice(0, 10);
}

export interface PlanBreakdown {
  id: number;
  title: string;
  total: number;
  done: number;
  open: number;
}

export interface ProjectActionPlanSummary {
  projectId: number;
  projectName: string | null;
  totalItems: number;
  doneItems: number;
  openItems: number;
  overdueItems: number;
  nextDueDate: string | null; // vencimento mais próximo entre os itens em aberto
  plans: PlanBreakdown[];
}

/**
 * Planos de ação consolidados por projeto — o gestor cobra o plano por obra, não
 * item a item. Junta todos os itens de todos os planos de cada projeto e resume
 * progresso (concluídos/total), abertos, vencidos e o próximo vencimento.
 */
export async function fetchActionPlanSummaryByProject(): Promise<
  ProjectActionPlanSummary[]
> {
  const rows = await db
    .select({
      projectId: projectActionPlansTable.projectId,
      projectName: projectsTable.name,
      planId: projectActionPlansTable.id,
      planTitle: projectActionPlansTable.title,
      itemId: projectActionItemsTable.id,
      dueDate: projectActionItemsTable.dueDate,
      completedAt: projectActionItemsTable.completedAt,
    })
    .from(projectActionPlansTable)
    .leftJoin(
      projectActionItemsTable,
      eq(projectActionItemsTable.planId, projectActionPlansTable.id),
    )
    .leftJoin(projectsTable, eq(projectActionPlansTable.projectId, projectsTable.id));

  const today = spToday();
  const byProject = new Map<number, ProjectActionPlanSummary>();
  const planByKey = new Map<string, PlanBreakdown>();

  for (const r of rows) {
    let proj = byProject.get(r.projectId);
    if (!proj) {
      proj = {
        projectId: r.projectId,
        projectName: r.projectName ?? null,
        totalItems: 0,
        doneItems: 0,
        openItems: 0,
        overdueItems: 0,
        nextDueDate: null,
        plans: [],
      };
      byProject.set(r.projectId, proj);
    }

    const pkey = `${r.projectId}-${r.planId}`;
    let plan = planByKey.get(pkey);
    if (!plan) {
      plan = { id: r.planId, title: r.planTitle, total: 0, done: 0, open: 0 };
      planByKey.set(pkey, plan);
      proj.plans.push(plan);
    }

    if (r.itemId == null) continue; // plano sem itens (veio do leftJoin)

    plan.total++;
    proj.totalItems++;
    if (r.completedAt != null) {
      plan.done++;
      proj.doneItems++;
    } else {
      plan.open++;
      proj.openItems++;
      if (r.dueDate) {
        if (r.dueDate < today) proj.overdueItems++;
        if (!proj.nextDueDate || r.dueDate < proj.nextDueDate) proj.nextDueDate = r.dueDate;
      }
    }
  }

  return [...byProject.values()]
    .filter((p) => p.totalItems > 0)
    .sort(
      (a, b) =>
        b.overdueItems - a.overdueItems ||
        (a.nextDueDate ?? "9999").localeCompare(b.nextDueDate ?? "9999"),
    );
}
