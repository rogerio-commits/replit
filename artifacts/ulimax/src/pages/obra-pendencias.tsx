import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListTasks,
  useListProjects,
  useListAllSiteVisits,
  useListChaseItems,
} from "@workspace/api-client-react";
import type { ChaseItem, Project, Task } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users, CalendarClock, CalendarDays, ChevronRight, ClipboardList,
  FileText, MessageCircle, PartyPopper,
} from "lucide-react";
import { VisitRdoActions } from "@/components/visit-rdo-actions";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";
import { useEffectiveRole } from "@/hooks/useViewAs";

// ── Obras · aba Pendências ───────────────────────────────────────────────────
// UMA fila de decisão, não cinco painéis: cada linha é uma pendência com a
// obra, o responsável, há quanto tempo venceu e a ÚNICA ação que resolve
// (anexar RDO, cobrar no WhatsApp, abrir as tarefas da pessoa, abrir a obra).
// Ordem: mais atrasado primeiro; o que ainda vai vencer fica no fim, e só
// aparece quando o filtro pede.

const DATAS_A_VENCER = 30; // dias

const DATE_FIELDS: { key: keyof Project; label: string }[] = [
  { key: "medicaoDate", label: "Medição" },
  { key: "producaoStartDate", label: "Início da produção" },
  { key: "producaoEndDate", label: "Fim da produção" },
  { key: "producaoFinalDate", label: "Produção final" },
  { key: "instalacaoStartDate", label: "Instalação" },
  { key: "endDate", label: "Prazo de entrega" },
  { key: "finalDate", label: "Prazo final" },
];

type Filtro = "atrasadas" | "semana" | "todas";

type Pendencia = {
  key: string;
  /** dias em relação a hoje: negativo = atrasado */
  d: number;
  icon: React.ReactNode;
  title: string;
  sub: string;
  badge: string;
  tone: "red" | "amber" | "muted";
  onOpen: () => void;
  action?: React.ReactNode;
};

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function prazoLabel(d: number): string {
  if (d < 0) return `há ${-d}d`;
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d}d`;
}

// Cobrança pronta para o WhatsApp — sem número salvo, o gestor escolhe o contato.
function whatsappUrl(item: ChaseItem): string {
  const nome = item.responsibleExternal ?? "";
  const prazo = item.dueDate ? ` Prazo: ${item.dueDate.split("-").reverse().join("/")}.` : "";
  const obra = item.projectName ? ` (obra: ${item.projectName})` : "";
  const msg = `Olá${nome ? `, ${nome}` : ""}! Passando para acompanhar: "${item.description}"${obra}.${prazo}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

const TONE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  muted: "bg-muted text-muted-foreground border-border",
};

