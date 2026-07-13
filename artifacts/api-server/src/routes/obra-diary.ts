import { Router } from "express";
import { db } from "@workspace/db";
import { obraDiaryTable, membersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/projects/:id/obra-diary", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });

  const entries = await db
    .select({
      id: obraDiaryTable.id,
      projectId: obraDiaryTable.projectId,
      date: obraDiaryTable.date,
      weather: obraDiaryTable.weather,
      teamCount: obraDiaryTable.teamCount,
      activities: obraDiaryTable.activities,
      observations: obraDiaryTable.observations,
      incidents: obraDiaryTable.incidents,
      authorId: obraDiaryTable.authorId,
      authorName: membersTable.name,
      createdAt: obraDiaryTable.createdAt,
    })
    .from(obraDiaryTable)
    .leftJoin(membersTable, eq(obraDiaryTable.authorId, membersTable.id))
    .where(eq(obraDiaryTable.projectId, projectId))
    .orderBy(desc(obraDiaryTable.date));

  return res.json(
    entries.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      date: e.date,
      weather: e.weather ?? null,
      teamCount: e.teamCount ?? null,
      activities: e.activities,
      observations: e.observations ?? null,
      incidents: e.incidents ?? null,
      authorId: e.authorId ?? null,
      authorName: e.authorName ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/projects/:id/obra-diary", async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });

  const { date, weather, teamCount, activities, observations, incidents } = req.body as {
    date: string;
    weather?: string;
    teamCount?: number;
    activities: string;
    observations?: string;
    incidents?: string;
  };

  if (!date || !activities) return res.status(400).json({ error: "date and activities are required" });

  const appUser = req.appUser!;
  const [member] = await db
    .select({ id: membersTable.id, name: membersTable.name })
    .from(membersTable)
    .where(eq(membersTable.email, appUser.email))
    .limit(1);

  const [entry] = await db
    .insert(obraDiaryTable)
    .values({
      projectId,
      date,
      weather: weather ?? null,
      teamCount: teamCount ?? null,
      activities,
      observations: observations ?? null,
      incidents: incidents ?? null,
      authorId: member?.id ?? null,
    })
    .returning();

  return res.status(201).json({
    ...entry,
    authorName: member?.name ?? appUser.email.split("@")[0],
    date: entry.date,
    createdAt: entry.createdAt.toISOString(),
  });
});

router.patch("/obra-diary/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { date, weather, teamCount, activities, observations, incidents } = req.body as {
    date?: string;
    weather?: string;
    teamCount?: number;
    activities?: string;
    observations?: string;
    incidents?: string;
  };

  const updates: Record<string, unknown> = {};
  if (date !== undefined) updates.date = date;
  if (weather !== undefined) updates.weather = weather;
  if (teamCount !== undefined) updates.teamCount = teamCount;
  if (activities !== undefined) updates.activities = activities;
  if (observations !== undefined) updates.observations = observations;
  if (incidents !== undefined) updates.incidents = incidents;

  const [entry] = await db
    .update(obraDiaryTable)
    .set(updates)
    .where(eq(obraDiaryTable.id, id))
    .returning();

  if (!entry) return res.status(404).json({ error: "Entry not found" });

  return res.json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

router.delete("/obra-diary/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(obraDiaryTable).where(eq(obraDiaryTable.id, id));
  return res.status(204).send();
});

export default router;
