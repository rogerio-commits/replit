import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customFieldDefinitionsTable = pgTable("custom_field_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  options: jsonb("options").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitionsTable, {
  name: z.string().min(1),
  type: z.enum(["text", "number", "date", "select"]),
  entityType: z.enum(["project", "task"]),
  options: z.array(z.string()).optional(),
}).omit({ id: true, createdAt: true });

export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;
export type CustomFieldDefinition = typeof customFieldDefinitionsTable.$inferSelect;
