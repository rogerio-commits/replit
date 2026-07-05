import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskTagsTable = pgTable("task_tags", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
});

export type Tag = typeof tagsTable.$inferSelect;
export type TaskTag = typeof taskTagsTable.$inferSelect;
