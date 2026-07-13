import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customFieldDefinitionsTable } from "./custom-field-definitions";

export const customFieldValuesTable = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  fieldId: integer("field_id")
    .notNull()
    .references(() => customFieldDefinitionsTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldValueSchema = createInsertSchema(customFieldValuesTable, {
  entityType: z.enum(["project", "task"]),
  entityId: z.number().int().positive(),
  value: z.string().optional(),
}).omit({ id: true, updatedAt: true });

export type InsertCustomFieldValue = z.infer<typeof insertCustomFieldValueSchema>;
export type CustomFieldValue = typeof customFieldValuesTable.$inferSelect;
