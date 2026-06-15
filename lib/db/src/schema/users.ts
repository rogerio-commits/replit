import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["gestor", "colaborador"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().default(""),
  role: userRoleEnum("role").notNull().default("colaborador"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AppUser = typeof usersTable.$inferSelect;
export type InsertAppUser = typeof usersTable.$inferInsert;
