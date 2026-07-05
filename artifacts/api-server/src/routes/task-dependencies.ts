import { Router } from "express";
import { db, taskDependenciesTable, tasksTable } from "@workspace/db";
import { requireExecutorOrGestor } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
import {
  ListTaskDependenciesParams,
  AddTaskDependencyParams,
  AddTaskDependencyBody,
  RemoveTaskDependencyParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/tasks/:id/dependencies", async (req, res) => {
  const params = ListTaskDependenciesParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const deps = await db
    .select({
      dep: taskDependenciesTable,
      depTask: tasksTable,
    })
    .from(taskDependenciesTable)
    .innerJoin(tasksTable, eq(taskDependenciesTable.dependsOnTaskId, tasksTable.id))
    .where(eq(taskDependenciesTable.taskId, params.data.id))
    .orderBy(taskDependenciesTable.createdAt);

  return res.json(deps.map((d) => ({
    id: d.dep.id,
    taskId: d.dep.taskId,
    dependsOnTaskId: d.dep.dependsOnTaskId,
    dependsOnTitle: d.depTask.title,
    dependsOnStatus: d.depTask.status,
    createdAt: d.dep.createdAt.toISOString(),
  })));
});

router.post("/tasks/:id/dependencies", requireExecutorOrGestor, async (req, res) => {
  const params = AddTaskDependencyParams.safeParse({ id: Number(req.params.id) });
  const body = AddTaskDependencyBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  if (params.data.id === body.data.dependsOnTaskId) {
    return res.status(400).json({ error: "Uma tarefa não pode depender de si mesma" });
  }

  const [depTask] = await db.select({ id: tasksTable.id, title: tasksTable.title, status: tasksTable.status })
    .from(tasksTable).where(eq(tasksTable.id, body.data.dependsOnTaskId)).limit(1);
  if (!depTask) return res.status(404).json({ error: "Tarefa dependência não encontrada" });

  const existing = await db.select().from(taskDependenciesTable).where(
    and(eq(taskDependenciesTable.taskId, params.data.id), eq(taskDependenciesTable.dependsOnTaskId, body.data.dependsOnTaskId))
  ).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Dependência já existe" });

  const [dep] = await db.insert(taskDependenciesTable).values({
    taskId: params.data.id,
    dependsOnTaskId: body.data.dependsOnTaskId,
  }).returning();

  return res.status(201).json({
    id: dep.id,
    taskId: dep.taskId,
    dependsOnTaskId: dep.dependsOnTaskId,
    dependsOnTitle: depTask.title,
    dependsOnStatus: depTask.status,
    createdAt: dep.createdAt.toISOString(),
  });
});

router.delete("/tasks/:id/dependencies/:depId", requireExecutorOrGestor, async (req, res) => {
  const params = RemoveTaskDependencyParams.safeParse({ id: Number(req.params.id), depId: Number(req.params.depId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  await db.delete(taskDependenciesTable).where(
    and(eq(taskDependenciesTable.id, params.data.depId), eq(taskDependenciesTable.taskId, params.data.id))
  );
  return res.status(204).send();
});

export default router;
