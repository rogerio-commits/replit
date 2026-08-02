import {
  db,
  projectActionItemsTable,
  projectActionPlansTable,
  siteVisitsTable,
  visitActionItemsTable,
  projectsTable,
  membersTable,
} from "@workspace/db";
import { isNull, eq } from "drizzle-orm";

/**
 * "Cobrança" = item em aberto que o gestor de obras precisa cobrar de alguém:
 * itens de plano de ação e follow-ups de visita, de todas as obras. Diferente
 * das tarefas, esses viviam só por-projeto e não entravam em nenhum lembrete.
 *
 * O `responsibleEmail` só existe para a cobrança por e-mail — o endpoint HTTP
 * remove esse campo antes de responder ao cliente.
 */
export interface ChaseItemRow {
  id: number;
  source: "action_plan" | "visit";
  description: string;
  projectId: number;
  projectName: string | null;
  context: string | null; // título do plano ou data da visita
  responsibleId: number | null;
  responsibleName: string | null;
  responsibleEmail: string | null;
  responsibleExternal: string | null;
  dueDate: string | null;
  createdAt: string;
}

/** Todos os itens em aberto (não concluídos) de planos de ação e visitas. */
export async function fetchOpenChaseItems(): Promise<ChaseItemRow[]> {
  const planItems = await db
    .select({
      item: projectActionItemsTable,
      planTitle: projectActionPlansTable.title,
      projectId: projectActionPlansTable.projectId,
      projectName: projectsTable.name,
      memberName: membersTable.name,
      memberEmail: membersTable.email,
    })
    .from(projectActionItemsTable)
    .innerJoin(
      projectActionPlansTable,
      eq(projectActionItemsTable.planId, projectActionPlansTable.id),
    )
    .leftJoin(projectsTable, eq(projectActionPlansTable.projectId, projectsTable.id))
    .leftJoin(membersTable, eq(projectActionItemsTable.responsibleId, membersTable.id))
    .where(isNull(projectActionItemsTable.completedAt));

  const visitItems = await db
    .select({
      item: visitActionItemsTable,
      visitDate: siteVisitsTable.date,
      projectId: siteVisitsTable.projectId,
      projectName: projectsTable.name,
      memberName: membersTable.name,
      memberEmail: membersTable.email,
    })
    .from(visitActionItemsTable)
    .innerJoin(siteVisitsTable, eq(visitActionItemsTable.visitId, siteVisitsTable.id))
    .leftJoin(projectsTable, eq(siteVisitsTable.projectId, projectsTable.id))
    .leftJoin(membersTable, eq(visitActionItemsTable.responsibleId, membersTable.id))
    .where(isNull(visitActionItemsTable.completedAt));

  const fromPlans: ChaseItemRow[] = planItems.map((r) => ({
    id: r.item.id,
    source: "action_plan",
    description: r.item.description,
    projectId: r.projectId,
    projectName: r.projectName ?? null,
    context: r.planTitle ?? null,
    responsibleId: r.item.responsibleId ?? null,
    responsibleName: r.memberName ?? null,
    responsibleEmail: r.memberEmail ?? null,
    responsibleExternal: r.item.responsibleExternal ?? null,
    dueDate: r.item.dueDate ?? null,
    createdAt: r.item.createdAt.toISOString(),
  }));

  const fromVisits: ChaseItemRow[] = visitItems.map((r) => ({
    id: r.item.id,
    source: "visit",
    description: r.item.description,
    projectId: r.projectId,
    projectName: r.projectName ?? null,
    context: r.visitDate ? `Visita ${r.visitDate}` : null,
    responsibleId: r.item.responsibleId ?? null,
    responsibleName: r.memberName ?? null,
    responsibleEmail: r.memberEmail ?? null,
    responsibleExternal: null,
    dueDate: r.item.dueDate ?? null,
    createdAt: r.item.createdAt.toISOString(),
  }));

  return [...fromPlans, ...fromVisits];
}
