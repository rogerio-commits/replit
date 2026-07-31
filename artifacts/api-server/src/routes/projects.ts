import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, membersTable, projectMembersTable, checklistItemsTable, siteVisitsTable, visitActionItemsTable, projectObservationsTable, tasksTable, projectPhaseHistoryTable, notificationsTable, usersTable } from "@workspace/db";
import { requireGestor, requireExecutorOrGestor } from "../middlewares/requireAuth";
import { logAudit, diffObjects } from "../lib/audit";
import { runAutomations } from "../lib/automation-engine";
import { and, eq, inArray, count } from "drizzle-orm";
import {
  ListProjectsQueryParams,
  CreateProjectBody,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  GetProjectParams,
  GetProjectStatsParams,
  ListProjectMembersParams,
  AddProjectMemberParams,
  AddProjectMemberBody,
  RemoveProjectMemberParams,
  ListChecklistItemsParams,
  CreateChecklistItemParams,
  CreateChecklistItemBody,
  UpdateChecklistItemParams,
  UpdateChecklistItemBody,
  DeleteChecklistItemParams,
  ListSiteVisitsParams,
  CreateSiteVisitParams,
  CreateSiteVisitBody,
  DeleteSiteVisitParams,
  AttachVisitReportParams,
  AttachVisitReportBody,
  ListVisitActionItemsParams,
  CreateVisitActionItemParams,
  CreateVisitActionItemBody,
  ToggleVisitActionItemParams,
  DeleteVisitActionItemParams,
  ListProjectObservationsParams,
  CreateProjectObservationParams,
  CreateProjectObservationBody,
  ListProjectPhaseHistoryParams,
  ApproveProjectParams,
  ApproveProjectBody,
  ArchiveProjectParams,
  UnarchiveProjectParams,
} from "@workspace/api-zod";

const router = Router();

function projectRow(
  p: typeof projectsTable.$inferSelect,
  participants: { memberId: number; memberName: string; memberAvatarUrl: string | null }[] = [],
  taskTotal = 0,
  taskDone = 0,
) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    status: p.status,
    priority: p.priority,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    finalDate: p.finalDate ?? null,
    producaoStartDate: p.producaoStartDate ?? null,
    producaoEndDate: p.producaoEndDate ?? null,
    producaoFinalDate: p.producaoFinalDate ?? null,
    medicaoDate: p.medicaoDate ?? null,
    instalacaoStartDate: p.instalacaoStartDate ?? null,
    materialType: p.materialType ?? null,
    approvalStatus: p.approvalStatus ?? null,
    approvalNote: p.approvalNote ?? null,
    approvalAt: p.approvalAt ? p.approvalAt.toISOString() : null,
    approvalBy: p.approvalBy ?? null,
    createdAt: p.createdAt.toISOString(),
    archived: p.archived,
    participants,
    taskTotal,
    taskDone,
  };
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

async function notifyProjectMembers(
  projectId: number,
  projectName: string,
  newStatus: string,
  actorEmail: string,
  log: { warn: (obj: object, msg: string) => void }
) {
  try {
    const rows = await db
      .select({ email: membersTable.email })
      .from(projectMembersTable)
      .innerJoin(membersTable, eq(projectMembersTable.memberId, membersTable.id))
      .where(eq(projectMembersTable.projectId, projectId));

    const statusLabel = PROJECT_STATUS_LABELS[newStatus] ?? newStatus;
    for (const row of rows) {
      if (row.email === actorEmail) continue;
      const [user] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, row.email))
        .limit(1);
      if (!user) continue;
      await db.insert(notificationsTable).values({
        userId: user.id,
        type: "project_status_changed",
        title: `Projeto "${projectName}" atualizado`,
        body: `Status alterado para: ${statusLabel}`,
        entityType: "project",
        entityId: projectId,
        read: false,
      });
    }

    if (newStatus === "em_aprovacao") {
      const gestors = await db
        .select({ id: usersTable.id, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.role, "gestor"));
      for (const g of gestors) {
        if (g.email === actorEmail) continue;
        await db.insert(notificationsTable).values({
          userId: g.id,
          type: "project_status_changed",
          title: `Aprovação necessária: "${projectName}"`,
          body: `O projeto entrou em aprovação e aguarda sua revisão.`,
          entityType: "project",
          entityId: projectId,
          read: false,
        });
      }
    }
  } catch (e) {
    log.warn({ err: e }, "Failed to send project status notifications");
  }
}

