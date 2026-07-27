import { Router } from "express";
import { db } from "@workspace/db";
import { automationRulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireGestor } from "../middlewares/requireAuth";

const VALID_TRIGGERS = [
  "task_completed",
  "task_status_changed",
  "project_completed",
  "task_assigned",
  "project_status_changed",
] as const;

const VALID_ACTIONS = [
  "notify_assignee",
  "notify_all",
  "notify_gestor",
  "advance_task_status",
] as const;

function formatRule(r: typeof automationRulesTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger,
    actionType: r.actionType,
    isActive: r.isActive,
    executionCount: r.executionCount,
    lastFiredAt: r.lastFiredAt ? r.lastFiredAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

const router = Router();

router.get("/automation-rules", requireGestor, async (_req, res) => {
  const rules = await db
    .select()
    .from(automationRulesTable)
    .orderBy(automationRulesTable.createdAt);
  return res.json(rules.map(formatRule));
});

router.post("/automation-rules", requireGestor, async (req, res) => {
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

  return res.status(201).json(formatRule(rule));
});

router.patch("/automation-rules/:id", requireGestor, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { name, isActive, trigger, actionType } = req.body as {
    name?: string;
    isActive?: boolean;
    trigger?: string;
    actionType?: string;
  };

  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (typeof trigger === "string" && VALID_TRIGGERS.includes(trigger as (typeof VALID_TRIGGERS)[number])) {
    updates.trigger = trigger;
  }
  if (typeof actionType === "string" && VALID_ACTIONS.includes(actionType as (typeof VALID_ACTIONS)[number])) {
    updates.actionType = actionType;
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: "No valid fields to update" });

  const [updated] = await db
    .update(automationRulesTable)
    .set(updates)
    .where(eq(automationRulesTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Rule not found" });
  return res.json(formatRule(updated));
});

router.delete("/automation-rules/:id", requireGestor, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(automationRulesTable).where(eq(automationRulesTable.id, id));
  return res.status(204).send();
});

export default router;
