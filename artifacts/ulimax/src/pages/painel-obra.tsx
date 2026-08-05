import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListChaseItems,
  useListAllSiteVisits,
  useListProjects,
  useListActionPlanSummaries,
} from "@workspace/api-client-react";
import type { ChaseItem, Project } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPinned, ClipboardList, CalendarClock, CheckSquare, ChevronRight,
  CalendarPlus, ChevronDown, PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import { FecharDia } from "@/components/fechar-dia";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";

// ── Painel da Obra ───────────────────────────────────────────────────────────
// A aba Hoje é UMA fila numerada: o que fazer, na ordem. Sem painéis
// concorrentes — o gestor abre, começa pelo item 1 e desce a lista.
// Ordem do dia: visitas de hoje → cobranças vencidas (planos, datas,
// checagens) → visitas a agendar. O que não é acionável hoje (checagens sem
// prazo ou futuras, planos sem atraso) mora em Pendências — não repete aqui.

const INSTALL_STATUSES = ["aguardando_instalacao", "em_instalacao"];
const VISIT_INTERVAL = 15; // obra em instalação precisa de visita a cada 15 dias
const PRE_INSTALL_WINDOW = 10; // fim da produção a até 10 dias já pede visita
const VISIBLE = 8;

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

type QueueItem = {
  key: string;
  kind: "visita_hoje" | "plano" | "data" | "checar" | "agendar";
  title: string;
  sub: string;
  badge: string;
  badgeTone: "red" | "amber" | "blue" | "muted";
  projectId: number;
  projectName: string;
};

const KIND_ICON: Record<QueueItem["kind"], React.ReactNode> = {
  visita_hoje: <MapPinned className="h-4 w-4 text-blue-500" />,
  plano: <ClipboardList className="h-4 w-4 text-red-500" />,
  data: <CalendarClock className="h-4 w-4 text-red-500" />,
  checar: <CheckSquare className="h-4 w-4 text-muted-foreground" />,
  agendar: <CalendarPlus className="h-4 w-4 text-amber-600" />,
};