async function fetchTaskCountsByProject(projectIds: number[]) {
  if (projectIds.length === 0) return { total: new Map<number, number>(), done: new Map<number, number>() };
  const totalRows = await db
    .select({ projectId: tasksTable.projectId, cnt: count() })
    .from(tasksTable)
    .where(inArray(tasksTable.projectId, projectIds))
    .groupBy(tasksTable.projectId);
  const doneRows = await db
    .select({ projectId: tasksTable.projectId, cnt: count() })
    .from(tasksTable)
    .where(and(inArray(tasksTable.projectId, projectIds), eq(tasksTable.status, "done")))
    .groupBy(tasksTable.projectId);
  const total = new Map<number, number>(totalRows.map(r => [r.projectId, r.cnt]));
  const done = new Map<number, number>(doneRows.map(r => [r.projectId, r.cnt]));
  return { total, done };
}

async function fetchParticipantsByProject(projectIds: number[]) {
  if (projectIds.length === 0) return new Map<number, { memberId: number; memberName: string; memberAvatarUrl: string | null }[]>();
  const rows = await db
    .select({
      projectId: projectMembersTable.projectId,
      memberId: membersTable.id,
      memberName: membersTable.name,
      memberAvatarUrl: membersTable.avatarUrl,
    })
    .from(projectMembersTable)
    .innerJoin(membersTable, eq(projectMembersTable.memberId, membersTable.id))
    .where(
      projectIds.length === 1
        ? eq(projectMembersTable.projectId, projectIds[0])
        : inArray(projectMembersTable.projectId, projectIds)
    );
  const map = new Map<number, { memberId: number; memberName: string; memberAvatarUrl: string | null }[]>();
  for (const r of rows) {
    if (!map.has(r.projectId)) map.set(r.projectId, []);
    map.get(r.projectId)!.push({ memberId: r.memberId, memberName: r.memberName, memberAvatarUrl: r.memberAvatarUrl ?? null });
  }
  return map;
}

async function isExecutorParticipant(email: string, projectId: number): Promise<boolean> {
  const [member] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.email, email))
    .limit(1);
  if (!member) return false;

  const [pm] = await db
    .select({ id: projectMembersTable.id })
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.memberId, member.id)
      )
    )
    .limit(1);

  return !!pm;
}

router.get("/projects", async (req, res) => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  const showArchived = query.data.archived === true;
  let rows = await db.select().from(projectsTable)
    .where(eq(projectsTable.archived, showArchived))
    .orderBy(projectsTable.createdAt);

  if (query.data.status) {
    rows = rows.filter((p) => p.status === query.data.status);
  }
  if (query.data.priority) {
    rows = rows.filter((p) => p.priority === query.data.priority);
  }

  const ids = rows.map((p) => p.id);
  const participantsMap = await fetchParticipantsByProject(ids);
  const taskCounts = await fetchTaskCountsByProject(ids);
  return res.json(rows.map((p) => projectRow(
    p,
    participantsMap.get(p.id) ?? [],
    taskCounts.total.get(p.id) ?? 0,
    taskCounts.done.get(p.id) ?? 0,
  )));
});

// ── Importação em lote via CSV ─────────────────────────────────────────────
const VALID_IMPORT_STATUSES = ["a_iniciar", "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"] as const;
type ImportStatus = typeof VALID_IMPORT_STATUSES[number];
const VALID_IMPORT_PRIORITIES = ["low", "medium", "high"] as const;
type ImportPriority = typeof VALID_IMPORT_PRIORITIES[number];
const VALID_IMPORT_MATERIALS = ["madeira", "aluminio"] as const;
type ImportMaterial = typeof VALID_IMPORT_MATERIALS[number];

function isImportStatus(v: unknown): v is ImportStatus { return VALID_IMPORT_STATUSES.includes(v as ImportStatus); }
function isImportPriority(v: unknown): v is ImportPriority { return VALID_IMPORT_PRIORITIES.includes(v as ImportPriority); }
function isImportMaterial(v: unknown): v is ImportMaterial { return VALID_IMPORT_MATERIALS.includes(v as ImportMaterial); }

