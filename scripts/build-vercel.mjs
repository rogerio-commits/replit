/**
 * Monta o diretório .vercel/output no formato da Build Output API v3.
 *
 * Por que assim, e não pela detecção automática da Vercel: a plataforma
 * procura funções na pasta `api/` do repositório **antes** de rodar o build.
 * Como nossa função é gerada durante o build (o bundle do esbuild), ela ainda
 * não existe naquele momento e a validação falha com
 * "doesn't match any Serverless Functions inside the `api` directory".
 *
 * A Build Output API resolve isso de forma definitiva: nós declaramos
 * explicitamente o que é estático, o que é função e como rotear — sem depender
 * de nenhuma heurística.
 *
 * Estrutura produzida:
 *
 *   .vercel/output/
 *     config.json                          rotas + cron
 *     static/                              build do frontend (Vite)
 *     functions/api/index.func/
 *       index.mjs                          bundle do Express
 *       .vc-config.json                    runtime e handler
 */
import { cp, mkdir, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const OUTPUT_DIR = path.join(repoRoot, ".vercel", "output");
const STATIC_SRC = path.join(repoRoot, "artifacts", "ulimax", "dist", "public");
const SERVERLESS_SRC = path.join(
  repoRoot,
  "artifacts",
  "api-server",
  "dist",
  "serverless",
);
const FUNC_DIR = path.join(OUTPUT_DIR, "functions", "api", "index.func");

/** Horário do lembrete diário: 10:00 UTC = 07:00 em São Paulo (UTC-3). */
const DAILY_REMINDERS_SCHEDULE = "0 10 * * *";

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const [label, dir] of [
    ["frontend (artifacts/ulimax/dist/public)", STATIC_SRC],
    ["servidor (artifacts/api-server/dist/serverless)", SERVERLESS_SRC],
  ]) {
    if (!(await exists(dir))) {
      throw new Error(
        `Build do ${label} não encontrado. Rode "pnpm run build" antes.`,
      );
    }
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(FUNC_DIR, { recursive: true });

  // Estáticos: tudo que o Vite gerou vai para a raiz do domínio.
  await cp(STATIC_SRC, path.join(OUTPUT_DIR, "static"), { recursive: true });

  // Função: o bundle autocontido do Express, mais o sourcemap para que os
  // stack traces em produção apontem para o código original.
  await cp(SERVERLESS_SRC, FUNC_DIR, { recursive: true });

  await writeFile(
    path.join(FUNC_DIR, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: false,
        shouldAddSourcemapSupport: true,
        maxDuration: 60,
      },
      null,
      2,
    ) + "\n",
  );

  await writeFile(
    path.join(OUTPUT_DIR, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          // Tudo sob /api vai para o Express. A função recebe a URL original,
          // então as rotas internas continuam funcionando normalmente.
          { src: "/api/(.*)", dest: "/api/index" },
          // Arquivos estáticos existentes são servidos diretamente.
          { handle: "filesystem" },
          // Qualquer outra rota é da SPA: devolve o index.html e o Wouter
          // resolve no navegador.
          { src: "/(.*)", dest: "/index.html" },
        ],
        crons: [
          {
            path: "/api/cron/daily-reminders",
            schedule: DAILY_REMINDERS_SCHEDULE,
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );

  console.log("✓ .vercel/output pronto");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
