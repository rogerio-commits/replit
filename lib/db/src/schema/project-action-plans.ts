import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectActionPlansTable = pgTable("project_action_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectActionPlan = typeof projectActionPlansTable.$inferSelect;
