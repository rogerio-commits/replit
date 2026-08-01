/**
 * Entrada para ambiente serverless (Vercel).
 *
 * O Express é exportado como handler: a plataforma cria a instância sob demanda
 * e a reaproveita entre requisições, então nada de `listen()` aqui.
 *
 * O agendamento diário não vem mais de um processo eterno — quem dispara é o
 * cron da Vercel chamando GET /api/cron/daily-reminders (ver vercel.json).
 */
import app from "./app";

export default app;
