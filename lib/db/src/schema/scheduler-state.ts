import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const schedulerStateTable = pgTable("scheduler_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SchedulerState = typeof schedulerStateTable.$inferSelect;
