---
name: Project participant authorization
description: How executor access to project/task mutations is restricted to project participants via the project_members junction table.
---

## Rule
Executors can only PATCH/DELETE a project (or POST/PATCH/DELETE a task within it) if their email matches a `members` row that appears in `project_members` for that project. Gestors bypass this check entirely.

**Why:** Business requirement — team members should only alter data for projects they are assigned to.

**How to apply:**
- Both `artifacts/api-server/src/routes/projects.ts` and `tasks.ts` contain an `isExecutorParticipant(email, projectId)` helper that performs the two-step lookup (members by email → project_members by projectId + memberId).
- Return 403 with `{ error: "Você não é participante deste projeto" }` when the check fails.
- For task PATCH/DELETE, fetch the task first to get its `projectId`, then call the helper.
- Frontend: derive `canEdit = isGestor || (isExecutor && isParticipant)` using `useListProjectMembers(projectId)` cross-referenced with the current user's member record.
- The `project_members` table has a unique constraint on `(projectId, memberId)`; POST /projects/:id/members returns 409 on duplicates.
- Only gestors can add/remove participants (POST/DELETE /projects/:id/members use `requireGestor`).
