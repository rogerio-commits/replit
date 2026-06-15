import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireGestor } from "../middlewares/requireAuth";
import { UpdateUserRoleBody } from "@workspace/api-zod";

const router = Router();

router.get("/me", (req, res) => {
  const u = req.appUser;
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  return res.json({
    id: u.id,
    clerkUserId: u.clerkUserId,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  });
});

router.get("/users", requireGestor, async (_req, res) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);
  return res.json(
    users.map((u) => ({
      id: u.id,
      clerkUserId: u.clerkUserId,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.patch("/users/:id", requireGestor, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateUserRoleBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  if (req.appUser!.id === id && body.data.role !== "gestor") {
    return res.status(400).json({ error: "Não é possível alterar o seu próprio papel" });
  }

  const [user] = await db
    .update(usersTable)
    .set({ role: body.data.role as "gestor" | "executor" | "observador" })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
