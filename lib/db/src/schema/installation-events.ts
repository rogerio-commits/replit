import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const installationEventsTable = pgTable("installation_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  projectId: integer("project_id"),
  teamDescription: text("team_description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  color: text("color").notNull().default("orange"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInstallationEventSchema = createInsertSchema(installationEventsTable).omit({ id: true, createdAt: true });
export type InsertInstallationEvent = z.infer<typeof insertInstallationEventSchema>;
export type InstallationEvent = typeof installationEventsTable.$inferSelect;
