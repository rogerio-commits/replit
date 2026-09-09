import { db, tasksTable, projectsTable, membersTable } from "@workspace/db";
import { eq, ne, isNotNull, and } from "drizzle-orm";

/**
 * "Cobrança" = tarefa em aberto com prazo, de qualquer obra. O conceito de
 * "item de plano de ação" foi fundido em tarefa (2026-09): uma coisa só para
 * registrar, cobrar e concluir. O responsável pode ser interno (membro) ou
 * externo (fornecedor, via `responsibleExternal`).
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
  context: string | null;
  responsibleId: number | null;
  responsibleName: string | null;
  responsibleEmail: string | null;
  responsibleExternal: string | null;
  dueDate: string | null;
  createdAt: string;
}

/** Tarefas em aberto com prazo — a fila de cobrança do gestor. */
export async function fetchOpenChaseItems(): Promise<ChaseItemRow[]> {
  const rows = await db
    .select({
      task: tasksTable,
      projectName: projectsTable.name,
      memberName: membersTable.name,
      memberEmail: membersTable.email,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .where(and(ne(tasksTable.status, "done"), isNotNull(tasksTable.dueDate)));

  return rows.map((r) => ({
    id: r.task.id,
    source: "action_plan" as const,
    description: r.task.title,
    projectId: r.task.projectId,
    projectName: r.projectName ?? null,
    context: null,
    responsibleId: r.task.assignedTo ?? null,
    responsibleName: r.memberName ?? null,
    responsibleEmail: r.memberEmail ?? null,
    responsibleExternal: r.task.responsibleExternal ?? null,
    dueDate: r.task.dueDate ?? null,
    createdAt: r.task.createdAt.toISOString(),
  }));
}
