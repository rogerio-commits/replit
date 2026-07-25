---
name: Composite libs & one-off server scripts
description: lib/db exposes stale dist .d.ts to dependents; how to typecheck after schema changes and how to run one-off TS scripts without tsx.
---

## Stale dist after schema changes
`lib/db` is a TypeScript composite project (`emitDeclarationOnly` → `dist/`). `artifacts/api-server` references it, so `tsc --noEmit` in api-server reads `lib/db/dist/*.d.ts`, NOT the source.

**Rule:** after editing anything in `lib/db/src/schema/`, run `pnpm exec tsc -b lib/db` (root) before typechecking api-server, or the new export "doesn't exist".

**Why:** hit this with a new schema table — api-server typecheck failed with TS2305 even though exports were correct. The API-spec codegen script (`pnpm --filter @workspace/api-spec run codegen`) also runs `tsc --build` at root, which refreshes all lib dists.

## One-off TS scripts on the server
No `tsx` and no `python3` in this environment. The api-server builds with esbuild (`build.mjs`).

**How to run a one-off TS script** (e.g., to smoke-test a lib against real env vars/DB):
```
cd artifacts/api-server
pnpm exec esbuild src/scripts/<script>.ts --bundle --platform=node --format=esm --outfile=/tmp/<script>.mjs --log-level=error
node /tmp/<script>.mjs
```
Bundle everything (don't externalize workspace deps — they're TS source). Delete the script after.
