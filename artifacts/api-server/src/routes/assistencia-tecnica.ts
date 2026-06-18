import { Router } from "express";
import { db, assistenciaTecnicaTable, membersTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
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

function atRow(
  row: typeof assistenciaTecnicaTable.$inferSelect,
  memberName?: string | null
) {
  return {
    id: row.id,
    clientName: row.clientName,
    contact: row.contact,
    description: row.description,
    status: row.status,
    scheduledDate: row.scheduledDate ?? null,
    responsibleMemberId: row.responsibleMemberId ?? null,
    responsibleMemberName: memberName ?? null,
    realizado: row.realizado,
    realizadoAt: row.realizadoAt ? row.realizadoAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/assistencia-tecnica", requireExecutorOrGestor, async (req, res) => {
  const { status } = ListAssistenciaTecnicaQueryParams.parse(req.query);

  const rows = await db
    .select({ at: assistenciaTecnicaTable, memberName: membersTable.name })
    .from(assistenciaTecnicaTable)
    .leftJoin(membersTable, eq(assistenciaTecnicaTable.responsibleMemberId, membersTable.id))
    .orderBy(assistenciaTecnicaTable.createdAt);

  const result = rows
    .filter((r) => !status || r.at.status === status)
    .map((r) => atRow(r.at, r.memberName));

  res.json(result);
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
      responsibleMemberId: body.responsibleMemberId ?? null,
      realizado: body.realizado ?? false,
    })
    .returning();

  let memberName: string | null = null;
  if (inserted.responsibleMemberId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, inserted.responsibleMemberId))
      .limit(1);
    memberName = m?.name ?? null;
  }

  res.status(201).json(atRow(inserted, memberName));
});

router.get("/assistencia-tecnica/:id", requireExecutorOrGestor, async (req, res) => {
  const { id } = GetAssistenciaTecnicaParams.parse(req.params);

  const [row] = await db
    .select({ at: assistenciaTecnicaTable, memberName: membersTable.name })
    .from(assistenciaTecnicaTable)
    .leftJoin(membersTable, eq(assistenciaTecnicaTable.responsibleMemberId, membersTable.id))
    .where(eq(assistenciaTecnicaTable.id, id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(atRow(row.at, row.memberName));
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
  if ("responsibleMemberId" in body) updates.responsibleMemberId = body.responsibleMemberId ?? null;
  if (body.realizado !== undefined) {
    updates.realizado = body.realizado;
    updates.realizadoAt = realizadoAt;
  }

  const [updated] = await db
    .update(assistenciaTecnicaTable)
    .set(updates)
    .where(eq(assistenciaTecnicaTable.id, id))
    .returning();

  let memberName: string | null = null;
  if (updated.responsibleMemberId) {
    const [m] = await db
      .select({ name: membersTable.name })
      .from(membersTable)
      .where(eq(membersTable.id, updated.responsibleMemberId))
      .limit(1);
    memberName = m?.name ?? null;
  }

  return res.json(atRow(updated, memberName));
});

router.delete("/assistencia-tecnica/:id", requireExecutorOrGestor, async (req, res) => {
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
