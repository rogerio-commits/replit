import { db, automationRulesTable, notificationsTable, membersTable, usersTable, projectMembersTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import type { Logger } from "pino";

export type AutomationTrigger =
  | "task_completed"
  | "task_status_changed"
  | "project_completed"
  | "task_assigned"
  | "project_status_changed";

export interface AutomationContext {
  taskId?: number;
  taskTitle?: string;
  taskAssignedTo?: number | null;
  projectId?: number;
  projectName?: string;
  newStatus?: string;
  actorEmail?: string;
}

async function getUserIdByMemberId(memberId: number): Promise<number | null> {
  const member = await db
    .select({ email: membersTable.email })
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .limit(1);
  if (!member[0]) return null;
  const user = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, member[0].email))
    .limit(1);
  return user[0]?.id ?? null;
}

async function getProjectMemberUserIds(projectId: number): Promise<number[]> {
  const members = await db
    .select({ memberId: projectMembersTable.memberId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, projectId));

  const memberIds = members.map((m) => m.memberId);
  if (!memberIds.length) return [];

  const rows = await db
    .select({ email: membersTable.email })
    .from(membersTable)
    .where(inArray(membersTable.id, memberIds));

  const emails = rows.map((r) => r.email);
  if (!emails.length) return [];

  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(inArray(usersTable.email, emails));

  return users.map((u) => u.id);
}

async function getAllUserIds(): Promise<number[]> {
  const users = await db.select({ id: usersTable.id }).from(usersTable);
  return users.map((u) => u.id);
}

async function getGestorUserIds(): Promise<number[]> {
  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "gestor"));
  return users.map((u) => u.id);
}

async function createNotificationsForUsers(
  userIds: number[],
  type: "task_assigned" | "task_overdue" | "task_status_changed" | "task_commented" | "project_status_changed" | "mention",
  title: string,
  body: string,
  entityType?: string,
  entityId?: number,
) {
  if (!userIds.length) return;
  await db.insert(notificationsTable).values(
    userIds.map((userId) => ({ userId, type, title, body, entityType, entityId })),
  );
}

export async function runAutomations(
  trigger: AutomationTrigger,
  ctx: AutomationContext,
  log: Logger,
): Promise<void> {
  try {
    const rules = await db
      .select()
      .from(automationRulesTable)
      .where(eq(automationRulesTable.isActive, true));

    const matching = rules.filter((r) => r.trigger === trigger);
    if (!matching.length) return;

    for (const rule of matching) {
      try {
        await executeAction(rule.actionType, trigger, ctx, log);
        await db
          .update(automationRulesTable)
          .set({
            executionCount: sql`${automationRulesTable.executionCount} + 1`,
            lastFiredAt: new Date(),
          })
          .where(eq(automationRulesTable.id, rule.id));
      } catch (err) {
        log.error({ err, ruleId: rule.id, trigger }, "Automation rule execution failed");
      }
    }
  } catch (err) {
    log.error({ err, trigger }, "Failed to run automations");
  }
}

async function executeAction(
  actionType: string,
  trigger: AutomationTrigger,
  ctx: AutomationContext,
  log: Logger,
) {
  const taskTitle = ctx.taskTitle ?? "Tarefa";
  const projectName = ctx.projectName ?? "Projeto";

  switch (actionType) {
    case "notify_assignee": {
      if (!ctx.taskAssignedTo) return;
      const userId = await getUserIdByMemberId(ctx.taskAssignedTo);
      if (!userId) return;
      const title = trigger === "task_completed"
        ? `Tarefa concluída: ${taskTitle}`
        : trigger === "task_status_changed"
          ? `Status alterado: ${taskTitle}`
          : `Automação: ${taskTitle}`;
      await createNotificationsForUsers(
        [userId],
        "task_status_changed",
        title,
        `Projeto: ${projectName}`,
        "task",
        ctx.taskId,
      );
      break;
    }

    case "notify_all": {
      const userIds = ctx.projectId
        ? await getProjectMemberUserIds(ctx.projectId)
        : await getAllUserIds();
      const title = trigger === "task_completed"
        ? `Tarefa concluída: ${taskTitle}`
        : trigger === "project_status_changed"
          ? `Status do projeto alterado: ${projectName}`
          : trigger === "project_completed"
            ? `Projeto concluído: ${projectName}`
            : `Automação: ${taskTitle}`;
      await createNotificationsForUsers(
        userIds,
        trigger === "project_status_changed" || trigger === "project_completed"
          ? "project_status_changed"
          : "task_status_changed",
        title,
        trigger === "project_status_changed"
          ? `Novo status: ${ctx.newStatus ?? "—"}`
          : `Projeto: ${projectName}`,
        ctx.taskId ? "task" : "project",
        ctx.taskId ?? ctx.projectId,
      );
      break;
    }

    case "notify_gestor": {
      const gestorIds = await getGestorUserIds();
      const title = trigger === "task_completed"
        ? `Tarefa concluída: ${taskTitle}`
        : trigger === "task_assigned"
          ? `Tarefa atribuída: ${taskTitle}`
          : `Automação: ${taskTitle}`;
      await createNotificationsForUsers(
        gestorIds,
        "task_status_changed",
        title,
        `Projeto: ${projectName}`,
        ctx.taskId ? "task" : "project",
        ctx.taskId ?? ctx.projectId,
      );
      break;
    }

    case "advance_task_status": {
      // No-op server side for now — status advancement is handled by frontend
      log.info({ trigger, ctx }, "advance_task_status automation triggered");
      break;
    }

    default:
      log.warn({ actionType }, "Unknown automation action type");
  }
}
