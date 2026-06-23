# Threat Model

## Project Overview

Ulimax is a private-deployed project management system for internal team use. The production stack is a React/Vite frontend (`artifacts/ulimax`) backed by an Express 5 API (`artifacts/api-server`) with PostgreSQL via Drizzle. Users authenticate with Clerk and receive one of three application roles: `gestor`, `executor`, or `observador`.

This scan assumes Replit deployment TLS and that the `artifacts/mockup-sandbox` app is dev-only and not production reachable.

## Assets

- **Project and task data** — project schedules, priorities, deadlines, task assignments, checklist items, site visits, observations, and installation events. Unauthorized changes can disrupt operations or hide work status.
- **Team directory and account mappings** — member names, emails, roles, and the mapping between Clerk identities and app roles. Exposure enables targeting of specific staff; unauthorized changes enable privilege abuse.
- **Authorization state** — role assignments and per-project participant assignments. These determine who may alter which operational records.
- **Application secrets and auth tokens** — Clerk credentials, bearer tokens, and database credentials. Compromise would enable impersonation or full backend access.

## Trust Boundaries

- **Browser to API** — the React client is untrusted. Every API route must enforce role and object-level authorization server-side regardless of frontend gating.
- **API to PostgreSQL** — the API has broad write access to business records. Authorization mistakes at the API layer directly become database tampering or disclosure.
- **Authenticated role boundary** — `gestor`, `executor`, and `observador` are materially different privilege levels. Role restrictions must be enforced on every relevant route.
- **Project participant boundary** — some executor actions are only allowed when the executor is assigned to the target project. This per-project boundary is separate from global role checks.
- **Internal vs dev-only boundary** — `artifacts/mockup-sandbox` is out of scope unless production reachability is demonstrated.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/`, `artifacts/api-server/src/middlewares/requireAuth.ts`
- Highest-risk backend areas: `artifacts/api-server/src/routes/projects.ts`, `tasks.ts`, `installation-events.ts`, and other operational mutation routes that rely on frontend permission assumptions
- Frontend permission assumptions: `artifacts/ulimax/src/hooks/useAppUser.ts`, `artifacts/ulimax/src/pages/project-detail.tsx`, `artifacts/ulimax/src/pages/checklist.tsx`, `artifacts/ulimax/src/pages/assistencia-tecnica.tsx`, `artifacts/ulimax/src/pages/calendario.tsx`, `artifacts/ulimax/src/pages/ajuda.tsx`
- Public surface: `/api/healthz`; all other API routes sit behind `requireAuth`
- Dev-only area to ignore by default: `artifacts/mockup-sandbox`

## Threat Categories

### Spoofing

The application relies on Clerk bearer tokens to identify users, then maps the Clerk user ID to an internal `users` row and role. The API must only trust server-validated Clerk identity data and must never let the client choose its effective role or impersonate another user through member or user identifiers.

### Tampering

This application’s main risk is unauthorized modification of operational records. Role checks (`gestor` vs `executor` vs `observador`) and project participant checks must be enforced server-side for every mutation route that changes projects, tasks, checklist items, visits, observations, schedules, or team records. Frontend-only gating is not a security control.

### Information Disclosure

Authenticated users can access sensitive internal planning and personnel data. API responses must not expose projects, assignments, member emails, or project-scoped records beyond what the authenticated role and participant relationship are allowed to see. Error messages and logs must also avoid leaking tokens or sensitive request data.

### Denial of Service

The main realistic DoS risk is low-privilege authenticated users triggering broad reads or repeated writes on operational endpoints. Routes that load full tables in memory or perform unbounded list operations should remain limited to trusted internal use and protected by role checks where appropriate.

### Elevation of Privilege

The most important guarantee is that lower-privilege users cannot gain wider control by calling backend routes directly. `observador` users must remain read-only, and `executor` users must not be able to alter project-scoped records for projects where they are not participants. Server-side authorization must follow these guarantees even when the UI hides controls.