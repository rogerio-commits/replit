import { Router } from "express";
import { db, tasksTable, projectsTable, membersTable } from "@workspace/db";
import { ilike, or, sql } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  if (!q || q.length < 1) {
    return res.status(400).json({ error: "Query param 'q' is required" });
  }

  const pattern = `%${q}%`;

  const [projectRows, taskRows, memberRows] = await Promise.all([
    db
      .select({ id: projectsTable.id, name: projectsTable.name, status: projectsTable.status })
      .from(projectsTable)
      .where(or(ilike(projectsTable.name, pattern), ilike(sql`coalesce(${projectsTable.description}, '')`, pattern)))
      .limit(limit),

    db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        projectId: tasksTable.projectId,
        projectName: projectsTable.name,
      })
      .from(tasksTable)
      .leftJoin(projectsTable, sql`${tasksTable.projectId} = ${projectsTable.id}`)
      .where(or(ilike(tasksTable.title, pattern), ilike(sql`coalesce(${tasksTable.description}, '')`, pattern)))
      .limit(limit),

    db
      .select({ id: membersTable.id, name: membersTable.name, role: membersTable.role, email: membersTable.email })
      .from(membersTable)
      .where(or(ilike(membersTable.name, pattern), ilike(membersTable.email, pattern), ilike(membersTable.role, pattern)))
      .limit(limit),
  ]);

  const STATUS_LABELS: Record<string, string> = {
    todo: "A Fazer",
    in_progress: "Em Andamento",
    review: "Em Revisão",
    done: "Concluído",
    a_iniciar: "A Iniciar",
    em_projeto: "Em Projeto",
    em_execucao: "Em Execução",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  const results = [
    ...projectRows.map((p) => ({
      kind: "project" as const,
      id: p.id,
      title: p.name,
      subtitle: null,
      meta: STATUS_LABELS[p.status ?? ""] ?? p.status ?? null,
    })),
    ...taskRows.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: t.projectName ?? null,
      meta: STATUS_LABELS[t.status] ?? t.status,
    })),
    ...memberRows.map((m) => ({
      kind: "member" as const,
      id: m.id,
      title: m.name,
      subtitle: m.email,
      meta: m.role,
    })),
  ];

  return res.json(results.slice(0, limit));
});

export default router;
