import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Em ambiente serverless cada invocação vive pouco e pode haver muitas em
 * paralelo. Um pool grande por instância esgota as conexões do Postgres
 * rapidamente, então limitamos a uma conexão e derrubamos as ociosas cedo.
 *
 * Importante: a DATABASE_URL deve apontar para o pooler em modo transação
 * (porta 6543 no Supabase), e não para a conexão direta.
 */
const isServerless = Boolean(process.env.VERCEL);

/**
 * Provedores gerenciados (Supabase, Neon, RDS) exigem conexão criptografada,
 * mas o node-postgres só liga TLS se a URL trouxer `sslmode` ou se pedirmos
 * explicitamente. Sem isso a conexão fica pendurada até estourar o tempo
 * limite. Só dispensamos TLS quando o banco é local.
 */
const connectionString = process.env.DATABASE_URL;
const isLocalDatabase = /@(localhost|127\.0\.0\.1|::1)[:/]/.test(
  connectionString,
);
const declaresSslMode = /[?&]sslmode=/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ...(isLocalDatabase || declaresSslMode ? {} : { ssl: true }),
  ...(isServerless ? { max: 1, idleTimeoutMillis: 10_000 } : {}),
});

export const db = drizzle(pool, { schema });

export * from "./schema";
