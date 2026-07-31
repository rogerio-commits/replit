import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { projectActionPlansTable } from "./project-action-plans";
import { membersTable } from "./members";

export const projectActionItemsTable = pgTable("project_action_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => projectActionPlansTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  responsibleExternal: text("responsible_external"),
  dueDate: text("due_date"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectActionItem = typeof projectActionItemsTable.$inferSelect;
