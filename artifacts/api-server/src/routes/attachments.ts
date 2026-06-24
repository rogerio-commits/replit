import { Router } from "express";
import { db, attachmentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const storage = new ObjectStorageService();

function attachRow(a: typeof attachmentsTable.$inferSelect) {
  return {
    id: a.id,
    entityType: a.entityType,
    entityId: a.entityId,
    filename: a.filename,
    originalName: a.originalName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    uploadedBy: a.uploadedBy,
    uploaderName: a.uploaderName,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/attachments", async (req, res) => {
  const entityType = req.query.entityType as string;
  const entityId = Number(req.query.entityId);
  if (!entityType || isNaN(entityId)) return res.status(400).json({ error: "entityType and entityId are required" });

  const rows = await db
    .select()
    .from(attachmentsTable)
    .where(
      and(
        eq(attachmentsTable.entityType, entityType as "task" | "project"),
        eq(attachmentsTable.entityId, entityId)
      )
    )
    .orderBy(attachmentsTable.createdAt);

  return res.json(rows.map(attachRow));
});

router.post("/attachments", async (req, res) => {
  const { entityType, entityId, filename, originalName, mimeType, sizeBytes } = req.body ?? {};
  if (!entityType || !entityId || !filename || !originalName || !mimeType || !sizeBytes) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const appUser = req.appUser!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, appUser.clerkUserId)).limit(1);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  const [attachment] = await db.insert(attachmentsTable).values({
    entityType: entityType as "task" | "project",
    entityId: Number(entityId),
    filename: String(filename),
    originalName: String(originalName),
    mimeType: String(mimeType),
    sizeBytes: Number(sizeBytes),
    uploadedBy: dbUser.id,
    uploaderName: appUser.email,
  }).returning();

  return res.status(201).json(attachRow(attachment));
});

router.delete("/attachments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const appUser = req.appUser!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, appUser.clerkUserId)).limit(1);
  if (!dbUser) return res.status(401).json({ error: "User not found" });

  const isGestor = appUser.role === "gestor";

  const [existing] = await db.select().from(attachmentsTable).where(eq(attachmentsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!isGestor && existing.uploadedBy !== dbUser.id) return res.status(403).json({ error: "Forbidden" });

  try {
    const file = await storage.getObjectEntityFile(existing.filename);
    await file.delete();
  } catch {
    // file may already be gone from storage, continue
  }

  await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id));
  return res.status(204).send();
});

export default router;
