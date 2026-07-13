import { pgTable, serial, integer, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const obraDiaryTable = pgTable("obra_diary", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  weather: text("weather"),
  teamCount: integer("team_count"),
  activities: text("activities").notNull(),
  observations: text("observations"),
  incidents: text("incidents"),
  authorId: integer("author_id").references(() => membersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertObraDiarySchema = createInsertSchema(obraDiaryTable, {
  activities: z.string().min(1),
  teamCount: z.number().int().nonnegative().optional(),
}).omit({ id: true, createdAt: true });

export type InsertObraDiary = z.infer<typeof insertObraDiarySchema>;
export type ObraDiary = typeof obraDiaryTable.$inferSelect;
