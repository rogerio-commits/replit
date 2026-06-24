import { Router } from "express";
import { db, projectsTable, tasksTable, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const projects = await db.select().from(projectsTable);
  const tasks = await db.select().from(tasksTable);
  const members = await db.select().from(membersTable);

  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
  ).length;

  return res.json({
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => ["em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"].includes(p.status)).length,
    completedProjects: projects.filter((p) => p.status === "em_instalacao").length,
    totalTasks: tasks.length,
    doneTasks: tasks.filter((t) => t.status === "done").length,
    overdueTasks,
    totalMembers: members.length,
    projectsByStatus: {
      a_iniciar: projects.filter((p) => p.status === "a_iniciar").length,
      em_projeto: projects.filter((p) => p.status === "em_projeto").length,
      em_aprovacao: projects.filter((p) => p.status === "em_aprovacao").length,
      em_producao: projects.filter((p) => p.status === "em_producao").length,
      aguardando_instalacao: projects.filter((p) => p.status === "aguardando_instalacao").length,
      em_instalacao: projects.filter((p) => p.status === "em_instalacao").length,
    },
    tasksByStatus: {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    },
    tasksByPriority: {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
    },
  });
});

router.get("/dashboard/recent-activity", async (_req, res) => {
  const { eq } = await import("drizzle-orm");

  const recentTasks = await db
    .select({
      task: tasksTable,
      projectName: projectsTable.name,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .orderBy(tasksTable.createdAt)
    .limit(5);

  const recentProjects = await db
    .select()
    .from(projectsTable)
    .orderBy(projectsTable.createdAt)
    .limit(5);

  const activity = [
    ...recentTasks.map((r) => ({
      id: r.task.id,
      type: "task" as const,
      title: r.task.title,
      status: r.task.status,
      priority: r.task.priority,
      projectName: r.projectName ?? null,
      createdAt: r.task.createdAt.toISOString(),
    })),
    ...recentProjects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      status: p.status,
      priority: p.priority,
      projectName: null,
      createdAt: p.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return res.json(activity);
});

router.get("/dashboard/member-productivity", async (_req, res) => {
  const members = await db.select().from(membersTable);
  const tasks = await db.select().from(tasksTable);
  const now = new Date();

  const stats = members.map((m) => {
    const memberTasks = tasks.filter((t) => t.assignedTo === m.id);
    const doneTasks = memberTasks.filter((t) => t.status === "done").length;
    const openTasks = memberTasks.filter((t) => t.status !== "done").length;
    const overdueTasks = memberTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
    ).length;
    return {
      memberId: m.id,
      memberName: m.name,
      email: m.email,
      role: m.role,
      totalTasks: memberTasks.length,
      doneTasks,
      openTasks,
      overdueTasks,
    };
  });

  return res.json(stats);
});

export default router;
