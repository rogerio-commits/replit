// Montagem de mensagens prontas para WhatsApp (agenda de instalações por equipe).
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/project-health";

export interface AgendaEvent {
  title: string;
  teamDescription?: string | null;
  eventType?: string | null;
  startDate: string;
  endDate?: string | null;
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtShort(iso: string): string {
  return format(parseLocalDate(iso), "dd/MM", { locale: ptBR });
}

/**
 * Monta o texto da agenda entre hoje e hoje+daysAhead (0 = só hoje).
 * Retorna null se não houver eventos no período.
 */
export function buildAgendaText(events: AgendaEvent[], daysAhead: number): string | null {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  const fromISO = isoDay(start);
  const toISO = isoDay(end);

  // Evento entra se o período dele cruza o intervalo pedido (datas YYYY-MM-DD comparáveis como texto)
  const inRange = events.filter((ev) => {
    const evStart = (ev.startDate ?? "").slice(0, 10);
    const evEnd = (ev.endDate ?? ev.startDate ?? "").slice(0, 10);
    return evStart <= toISO && evEnd >= fromISO;
  });
  if (inRange.length === 0) return null;

  const byTeam = new Map<string, AgendaEvent[]>();
  for (const ev of inRange) {
    const team = ev.teamDescription?.trim() || "Sem equipe";
    if (!byTeam.has(team)) byTeam.set(team, []);
    byTeam.get(team)!.push(ev);
  }

  const header =
    daysAhead === 0
      ? `*Programação de hoje — ${format(start, "EEEE, dd/MM", { locale: ptBR })}*`
      : daysAhead === 1
        ? `*Programação — hoje e amanhã (${fmtShort(fromISO)} a ${fmtShort(toISO)})*`
        : `*Programação — ${fmtShort(fromISO)} a ${fmtShort(toISO)}*`;

  const blocks: string[] = [header];
  const teams = [...byTeam.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const team of teams) {
    const list = byTeam
      .get(team)!
      .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
    const lines = list.map((ev) => {
      const evStart = ev.startDate.slice(0, 10);
      const evEnd = (ev.endDate ?? ev.startDate).slice(0, 10);
      const range = evEnd !== evStart ? `${fmtShort(evStart)} a ${fmtShort(evEnd)}` : fmtShort(evStart);
      const tipo = ev.eventType === "assistencia" ? " _(assistência)_" : "";
      return `• ${range} — ${ev.title}${tipo}`;
    });
    blocks.push(`*${team}*\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
}

/** Abre o WhatsApp com o texto pronto — o usuário só escolhe o contato. */
export function openWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
