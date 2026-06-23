import { Router } from "express";
import { clerkClient } from "@clerk/express";
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

router.post("/users/:id/signin-link", requireGestor, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "id inválido" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  try {
    const signInToken = await clerkClient.signInTokens.createSignInToken({
      userId: user.clerkUserId,
      expiresInSeconds: 60 * 60 * 24,
    });
    return res.json({ url: signInToken.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro ao gerar link: ${msg}` });
  }
});

export default router;