export default function PainelObra() {
  const [, navigate] = useLocation();
  const [showAll, setShowAll] = useState(false);
  const { data: chase, isLoading: l1 } = useListChaseItems();
  const { data: visits, isLoading: l2 } = useListAllSiteVisits();
  const { data: projects, isLoading: l3 } = useListProjects();
  const { data: planSummaries } = useListActionPlanSummaries();
  const loading = l1 || l2 || l3;

  const queue = useMemo(() => {
    const items = (chase ?? []) as ChaseItem[];
    const allVisits = visits ?? [];
    const projs = (projects ?? []) as Project[];
    const q: QueueItem[] = [];

    // 1. Visitas agendadas para hoje — compromissos vêm antes do backlog.
    for (const v of allVisits) {
      if (daysFromToday(v.date) !== 0) continue;
      q.push({
        key: `vh-${v.id}`,
        kind: "visita_hoje",
        title: `Visitar hoje: ${v.projectName ?? "obra"}`,
        sub: v.objective || "visita agendada",
        badge: "hoje",
        badgeTone: "blue",
        projectId: v.projectId,
        projectName: v.projectName ?? "",
      });
    }

    // 2. Planos de ação com itens vencidos — cobrança por obra, não item a item.
    const planosVencidos = (planSummaries ?? [])
      .filter((s) => s.overdueItems > 0)
      .sort((a, b) => b.overdueItems - a.overdueItems);
    for (const s of planosVencidos) {
      q.push({
        key: `pl-${s.projectId}`,
        kind: "plano",
        title: `Cobrar plano de ação: ${s.projectName ?? "obra"}`,
        sub: `${s.overdueItems} vencido${s.overdueItems !== 1 ? "s" : ""} de ${s.openItems} em aberto`,
        badge: `${s.overdueItems} vencido${s.overdueItems !== 1 ? "s" : ""}`,
        badgeTone: "red",
        projectId: s.projectId,
        projectName: s.projectName ?? "",
      });
    }

    // 3. Datas de obra vencidas — estimada passou sem data final registrada.
    const datas: { projectId: number; projectName: string; label: string; days: number }[] = [];
    for (const p of projs) {
      for (const od of overdueObraDates(p)) {
        datas.push({ projectId: p.id, projectName: p.name, label: od.label, days: od.days });
      }
    }
    datas.sort((a, b) => a.days - b.days);
    for (const d of datas) {
      q.push({
        key: `dt-${d.projectId}-${d.label}`,
        kind: "data",
        title: `Resolver ${d.label.toLowerCase()}: ${d.projectName}`,
        sub: "estimada passou e a data final não foi registrada",
        badge: `há ${-d.days}d`,
        badgeTone: "red",
        projectId: d.projectId,
        projectName: d.projectName,
      });
    }

    // 4. Checagens in loco com prazo vencido.
    const checarVencidos = items
      .filter((it) => it.source === "visit" && it.dueDate && daysFromToday(it.dueDate) < 0)
      .sort((a, b) => daysFromToday(a.dueDate!) - daysFromToday(b.dueDate!));
    for (const it of checarVencidos) {
      q.push({
        key: `cv-${it.id}`,
        kind: "checar",
        title: `Checar na obra: ${it.description}`,
        sub: it.projectName ?? "obra",
        badge: `há ${-daysFromToday(it.dueDate!)}d`,
        badgeTone: "red",
        projectId: it.projectId,
        projectName: it.projectName ?? "",
      });
    }

    // 5. Obras em instalação sem visita recente nem agendada.
    const lastByProject = new Map<number, number>();
    const nextByProject = new Map<number, string>();
    for (const v of allVisits) {
      const d = daysFromToday(v.date);
      if (d <= 0) {
        const since = -d;
        const cur = lastByProject.get(v.projectId);
        if (cur === undefined || since < cur) lastByProject.set(v.projectId, since);
      } else {
        const cur = nextByProject.get(v.projectId);
        if (!cur || v.date < cur) nextByProject.set(v.projectId, v.date);
      }
    }
    // Uma obra pede visita quando está em instalação (cadência de 15 dias) ou
    // quando o fim da produção está a até 10 dias (visita de pré-instalação).
    const precisamVisita = projs
      .filter((p) => !p.archived)
      .map((p) => {
        const emInstalacao = INSTALL_STATUSES.includes(p.status);
        const dFimProd = p.producaoEndDate ? daysFromToday(p.producaoEndDate) : null;
        const preInstalacao = !emInstalacao && dFimProd !== null && dFimProd <= PRE_INSTALL_WINDOW;
        return { p, emInstalacao, preInstalacao, dFimProd, since: lastByProject.get(p.id), next: nextByProject.get(p.id) };
      })
      .filter(({ emInstalacao, preInstalacao }) => emInstalacao || preInstalacao)
      .filter(({ since, next }) => !next && (since === undefined || since >= VISIT_INTERVAL))
      .sort((a, b) => (b.since ?? 9999) - (a.since ?? 9999));
    for (const { p, since, emInstalacao, dFimProd } of precisamVisita) {
      const contexto = emInstalacao
        ? "obra em instalação"
        : dFimProd !== null && dFimProd >= 0
          ? `produção termina em ${dFimProd === 0 ? "hoje" : `${dFimProd}d`}`
          : "produção deveria ter terminado";
      q.push({
        key: `ag-${p.id}`,
        kind: "agendar",
        title: `Agendar visita: ${p.name}`,
        sub: since === undefined ? `${contexto} · nunca visitada` : `${contexto} · última visita há ${since} dias`,
        badge: since === undefined ? "nunca" : `${since}d sem visita`,
        badgeTone: "amber",
        projectId: p.id,
        projectName: p.name,
      });
    }

    return q;
  }, [chase, visits, projects, planSummaries]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const visible = showAll ? queue : queue.slice(0, VISIBLE);
  const hidden = queue.length - visible.length;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-3xl">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Comece por aqui</h2>
          <p className="text-xs text-muted-foreground">
            {queue.length === 0
              ? "Nada pede sua ação hoje."
              : `${queue.length} ${queue.length === 1 ? "item pede" : "itens pedem"} sua ação, do mais urgente ao menos. Faça na ordem.`}
          </p>
        </div>

        {queue.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <PartyPopper className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">Visitas em dia, planos sem atraso e nenhuma data vencida.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((it, i) => (
              <div
                key={it.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer",
                  i === 0 && !showAll && "bg-primary/[.04]"
                )}
                onClick={() => navigate(`/projects/${it.projectId}`)}
              >
                <span
                  className={cn(
                    "shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold tabular-nums",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <span className="shrink-0">{KIND_ICON[it.kind]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.sub}</p>
                </div>
                <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", BADGE_TONE[it.badgeTone])}>
                  {it.badge}
                </span>
                {it.kind === "agendar" ? (
                  <span onClick={(e) => e.stopPropagation()}>
                    <NewVisitDialog
                      projectId={it.projectId}
                      projectName={it.projectName}
                      trigger={
                        <Button size="sm" variant="outline" className="shrink-0 h-7 gap-1 text-xs">
                          <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                        </Button>
                      }
                    />
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {hidden > 0 && (
          <button
            className="w-full px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/40 flex items-center justify-center gap-1 border-t border-border"
            onClick={() => setShowAll(true)}
          >
            Mostrar os outros {hidden} <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Fim do expediente: RDO automático com o que foi registrado hoje */}
      <FecharDia />

      <p className="text-xs text-muted-foreground px-1">
        Procurando algo que não está na fila? <Link href="/obra?tab=pendencias" className="text-primary hover:underline">Pendências</Link> tem
        a lista completa de cobranças e <Link href="/obra?tab=agenda" className="text-primary hover:underline">Agenda</Link> mostra
        as próximas visitas e datas-chave.
      </p>
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40",
  muted: "bg-muted text-muted-foreground border-border",
};
