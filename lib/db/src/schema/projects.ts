import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectStatusEnum = pgEnum("project_status", ["a_iniciar", "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"]);
export const projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high"]);
export const projectMaterialTypeEnum = pgEnum("project_material_type", ["madeira", "aluminio"]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("a_iniciar"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  finalDate: text("final_date"),
  producaoStartDate: text("producao_start_date"),
  producaoEndDate: text("producao_end_date"),
  producaoFinalDate: text("producao_final_date"),
  medicaoDate: text("medicao_date"),
  instalacaoStartDate: text("instalacao_start_date"),
  materialType: projectMaterialTypeEnum("material_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
