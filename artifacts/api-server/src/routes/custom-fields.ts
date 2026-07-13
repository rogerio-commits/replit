import { Router } from "express";
import { db } from "@workspace/db";
import { customFieldDefinitionsTable, customFieldValuesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/custom-fields", async (req, res) => {
  const { entityType } = req.query as { entityType?: string };
  const query = db.select().from(customFieldDefinitionsTable);
  const rows = entityType
    ? await query.where(eq(customFieldDefinitionsTable.entityType, entityType))
    : await query;
  return res.json(
    rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  );
});

router.post("/custom-fields", async (req, res) => {
  const { name, type, entityType, options } = req.body as {
    name: string;
    type: string;
    entityType: string;
    options?: string[];
  };

  if (!name || !type || !entityType) {
    return res.status(400).json({ error: "name, type and entityType are required" });
  }

  const [field] = await db
    .insert(customFieldDefinitionsTable)
    .values({ name, type, entityType, options: options ?? null })
    .returning();

  return res.status(201).json({ ...field, createdAt: field.createdAt.toISOString() });
});

router.delete("/custom-fields/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(customFieldDefinitionsTable).where(eq(customFieldDefinitionsTable.id, id));
  return res.status(204).send();
});

router.get("/custom-field-values", async (req, res) => {
  const { entityType, entityId } = req.query as { entityType?: string; entityId?: string };
  if (!entityType || !entityId) {
    return res.status(400).json({ error: "entityType and entityId are required" });
  }
  const rows = await db
    .select()
    .from(customFieldValuesTable)
    .where(
      and(
        eq(customFieldValuesTable.entityType, entityType),
        eq(customFieldValuesTable.entityId, Number(entityId)),
      ),
    );
  return res.json(rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })));
});

router.put("/custom-field-values", async (req, res) => {
  const { fieldId, entityType, entityId, value } = req.body as {
    fieldId: number;
    entityType: string;
    entityId: number;
    value: string;
  };

  if (!fieldId || !entityType || !entityId) {
    return res.status(400).json({ error: "fieldId, entityType and entityId are required" });
  }

  const existing = await db
    .select()
    .from(customFieldValuesTable)
    .where(
      and(
        eq(customFieldValuesTable.fieldId, fieldId),
        eq(customFieldValuesTable.entityType, entityType),
        eq(customFieldValuesTable.entityId, entityId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(customFieldValuesTable)
      .set({ value: value ?? null, updatedAt: new Date() })
      .where(eq(customFieldValuesTable.id, existing[0].id))
      .returning();
    return res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } else {
    const [created] = await db
      .insert(customFieldValuesTable)
      .values({ fieldId, entityType, entityId, value: value ?? null })
      .returning();
    return res.status(201).json({ ...created, updatedAt: created.updatedAt.toISOString() });
  }
});

export default router;