export default function ObraPendencias() {
  const [, navigate] = useLocation();
  const [filtro, setFiltro] = useState<Filtro>("atrasadas");
  const { data: tasks, isLoading: l1 } = useListTasks();
  const { data: projects, isLoading: l2 } = useListProjects();
  const { data: visits } = useListAllSiteVisits();
  const { data: chase } = useListChaseItems();
  const canEdit = useCanEdit();
  // Campo nao acompanha fabrica: datas de producao ficam fora do "a vencer".
  const isCampo = useEffectiveRole() === "gestor_obras";
  const dateFields = isCampo
    ? DATE_FIELDS.filter((f) => !String(f.key).startsWith("producao"))
    : DATE_FIELDS;

  const itens = useMemo(() => {
    const allTasks = (tasks ?? []) as Task[];
    const projs = (projects ?? []) as Project[];
    const hoje = new Date().toISOString().slice(0, 10);
    const out: Pendencia[] = [];

    // RDO da visita realizada — a pendência da visita é o arquivo faltando.
    for (const v of visits ?? []) {
      if (v.date > hoje || v.reportFileKey) continue;
      out.push({
        key: `rdo-${v.id}`,
        d: daysFromToday(v.date),
        icon: <FileText className="h-4 w-4 text-red-500 shrink-0" />,
        title: `RDO da visita: ${v.projectName}`,
        sub: `visita de ${fmtBr(v.date)}${v.objective ? ` · ${v.objective}` : ""}`,
        badge: prazoLabel(daysFromToday(v.date)),
        tone: "red",
        onOpen: () => navigate(`/projects/${v.projectId}`),
        action: (
          <span onClick={(e) => e.stopPropagation()}>
            <VisitRdoActions visit={v} projectId={v.projectId} canEdit={canEdit} />
          </span>
        ),
      });
    }

    // Itens de plano de ação — cobra o responsável (WhatsApp para externos).
    for (const it of (chase ?? []) as ChaseItem[]) {
      const d = it.dueDate ? daysFromToday(it.dueDate) : 999;
      if (d > DATAS_A_VENCER) continue;
      const quem = it.responsibleName ?? it.responsibleExternal ?? "sem responsável";
      out.push({
        key: `plano-${it.id}`,
        d,
        icon: <ClipboardList className="h-4 w-4 text-red-500 shrink-0" />,
        title: it.description,
        sub: `${it.projectName ?? "Obra"} · ${quem}${it.dueDate ? ` · prazo ${fmtBr(it.dueDate)}` : " · sem prazo"}`,
        badge: it.dueDate ? prazoLabel(d) : "sem prazo",
        tone: d < 0 ? "red" : d <= 3 ? "amber" : "muted",
        onOpen: () => navigate(`/projects/${it.projectId}`),
        action: it.responsibleExternal ? (
          <a
            href={whatsappUrl(it)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Cobrar no WhatsApp"
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Cobrar
          </a>
        ) : undefined,
      });
    }

    // Tarefas vencidas — uma linha por pessoa: cobra-se a pessoa, não a tarefa.
    const porPessoa = new Map<string, { id: number | null; name: string; count: number; oldest: number }>();
    for (const t of allTasks) {
      if (t.status === "done" || !t.dueDate) continue;
      const atraso = -daysFromToday(t.dueDate);
      if (atraso <= 0) continue;
      const k = t.assignedTo != null ? String(t.assignedTo) : "none";
      const cur = porPessoa.get(k);
      if (cur) {
        cur.count += 1;
        cur.oldest = Math.max(cur.oldest, atraso);
      } else {
        porPessoa.set(k, { id: t.assignedTo ?? null, name: t.assigneeName ?? "Sem responsável", count: 1, oldest: atraso });
      }
    }
    for (const pe of porPessoa.values()) {
      out.push({
        key: `pessoa-${pe.id ?? "none"}`,
        d: -pe.oldest,
        icon: <Users className="h-4 w-4 text-red-500 shrink-0" />,
        title: `${pe.name} — ${pe.count} tarefa${pe.count !== 1 ? "s" : ""} vencida${pe.count !== 1 ? "s" : ""}`,
        sub: `a mais antiga há ${pe.oldest} dias · clique para abrir a lista da pessoa`,
        badge: `há ${pe.oldest}d`,
        tone: "red",
        onOpen: () => navigate(pe.id != null ? `/tasks?responsavel=${pe.id}&vencidas=1` : "/tasks?vencidas=1"),
      });
    }

    // Datas de obra vencidas (estimada passou sem a final registrada).
    for (const p of projs) {
      for (const od of overdueObraDates(p)) {
        out.push({
          key: `dv-${p.id}-${od.label}`,
          d: od.days,
          icon: <CalendarClock className="h-4 w-4 text-red-500 shrink-0" />,
          title: `${od.label}: ${p.name}`,
          sub: "registre a data final ou cobre a conclusão",
          badge: prazoLabel(od.days),
          tone: "red",
          onOpen: () => navigate(`/projects/${p.id}`),
        });
      }
    }

    // Datas a vencer — para se antecipar.
    for (const p of projs) {
      if (p.archived) continue;
      for (const f of dateFields) {
        const val = p[f.key] as string | null | undefined;
        if (!val) continue;
        const d = daysFromToday(val);
        if (d < 0 || d > DATAS_A_VENCER) continue;
        out.push({
          key: `av-${p.id}-${String(f.key)}`,
          d,
          icon: <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />,
          title: `${f.label}: ${p.name}`,
          sub: `previsto para ${fmtBr(val)}`,
          badge: prazoLabel(d),
          tone: d <= 3 ? "amber" : "muted",
          onOpen: () => navigate(`/projects/${p.id}`),
        });
      }
    }

    out.sort((a, b) => a.d - b.d);
    return out;
  }, [tasks, projects, visits, chase, dateFields, canEdit, navigate]);

  const atrasadas = itens.filter((i) => i.d < 0);
  const semana = itens.filter((i) => i.d >= 0 && i.d <= 7);
  const lista = filtro === "atrasadas" ? atrasadas : filtro === "semana" ? semana : itens;

  if (l1 || l2) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const CHIPS: { id: Filtro; label: string; n: number; danger?: boolean }[] = [
    { id: "atrasadas", label: "Atrasadas", n: atrasadas.length, danger: true },
    { id: "semana", label: "Vencem em 7 dias", n: semana.length },
    { id: "todas", label: "Todas", n: itens.length },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-3xl">
      {/* Filtro de decisão: começa nas atrasadas, que é o que exige ação hoje */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filtro === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted/50",
            )}
          >
            {c.label}
            <span className={cn(
              "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
              filtro === c.id
                ? "bg-primary-foreground/20"
                : c.danger && c.n > 0 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground",
            )}>
              {c.n}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {lista.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <PartyPopper className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              {filtro === "atrasadas" ? "Nada atrasado" : filtro === "semana" ? "Nada vencendo nesta semana" : "Nenhuma pendência"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filtro === "atrasadas" && itens.length > 0
                ? `Ainda há ${itens.length} pendência${itens.length !== 1 ? "s" : ""} com prazo em aberto — veja em "Todas".`
                : "RDOs anexados, tarefas em dia, planos de ação sem atraso e datas registradas."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lista.map((it) => (
              <div
                key={it.key}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={it.onOpen}
              >
                {it.icon}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.sub}</p>
                </div>
                <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", TONE[it.tone])}>
                  {it.badge}
                </span>
                {it.action ?? <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
