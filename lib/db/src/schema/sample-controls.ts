import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const sampleControlsTable = pgTable("sample_controls", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projectsTable.id, { onDelete: "set null" }),
  samples: text("samples").notNull(),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  deadline: text("deadline").notNull(),
  requester: text("requester").notNull(),
  notes: text("notes"),
  ready: boolean("ready").notNull().default(false),
  delivered: boolean("delivered").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SampleControl = typeof sampleControlsTable.$inferSelect;
