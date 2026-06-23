import { Router } from "express";
import { db, installationEventsTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  CreateInstallationEventBody,
  UpdateInstallationEventParams,
  UpdateInstallationEventBody,
  DeleteInstallationEventParams,
} from "@workspace/api-zod";

const router = Router();

function eventRow(e: typeof installationEventsTable.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    projectId: e.projectId ?? null,
    teamDescription: e.teamDescription ?? null,
    eventType: e.eventType,
    startDate: e.startDate,
    endDate: e.endDate ?? null,
    notes: e.notes ?? null,
    color: e.color,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/installation-events", async (req, res) => {
  const { month } = req.query as { month?: string };

  let rows;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;
    rows = await db
      .select()
      .from(installationEventsTable)
      .where(and(gte(installationEventsTable.startDate, start), lte(installationEventsTable.startDate, end)))
      .orderBy(installationEventsTable.startDate);
  } else {
    rows = await db
      .select()
      .from(installationEventsTable)
      .orderBy(installationEventsTable.startDate);
  }

  return res.json(rows.map(eventRow));
});

router.post("/installation-events", requireExecutorOrGestor, async (req, res) => {
  const body = CreateInstallationEventBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  const [event] = await db
    .insert(installationEventsTable)
    .values({
      title: body.data.title,
      projectId: body.data.projectId ?? null,
      teamDescription: body.data.teamDescription ?? null,
      eventType: body.data.eventType ?? "instalacao",
      startDate: body.data.startDate,
      endDate: body.data.endDate ?? null,
      notes: body.data.notes ?? null,
      color: body.data.color ?? "orange",
    })
    .returning();

  return res.status(201).json(eventRow(event));
});

router.patch("/installation-events/:id", requireExecutorOrGestor, async (req, res) => {
  const params = UpdateInstallationEventParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateInstallationEventBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const update: Record<string, unknown> = {};
  if (body.data.title !== undefined) update.title = body.data.title;
  if (body.data.projectId !== undefined) update.projectId = body.data.projectId;
  if (body.data.teamDescription !== undefined) update.teamDescription = body.data.teamDescription;
  if (body.data.eventType !== undefined) update.eventType = body.data.eventType;
  if (body.data.startDate !== undefined) update.startDate = body.data.startDate;
  if (body.data.endDate !== undefined) update.endDate = body.data.endDate;
  if (body.data.notes !== undefined) update.notes = body.data.notes;
  if (body.data.color !== undefined) update.color = body.data.color;

  const [event] = await db
    .update(installationEventsTable)
    .set(update)
    .where(eq(installationEventsTable.id, params.data.id))
    .returning();

  if (!event) return res.status(404).json({ error: "Not found" });
  return res.json(eventRow(event));
});

router.delete("/installation-events/:id", requireExecutorOrGestor, async (req, res) => {
  const params = DeleteInstallationEventParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(installationEventsTable).where(eq(installationEventsTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
