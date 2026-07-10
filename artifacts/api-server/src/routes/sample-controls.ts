import { Router } from "express";
import { db, sampleControlsTable, projectsTable, membersTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, isNull } from "drizzle-orm";
import {
  ListSampleControlsQueryParams,
  CreateSampleControlBody,
  UpdateSampleControlParams,
  UpdateSampleControlBody,
  DeleteSampleControlParams,
} from "@workspace/api-zod";

const router = Router();

function scRow(
  row: typeof sampleControlsTable.$inferSelect,
  projectName: string | null,
  responsibleName: string | null
) {
  return {
    id: row.id,
    projectId: row.projectId ?? null,
    projectName: projectName ?? null,
    samples: row.samples,
    responsibleId: row.responsibleId,
    responsibleName,
    deadline: row.deadline,
    requester: row.requester,
    notes: row.notes ?? null,
    ready: row.ready,
    delivered: row.delivered,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/sample-controls", requireExecutorOrGestor, async (req, res) => {
  const query = ListSampleControlsQueryParams.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid query" });

  const rows = await db
    .select({
      sc: sampleControlsTable,
      projectName: projectsTable.name,
      memberName: membersTable.name,
    })
    .from(sampleControlsTable)
    .leftJoin(projectsTable, eq(sampleControlsTable.projectId, projectsTable.id))
    .leftJoin(membersTable, eq(sampleControlsTable.responsibleId, membersTable.id))
    .orderBy(sampleControlsTable.deadline);

  let result = rows.map(({ sc, projectName, memberName }) =>
    scRow(sc, projectName ?? null, memberName ?? null)
  );

  if (query.data.projectId) result = result.filter((r) => r.projectId === query.data.projectId);

  return res.json(result);
});

router.post("/sample-controls", requireExecutorOrGestor, async (req, res) => {
  const body = CreateSampleControlBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  let projectName: string | null = null;
  if (body.data.projectId != null) {
    const [project] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.id, body.data.projectId));
    if (!project) return res.status(400).json({ error: "Project not found" });
    projectName = project.name;
  }

  const [row] = await db
    .insert(sampleControlsTable)
    .values({
      projectId: body.data.projectId ?? null,
      samples: body.data.samples,
      responsibleId: body.data.responsibleId ?? null,
      deadline: body.data.deadline,
      requester: body.data.requester,
      notes: body.data.notes ?? null,
      ready: body.data.ready ?? false,
      delivered: body.data.delivered ?? false,
    })
    .returning();

  let responsibleName: string | null = null;
  if (row.responsibleId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, row.responsibleId));
    responsibleName = m?.name ?? null;
  }

  return res.status(201).json(scRow(row, projectName, responsibleName));
});

router.patch("/sample-controls/:id", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateSampleControlParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateSampleControlBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  let projectName: string | null = null;
  if (body.data.projectId != null) {
    const [project] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.id, body.data.projectId));
    if (!project) return res.status(400).json({ error: "Project not found" });
    projectName = project.name;
  }

  const [row] = await db
    .update(sampleControlsTable)
    .set({
      ...(body.data.projectId !== undefined && { projectId: body.data.projectId ?? null }),
      ...(body.data.samples !== undefined && { samples: body.data.samples }),
      ...(body.data.responsibleId !== undefined && { responsibleId: body.data.responsibleId }),
      ...(body.data.deadline !== undefined && { deadline: body.data.deadline }),
      ...(body.data.requester !== undefined && { requester: body.data.requester }),
      ...(body.data.notes !== undefined && { notes: body.data.notes }),
      ...(body.data.ready !== undefined && { ready: body.data.ready }),
      ...(body.data.delivered !== undefined && { delivered: body.data.delivered }),
    })
    .where(eq(sampleControlsTable.id, params.data.id))
    .returning();

  if (!row) return res.status(404).json({ error: "Not found" });

  if (!projectName && row.projectId) {
    const [proj] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.id, row.projectId));
    projectName = proj?.name ?? null;
  }

  let responsibleName: string | null = null;
  if (row.responsibleId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, row.responsibleId));
    responsibleName = m?.name ?? null;
  }

  return res.json(scRow(row, projectName, responsibleName));
});

router.delete("/sample-controls/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteSampleControlParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(sampleControlsTable).where(eq(sampleControlsTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
