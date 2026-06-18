import { pgTable, text, serial, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const assistenciaTecnicaStatusEnum = pgEnum("assistencia_tecnica_status", [
  "aberto",
  "em_andamento",
  "concluido",
  "cancelado",
]);

export const assistenciaTecnicaTable = pgTable("assistencia_tecnica", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  contact: text("contact").notNull(),
  description: text("description").notNull(),
  status: assistenciaTecnicaStatusEnum("status").notNull().default("aberto"),
  scheduledDate: text("scheduled_date"),
  responsibleMembers: text("responsible_members"),
  realizado: boolean("realizado").notNull().default(false),
  realizadoAt: timestamp("realizado_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AssistenciaTecnica = typeof assistenciaTecnicaTable.$inferSelect;
