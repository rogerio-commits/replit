import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const checklistStatusEnum = pgEnum("checklist_status", [
  "nao_instalado",
  "instalado",
  "finalizado",
]);

export const checklistItemsTable = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  peca: text("peca").notNull(),
  local: text("local"),
  status: checklistStatusEnum("status").notNull().default("nao_instalado"),
  actionDescription: text("action_description"),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  actionDueDate: text("action_due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ChecklistItem = typeof checklistItemsTable.$inferSelect;
