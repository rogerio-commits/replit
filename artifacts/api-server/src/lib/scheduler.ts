import { db, schedulerStateTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import type { Logger } from "pino";
import {
  runDailyReminders,
  spToday,
  spHour,
  type DailyRemindersResult,
} from "./daily-reminders";
import { recordDailyMetricsSnapshot } from "./metrics-snapshot";

const KEY = "daily_reminders_last_run";
const RUN_AFTER_HOUR = 7; // dispara a partir das 07:00 (horário de São Paulo)
const TICK_MS = 10 * 60 * 1000;
const BOOT_DELAY_MS = 15 * 1000;

async function getLastRun(): Promise<string | null> {
  const [row] = await db
    .select()
    .from(schedulerStateTable)
    .where(eq(schedulerStateTable.key, KEY));
  return row?.value ?? null;
}

async function setLastRun(date: string): Promise<void> {
  await db
    .insert(schedulerStateTable)
    .values({ key: KEY, value: date, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schedulerStateTable.key,
      set: { value: date, updatedAt: new Date() },
    });
}

/**
 * Reivindica o dia de forma atômica: um único INSERT ... ON CONFLICT DO UPDATE
 * com WHERE garante que apenas um executor grava `today` — corridas entre o
 * tick do scheduler, o boot e múltiplas instâncias não geram envio duplicado.
 */
async function claimDay(today: string): Promise<boolean> {
  const rows = await db
    .insert(schedulerStateTable)
    .values({ key: KEY, value: today, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schedulerStateTable.key,
      set: { value: today, updatedAt: new Date() },
      setWhere: sql`${schedulerStateTable.value} is distinct from ${today}`,
    })
    .returning({ key: schedulerStateTable.key });
  return rows.length > 0;
}

/**
 * Libera a reivindicação após uma falha (somente se ainda for a nossa),
 * permitindo que o próximo tick tente novamente no mesmo dia.
 */
async function releaseClaim(today: string): Promise<void> {
  await db
    .update(schedulerStateTable)
    .set({ value: `${today}:failed`, updatedAt: new Date() })
    .where(and(eq(schedulerStateTable.key, KEY), eq(schedulerStateTable.value, today)));
}

export interface SchedulerRunOutcome {
  ran: boolean;
  reason?: string;
  result?: DailyRemindersResult;
}

/**
 * Executa a cobrança diária no máximo uma vez por dia (após as 7h de São Paulo).
 * Com `force`, executa imediatamente (usada pelo botão do gestor) e também
 * marca o dia como executado para evitar repetição automática.
 */
export async function runDailyRemindersIfDue(
  log: Logger,
  opts?: { force?: boolean },
): Promise<SchedulerRunOutcome> {
  const today = spToday();

  if (!opts?.force) {
    if (spHour() < RUN_AFTER_HOUR) {
      return { ran: false, reason: "before_run_hour" };
    }
    const last = await getLastRun();
    if (last === today) {
      return { ran: false, reason: "already_ran_today" };
    }
    // Reivindicação atômica: só um executor por dia, mesmo com corridas.
    const claimed = await claimDay(today);
    if (!claimed) {
      return { ran: false, reason: "already_ran_today" };
    }
    try {
      const result = await runDailyReminders(log);
      return { ran: true, result };
    } catch (err) {
      // Libera o dia para o próximo tick tentar de novo (falha transitória).
      await releaseClaim(today).catch(() => {});
      throw err;
    }
  }

  // force (botão do gestor): executa sempre; marca o dia só após sucesso
  // para não bloquear a execução automática caso o envio manual falhe.
  const result = await runDailyReminders(log);
  await setLastRun(today);
  return { ran: true, result };
}

export function startScheduler(log: Logger): void {
  const tick = () => {
    recordDailyMetricsSnapshot(log).catch((err) => {
      log.error({ err }, "Scheduler: falha ao gravar snapshot de métricas");
    });
    runDailyRemindersIfDue(log)
      .then((outcome) => {
        if (outcome.ran) {
          log.info(outcome.result, "Scheduler: lembretes diários enviados");
        }
      })
      .catch((err) => {
        log.error({ err }, "Scheduler: falha ao executar lembretes diários");
      });
  };

  setTimeout(tick, BOOT_DELAY_MS);
  setInterval(tick, TICK_MS);
  log.info(
    { runAfterHour: RUN_AFTER_HOUR, tickMinutes: TICK_MS / 60000 },
    "Scheduler de lembretes diários iniciado (horário de São Paulo)",
  );
}