router.post("/projects/import", requireExecutorOrGestor, async (req, res) => {
  const rows = (req.body as { projects?: unknown })?.projects;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "projects array is required" });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: "Máximo de 500 projetos por importação" });
  }

  const importedIds: number[] = [];
  const errors: { row: number; name: string; message: string }[] = [];

  const actorMember = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorName = actorMember[0]?.name ?? req.appUser!.email.split("@")[0];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) {
      errors.push({ row: i + 1, name: String(row.name ?? ""), message: "Nome é obrigatório" });
      continue;
    }
    const status: ImportStatus = isImportStatus(row.status) ? row.status : "a_iniciar";
    const priority: ImportPriority = isImportPriority(row.priority) ? row.priority : "medium";
    const materialType: ImportMaterial | null = isImportMaterial(row.materialType) ? row.materialType : null;

    try {
      const [project] = await db.insert(projectsTable).values({
        name,
        description: typeof row.description === "string" && row.description.trim() ? row.description.trim() : null,
        status,
        priority,
        startDate:  typeof row.startDate === "string"  && row.startDate  ? row.startDate  : null,
        endDate:    typeof row.endDate === "string"     && row.endDate    ? row.endDate    : null,
        finalDate:  typeof row.finalDate === "string"   && row.finalDate  ? row.finalDate  : null,
        materialType,
      }).returning();
      logAudit({ entityType: "project", entityId: project.id, entityName: project.name, action: "created", actorName, actorEmail: req.appUser!.email }, req.log);
      importedIds.push(project.id);
    } catch {
      errors.push({ row: i + 1, name, message: "Erro interno ao inserir" });
    }
  }

  return res.json({ imported: importedIds.length, errors });
});

router.post("/projects", requireExecutorOrGestor, async (req, res) => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const raw = req.body as Record<string, unknown>;
  const [project] = await db
    .insert(projectsTable)
    .values({
      name: body.data.name,
      description: body.data.description ?? null,
      status: (body.data.status as "a_iniciar" | "em_projeto" | "em_aprovacao" | "em_producao" | "aguardando_instalacao" | "em_instalacao") ?? "a_iniciar",
      priority: (body.data.priority as "low" | "medium" | "high") ?? "medium",
      startDate: body.data.startDate ?? null,
      endDate: body.data.endDate ?? null,
      finalDate: raw.finalDate as string ?? null,
      producaoStartDate: raw.producaoStartDate as string ?? null,
      producaoEndDate: raw.producaoEndDate as string ?? null,
      producaoFinalDate: raw.producaoFinalDate as string ?? null,
      medicaoDate: raw.medicaoDate as string ?? null,
      instalacaoStartDate: raw.instalacaoStartDate as string ?? null,
      materialType: raw.materialType as "madeira" | "aluminio" ?? null,
    })
    .returning();

  const actorMemberPost = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorNamePost = actorMemberPost[0]?.name ?? req.appUser!.email.split("@")[0];
  logAudit({ entityType: "project", entityId: project.id, entityName: project.name, action: "created", actorName: actorNamePost, actorEmail: req.appUser!.email }, req.log);

  return res.status(201).json(projectRow(project, []));
});

router.get("/projects/:id", async (req, res) => {
  const params = GetProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) return res.status(404).json({ error: "Not found" });

  const participantsMap = await fetchParticipantsByProject([project.id]);
  const taskCounts = await fetchTaskCountsByProject([project.id]);
  return res.json(projectRow(
    project,
    participantsMap.get(project.id) ?? [],
    taskCounts.total.get(project.id) ?? 0,
    taskCounts.done.get(project.id) ?? 0,
  ));
});

