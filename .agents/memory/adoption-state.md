---
name: Adoption state
description: Real usage status of the Ulimax system (dev/prod data volumes) and what "missing feature in prod" reports usually mean.
---

# Adoption state (as of 2026-07-25)

Both databases are nearly empty — the team has NOT started using the system yet:

- **Prod**: 1 test project, 5 automation_rules, 1 user (the gestora's account).
- **Dev**: 4 users (1 gestor + 3 executors), 0 projects/tasks.

**Why this matters:**
- Features that read history (dashboards, resumo de ontem, desempenho) will look empty/quiet until real data exists — that is expected, not a bug.
- The gestora's reports of "button/feature missing" on the published site have so far been caused by a **stale production build**, not by roles or code. First response: remind her to republish (text only — never show a deploy card for this user).

**How to apply:** before debugging prod-only "missing UI" complaints, compare deploy date vs. feature date; before judging empty dashboards, check whether real data entry has started. Adoption-focused design decisions live in `docs/superpowers/specs/2026-07-25-dinamica-de-uso-design.md`.
