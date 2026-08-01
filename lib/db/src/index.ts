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
 * mas o node-postgres só liga TLS se pedirmos explicitamente.
 *
 * Sobre a verificação do certificado: o pooler do Supabase é assinado por uma
 * autoridade própria, ausente da lista de confiáveis do Node — daí o erro
 * SELF_SIGNED_CERT_IN_CHAIN. Há dois caminhos:
 *
 * 1. Definir DATABASE_CA_CERT com o certificado da autoridade do provedor
 *    (Supabase → Settings → Database → SSL Configuration). O tráfego fica
 *    criptografado E a identidade do servidor é verificada. Preferível.
 *
 * 2. Sem essa variável, seguimos sem verificar a identidade do servidor. O
 *    tráfego continua criptografado, mas em tese alguém posicionado no meio do
 *    caminho poderia se passar pelo banco. Entre Vercel e Supabase, ambos na
 *    mesma infraestrutura, o risco é baixo — mas não é zero.
 */
const connectionString = process.env.DATABASE_URL;
const caCert = process.env.DATABASE_CA_CERT;
const isLocalDatabase = /@(localhost|127\.0\.0\.1|::1)[:/]/.test(
  connectionString,
);

function sslConfig() {
  if (isLocalDatabase) return {};
  if (caCert) return { ssl: { ca: caCert, rejectUnauthorized: true } };
  return { ssl: { rejectUnauthorized: false } };
}

export const pool = new Pool({
  connectionString,
  ...sslConfig(),
  ...(isServerless ? { max: 1, idleTimeoutMillis: 10_000 } : {}),
});

export const db = drizzle(pool, { schema });

export * from "./schema";
