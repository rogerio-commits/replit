---
name: Gestor de Obras role
description: Boundaries of the gestor_obras role and every place the role enum must stay in sync
---

# Gestor de Obras (`gestor_obras`)

4th system role, between gestor and executor. Agreed boundaries:

- **Can**: operate everything operational in ALL projects without being a participant —
  tasks, projects (create/edit), checklist/instalações, calendário (installation events),
  assistência técnica (create/edit/realizado), amostras, gantt, portfolio, meu-dia.
  Gets the 7am daily reminder e-mails like gestores.
- **Cannot**: delete projects (explicit 403 in projects DELETE), approve/archive projects,
  or reach any `requireGestor` route (invites, members write, templates, automation, audit,
  assistant, project members write, assistencia DELETE).
- Participant checks only test `role === "executor"`, so gestor_obras bypasses them
  automatically — no schema change needed for that.
- Admin route files do NOT inherit `requireGestor` from anywhere — each route must add it
  explicitly. Automation-rules, audit-logs and template GETs were once left open to all
  authenticated roles; always check the guard when touching admin routes.
- Frontend: home = `/obra` (Central da Obra page); allowed prefixes in `access.ts`
  (GESTOR_OBRAS_PREFIXES). No `/dashboard` access (that stays gestor/observador).

## Role enum sync points (adding another role = touch ALL of these)

1. `lib/db` pgEnum `user_role` (append at END) + `ALTER TYPE user_role ADD VALUE IF NOT EXISTS '<role>'` on dev DB (prod gets it via Publish schema diff).
2. `lib/api-spec/openapi.yaml` → `UserRole` enum (static YAML!) then `pnpm run codegen` in `lib/api-spec` (regenerates api-client-react + api-zod).
3. api-server: `AppUserRole` type in requireAuth middleware; `validRoles` + cast in invitations route; roleLabel ternary in email lib; daily-reminders gestores filter.
4. ulimax hardcoded unions: `access.ts` SystemRole, `members.tsx` local SystemRole + ROLE_META + 2 zod enums + 2 hardcoded SelectItem lists (inline row select + RoleSelectItems), `layout.tsx` role cast (line ~63) + navGroups ternary, command-palette role gates, `useCanEdit` in useAppUser.

**Why:** the enum is duplicated across db, static openapi.yaml, and several UI literals — TS2367 "no overlap" errors after adding a role mean one of these was missed.
