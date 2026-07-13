import { Router } from "express";
import { db } from "@workspace/db";
import { timeEntriesTable, membersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/tasks/:id/time-entries", async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task id" });

  const entries = await db
    .select({
      id: timeEntriesTable.id,
      taskId: timeEntriesTable.taskId,
      memberId: timeEntriesTable.memberId,
      memberName: membersTable.name,
      hours: timeEntriesTable.hours,
      description: timeEntriesTable.description,
      date: timeEntriesTable.date,
      createdAt: timeEntriesTable.createdAt,
    })
    .from(timeEntriesTable)
    .leftJoin(membersTable, eq(timeEntriesTable.memberId, membersTable.id))
    .where(eq(timeEntriesTable.taskId, taskId))
    .orderBy(desc(timeEntriesTable.date));

  return res.json(
    entries.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      memberId: e.memberId,
      memberName: e.memberName ?? null,
      hours: Number(e.hours),
      description: e.description ?? null,
      date: e.date,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/tasks/:id/time-entries", async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task id" });

  const { hours, description, date, memberId: bodyMemberId } = req.body as {
    hours: unknown;
    description?: string;
    date: unknown;
    memberId?: number;
  };

  if (!hours || !date) return res.status(400).json({ error: "hours and date are required" });
  const hoursNum = Number(hours);
  if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
    return res.status(400).json({ error: "hours must be between 0.01 and 24" });
  }

  let resolvedMemberId = bodyMemberId;
  if (!resolvedMemberId) {
    const appUser = req.appUser!;
    const [member] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(eq(membersTable.email, appUser.email))
      .limit(1);
    resolvedMemberId = member?.id;
  }
  if (!resolvedMemberId) return res.status(400).json({ error: "Member not found for current user" });

  const [entry] = await db
    .insert(timeEntriesTable)
    .values({
      taskId,
      memberId: resolvedMemberId,
      hours: hoursNum.toString(),
      description: description ?? null,
      date: String(date),
    })
    .returning();

  const [member] = await db
    .select({ name: membersTable.name })
    .from(membersTable)
    .where(eq(membersTable.id, resolvedMemberId))
    .limit(1);

  return res.status(201).json({
    id: entry.id,
    taskId: entry.taskId,
    memberId: entry.memberId,
    memberName: member?.name ?? null,
    hours: Number(entry.hours),
    description: entry.description ?? null,
    date: entry.date,
    createdAt: entry.createdAt.toISOString(),
  });
});

router.delete("/time-entries/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, id));
  return res.status(204).send();
});

export default router;