router.patch("/projects/:id", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [existing] = await db
    .select({ status: projectsTable.status, name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!existing) return res.status(404).json({ error: "Not found" });

  const raw = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.priority !== undefined) updateData.priority = body.data.priority;
  if (body.data.startDate !== undefined) updateData.startDate = body.data.startDate;
  if (body.data.endDate !== undefined) updateData.endDate = body.data.endDate;
  if (raw.finalDate !== undefined) updateData.finalDate = raw.finalDate;
  if (raw.producaoStartDate !== undefined) updateData.producaoStartDate = raw.producaoStartDate;
  if (raw.producaoEndDate !== undefined) updateData.producaoEndDate = raw.producaoEndDate;
  if (raw.producaoFinalDate !== undefined) updateData.producaoFinalDate = raw.producaoFinalDate;
  if (raw.medicaoDate !== undefined) updateData.medicaoDate = raw.medicaoDate;
  if (raw.instalacaoStartDate !== undefined) updateData.instalacaoStartDate = raw.instalacaoStartDate;
  if (raw.materialType !== undefined) updateData.materialType = raw.materialType as "madeira" | "aluminio";

  const [project] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) return res.status(404).json({ error: "Not found" });

  if (body.data.status !== undefined && body.data.status !== existing.status) {
    await db.insert(projectPhaseHistoryTable).values({
      projectId: params.data.id,
      fromStatus: existing.status,
      toStatus: body.data.status,
    });
    if (body.data.status === "em_aprovacao") {
      updateData.approvalStatus = "pending";
      updateData.approvalNote = null;
      updateData.approvalAt = null;
      updateData.approvalBy = null;
    }
    notifyProjectMembers(params.data.id, project.name, body.data.status, req.appUser!.email, req.log);
    void runAutomations("project_status_changed", {
      projectId: params.data.id,
      projectName: project.name,
      newStatus: body.data.status,
    }, req.log);
  }

  if (body.data.status === "em_instalacao" && existing.status !== "em_instalacao") {
    const existingItems = await db
      .select({ id: checklistItemsTable.id })
      .from(checklistItemsTable)
      .where(eq(checklistItemsTable.projectId, params.data.id))
      .limit(1);

    if (existingItems.length === 0) {
      await db.insert(checklistItemsTable).values({
        projectId: params.data.id,
        peca: "Instalação",
        status: "nao_instalado",
      });
      req.log.info({ projectId: params.data.id }, "Auto-created checklist entry on em_instalacao transition");
    }
  }

  const actorMemberPatch = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorNamePatch = actorMemberPatch[0]?.name ?? req.appUser!.email.split("@")[0];
  const projPatchChanges = diffObjects(existing as Record<string, unknown>, updateData, ["status", "priority", "name"]);
  const projPatchAction = body.data.status !== undefined && body.data.status !== existing.status ? "status_changed" as const : "updated" as const;
  logAudit({ entityType: "project", entityId: project.id, entityName: project.name, action: projPatchAction, actorName: actorNamePatch, actorEmail: req.appUser!.email, changes: projPatchChanges.length > 0 ? projPatchChanges : undefined }, req.log);

  const participantsMap = await fetchParticipantsByProject([project.id]);
  const taskCounts = await fetchTaskCountsByProject([project.id]);
  return res.json(projectRow(
    project,
    participantsMap.get(project.id) ?? [],
    taskCounts.total.get(project.id) ?? 0,
    taskCounts.done.get(project.id) ?? 0,
  ));
});

router.delete("/projects/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  // Gestor de Obras opera em todos os projetos, mas não pode excluí-los.
  if (req.appUser!.role === "gestor_obras") {
    return res.status(403).json({ error: "Gestor de Obras não pode excluir projetos" });
  }

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [projToDelete] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, params.data.id)).limit(1);
  const actorMemberDel = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorNameDel = actorMemberDel[0]?.name ?? req.appUser!.email.split("@")[0];

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));

  if (projToDelete) {
    logAudit({ entityType: "project", entityId: params.data.id, entityName: projToDelete.name, action: "deleted", actorName: actorNameDel, actorEmail: req.appUser!.email }, req.log);
  }
  return res.status(204).send();
});

router.post("/projects/:id/archive", requireExecutorOrGestor, async (req, res) => {
  const params = ArchiveProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  if (req.appUser!.role === "executor") {
    return res.status(403).json({ error: "Executores não podem arquivar projetos" });
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id)).limit(1);
  if (!project) return res.status(404).json({ error: "Projeto não encontrado" });

  const actorMember = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorName = actorMember[0]?.name ?? req.appUser!.email.split("@")[0];

  const [updated] = await db.update(projectsTable).set({ archived: true }).where(eq(projectsTable.id, params.data.id)).returning();
  logAudit({ entityType: "project", entityId: params.data.id, entityName: project.name, action: "updated", actorName, actorEmail: req.appUser!.email }, req.log);

  const participantsMap = await fetchParticipantsByProject([params.data.id]);
  const taskCounts = await fetchTaskCountsByProject([params.data.id]);
  return res.json(projectRow(updated, participantsMap.get(params.data.id) ?? [], taskCounts.total.get(params.data.id) ?? 0, taskCounts.done.get(params.data.id) ?? 0));
});

