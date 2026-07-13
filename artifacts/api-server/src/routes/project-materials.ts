import { Router } from "express";
import { db } from "@workspace/db";
import { projectMaterialsTable, membersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/projects/:id/materials", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });

  const rows = await db
    .select({
      id: projectMaterialsTable.id,
      projectId: projectMaterialsTable.projectId,
      name: projectMaterialsTable.name,
      unit: projectMaterialsTable.unit,
      quantity: projectMaterialsTable.quantity,
      type: projectMaterialsTable.type,
      unitPrice: projectMaterialsTable.unitPrice,
      date: projectMaterialsTable.date,
      notes: projectMaterialsTable.notes,
      authorId: projectMaterialsTable.authorId,
      authorName: membersTable.name,
      createdAt: projectMaterialsTable.createdAt,
    })
    .from(projectMaterialsTable)
    .leftJoin(membersTable, eq(projectMaterialsTable.authorId, membersTable.id))
    .where(eq(projectMaterialsTable.projectId, projectId))
    .orderBy(desc(projectMaterialsTable.date));

  return res.json(
    rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      name: r.name,
      unit: r.unit,
      quantity: Number(r.quantity),
      type: r.type,
      unitPrice: r.unitPrice !== null ? Number(r.unitPrice) : null,
      date: r.date,
      notes: r.notes ?? null,
      authorId: r.authorId ?? null,
      authorName: r.authorName ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/projects/:id/materials", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });

  const { name, unit, quantity, type, unitPrice, date, notes } = req.body as {
    name: string;
    unit: string;
    quantity: number;
    type: string;
    unitPrice?: number;
    date: string;
    notes?: string;
  };

  if (!name || !unit || !quantity || !type || !date) {
    return res.status(400).json({ error: "name, unit, quantity, type and date are required" });
  }

  const appUser = req.appUser!;
  const [member] = await db
    .select({ id: membersTable.id, name: membersTable.name })
    .from(membersTable)
    .where(eq(membersTable.email, appUser.email))
    .limit(1);

  const [row] = await db
    .insert(projectMaterialsTable)
    .values({
      projectId,
      name,
      unit,
      quantity: String(quantity),
      type,
      unitPrice: unitPrice !== undefined ? String(unitPrice) : null,
      date,
      notes: notes ?? null,
      authorId: member?.id ?? null,
    })
    .returning();

  return res.status(201).json({
    ...row,
    quantity: Number(row.quantity),
    unitPrice: row.unitPrice !== null ? Number(row.unitPrice) : null,
    authorName: member?.name ?? appUser.email.split("@")[0],
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/materials/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(projectMaterialsTable).where(eq(projectMaterialsTable.id, id));
  return res.status(204).send();
});

export default router;
