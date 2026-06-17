import { useMemo } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useGetDashboardSummary,
  useListProjects,
} from "@workspace/api-client-react";
import type { ListProjectsQueryResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  AlertCircle,
  Clock,
  CheckSquare,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Project = ListProjectsQueryResult[number];

// ── Constants ────────────────────────────────────────────────────────────────

const PHASE_CONFIG: { id: string; label: string; color: string; bg: string; border: string }[] = [
  { id: "a_iniciar",             label: "A Iniciar",             color: "text-slate-700",   bg: "bg-slate-100",   border: "border-slate-300" },
  { id: "em_projeto",            label: "Em Projeto",            color: "text-violet-700",  bg: "bg-violet-100",  border: "border-violet-300" },
  { id: "em_aprovacao",          label: "Em Aprovação",          color: "text-purple-700",  bg: "bg-purple-100",  border: "border-purple-300" },
  { id: "em_producao",           label: "Em Produção",           color: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-300" },
  { id: "aguardando_instalacao", label: "Ag. Instalação",        color: "text-amber-700",   bg: "bg-amber-100",   border: "border-amber-300" },
  { id: "em_instalacao",         label: "Em Instalação",         color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300" },
];

const DEADLINE_FIELDS: { key: keyof Project; label: string }[] = [
  { key: "endDate",          label: "Fim Est. Proj." },
  { key: "finalDate",        label: "Final Proj." },
  { key: "producaoEndDate",  label: "Fim Est. Prod." },
  { key: "producaoFinalDate",label: "Final Prod." },
  { key: "medicaoDate",      label: "Medição" },
];

const ACTIVE_STATUSES = new Set(["em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"]);

const STATUS_LABEL: Record<string, string> = {
  a_iniciar: "A Iniciar", em_projeto: "Em Projeto", em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção", aguardando_instalacao: "Ag. Instalação", em_instalacao: "Em Instalação",
};

const STATUS_COLOR: Record<string, string> = {
  a_iniciar: "bg-slate-100 text-slate-700 border-slate-300",
  em_projeto: "bg-violet-100 text-violet-700 border-violet-300",
  em_aprovacao: "bg-purple-100 text-purple-700 border-purple-300",
  em_producao: "bg-blue-100 text-blue-700 border-blue-300",
  aguardando_instalacao: "bg-amber-100 text-amber-700 border-amber-300",
  em_instalacao: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(val?: string | null) {
  if (!val) return null;
  try { return format(parseISO(val), "dd/MM/yy", { locale: ptBR }); }
  catch { return null; }
}

type AlertLevel = "overdue" | "soon";
interface DateAlert {
  project: Project;
  fieldLabel: string;
  date: string;
  level: AlertLevel;
  daysLeft: number;
}

function buildAlerts(projects: Project[]): DateAlert[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: DateAlert[] = [];

  for (const p of projects) {
    for (const { key, label } of DEADLINE_FIELDS) {
      const val = p[key] as string | null | undefined;
      if (!val) continue;
      try {
        const d = parseISO(val);
        const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
        if (diff < 0)      alerts.push({ project: p, fieldLabel: label, date: val, level: "overdue", daysLeft: diff });
        else if (diff <= 7) alerts.push({ project: p, fieldLabel: label, date: val, level: "soon",    daysLeft: diff });
      } catch { /* skip */ }
    }
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: number | string; sub: string; accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className={cn("text-sm font-medium", accent)}>{label}</CardTitle>
        <Icon className={cn("h-4 w-4", accent ?? "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", accent)}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects({});

  const loading = isSummaryLoading || isProjectsLoading;

  const phaseCounts = useMemo(() => {
    if (!projects) return {} as Record<string, number>;
    return projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [projects]);

  const alerts = useMemo(() => buildAlerts(projects ?? []), [projects]);

  const activeProjects = useMemo(
    () => (projects ?? []).filter((p) => ACTIVE_STATUSES.has(p.status)),
    [projects]
  );

  const materialCounts = useMemo(() => {
    const m = { madeira: 0, aluminio: 0, indefinido: 0 };
    for (const p of projects ?? []) {
      if (p.materialType === "madeira") m.madeira++;
      else if (p.materialType === "aluminio") m.aluminio++;
      else m.indefinido++;
    }
    return m;
  }, [projects]);

  const total = projects?.length ?? 0;
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos projetos e alertas.</p>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Briefcase}    label="Total de Projetos"   value={total}                       sub={`${phaseCounts["a_iniciar"] ?? 0} a iniciar · ${phaseCounts["em_instalacao"] ?? 0} em instalação`} />
          <KpiCard icon={Layers}       label="Projetos Ativos"     value={activeProjects.length}          sub="em projeto, produção ou instalação" />
          <KpiCard icon={AlertCircle}  label="Alertas de Prazo"    value={alerts.length}               sub={`${alerts.filter(a => a.level === "overdue").length} vencidos · ${alerts.filter(a => a.level === "soon").length} próximos`} accent={alerts.length > 0 ? "text-red-600" : undefined} />
          <KpiCard icon={CheckSquare}  label="Tarefas Concluídas"  value={summary ? `${summary.doneTasks}/${summary.totalTasks}` : "—"} sub={summary?.overdueTasks ? `${summary.overdueTasks} tarefa(s) atrasada(s)` : "nenhuma tarefa atrasada"} />
        </div>
      )}

      {/* ── Projetos por fase ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projetos por Fase</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 flex-1 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PHASE_CONFIG.map((phase) => {
                const count = phaseCounts[phase.id] ?? 0;
                return (
                  <Link key={phase.id} href={`/projects?status=${phase.id}`}>
                    <div className={cn(
                      "rounded-lg border p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                      phase.bg, phase.border
                    )}>
                      <div className={cn("text-2xl font-bold", phase.color)}>{count}</div>
                      <div className={cn("text-[11px] font-medium mt-1 leading-tight", phase.color)}>{phase.label}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Alertas + Material ── */}
      <div className="grid gap-4 lg:grid-cols-7">

        {/* Alertas de prazo */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-base">Alertas de Prazo</CardTitle>
              {alerts.length > 0 && (
                <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                  {alerts.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <CheckSquare className="h-8 w-8 text-emerald-500 opacity-60" />
                <p className="text-sm text-muted-foreground">Nenhum prazo vencido ou próximo.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {alerts.map((a, idx) => (
                  <Link key={idx} href={`/projects/${a.project.id}`}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer hover:opacity-80 transition-opacity",
                      a.level === "overdue"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    )}>
                      {a.level === "overdue"
                        ? <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        : <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{a.project.name}</span>
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium whitespace-nowrap shrink-0",
                        a.level === "overdue" ? "text-red-600" : "text-amber-600"
                      )}>
                        {a.fieldLabel} · {fmtDate(a.date)}
                      </span>
                      {a.level === "overdue"
                        ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                            {Math.abs(a.daysLeft)}d atraso
                          </span>
                        : <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                            {a.daysLeft === 0 ? "hoje" : `${a.daysLeft}d`}
                          </span>
                      }
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material breakdown */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Material</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[160px] w-full" />
            ) : (
              <div className="space-y-5">
                {[
                  { label: "Madeira", count: materialCounts.madeira,   color: "bg-amber-500",   textColor: "text-amber-700" },
                  { label: "Alumínio", count: materialCounts.aluminio, color: "bg-blue-500",     textColor: "text-blue-700" },
                  { label: "Indefinido", count: materialCounts.indefinido, color: "bg-slate-300", textColor: "text-slate-500" },
                ].map(({ label, count, color, textColor }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className={cn("font-semibold", textColor)}>{count} ({pct(count)}%)</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", color)}
                        style={{ width: `${pct(count)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                  <span>Total de projetos</span>
                  <span className="font-semibold text-foreground">{total}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
