import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed"]);
export const projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high"]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
