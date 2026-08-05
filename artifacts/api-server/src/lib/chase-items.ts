import {
  db,
  projectActionItemsTable,
  projectActionPlansTable,
  projectsTable,
  membersTable,
} from "@workspace/db";
import { isNull, eq } from "drizzle-orm";

/**
 * "Cobrança" = item em aberto que o gestor de obras precisa cobrar de alguém:
 * itens de plano de ação, de todas as obras.
 *
 * Follow-ups de visita NÃO entram mais aqui (decisão de produto): visita não
 * gera pendência item a item — a pendência de uma visita é o RDO não anexado,
 * cobrado nas telas de Obras. O source "visit" permanece no contrato por
 * compatibilidade, mas não é mais emitido.
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

/** Todos os itens em aberto (não concluídos) de planos de ação. */
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

  return fromPlans;
}
