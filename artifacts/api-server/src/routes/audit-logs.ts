import { Router } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/audit-logs", async (req, res) => {
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const entityId = req.query.entityId ? Number(req.query.entityId) : undefined;
  const limit = Math.min(Number(req.query.limit ?? 100), 200);

  const conditions = [];
  if (entityType) conditions.push(eq(auditLogsTable.entityType, entityType));
  if (entityId && !isNaN(entityId)) conditions.push(eq(auditLogsTable.entityId, entityId));

  const rows = await db
    .select()
    .from(auditLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  return res.json(
    rows.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      entityName: r.entityName,
      action: r.action,
      actorName: r.actorName,
      actorEmail: r.actorEmail,
      changes: r.changes ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
