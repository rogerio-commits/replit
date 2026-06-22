import { Router } from "express";
import { db, sampleControlsTable, projectsTable, membersTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
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
  projectName: string,
  responsibleName: string | null
) {
  return {
    id: row.id,
    projectId: row.projectId,
    projectName,
    samples: row.samples,
    responsibleId: row.responsibleId,
    responsibleName,
    deadline: row.deadline,
    requester: row.requester,
    notes: row.notes ?? null,
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
    .innerJoin(projectsTable, eq(sampleControlsTable.projectId, projectsTable.id))
    .leftJoin(membersTable, eq(sampleControlsTable.responsibleId, membersTable.id))
    .orderBy(sampleControlsTable.deadline);

  let result = rows.map(({ sc, projectName, memberName }) =>
    scRow(sc, projectName, memberName ?? null)
  );

  if (query.data.projectId) result = result.filter((r) => r.projectId === query.data.projectId);

  return res.json(result);
});

router.post("/sample-controls", requireExecutorOrGestor, async (req, res) => {
  const body = CreateSampleControlBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, body.data.projectId));
  if (!project) return res.status(400).json({ error: "Project not found" });

  const [row] = await db
    .insert(sampleControlsTable)
    .values({
      projectId: body.data.projectId,
      samples: body.data.samples,
      responsibleId: body.data.responsibleId ?? null,
      deadline: body.data.deadline,
      requester: body.data.requester,
      notes: body.data.notes ?? null,
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

  return res.status(201).json(scRow(row, project.name, responsibleName));
});

router.patch("/sample-controls/:id", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateSampleControlParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateSampleControlBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const [project] = body.data.projectId
    ? await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, body.data.projectId))
    : [undefined];
  if (body.data.projectId && !project) return res.status(400).json({ error: "Project not found" });

  const [row] = await db
    .update(sampleControlsTable)
    .set({
      ...(body.data.projectId !== undefined && { projectId: body.data.projectId }),
      ...(body.data.samples !== undefined && { samples: body.data.samples }),
      ...(body.data.responsibleId !== undefined && { responsibleId: body.data.responsibleId }),
      ...(body.data.deadline !== undefined && { deadline: body.data.deadline }),
      ...(body.data.requester !== undefined && { requester: body.data.requester }),
      ...(body.data.notes !== undefined && { notes: body.data.notes }),
    })
    .where(eq(sampleControlsTable.id, params.data.id))
    .returning();

  if (!row) return res.status(404).json({ error: "Not found" });

  const [proj] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, row.projectId));

  let responsibleName: string | null = null;
  if (row.responsibleId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, row.responsibleId));
    responsibleName = m?.name ?? null;
  }

  return res.json(scRow(row, proj?.name ?? "", responsibleName));
});

router.delete("/sample-controls/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteSampleControlParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(sampleControlsTable).where(eq(sampleControlsTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
