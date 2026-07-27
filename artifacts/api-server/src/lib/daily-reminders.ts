import {
  db,
  tasksTable,
  projectsTable,
  membersTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { ne } from "drizzle-orm";
import type { Logger } from "pino";
import {
  sendDailySummaryEmail,
  sendGestorDigestEmail,
  type DigestTaskItem,
} from "./email";

// São Paulo é UTC-3 o ano inteiro (sem horário de verão desde 2019).
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const STALE_DAYS = 7;
const UPCOMING_DAYS = 3;

export function spNow(): Date {
  return new Date(Date.now() - SP_OFFSET_MS);
}

/** Data de hoje (YYYY-MM-DD) no horário de São Paulo. */
export function spToday(): string {
  return spNow().toISOString().slice(0, 10);
}

/** Hora atual (0-23) no horário de São Paulo. */
export function spHour(): number {
  return spNow().getUTCHours();
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatBr(iso: string): string {
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
}

type BucketKey = "atrasadas" | "vencemHoje" | "proximas" | "paradas";

interface MemberBuckets {
  atrasadas: DigestTaskItem[];
  vencemHoje: DigestTaskItem[];
  proximas: DigestTaskItem[];
  paradas: DigestTaskItem[];
}

function emptyBuckets(): MemberBuckets {
  return { atrasadas: [], vencemHoje: [], proximas: [], paradas: [] };
}

function bucketsTotal(b: MemberBuckets): number {
  return b.atrasadas.length + b.vencemHoje.length + b.proximas.length + b.paradas.length;
}

export interface DailyRemindersResult {
  membersNotified: number;
  gestoresNotified: number;
  totalAtrasadas: number;
  totalVencemHoje: number;
  totalProximas: number;
  totalParadas: number;
  semResponsavel: number;
}

/**
 * Cobrança automática diária:
 *  - cada membro com pendências recebe uma notificação (e e-mail, quando ativo)
 *    listando tarefas atrasadas, que vencem hoje/em breve e paradas há 7+ dias;
 *  - cada gestor recebe um resumo geral da equipe.
 */
export async function runDailyReminders(log: Logger): Promise<DailyRemindersResult> {
  const today = spToday();
  const horizon = addDaysIso(today, UPCOMING_DAYS);
  const staleCutoffMs = Date.now() - STALE_DAYS * 86400000;

  const [tasks, projects, members, users] = await Promise.all([
    db.select().from(tasksTable).where(ne(tasksTable.status, "done")),
    db.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable),
    db.select().from(membersTable),
    db.select().from(usersTable),
  ]);

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const membersById = new Map(members.map((m) => [m.id, m]));
  const userByEmail = new Map(
    users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]),
  );

  const totals: Record<BucketKey, number> = {
    atrasadas: 0,
    vencemHoje: 0,
    proximas: 0,
    paradas: 0,
  };
  let semResponsavel = 0;
  const bucketsByMember = new Map<number, MemberBuckets>();

  for (const t of tasks) {
    if (t.assignedTo == null) semResponsavel++;

    const proj = projectNames.get(t.projectId) ?? "Projeto";
    let key: BucketKey | null = null;
    let meta = "";

    if (t.dueDate && t.dueDate < today) {
      key = "atrasadas";
      meta = `${proj} · venceu ${formatBr(t.dueDate)}`;
    } else if (t.dueDate && t.dueDate === today) {
      key = "vencemHoje";
      meta = `${proj} · vence hoje`;
    } else if (t.dueDate && t.dueDate > today && t.dueDate <= horizon) {
      key = "proximas";
      meta = `${proj} · vence ${formatBr(t.dueDate)}`;
    } else if (t.status === "todo" && t.createdAt.getTime() <= staleCutoffMs) {
      const dias = Math.floor((Date.now() - t.createdAt.getTime()) / 86400000);
      key = "paradas";
      meta = `${proj} · parada há ${dias} dias`;
    }

    if (!key) continue;
    totals[key]++;

    if (t.assignedTo != null) {
      let b = bucketsByMember.get(t.assignedTo);
      if (!b) {
        b = emptyBuckets();
        bucketsByMember.set(t.assignedTo, b);
      }
      b[key].push({ title: t.title, meta });
    }
  }

  const notifications: (typeof notificationsTable.$inferInsert)[] = [];
  const emailJobs: Promise<void>[] = [];
  let membersNotified = 0;

  // 1) Lembrete individual por membro com pendências
  for (const [memberId, buckets] of bucketsByMember) {
    const member = membersById.get(memberId);
    if (!member) continue;
    const total = bucketsTotal(buckets);
    if (!total) continue;

    membersNotified++;

    const parts: string[] = [];
    if (buckets.atrasadas.length) parts.push(`${buckets.atrasadas.length} atrasada${buckets.atrasadas.length > 1 ? "s" : ""}`);
    if (buckets.vencemHoje.length) parts.push(`${buckets.vencemHoje.length} vence${buckets.vencemHoje.length > 1 ? "m" : ""} hoje`);
    if (buckets.proximas.length) parts.push(`${buckets.proximas.length} vence${buckets.proximas.length > 1 ? "m" : ""} em até ${UPCOMING_DAYS} dias`);
    if (buckets.paradas.length) parts.push(`${buckets.paradas.length} parada${buckets.paradas.length > 1 ? "s" : ""} há ${STALE_DAYS}+ dias`);

    const user = userByEmail.get(member.email.toLowerCase());
    if (user) {
      notifications.push({
        userId: user.id,
        type: "task_overdue",
        title: `⏰ Você tem ${total} pendência${total > 1 ? "s" : ""} hoje`,
        body: parts.join(" · "),
        entityType: "task",
      });
    }

    emailJobs.push(
      sendDailySummaryEmail({
        toEmail: member.email,
        toName: member.name,
        atrasadas: buckets.atrasadas,
        vencemHoje: buckets.vencemHoje,
        proximas: buckets.proximas,
        paradas: buckets.paradas,
      }).catch((err) => {
        log.warn({ err, member: member.email }, "Falha ao enviar e-mail de pendências");
      }),
    );
  }

  // 2) Resumo geral para gestores
  const gestores = users.filter((u) => (u.role === "gestor" || u.role === "gestor_obras") && u.email);
  const porPessoa = [...bucketsByMember.entries()]
    .map(([memberId, b]) => ({
      name: membersById.get(memberId)?.name ?? "—",
      atrasadas: b.atrasadas.length,
      vencemHoje: b.vencemHoje.length,
      proximas: b.proximas.length,
      paradas: b.paradas.length,
    }))
    .sort((a, b) => b.atrasadas - a.atrasadas || b.vencemHoje - a.vencemHoje);

  const anyPendencia =
    totals.atrasadas + totals.vencemHoje + totals.proximas + totals.paradas > 0 ||
    semResponsavel > 0;

  if (anyPendencia) {
    for (const gestor of gestores) {
      notifications.push({
        userId: gestor.id,
        type: "task_overdue",
        title: `📋 Resumo do dia: ${totals.atrasadas} atrasada${totals.atrasadas === 1 ? "" : "s"}, ${totals.vencemHoje} vence${totals.vencemHoje === 1 ? "" : "m"} hoje`,
        body: [
          `${totals.proximas} vence${totals.proximas === 1 ? "" : "m"} em até ${UPCOMING_DAYS} dias`,
          `${totals.paradas} parada${totals.paradas === 1 ? "" : "s"} há ${STALE_DAYS}+ dias`,
          `${semResponsavel} sem responsável`,
        ].join(" · "),
        entityType: "task",
      });

      const gestorMember = members.find(
        (m) => m.email.toLowerCase() === gestor.email.toLowerCase(),
      );
      emailJobs.push(
        sendGestorDigestEmail({
          toEmail: gestor.email,
          toName: gestorMember?.name ?? gestor.email.split("@")[0] ?? "Gestor",
          totalAtrasadas: totals.atrasadas,
          totalVencemHoje: totals.vencemHoje,
          totalProximas: totals.proximas,
          totalParadas: totals.paradas,
          semResponsavel,
          porPessoa,
        }).catch((err) => {
          log.warn({ err, gestor: gestor.email }, "Falha ao enviar resumo do gestor");
        }),
      );
    }
  }

  if (notifications.length) {
    await db.insert(notificationsTable).values(notifications);
  }
  await Promise.allSettled(emailJobs);

  const result: DailyRemindersResult = {
    membersNotified,
    gestoresNotified: anyPendencia ? gestores.length : 0,
    totalAtrasadas: totals.atrasadas,
    totalVencemHoje: totals.vencemHoje,
    totalProximas: totals.proximas,
    totalParadas: totals.paradas,
    semResponsavel,
  };
  log.info(result, "Cobrança automática diária executada");
  return result;
}
