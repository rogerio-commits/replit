import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const projectPhaseHistoryTable = pgTable("project_phase_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export type ProjectPhaseHistory = typeof projectPhaseHistoryTable.$inferSelect;
