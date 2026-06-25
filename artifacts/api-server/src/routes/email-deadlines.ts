import { Router } from "express";
import { db, tasksTable, membersTable, projectsTable } from "@workspace/db";
import { eq, and, isNotNull, lte, gte } from "drizzle-orm";
import { sendDeadlineReminderEmail } from "../lib/email";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const router = Router();

// POST /api/email/notify-deadlines
// Sends reminder emails for tasks due in 0, 1, or 3 days that haven't been completed.
// Call this from an external cron (e.g. Render Cron Job, GitHub Actions, etc.) once per day.
router.post("/email/notify-deadlines", async (req, res) => {
  const today = startOfDay(new Date());
  const horizon = endOfDay(addDays(today, 3));

  const rows = await db
    .select({
      taskId: tasksTable.id,
      title: tasksTable.title,
      dueDate: tasksTable.dueDate,
      status: tasksTable.status,
      assignedTo: tasksTable.assignedTo,
      memberName: membersTable.name,
      memberEmail: membersTable.email,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(membersTable, eq(tasksTable.assignedTo, membersTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(
      and(
        isNotNull(tasksTable.dueDate),
        isNotNull(tasksTable.assignedTo),
        lte(tasksTable.dueDate, horizon.toISOString().split("T")[0]),
        gte(tasksTable.dueDate, today.toISOString().split("T")[0])
      )
    );

  const pending = rows.filter(
    (r) => r.status !== "done" && r.memberEmail && r.memberName
  );

  let sent = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    pending.map(async (r) => {
      if (!r.memberEmail || !r.memberName || !r.dueDate) return;
      const due = new Date(r.dueDate);
      const daysLeft = Math.max(0, Math.round((due.getTime() - today.getTime()) / 86400000));
      const dueDateFmt = format(due, "d 'de' MMMM", { locale: ptBR });
      try {
        await sendDeadlineReminderEmail({
          toEmail: r.memberEmail,
          toName: r.memberName,
          taskTitle: r.title,
          taskId: r.taskId,
          projectName: r.projectName ?? "Projeto",
          daysLeft,
          dueDate: dueDateFmt,
        });
        sent++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${r.taskId}: ${msg}`);
      }
    })
  );

  return res.json({ sent, errors, total: pending.length });
});

export default router;
