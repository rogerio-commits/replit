---
name: Stale task detection
description: Tasks have no updatedAt; staleness uses createdAt proxy, and date-only strings must be parsed as local midnight.
---

- The task model has `createdAt` and `completedAt` but **no `updatedAt`**. "Tarefa parada" (stale) detection uses the proxy: status `todo` + createdAt ≥ 7 days.
- **Why:** without updatedAt there's no way to know last activity; createdAt-based age is the agreed approximation (badge on tasks page + `stale_task` alert in useAlerts).
- **How to apply:** keep the tasks.tsx badge and useAlerts.ts alert using the same date-only midnight math (`parseLocalDate`/`daysFromToday` style) or they disagree at day boundaries. Never `new Date("YYYY-MM-DD")` directly — it parses as UTC and shifts a day in local timezones. Suppress stale alert when the task is already overdue or has no assignee (those alerts cover it).