router.post("/projects/:id/unarchive", requireExecutorOrGestor, async (req, res) => {
  const params = UnarchiveProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  if (req.appUser!.role === "executor") {
    return res.status(403).json({ error: "Executores não podem desarquivar projetos" });
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id)).limit(1);
  if (!project) return res.status(404).json({ error: "Projeto não encontrado" });

  const actorMember = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1);
  const actorName = actorMember[0]?.name ?? req.appUser!.email.split("@")[0];

  const [updated] = await db.update(projectsTable).set({ archived: false }).where(eq(projectsTable.id, params.data.id)).returning();
  logAudit({ entityType: "project", entityId: params.data.id, entityName: project.name, action: "updated", actorName, actorEmail: req.appUser!.email }, req.log);

  const participantsMap = await fetchParticipantsByProject([params.data.id]);
  const taskCounts = await fetchTaskCountsByProject([params.data.id]);
  return res.json(projectRow(updated, participantsMap.get(params.data.id) ?? [], taskCounts.total.get(params.data.id) ?? 0, taskCounts.done.get(params.data.id) ?? 0));
});

router.post("/projects/:id/approve", requireGestor, async (req, res) => {
  const params = ApproveProjectParams.safeParse({ id: Number(req.params.id) });
  const body = ApproveProjectBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [existing] = await db
    .select({ name: projectsTable.name, status: projectsTable.status })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [dbUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, req.appUser!.email))
    .limit(1);

  const [project] = await db
    .update(projectsTable)
    .set({
      approvalStatus: body.data.action,
      approvalNote: body.data.note ?? null,
      approvalAt: new Date(),
      approvalBy: dbUser?.id ?? null,
    })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) return res.status(404).json({ error: "Not found" });

  const actionLabel = body.data.action === "approved" ? "Aprovado ✓" : "Rejeitado ✗";
  const actorName = (await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.email, req.appUser!.email)).limit(1))[0]?.name ?? req.appUser!.email.split("@")[0];

  const memberRows = await db
    .select({ email: membersTable.email })
    .from(projectMembersTable)
    .innerJoin(membersTable, eq(projectMembersTable.memberId, membersTable.id))
    .where(eq(projectMembersTable.projectId, params.data.id));

  for (const row of memberRows) {
    if (row.email === req.appUser!.email) continue;
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, row.email)).limit(1);
    if (!u) continue;
    await db.insert(notificationsTable).values({
      userId: u.id,
      type: "project_status_changed",
      title: `Projeto "${existing.name}" — ${actionLabel}`,
      body: body.data.note ? `Nota: ${body.data.note}` : `Revisado por ${actorName}`,
      entityType: "project",
      entityId: params.data.id,
      read: false,
    });
  }

  logAudit({ entityType: "project", entityId: project.id, entityName: project.name, action: "updated", actorName, actorEmail: req.appUser!.email, changes: [{ field: "approvalStatus", from: null, to: body.data.action }] }, req.log);

  const participantsMap = await fetchParticipantsByProject([project.id]);
  const taskCounts = await fetchTaskCountsByProject([project.id]);
  return res.json(projectRow(project, participantsMap.get(project.id) ?? [], taskCounts.total.get(project.id) ?? 0, taskCounts.done.get(project.id) ?? 0));
});

router.get("/projects/:id/phase-history", async (req, res) => {
  const params = ListProjectPhaseHistoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select()
    .from(projectPhaseHistoryTable)
    .where(eq(projectPhaseHistoryTable.projectId, params.data.id))
    .orderBy(projectPhaseHistoryTable.changedAt);

  return res.json(rows.map(r => ({
    id: r.id,
    projectId: r.projectId,
    fromStatus: r.fromStatus ?? null,
    toStatus: r.toStatus,
    changedAt: r.changedAt.toISOString(),
  })));
});

router.get("/projects/:id/stats", async (req, res) => {
  const params = GetProjectStatsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const { tasksTable } = await import("@workspace/db");
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.projectId, params.data.id));

  const now = new Date();
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
  ).length;

  return res.json({
    projectId: params.data.id,
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue,
  });
});

router.get("/projects/:id/members", async (req, res) => {
  const params = ListProjectMembersParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select({
      pm: projectMembersTable,
      member: membersTable,
    })
    .from(projectMembersTable)
    .innerJoin(membersTable, eq(projectMembersTable.memberId, membersTable.id))
    .where(eq(projectMembersTable.projectId, params.data.id))
    .orderBy(membersTable.name);

  return res.json(
    rows.map(({ pm, member }) => ({
      id: pm.id,
      projectId: pm.projectId,
      memberId: pm.memberId,
      memberName: member.name,
      memberRole: member.role,
      memberEmail: member.email,
      memberAvatarUrl: member.avatarUrl ?? null,
      addedAt: pm.addedAt.toISOString(),
    }))
  );
});

