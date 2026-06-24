import { Router } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function notifRow(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    entityType: n.entityType ?? null,
    entityId: n.entityId ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

async function getDbUser(clerkUserId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  return u ?? null;
}

router.get("/notifications", async (req, res) => {
  const dbUser = await getDbUser(req.appUser!.clerkUserId);
  if (!dbUser) return res.json([]);

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, dbUser.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  return res.json(rows.map(notifRow));
});

router.patch("/notifications/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const dbUser = await getDbUser(req.appUser!.clerkUserId);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, dbUser.id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(notifRow(updated));
});

router.post("/notifications/read-all", async (req, res) => {
  const dbUser = await getDbUser(req.appUser!.clerkUserId);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, dbUser.id), eq(notificationsTable.read, false)));

  return res.status(204).send();
});

export default router;
