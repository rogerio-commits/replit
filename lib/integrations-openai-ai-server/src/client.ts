import OpenAI from "openai";

/**
 * Cliente de IA compatível com a API da OpenAI.
 *
 * A criação é preguiçosa de propósito. Antes, a falta das variáveis derrubava
 * o módulo no momento do import — o que, em produção, derrubava o servidor
 * inteiro no boot, e não apenas o assistente. Agora a ausência de configuração
 * só afeta quem realmente chama a IA.
 */

let cached: OpenAI | null = null;

/** Indica se o assistente de IA está configurado neste ambiente. */
export function isAiConfigured(): boolean {
  return Boolean(
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL &&
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  );
}

/**
 * Devolve o cliente, criando-o na primeira chamada.
 * Lança apenas se a IA for de fato usada sem configuração.
 */
export function getOpenAi(): OpenAI {
  if (!isAiConfigured()) {
    throw new Error(
      "Assistente de IA não configurado. Defina AI_INTEGRATIONS_OPENAI_BASE_URL " +
        "e AI_INTEGRATIONS_OPENAI_API_KEY.",
    );
  }

  if (!cached) {
    cached = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  return cached;
}
