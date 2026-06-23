import { Router } from "express";
import { db, assistenciaTecnicaTable } from "@workspace/db";
import { requireExecutorOrGestor, requireGestor } from "../middlewares/requireAuth";
import { eq } from "drizzle-orm";
import {
  ListAssistenciaTecnicaQueryParams,
  CreateAssistenciaTecnicaBody,
  GetAssistenciaTecnicaParams,
  UpdateAssistenciaTecnicaParams,
  UpdateAssistenciaTecnicaBody,
  DeleteAssistenciaTecnicaParams,
} from "@workspace/api-zod";

const router = Router();

function atRow(row: typeof assistenciaTecnicaTable.$inferSelect) {
  return {
    id: row.id,
    clientName: row.clientName,
    contact: row.contact,
    description: row.description,
    status: row.status,
    scheduledDate: row.scheduledDate ?? null,
    responsibleMembers: row.responsibleMembers ?? null,
    realizado: row.realizado,
    realizadoAt: row.realizadoAt ? row.realizadoAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/assistencia-tecnica", requireExecutorOrGestor, async (req, res) => {
  const { status } = ListAssistenciaTecnicaQueryParams.parse(req.query);
  const rows = await db
    .select()
    .from(assistenciaTecnicaTable)
    .orderBy(assistenciaTecnicaTable.createdAt);

  const result = rows
    .filter((r) => !status || r.status === status)
    .map(atRow);

  return res.json(result);
});

router.post("/assistencia-tecnica", requireExecutorOrGestor, async (req, res) => {
  const body = CreateAssistenciaTecnicaBody.parse(req.body);

  const [inserted] = await db
    .insert(assistenciaTecnicaTable)
    .values({
      clientName: body.clientName,
      contact: body.contact,
      description: body.description,
      status: (body.status ?? "aberto") as "aberto" | "em_andamento" | "concluido" | "cancelado",
      scheduledDate: body.scheduledDate ?? null,
      responsibleMembers: body.responsibleMembers ?? null,
      realizado: body.realizado ?? false,
    })
    .returning();

  return res.status(201).json(atRow(inserted));
});

router.get("/assistencia-tecnica/:id", requireExecutorOrGestor, async (req, res) => {
  const { id } = GetAssistenciaTecnicaParams.parse(req.params);

  const [row] = await db
    .select()
    .from(assistenciaTecnicaTable)
    .where(eq(assistenciaTecnicaTable.id, id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(atRow(row));
});

router.patch("/assistencia-tecnica/:id", requireExecutorOrGestor, async (req, res) => {
  const { id } = UpdateAssistenciaTecnicaParams.parse(req.params);
  const body = UpdateAssistenciaTecnicaBody.parse(req.body);

  const [existing] = await db
    .select()
    .from(assistenciaTecnicaTable)
    .where(eq(assistenciaTecnicaTable.id, id))
    .limit(1);

  if (!existing) return res.status(404).json({ error: "Not found" });

  const realizadoChanged = body.realizado !== undefined && body.realizado !== existing.realizado;
  const realizadoAt =
    realizadoChanged && body.realizado
      ? new Date()
      : realizadoChanged && !body.realizado
      ? null
      : existing.realizadoAt;

  const updates: Partial<typeof assistenciaTecnicaTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.clientName !== undefined) updates.clientName = body.clientName;
  if (body.contact !== undefined) updates.contact = body.contact;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status as "aberto" | "em_andamento" | "concluido" | "cancelado";
  if ("scheduledDate" in body) updates.scheduledDate = body.scheduledDate ?? null;
  if ("responsibleMembers" in body) updates.responsibleMembers = body.responsibleMembers ?? null;
  if (body.realizado !== undefined) {
    updates.realizado = body.realizado;
    updates.realizadoAt = realizadoAt;
  }

  const [updated] = await db
    .update(assistenciaTecnicaTable)
    .set(updates)
    .where(eq(assistenciaTecnicaTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(atRow(updated));
});

router.delete("/assistencia-tecnica/:id", requireGestor, async (req, res) => {
  const { id } = DeleteAssistenciaTecnicaParams.parse(req.params);

  const [existing] = await db
    .select({ id: assistenciaTecnicaTable.id })
    .from(assistenciaTecnicaTable)
    .where(eq(assistenciaTecnicaTable.id, id))
    .limit(1);

  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.delete(assistenciaTecnicaTable).where(eq(assistenciaTecnicaTable.id, id));
  return res.status(204).send();
});

export default router;
