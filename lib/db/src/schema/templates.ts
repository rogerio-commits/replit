import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatePriorityEnum = pgEnum("template_priority", ["low", "medium", "high"]);

export const projectTemplatesTable = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priority: templatePriorityEnum("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectTemplateTasksTable = pgTable("project_template_tasks", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: templatePriorityEnum("priority").notNull().default("medium"),
  offsetDays: integer("offset_days").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectTemplateSchema = createInsertSchema(projectTemplatesTable).omit({ id: true, createdAt: true });
export const insertProjectTemplateTaskSchema = createInsertSchema(projectTemplateTasksTable).omit({ id: true, createdAt: true });

export type ProjectTemplate = typeof projectTemplatesTable.$inferSelect;
export type ProjectTemplateTask = typeof projectTemplateTasksTable.$inferSelect;
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type InsertProjectTemplateTask = z.infer<typeof insertProjectTemplateTaskSchema>;
