import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectObservationsTable = pgTable("project_observations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  authorName: text("author_name").notNull().default("Sistema"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectObservation = typeof projectObservationsTable.$inferSelect;