router.post("/projects/:id/members", requireGestor, async (req, res) => {
  const params = AddProjectMemberParams.safeParse({ id: Number(req.params.id) });
  const body = AddProjectMemberBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const existing = await db
    .select({ id: projectMembersTable.id })
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, params.data.id),
        eq(projectMembersTable.memberId, body.data.memberId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Membro já está neste projeto" });
  }

  const [pm] = await db
    .insert(projectMembersTable)
    .values({ projectId: params.data.id, memberId: body.data.memberId })
    .returning();

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, pm.memberId));

  return res.status(201).json({
    id: pm.id,
    projectId: pm.projectId,
    memberId: pm.memberId,
    memberName: member.name,
    memberRole: member.role,
    memberEmail: member.email,
    memberAvatarUrl: member.avatarUrl ?? null,
    addedAt: pm.addedAt.toISOString(),
  });
});

router.delete("/projects/:id/members/:memberId", requireGestor, async (req, res) => {
  const params = RemoveProjectMemberParams.safeParse({
    id: Number(req.params.id),
    memberId: Number(req.params.memberId),
  });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  await db
    .delete(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, params.data.id),
        eq(projectMembersTable.memberId, params.data.memberId)
      )
    );

  return res.status(204).send();
});

// ─── Checklist ────────────────────────────────────────────────────────────────

function checklistRow(
  item: typeof checklistItemsTable.$inferSelect,
  responsibleName: string | null,
  projectName?: string | null
) {
  return {
    id: item.id,
    projectId: item.projectId,
    projectName: projectName ?? null,
    peca: item.peca,
    local: item.local ?? null,
    status: item.status,
    actionDescription: item.actionDescription ?? null,
    responsibleId: item.responsibleId ?? null,
    responsibleName,
    actionDueDate: item.actionDueDate ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

router.get("/checklist", async (_req, res) => {
  const rows = await db
    .select({
      item: checklistItemsTable,
      memberName: membersTable.name,
      projectName: projectsTable.name,
    })
    .from(checklistItemsTable)
    .leftJoin(membersTable, eq(checklistItemsTable.responsibleId, membersTable.id))
    .leftJoin(projectsTable, eq(checklistItemsTable.projectId, projectsTable.id))
    .orderBy(checklistItemsTable.projectId, checklistItemsTable.createdAt);

  return res.json(rows.map(({ item, memberName, projectName }) =>
    checklistRow(item, memberName ?? null, projectName ?? null)
  ));
});

router.get("/projects/:id/checklist", async (req, res) => {
  const params = ListChecklistItemsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select({ item: checklistItemsTable, memberName: membersTable.name })
    .from(checklistItemsTable)
    .leftJoin(membersTable, eq(checklistItemsTable.responsibleId, membersTable.id))
    .where(eq(checklistItemsTable.projectId, params.data.id))
    .orderBy(checklistItemsTable.createdAt);

  return res.json(rows.map(({ item, memberName }) => checklistRow(item, memberName ?? null)));
});

router.post("/projects/:id/checklist", requireExecutorOrGestor, async (req, res) => {
  const params = CreateChecklistItemParams.safeParse({ id: Number(req.params.id) });
  const body = CreateChecklistItemBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [item] = await db
    .insert(checklistItemsTable)
    .values({
      projectId: params.data.id,
      peca: body.data.peca,
      local: body.data.local ?? null,
      status: (body.data.status as "nao_instalado" | "instalado" | "finalizado") ?? "nao_instalado",
      actionDescription: body.data.actionDescription ?? null,
      responsibleId: body.data.responsibleId ?? null,
      actionDueDate: body.data.actionDueDate ?? null,
    })
    .returning();

  let responsibleName: string | null = null;
  if (item.responsibleId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, item.responsibleId));
    responsibleName = m?.name ?? null;
  }

  return res.status(201).json(checklistRow(item, responsibleName));
});

router.patch("/projects/:id/checklist/:itemId", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateChecklistItemParams.safeParse({
    id: Number(req.params.id),
    itemId: Number(req.params.itemId),
  });
  const body = UpdateChecklistItemBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.peca !== undefined) updateData.peca = body.data.peca;
  if ("local" in body.data) updateData.local = body.data.local;
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if ("actionDescription" in body.data) updateData.actionDescription = body.data.actionDescription;
  if ("responsibleId" in body.data) updateData.responsibleId = body.data.responsibleId;
  if ("actionDueDate" in body.data) updateData.actionDueDate = body.data.actionDueDate;

  const [item] = await db
    .update(checklistItemsTable)
    .set(updateData)
    .where(
      and(
        eq(checklistItemsTable.id, params.data.itemId),
        eq(checklistItemsTable.projectId, params.data.id)
      )
    )
    .returning();

  if (!item) return res.status(404).json({ error: "Not found" });

  let responsibleName: string | null = null;
  if (item.responsibleId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, item.responsibleId));
    responsibleName = m?.name ?? null;
  }

  return res.json(checklistRow(item, responsibleName));
});

