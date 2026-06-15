import { Router } from "express";
import { db, membersTable } from "@workspace/db";
import { requireGestor } from "../middlewares/requireAuth";
import { eq } from "drizzle-orm";
import {
  CreateMemberBody,
  UpdateMemberParams,
  UpdateMemberBody,
  DeleteMemberParams,
  GetMemberParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/members", async (_req, res) => {
  const rows = await db.select().from(membersTable).orderBy(membersTable.name);
  return res.json(
    rows.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      avatarUrl: m.avatarUrl ?? null,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.post("/members", requireGestor, async (req, res) => {
  const body = CreateMemberBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  const [member] = await db
    .insert(membersTable)
    .values({
      name: body.data.name,
      role: body.data.role,
      email: body.data.email,
      avatarUrl: body.data.avatarUrl ?? null,
    })
    .returning();

  return res.status(201).json({
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email,
    avatarUrl: member.avatarUrl ?? null,
    createdAt: member.createdAt.toISOString(),
  });
});

router.get("/members/:id", async (req, res) => {
  const params = GetMemberParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, params.data.id));

  if (!member) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email,
    avatarUrl: member.avatarUrl ?? null,
    createdAt: member.createdAt.toISOString(),
  });
});

router.patch("/members/:id", requireGestor, async (req, res) => {
  const params = UpdateMemberParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateMemberBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.role !== undefined) updateData.role = body.data.role;
  if (body.data.email !== undefined) updateData.email = body.data.email;
  if (body.data.avatarUrl !== undefined) updateData.avatarUrl = body.data.avatarUrl;

  const [member] = await db
    .update(membersTable)
    .set(updateData)
    .where(eq(membersTable.id, params.data.id))
    .returning();

  if (!member) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email,
    avatarUrl: member.avatarUrl ?? null,
    createdAt: member.createdAt.toISOString(),
  });
});

router.delete("/members/:id", requireGestor, async (req, res) => {
  const params = DeleteMemberParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(membersTable).where(eq(membersTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
