import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, membersTable, projectMembersTable } from "@workspace/db";
import { requireGestor, requireExecutorOrGestor } from "../middlewares/requireAuth";
import { and, eq, inArray } from "drizzle-orm";
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
} from "@workspace/api-zod";

const router = Router();

function projectRow(
  p: typeof projectsTable.$inferSelect,
  participants: { memberId: number; memberName: string; memberAvatarUrl: string | null }[] = []
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
    createdAt: p.createdAt.toISOString(),
    participants,
  };
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

  let rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);

  if (query.data.status) {
    rows = rows.filter((p) => p.status === query.data.status);
  }
  if (query.data.priority) {
    rows = rows.filter((p) => p.priority === query.data.priority);
  }

  const participantsMap = await fetchParticipantsByProject(rows.map((p) => p.id));
  return res.json(rows.map((p) => projectRow(p, participantsMap.get(p.id) ?? [])));
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
  return res.json(projectRow(project, participantsMap.get(project.id) ?? []));
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

  const participantsMap = await fetchParticipantsByProject([project.id]);
  return res.json(projectRow(project, participantsMap.get(project.id) ?? []));
});

router.delete("/projects/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  if (req.appUser!.role === "executor") {
    const ok = await isExecutorParticipant(req.appUser!.email, params.data.id);
    if (!ok) return res.status(403).json({ error: "Você não é participante deste projeto" });
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  return res.status(204).send();
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

export default router;
