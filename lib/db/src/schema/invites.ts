import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { userRoleEnum } from "./users";

export const invitesTable = pgTable("invites", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  intendedRole: userRoleEnum("intended_role").notNull().default("observador"),
  clerkInvitationId: text("clerk_invitation_id"),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
});

export type Invite = typeof invitesTable.$inferSelect;
export type InsertInvite = typeof invitesTable.$inferInsert;