router.delete("/projects/:id/checklist/:itemId", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteChecklistItemParams.safeParse({
    id: Number(req.params.id),
    itemId: Number(req.params.itemId),
  });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  await db
    .delete(checklistItemsTable)
    .where(
      and(
        eq(checklistItemsTable.id, params.data.itemId),
        eq(checklistItemsTable.projectId, params.data.id)
      )
    );

  return res.status(204).send();
});

function siteVisitRow(
  visit: typeof siteVisitsTable.$inferSelect,
  responsibleName: string | null
) {
  return {
    id: visit.id,
    projectId: visit.projectId,
    date: visit.date,
    responsibleId: visit.responsibleId,
    responsibleName,
    visitors: visit.visitors,
    objective: visit.objective,
    notes: visit.notes,
    reportFileKey: visit.reportFileKey ?? null,
    createdAt: visit.createdAt.toISOString(),
  };
}

router.get("/projects/:id/visits", async (req, res) => {
  const params = ListSiteVisitsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select({ visit: siteVisitsTable, memberName: membersTable.name })
    .from(siteVisitsTable)
    .leftJoin(membersTable, eq(siteVisitsTable.responsibleId, membersTable.id))
    .where(eq(siteVisitsTable.projectId, params.data.id))
    .orderBy(siteVisitsTable.date);

  return res.json(rows.map(({ visit, memberName }) => siteVisitRow(visit, memberName ?? null)));
});

router.post("/projects/:id/visits", requireExecutorOrGestor, async (req, res) => {
  const params = CreateSiteVisitParams.safeParse({ id: Number(req.params.id) });
  const body = CreateSiteVisitBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const [visit] = await db
    .insert(siteVisitsTable)
    .values({
      projectId: params.data.id,
      date: body.data.date,
      responsibleId: body.data.responsibleId ?? null,
      visitors: body.data.visitors,
      objective: body.data.objective,
      notes: body.data.notes ?? null,
    })
    .returning();

  let responsibleName: string | null = null;
  if (visit.responsibleId) {
    const [m] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, visit.responsibleId));
    responsibleName = m?.name ?? null;
  }

  return res.status(201).json(siteVisitRow(visit, responsibleName));
});

router.delete("/projects/:id/visits/:visitId", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteSiteVisitParams.safeParse({
    id: Number(req.params.id),
    visitId: Number(req.params.visitId),
  });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  await db
    .delete(siteVisitsTable)
    .where(
      and(
        eq(siteVisitsTable.id, params.data.visitId),
        eq(siteVisitsTable.projectId, params.data.id)
      )
    );

  return res.status(204).send();
});

// ── Attach report to visit ────────────────────────────────────────────────────

router.patch("/projects/:id/visits/:visitId", requireExecutorOrGestor, async (req, res) => {
  const params = AttachVisitReportParams.safeParse({ id: Number(req.params.id), visitId: Number(req.params.visitId) });
  const body = AttachVisitReportBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [visit] = await db
    .update(siteVisitsTable)
    .set({ reportFileKey: body.data.reportFileKey ?? null })
    .where(and(eq(siteVisitsTable.id, params.data.visitId), eq(siteVisitsTable.projectId, params.data.id)))
    .returning();

  if (!visit) return res.status(404).json({ error: "Visit not found" });

  let responsibleName: string | null = null;
  if (visit.responsibleId) {
    const [m] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, visit.responsibleId));
    responsibleName = m?.name ?? null;
  }
  return res.json(siteVisitRow(visit, responsibleName));
});

// ── Visit action items ────────────────────────────────────────────────────────

function actionItemRow(
  item: typeof visitActionItemsTable.$inferSelect,
  responsibleName: string | null
) {
  return {
    id: item.id,
    visitId: item.visitId,
    description: item.description,
    responsibleId: item.responsibleId,
    responsibleName,
    dueDate: item.dueDate ?? null,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
  };
}

