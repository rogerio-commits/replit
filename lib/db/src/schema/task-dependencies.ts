import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";

export const taskDependenciesTable = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TaskDependency = typeof taskDependenciesTable.$inferSelect;
