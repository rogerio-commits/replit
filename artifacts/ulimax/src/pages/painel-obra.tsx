import { useMemo } from "react";
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
  MapPinned, ClipboardList, CalendarClock, AlertTriangle,
  CheckSquare, ChevronRight, CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import { FecharDia } from "@/components/fechar-dia";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";
import { projectStatusLabel } from "@/lib/project-status";

// ── Painel da Obra ───────────────────────────────────────────────────────────
// Cockpit diário do gestor de obras: num olhar, o que precisa de ação hoje.
// Compõe cobranças, visitas e datas — e destaca obras EM INSTALAÇÃO sem visita
// recente/agendada (nessa fase a frequência de visita precisa subir).

const INSTALL_STATUSES = ["aguardando_instalacao", "em_instalacao"];
const VISIT_INTERVAL = 7; // dias sem visita, em fase de instalação, já pede visita
const UPCOMING_VISIT_DAYS = 7;

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

export default function PainelObra() {
  const [, navigate] = useLocation();
  const { data: chase, isLoading: l1 } = useListChaseItems();
  const { data: visits, isLoading: l2 } = useListAllSiteVisits();
  const { data: projects, isLoading: l3 } = useListProjects();
  const { data: planSummaries } = useListActionPlanSummaries();
  const loading = l1 || l2 || l3;

  const planosPorProjeto = (planSummaries ?? []).filter((s) => s.openItems > 0);

  const data = useMemo(() => {
    const items = (chase ?? []) as ChaseItem[];
    const allVisits = visits ?? [];
    const projs = (projects ?? []) as Project[];

    // Visitas por projeto: última realizada (<= hoje) e próxima agendada (>= hoje).
    const lastByProject = new Map<number, number>(); // projId -> dias desde a última (>=0)
    const nextByProject = new Map<number, string>();  // projId -> data da próxima
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

    // Obras em instalação que precisam de visita: sem próxima agendada e sem
    // visita recente (ou nunca visitadas).
    const precisamVisita = projs
      .filter((p) => !p.archived && INSTALL_STATUSES.includes(p.status))
      .map((p) => {
        const since = lastByProject.get(p.id);
        const next = nextByProject.get(p.id);
        return { p, since, next };
      })
      .filter(({ since, next }) => !next && (since === undefined || since >= VISIT_INTERVAL))
      .sort((a, b) => (b.since ?? 9999) - (a.since ?? 9999));

    const planosAtrasados = items
      .filter((it) => it.source === "action_plan" && it.dueDate && daysFromToday(it.dueDate) < 0)
      .sort((a, b) => daysFromToday(a.dueDate!) - daysFromToday(b.dueDate!));

    const checarInLoco = items
      .filter((it) => it.source === "visit")
      .sort((a, b) => {
        const da = a.dueDate ? daysFromToday(a.dueDate) : 9999;
        const db = b.dueDate ? daysFromToday(b.dueDate) : 9999;
        return da - db;
      });

    const datasVencidas: { projectId: number; projectName: string; label: string; days: number }[] = [];
    for (const p of projs) {
      for (const od of overdueObraDates(p)) {
        datasVencidas.push({ projectId: p.id, projectName: p.name, label: od.label, days: od.days });
      }
    }
    datasVencidas.sort((a, b) => a.days - b.days);

    const emInstalacao = projs.filter((p) => !p.archived && INSTALL_STATUSES.includes(p.status)).length;

    return { precisamVisita, planosAtrasados, checarInLoco, datasVencidas, emInstalacao };
  }, [chase, visits, projects]);

  const stats = [
    { label: "Em instalação", value: data.emInstalacao, tone: "text-blue-600" },
    { label: "Precisam de visita", value: data.precisamVisita.length, tone: "text-amber-600" },
    { label: "Planos atrasados", value: data.planosAtrasados.length, tone: "text-red-600" },
    { label: "Datas vencidas", value: data.datasVencidas.length, tone: "text-red-600" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                <div className={cn("text-2xl font-bold tabular-nums", s.tone)}>{s.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Precisam de visita — o destaque da fase de instalação */}
            <Panel
              icon={<MapPinned className="h-4 w-4 text-amber-600" />}
              title="Precisam de visita"
              hint="Em instalação, sem visita recente ou agendada"
              count={data.precisamVisita.length}
              accent="amber"
              empty="Todas as obras em instalação têm visita em dia. 👏"
            >
              {data.precisamVisita.slice(0, 6).map(({ p, since }) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {projectStatusLabel(p.status)} · {since === undefined ? "nunca visitada" : `última visita há ${since}d`}
                    </p>
                  </div>
                  <NewVisitDialog
                    projectId={p.id}
                    projectName={p.name}
                    trigger={
                      <Button size="sm" variant="outline" className="shrink-0 h-7 gap-1 text-xs">
                        <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                      </Button>
                    }
                  />
                </div>
              ))}
            </Panel>

            {/* Checar in loco (follow-ups de visita) */}
            <Panel
              icon={<CheckSquare className="h-4 w-4 text-blue-500" />}
              title="Checar in loco"
              hint="Follow-ups de visita a verificar na obra"
              count={data.checarInLoco.length}
              seeAll="/cobrancas"
              empty="Nenhum follow-up de visita pendente."
            >
              {data.checarInLoco.slice(0, 6).map((it) => (
                <Row key={`v-${it.id}`} href={`/projects/${it.projectId}`}
                  title={it.description}
                  sub={`${it.projectName ?? "Obra"}${it.context ? ` · ${it.context}` : ""}`}
                  badge={it.dueDate ? (daysFromToday(it.dueDate) < 0 ? `há ${-daysFromToday(it.dueDate)}d` : fmtBr(it.dueDate)) : "s/ prazo"}
                  badgeTone={it.dueDate && daysFromToday(it.dueDate) < 0 ? "red" : "muted"}
                />
              ))}
            </Panel>
          </div>

          {/* Fechar o dia — RDO automático com o que foi registrado hoje */}
          <FecharDia />

          {/* Planos de ação por projeto — cobra o plano por obra, não item a item */}
          {(planSummaries ?? []).length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground leading-tight">Planos de ação por projeto</h2>
                  <p className="text-[11px] text-muted-foreground leading-tight">Cobre o plano por obra — não item a item</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{planosPorProjeto.length} em aberto</span>
              </div>
              {planosPorProjeto.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Todos os planos de ação concluídos. 👏</p>
              ) : (
                <div className="divide-y divide-border">
                  {planosPorProjeto.map((s) => {
                    const pct = s.totalItems > 0 ? Math.round((s.doneItems / s.totalItems) * 100) : 0;
                    return (
                      <div key={s.projectId}
                        className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/projects/${s.projectId}`)}>
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{s.projectName ?? "Obra"}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.openItems} aberto{s.openItems !== 1 ? "s" : ""} de {s.totalItems}
                              {s.nextDueDate ? ` · próximo ${fmtBr(s.nextDueDate)}` : ""}
                            </p>
                          </div>
                          {s.overdueItems > 0 && (
                            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40">
                              {s.overdueItems} vencido{s.overdueItems !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{s.doneItems}/{s.totalItems}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Datas de obra vencidas — largura total */}
          {data.datasVencidas.length > 0 && (
            <Panel
              icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
              title="Datas de obra vencidas"
              hint="Fim do projeto / produção sem data final registrada"
              count={data.datasVencidas.length}
              seeAll="/obra?tab=agenda"
              accent="red"
              empty=""
            >
              {data.datasVencidas.slice(0, 8).map((e, i) => (
                <Row key={`d-${e.projectId}-${i}`} href={`/projects/${e.projectId}`}
                  title={`${e.label}: ${e.projectName}`}
                  sub="sem data final registrada"
                  badge={`há ${-e.days}d`}
                  badgeTone="red"
                />
              ))}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

const ACCENT_BORDER: Record<string, string> = {
  amber: "border-amber-200 dark:border-amber-800/40",
  red: "border-red-200 dark:border-red-800/40",
};

function Panel({
  icon, title, hint, count, children, empty, seeAll, accent,
}: {
  icon: React.ReactNode; title: string; hint: string; count: number;
  children: React.ReactNode; empty: string; seeAll?: string; accent?: "amber" | "red";
}) {
  return (
    <div className={cn("bg-card rounded-xl border overflow-hidden", accent ? ACCENT_BORDER[accent] : "border-border")}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {icon}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">{title}</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>
        </div>
        <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{count}</span>
      </div>
      {count === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <>
          <div className="divide-y divide-border">{children}</div>
          {seeAll && count > 6 && (
            <Link href={seeAll}>
              <div className="px-4 py-2.5 text-xs font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
                Ver todos ({count}) <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40",
  muted: "bg-muted text-muted-foreground border-border",
};

function Row({
  href, title, sub, badge, badgeTone,
}: {
  href: string; title: string; sub: string; badge: string; badgeTone: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{sub}</p>
        </div>
        <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", BADGE_TONE[badgeTone])}>
          {badge}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </div>
    </Link>
  );
}
