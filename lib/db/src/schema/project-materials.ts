import { pgTable, serial, integer, text, timestamp, date, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const projectMaterialsTable = pgTable("project_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  type: text("type").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  date: date("date").notNull(),
  notes: text("notes"),
  authorId: integer("author_id").references(() => membersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectMaterialSchema = createInsertSchema(projectMaterialsTable, {
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  type: z.enum(["entrada", "saida", "estoque"]),
  unitPrice: z.number().nonnegative().optional(),
}).omit({ id: true, createdAt: true });

export type InsertProjectMaterial = z.infer<typeof insertProjectMaterialSchema>;
export type ProjectMaterial = typeof projectMaterialsTable.$inferSelect;
