import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const projectMembersTable = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.projectId, t.memberId),
  })
);

export type ProjectMember = typeof projectMembersTable.$inferSelect;