router.get("/projects/:id/visits/:visitId/action-items", async (req, res) => {
  const params = ListVisitActionItemsParams.safeParse({ id: Number(req.params.id), visitId: Number(req.params.visitId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  const rows = await db
    .select({ item: visitActionItemsTable, memberName: membersTable.name })
    .from(visitActionItemsTable)
    .leftJoin(membersTable, eq(visitActionItemsTable.responsibleId, membersTable.id))
    .where(eq(visitActionItemsTable.visitId, params.data.visitId))
    .orderBy(visitActionItemsTable.createdAt);

  return res.json(rows.map(({ item, memberName }) => actionItemRow(item, memberName ?? null)));
});

router.post("/projects/:id/visits/:visitId/action-items", requireExecutorOrGestor, async (req, res) => {
  const params = CreateVisitActionItemParams.safeParse({ id: Number(req.params.id), visitId: Number(req.params.visitId) });
  const body = CreateVisitActionItemBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [item] = await db
    .insert(visitActionItemsTable)
    .values({
      visitId: params.data.visitId,
      description: body.data.description,
      responsibleId: body.data.responsibleId ?? null,
      dueDate: body.data.dueDate ?? null,
    })
    .returning();

  let responsibleName: string | null = null;
  if (item.responsibleId) {
    const [m] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, item.responsibleId));
    responsibleName = m?.name ?? null;
  }
  return res.status(201).json(actionItemRow(item, responsibleName));
});

router.patch("/visit-action-items/:itemId/toggle", requireExecutorOrGestor, async (req, res) => {
  const params = ToggleVisitActionItemParams.safeParse({ itemId: Number(req.params.itemId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  const [current] = await db.select().from(visitActionItemsTable).where(eq(visitActionItemsTable.id, params.data.itemId)).limit(1);
  if (!current) return res.status(404).json({ error: "Not found" });

  const completedAt = current.completedAt ? null : new Date();
  const [updated] = await db
    .update(visitActionItemsTable)
    .set({ completedAt })
    .where(eq(visitActionItemsTable.id, params.data.itemId))
    .returning();

  let responsibleName: string | null = null;
  if (updated.responsibleId) {
    const [m] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, updated.responsibleId));
    responsibleName = m?.name ?? null;
  }
  return res.json(actionItemRow(updated, responsibleName));
});

router.delete("/visit-action-items/:itemId", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteVisitActionItemParams.safeParse({ itemId: Number(req.params.itemId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });
  await db.delete(visitActionItemsTable).where(eq(visitActionItemsTable.id, params.data.itemId));
  return res.status(204).send();
});

// ── All site visits (dashboard) ───────────────────────────────────────────────

router.get("/site-visits", async (_req, res) => {
  const rows = await db
    .select({
      visit: siteVisitsTable,
      projectName: projectsTable.name,
      memberName: membersTable.name,
    })
    .from(siteVisitsTable)
    .innerJoin(projectsTable, eq(siteVisitsTable.projectId, projectsTable.id))
    .leftJoin(membersTable, eq(siteVisitsTable.responsibleId, membersTable.id))
    .orderBy(siteVisitsTable.date);

  return res.json(rows.map(({ visit, projectName, memberName }) => ({
    id: visit.id,
    projectId: visit.projectId,
    projectName,
    date: visit.date,
    responsibleId: visit.responsibleId,
    responsibleName: memberName ?? null,
    visitors: visit.visitors,
    objective: visit.objective,
    notes: visit.notes,
    createdAt: visit.createdAt.toISOString(),
  })));
});

// ── Observations ──────────────────────────────────────────────────────────────

router.get("/projects/:id/observations", async (req, res) => {
  const params = ListProjectObservationsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  const rows = await db
    .select()
    .from(projectObservationsTable)
    .where(eq(projectObservationsTable.projectId, params.data.id))
    .orderBy(projectObservationsTable.createdAt);

  return res.json(rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    text: r.text,
    authorName: r.authorName,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/projects/:id/observations", requireExecutorOrGestor, async (req, res) => {
  const params = CreateProjectObservationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  const body = CreateProjectObservationBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  const authorName = req.appUser?.email ?? "Sistema";

  const [obs] = await db
    .insert(projectObservationsTable)
    .values({
      projectId: params.data.id,
      text: body.data.text,
      authorName,
    })
    .returning();

  return res.status(201).json({
    id: obs.id,
    projectId: obs.projectId,
    text: obs.text,
    authorName: obs.authorName,
    createdAt: obs.createdAt.toISOString(),
  });
});

export default router;
