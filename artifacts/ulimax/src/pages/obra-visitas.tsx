import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  useListAllSiteVisits,
  useListProjects,
  useListChaseItems,
} from "@workspace/api-client-react";
import type { ChaseItem, Project } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, MapPinned, ChevronRight, CalendarPlus, CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";

// ── Obras · aba Visitas ──────────────────────────────────────────────────────
// O centro do trabalho do gestor de obras:
//   1. Programação do mês — todas as visitas confirmadas do mês, dia a dia
//      (as já realizadas ficam esmaecidas), + as marcadas para depois do mês.
//   2. Visitas sugeridas — obras que pedem visita pelo critério (fim da
//      produção ≤10d ou em instalação há 15+ dias sem visita), aguardando o
//      gestor confirmar com o botão Agendar.

const INSTALL_STATUSES = ["aguardando_instalacao", "em_instalacao"];
const VISIT_INTERVAL = 15; // obra em instalação precisa de visita a cada 15 dias
const PRE_INSTALL_WINDOW = 10; // fim da produção a até 10 dias já pede visita

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function nomeDoDia(iso: string, d: number): string {
  if (d === 0) return `Hoje · ${fmtBr(iso)}`;
  if (d === 1) return `Amanhã · ${fmtBr(iso)}`;
  const wd = DIAS[new Date(iso + "T00:00:00").getDay()];
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} · ${fmtBr(iso)}`;
}

export default function ObraVisitas() {
  const [, navigate] = useLocation();
  const { data: visits, isLoading: l1 } = useListAllSiteVisits();
  const { data: projects, isLoading: l2 } = useListProjects();
  const { data: chase } = useListChaseItems();
  const loading = l1 || l2;

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7); // YYYY-MM

  const data = useMemo(() => {
    const allVisits = visits ?? [];
    const projs = (projects ?? []) as Project[];
    const items = (chase ?? []) as ChaseItem[];

    // Itens em aberto por obra (follow-ups): o que conferir quando for lá.
    const checarPorObra = new Map<number, number>();
    for (const it of items) {
      if (it.source !== "visit") continue;
      checarPorObra.set(it.projectId, (checarPorObra.get(it.projectId) ?? 0) + 1);
    }

    // Programação do mês, agrupada por dia.
    const porDia = new Map<string, { d: number; visitas: typeof allVisits }>();
    const depoisDoMes: typeof allVisits = [];
    for (const v of allVisits) {
      if (v.date.slice(0, 7) === mesAtual) {
        const g = porDia.get(v.date) ?? { d: daysFromToday(v.date), visitas: [] };
        g.visitas.push(v);
        porDia.set(v.date, g);
      } else if (v.date > hoje) {
        depoisDoMes.push(v);
      }
    }
    const dias = [...porDia.entries()]
      .map(([date, g]) => ({ date, ...g }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    depoisDoMes.sort((a, b) => (a.date < b.date ? -1 : 1));
    const totalMes = dias.reduce((acc, g) => acc + g.visitas.length, 0);

    // Sugeridas: critério de visita, sem visita futura marcada.
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
    const sugeridas = projs
      .filter((p) => !p.archived)
      .map((p) => {
        const emInstalacao = INSTALL_STATUSES.includes(p.status);
        const dFimProd = p.producaoEndDate ? daysFromToday(p.producaoEndDate) : null;
        const preInstalacao = !emInstalacao && dFimProd !== null && dFimProd <= PRE_INSTALL_WINDOW;
        return { p, emInstalacao, dFimProd, elegivel: emInstalacao || preInstalacao, since: lastByProject.get(p.id), next: nextByProject.get(p.id) };
      })
      .filter(({ elegivel, since, next }) => elegivel && !next && (since === undefined || since >= VISIT_INTERVAL))
      .sort((a, b) => (b.since ?? 9999) - (a.since ?? 9999))
      .map(({ p, emInstalacao, dFimProd, since }) => ({
        p,
        since,
        checar: checarPorObra.get(p.id) ?? 0,
        contexto: emInstalacao
          ? "em instalação"
          : dFimProd !== null && dFimProd >= 0
            ? `produção termina em ${dFimProd === 0 ? "hoje" : `${dFimProd}d`}`
            : "produção deveria ter terminado",
      }));

    return { dias, depoisDoMes, totalMes, sugeridas, checarPorObra };
  }, [visits, projects, chase, mesAtual, hoje]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const [ano, mes] = mesAtual.split("-").map(Number);
  const tituloMes = `${MESES[mes - 1].charAt(0).toUpperCase()}${MESES[mes - 1].slice(1)} de ${ano}`;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-3xl">
      {/* ── Programação do mês ── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <CalendarDays className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-tight">Programação do mês — {tituloMes}</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">Todas as visitas confirmadas, dia a dia</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{data.totalMes}</span>
        </div>
        {data.totalMes === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma visita confirmada neste mês — use "Nova visita" ou confirme uma sugestão abaixo.</p>
        ) : (
          data.dias.map(({ date, d, visitas }) => (
            <div key={date} className={cn(d < 0 && "opacity-55")}>
              <div className={cn(
                "px-4 py-1.5 border-y border-border bg-muted/30 flex items-center gap-2",
                d === 0 && "bg-primary/[.06]"
              )}>
                <span className={cn("text-xs font-semibold", d === 0 ? "text-primary" : "text-muted-foreground")}>
                  {nomeDoDia(date, d)}
                </span>
                {d < 0 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              </div>
              <div className="divide-y divide-border">
                {visitas.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${v.projectId}`)}>
                    <MapPin className="h-4 w-4 text-violet-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{v.projectName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[v.objective, v.responsibleName].filter(Boolean).join(" · ") || "visita agendada"}
                      </p>
                    </div>
                    {v.pendingActionItemsCount > 0 && (
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                        {v.pendingActionItemsCount} pendente{v.pendingActionItemsCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        {data.depoisDoMes.length > 0 && (
          <>
            <div className="px-4 py-1.5 border-y border-border bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground">Depois deste mês</span>
            </div>
            <div className="divide-y divide-border">
              {data.depoisDoMes.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${v.projectId}`)}>
                  <MapPin className="h-4 w-4 text-violet-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{v.projectName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[v.objective, v.responsibleName].filter(Boolean).join(" · ") || "visita agendada"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{fmtBr(v.date)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Sugeridas, aguardando confirmação ── */}
      <div className="bg-card rounded-xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <MapPinned className="h-4 w-4 text-amber-600" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-tight">Visitas sugeridas — aguardando sua confirmação</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">Produção terminando em até 10 dias, ou obra em instalação há 15+ dias sem visita</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{data.sugeridas.length}</span>
        </div>
        {data.sugeridas.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma sugestão — todas as obras estão com visita em dia ou agendada. 👏</p>
        ) : (
          <div className="divide-y divide-border">
            {data.sugeridas.map(({ p, since, checar, contexto }) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/projects/${p.id}`)}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contexto} · {since === undefined ? "nunca visitada" : `última visita há ${since} dias`}
                    {checar > 0 ? ` · ${checar} ite${checar !== 1 ? "ns" : "m"} para checar lá` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                  {since === undefined ? "nunca visitada" : `${since}d sem visita`}
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <NewVisitDialog
                    projectId={p.id}
                    projectName={p.name}
                    trigger={
                      <Button size="sm" variant="outline" className="shrink-0 h-7 gap-1 text-xs">
                        <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                      </Button>
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
