import { Router } from "express";
import { db } from "@workspace/db";
import { automationRulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const VALID_TRIGGERS = ["task_completed", "task_status_changed", "project_completed"] as const;
const VALID_ACTIONS = ["notify_assignee", "notify_all"] as const;

const router = Router();

router.get("/automation-rules", async (_req, res) => {
  const rules = await db
    .select()
    .from(automationRulesTable)
    .orderBy(automationRulesTable.createdAt);

  return res.json(
    rules.map((r) => ({
      id: r.id,
      name: r.name,
      trigger: r.trigger,
      actionType: r.actionType,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/automation-rules", async (req, res) => {
  const { name, trigger, actionType, isActive } = req.body as {
    name: string;
    trigger: string;
    actionType: string;
    isActive?: boolean;
  };

  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  if (!VALID_TRIGGERS.includes(trigger as (typeof VALID_TRIGGERS)[number])) {
    return res.status(400).json({ error: `trigger must be one of: ${VALID_TRIGGERS.join(", ")}` });
  }
  if (!VALID_ACTIONS.includes(actionType as (typeof VALID_ACTIONS)[number])) {
    return res.status(400).json({ error: `actionType must be one of: ${VALID_ACTIONS.join(", ")}` });
  }

  const [rule] = await db
    .insert(automationRulesTable)
    .values({ name: name.trim(), trigger, actionType, isActive: isActive ?? true })
    .returning();

  return res.status(201).json({
    id: rule.id,
    name: rule.name,
    trigger: rule.trigger,
    actionType: rule.actionType,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
  });
});

router.patch("/automation-rules/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { name, isActive } = req.body as { name?: string; isActive?: boolean };
  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof isActive === "boolean") updates.isActive = isActive;

  if (!Object.keys(updates).length) return res.status(400).json({ error: "No valid fields to update" });

  const [updated] = await db
    .update(automationRulesTable)
    .set(updates)
    .where(eq(automationRulesTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Rule not found" });

  return res.json({
    id: updated.id,
    name: updated.name,
    trigger: updated.trigger,
    actionType: updated.actionType,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/automation-rules/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(automationRulesTable).where(eq(automationRulesTable.id, id));
  return res.status(204).send();
});

export default router;
