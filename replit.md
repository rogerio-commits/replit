# Ulimax — Sistema de Controle de Projetos

Sistema de gestão e controle de projetos para a Ulimax, com projetos, tarefas, membros de equipe e dashboard de acompanhamento.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ulimax run dev` — run the frontend (port 22537)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/db/src/schema/` — Drizzle schema (projects.ts, tasks.ts, members.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/ulimax/src/pages/` — React pages (dashboard, projects, tasks, members)

## Architecture decisions

- Contract-first OpenAPI: spec gates codegen, which gates frontend
- Activity feed uses composite key `${type}-${id}` to avoid React duplicate key warnings when tasks and projects share IDs
- Dashboard summary computed server-side from live DB queries
- Recent activity merges tasks + projects sorted by createdAt

## Product

- **Dashboard** — métricas resumidas (projetos, tarefas, vencidas, equipe), atividade recente, breakdown por status
- **Projetos** — CRUD completo com filtros por status e prioridade, detalhe com estatísticas e tarefas do projeto
- **Tarefas** — lista global com filtros por projeto, status, prioridade e responsável
- **Equipe** — gestão de membros com nome, cargo e e-mail
- **Cobrança automática** — scheduler diário (7h America/Sao_Paulo, once/day claim em `scheduler_state`) notifica pendências por membro + resumo para gestores; botão "Executar agora" em Automações; e-mails prontos porém dormentes (sem `RESEND_API_KEY`)
- **Assistente IA** — chat PT-BR gestor-only (`/assistente`, POST `/assistant/chat`) via Replit AI Integrations (OpenAI-compat, modelo `gpt-5.6-terra`); snapshot compacto do banco no system prompt; conversa não persistida no servidor
- **Mobile** — nav hambúrguer, formulários empilham em telas estreitas, anexos com botão "Foto" (captura direta da câmera)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After OpenAPI changes, always run codegen before touching routes or frontend
- Enums in Drizzle require explicit type casting when inserting

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
