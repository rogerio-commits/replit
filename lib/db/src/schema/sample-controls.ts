import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const sampleControlsTable = pgTable("sample_controls", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  samples: text("samples").notNull(),
  responsibleId: integer("responsible_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),
  deadline: text("deadline").notNull(),
  requester: text("requester").notNull(),
  status: text("status").notNull().default("pendente"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SampleControl = typeof sampleControlsTable.$inferSelect;
