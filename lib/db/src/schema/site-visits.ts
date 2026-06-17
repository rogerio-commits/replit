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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SiteVisit = typeof siteVisitsTable.$inferSelect;
