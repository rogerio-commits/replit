import { db, auditLogsTable } from "@workspace/db";
import type { Logger } from "pino";

interface AuditEntry {
  entityType: "task" | "project" | "member";
  entityId: number;
  entityName: string;
  action: "created" | "updated" | "deleted" | "status_changed" | "assigned" | "unassigned";
  actorName: string;
  actorEmail: string;
  changes?: { field: string; from: unknown; to: unknown }[];
}

export async function logAudit(
  entry: AuditEntry,
  log: Pick<Logger, "warn">
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName,
      action: entry.action,
      actorName: entry.actorName,
      actorEmail: entry.actorEmail,
      changes: entry.changes ?? null,
    });
  } catch (e) {
    log.warn({ err: e }, "Failed to write audit log");
  }
}

export function diffObjects(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  fields: string[]
): { field: string; from: unknown; to: unknown }[] {
  return fields
    .filter((f) => prev[f] !== next[f] && next[f] !== undefined)
    .map((f) => ({ field: f, from: prev[f] ?? null, to: next[f] ?? null }));
}
