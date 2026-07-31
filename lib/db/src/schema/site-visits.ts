import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const siteVisitsTable = pgTable("site_visits", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  visitors: text("visitors").notNull(),
  objective: text("objective").notNull(),
  notes: text("notes"),
  reportFileKey: text("report_file_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SiteVisit = typeof siteVisitsTable.$inferSelect;

export const visitActionItemsTable = pgTable("visit_action_items", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id")
    .notNull()
    .references(() => siteVisitsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VisitActionItem = typeof visitActionItemsTable.$inferSelect;
