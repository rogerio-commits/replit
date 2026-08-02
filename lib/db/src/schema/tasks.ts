import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const taskRecurrenceEnum = pgEnum("task_recurrence", ["none", "daily", "weekly", "monthly", "yearly"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  parentId: integer("parent_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to"),
  dueDate: text("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  recurrence: taskRecurrenceEnum("recurrence").notNull().default("none"),
  recurrenceEndDate: text("recurrence_end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
