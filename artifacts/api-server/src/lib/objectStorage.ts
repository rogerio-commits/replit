import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * Armazenamento de objetos sobre o Supabase Storage.
 *
 * Substitui a implementação anterior, que dependia do sidecar do Replit em
 * 127.0.0.1:1106 para obter credenciais do Google Cloud Storage — um serviço
 * que só existe dentro do Replit.
 *
 * Convenções:
 * - a chave real no bucket é `uploads/<uuid>` (privados) ou `public/<caminho>`;
 * - a aplicação e o banco guardam o "objectPath", no formato `/objects/<chave>`;
 * - o download nunca passa pelo servidor: as rotas redirecionam para uma URL
 *   assinada, o que mantém a função serverless leve e barata.
 */

const OBJECT_PREFIX = "/objects/";
const UPLOAD_DIR = "uploads";
const PUBLIC_DIR = "public";

/** Validade da URL assinada de download, em segundos. */
const DOWNLOAD_URL_TTL_SEC = 60 * 60;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} não configurada. Defina as variáveis do Supabase Storage ` +
        `(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET).`,
    );
  }
  return value;
}

let cachedClient: SupabaseClient | null = null;

function storageClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cachedClient;
}

function bucket() {
  const name = process.env.SUPABASE_STORAGE_BUCKET || "ulimax";
  return storageClient().storage.from(name);
}

/**
 * Converte o caminho guardado pela aplicação (`/objects/uploads/<uuid>`) na
 * chave real do bucket (`uploads/<uuid>`).
 */
export function objectPathToKey(objectPath: string): string {
  if (!objectPath.startsWith(OBJECT_PREFIX)) {
    throw new ObjectNotFoundError();
  }
  const key = objectPath.slice(OBJECT_PREFIX.length);
  // Barra a travessia de diretórios em caminhos vindos do cliente.
  if (!key || key.startsWith("/") || key.split("/").includes("..")) {
    throw new ObjectNotFoundError();
  }
  return key;
}

export class ObjectStorageService {
  /**
   * Gera uma URL assinada de upload. O cliente envia o arquivo direto para o
   * Supabase com PUT — nada trafega pelo servidor.
   *
   * Retorna também o `objectPath` que deve ser persistido no banco.
   */
  async getObjectEntityUploadURL(): Promise<{
    uploadURL: string;
    objectPath: string;
  }> {
    const key = `${UPLOAD_DIR}/${randomUUID()}`;
    const { data, error } = await bucket().createSignedUploadUrl(key);

    if (error || !data) {
      throw error ?? new Error("Falha ao gerar URL de upload");
    }

    return { uploadURL: data.signedUrl, objectPath: `${OBJECT_PREFIX}${key}` };
  }

  /** URL assinada de leitura para um objeto privado. */
  async getObjectDownloadURL(objectPath: string): Promise<string> {
    const key = objectPathToKey(objectPath);
    const { data, error } = await bucket().createSignedUrl(
      key,
      DOWNLOAD_URL_TTL_SEC,
    );

    if (error || !data) {
      throw new ObjectNotFoundError();
    }
    return data.signedUrl;
  }

  /** URL assinada para um asset sob o prefixo público do bucket. */
  async getPublicObjectURL(filePath: string): Promise<string | null> {
    const clean = filePath.replace(/^\/+/, "");
    if (!clean || clean.split("/").includes("..")) {
      return null;
    }

    const { data, error } = await bucket().createSignedUrl(
      `${PUBLIC_DIR}/${clean}`,
      DOWNLOAD_URL_TTL_SEC,
    );

    if (error || !data) {
      return null;
    }
    return data.signedUrl;
  }

  /** Remove o objeto do bucket. Não falha se ele já não existir. */
  async deleteObject(objectPath: string): Promise<void> {
    const key = objectPathToKey(objectPath);
    const { error } = await bucket().remove([key]);
    if (error) {
      throw error;
    }
  }
}
