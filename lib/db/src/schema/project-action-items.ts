import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const projectActionItemsTable = pgTable("project_action_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectActionItem = typeof projectActionItemsTable.$inferSelect;
