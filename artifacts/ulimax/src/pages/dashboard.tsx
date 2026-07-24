import { useMemo } from "react";
import { Link } from "wouter";
import { format, parseISO, isToday, isTomorrow, isPast, addDays, startOfDay } from "date-fns";
import { PieChart, Pie, Cell } from "recharts";
import { ptBR } from "date-fns/locale";
import {
  useGetDashboardSummary,
  useListProjects,
  useListAllSiteVisits,
  useGetRecentActivity,
  useListTasks,
  useListMembers,
} from "@workspace/api-client-react";
import type {
  ListProjectsQueryResult,
  GetRecentActivityQueryResult,
} from "@workspace/api-client-react";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  AlertCircle,
  Clock,
  CheckSquare,
  ChevronRight,
  MapPin,
  Users,
  CalendarDays,
  Layers,
  CheckCircle2,
  Info,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Project = ListProjectsQueryResult[number];
type ActivityItem = GetRecentActivityQueryResult[number];

// ── Constants ────────────────────────────────────────────────────────────────

const PHASE_CONFIG = [
  { id: "a_iniciar",             label: "A Iniciar",      labelShort: "A Iniciar",      color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-300",   bar: "bg-slate-400",   flow: "bg-slate-200" },
  { id: "em_projeto",            label: "Em Projeto",     labelShort: "Em Proj.",       color: "text-violet-700",  bg: "bg-violet-100",  border: "border-violet-300",  bar: "bg-violet-500",  flow: "bg-violet-200" },
  { id: "em_aprovacao",          label: "Em Aprovação",   labelShort: "Em Aprov.",      color: "text-purple-700",  bg: "bg-purple-100",  border: "border-purple-300",  bar: "bg-purple-500",  flow: "bg-purple-200" },
  { id: "em_producao",           label: "Em Produção",    labelShort: "Em Prod.",       color: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-300",    bar: "bg-blue-500",    flow: "bg-blue-200" },
  { id: "aguardando_instalacao", label: "Ag. Instalação", labelShort: "Ag. Inst.",      color: "text-amber-700",   bg: "bg-amber-100",   border: "border-amber-300",   bar: "bg-amber-500",   flow: "bg-amber-200" },
  { id: "em_instalacao",         label: "Em Instalação",  labelShort: "Em Inst.",       color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300", bar: "bg-emerald-500", flow: "bg-emerald-200" },
];

const DEADLINE_FIELDS: { key: keyof Project; label: string }[] = [
  { key: "endDate",           label: "Fim Est. Proj." },
  { key: "finalDate",         label: "Final Proj." },
  { key: "producaoEndDate",   label: "Fim Est. Prod." },
  { key: "producaoFinalDate", label: "Final Prod." },
  { key: "medicaoDate",       label: "Medição" },
];

const ACTIVE_STATUSES = new Set([
  "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao",
]);

const STATUS_PILL: Record<string, string> = {
  a_iniciar:             "bg-slate-100 text-slate-700 border-slate-200",
  em_projeto:            "bg-violet-100 text-violet-700 border-violet-200",
  em_aprovacao:          "bg-purple-100 text-purple-700 border-purple-200",
  em_producao:           "bg-blue-100 text-blue-700 border-blue-200",
  aguardando_instalacao: "bg-amber-100 text-amber-700 border-amber-200",
  em_instalacao:         "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_LABEL: Record<string, string> = {
  a_iniciar: "A Iniciar", em_projeto: "Em Projeto", em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção", aguardando_instalacao: "Ag. Instalação", em_instalacao: "Em Instalação",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(val?: string | null) {
  if (!val) return null;
  try { return format(parseISO(val), "dd/MM/yy", { locale: ptBR }); }
  catch { return null; }
}

function visitDateLabel(dateStr: string): { label: string; today: boolean } {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return { label: "Hoje", today: true };
    if (isTomorrow(d)) return { label: "Amanhã", today: false };
    return { label: format(d, "dd/MM", { locale: ptBR }), today: false };
  } catch { return { label: dateStr, today: false }; }
}

function activityIcon(item: ActivityItem): string {
  if (item.type === "project") return "🔵";
  if (item.status === "done") return "✅";
  if (item.status === "in_progress") return "⚙️";
  if (item.status === "review") return "🔍";
  return "➕";
}

function activityText(item: ActivityItem): string {
  if (item.type === "project") return `Projeto "${item.title}" atualizado`;
  if (item.status === "done") return `Tarefa concluída: ${item.title}`;
  if (item.status === "in_progress") return `Em andamento: ${item.title}`;
  return `Nova tarefa: ${item.title}`;
}

function timeAgo(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch { return "—"; }
}

type AlertLevel = "overdue" | "soon";
interface DateAlert { project: Project; fieldLabel: string; date: string; level: AlertLevel; daysLeft: number; }

function buildAlerts(projects: Project[]): DateAlert[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const alerts: DateAlert[] = [];
  for (const p of projects) {
    for (const { key, label } of DEADLINE_FIELDS) {
      const val = p[key] as string | null | undefined;
      if (!val) continue;
      try {
        const diff = Math.floor((parseISO(val).getTime() - today.getTime()) / 86_400_000);
        if (diff < 0)       alerts.push({ project: p, fieldLabel: label, date: val, level: "overdue", daysLeft: diff });
        else if (diff <= 7) alerts.push({ project: p, fieldLabel: label, date: val, level: "soon",    daysLeft: diff });
      } catch { /* skip */ }
    }
  }
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

interface UpcomingDeadline { project: Project; fieldLabel: string; date: string; daysLeft: number; }

/** All deadlines in the next 1–15 days across all projects, sorted ascending */
function buildUpcoming15(projects: Project[]): UpcomingDeadline[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const items: UpcomingDeadline[] = [];
  for (const p of projects) {
    for (const { key, label } of DEADLINE_FIELDS) {
      const val = p[key] as string | null | undefined;
      if (!val) continue;
      try {
        const diff = Math.floor((parseISO(val).getTime() - today.getTime()) / 86_400_000);
        if (diff >= 0 && diff <= 15) items.push({ project: p, fieldLabel: label, date: val, daysLeft: diff });
      } catch { /* skip */ }
    }
  }
  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Nearest upcoming deadline across all DEADLINE_FIELDS */
function nearestDeadline(p: Project): { label: string; date: string; overdue: boolean } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let best: { label: string; date: string; diff: number } | null = null;
  for (const { key, label } of DEADLINE_FIELDS) {
    const val = p[key] as string | null | undefined;
    if (!val) continue;
    try {
      const diff = Math.floor((parseISO(val).getTime() - today.getTime()) / 86_400_000);
      if (!best || Math.abs(diff) < Math.abs(best.diff)) best = { label, date: val, diff };
    } catch { /* skip */ }
  }
  if (!best) return null;
  return { label: best.label, date: best.date, overdue: best.diff < 0 };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PipelineChart({
  title,
  flowColor,
  barColor,
  textColor,
  data,
}: {
  title: string;
  flowColor: string;
  barColor: string;
  textColor: string;
  data: { id: string; label: string; labelShort: string; count: number }[];
}) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("w-3 h-3 rounded-sm shrink-0", barColor)} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className={cn("ml-auto text-xs font-bold", textColor)}>{total} projetos</span>
      </div>
      <div className="flex gap-2 items-end" style={{ height: 88 }}>
        {data.map((phase) => {
          const barH = maxCount > 0 ? Math.round((phase.count / maxCount) * 64) : 0;
          return (
            <Link key={phase.id} href={`/projects?status=${phase.id}`} className="flex-1">
              <div className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-full flex flex-col-reverse rounded overflow-hidden" style={{ height: 64 }}>
                  <div className={cn("w-full shrink-0", barColor)} style={{ height: barH }} />
                </div>
                <div className={cn("text-[11px] font-bold", textColor)}>{phase.count}</div>
                <div className="text-[9px] text-center leading-tight text-muted-foreground font-medium">{phase.labelShort}</div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-0.5">
        {data.map((phase, i) => (
          <div key={phase.id} className="flex-1 flex items-center">
            <div className={cn("h-1 flex-1 rounded-sm", flowColor)} />
            {i < data.length - 1 && <span className="text-muted-foreground text-[9px] px-0.5">▶</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const SEVERITY_META = {
  danger:  { label: "Críticos",     icon: AlertCircle, row: "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30",       iconColor: "text-red-500",   chip: "bg-red-100 text-red-700" },
  warning: { label: "Atenção",      icon: Clock,       row: "bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30", iconColor: "text-amber-500", chip: "bg-amber-100 text-amber-700" },
  info:    { label: "Informativos", icon: Info,        row: "bg-muted/30 border-border",                                                  iconColor: "text-blue-500",  chip: "bg-blue-100 text-blue-700" },
} as const;

function AlertRow({ alert }: { alert: Alert }) {
  const meta = SEVERITY_META[alert.severity];
  const Icon = meta.icon;
  return (
    <Link href={alert.href}>
      <div className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 border cursor-pointer hover:opacity-80 transition-opacity",
        meta.row,
      )}>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects({});
  const { data: siteVisits, isLoading: isVisitsLoading } = useListAllSiteVisits();
  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity();
  const { data: allTasks, isLoading: isTasksLoading } = useListTasks();
  const { data: members } = useListMembers();
  const allAlerts = useAlerts();

  const loading = isSummaryLoading || isProjectsLoading;

  // Central de alertas — tudo, exceto os alertas pessoais ("tarefa para você")
  const centralAlerts = useMemo(
    () => allAlerts.filter(a => a.type !== "task_assigned_to_me"),
    [allAlerts],
  );
  const alertCounts = useMemo(() => ({
    danger:  centralAlerts.filter(a => a.severity === "danger").length,
    warning: centralAlerts.filter(a => a.severity === "warning").length,
    info:    centralAlerts.filter(a => a.severity === "info").length,
  }), [centralAlerts]);
  const actionableAlerts = alertCounts.danger + alertCounts.warning;

  // Tarefas atrasadas por responsável
  const overdueByMember = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isTaskOverdue = (t: { status: string; dueDate?: string | null }) => {
      if (t.status === "done" || !t.dueDate) return false;
      try { return parseISO(t.dueDate) < today; } catch { return false; }
    };
    const tasks = (allTasks ?? []) as unknown as { assignedTo?: number | null; status: string; dueDate?: string | null }[];
    const rows = (members ?? []).map(m => {
      const mine = tasks.filter(t => t.assignedTo === m.id && t.status !== "done");
      return { member: m, open: mine.length, overdue: mine.filter(isTaskOverdue).length };
    }).filter(w => w.overdue > 0).sort((a, b) => b.overdue - a.overdue);
    const unassignedOverdue = tasks.filter(t => !t.assignedTo && isTaskOverdue(t)).length;
    return { rows, unassignedOverdue };
  }, [members, allTasks]);

  // Pipeline counts broken out by material
  const pipelineData = useMemo(() => {
    const byStatusMaterial = new Map<string, { madeira: number; aluminio: number }>();
    for (const p of PHASE_CONFIG) byStatusMaterial.set(p.id, { madeira: 0, aluminio: 0 });
    for (const p of projects ?? []) {
      const entry = byStatusMaterial.get(p.status);
      if (!entry) continue;
      if (p.materialType === "madeira") entry.madeira++;
      else if (p.materialType === "aluminio") entry.aluminio++;
    }
    return PHASE_CONFIG.map(ph => {
      const counts = byStatusMaterial.get(ph.id) ?? { madeira: 0, aluminio: 0 };
      return { ...ph, madeira: counts.madeira, aluminio: counts.aluminio };
    });
  }, [projects]);

  const madeiraPipeline = pipelineData.map(p => ({ ...p, count: p.madeira }));
  const aluminioPipeline = pipelineData.map(p => ({ ...p, count: p.aluminio }));

  const dateAlerts = useMemo(() => buildAlerts(projects ?? []), [projects]);
  const upcoming15 = useMemo(() => buildUpcoming15(projects ?? []), [projects]);
  const activeProjects = useMemo(
    () => (projects ?? []).filter(p => ACTIVE_STATUSES.has(p.status)).slice(0, 6),
    [projects],
  );

  const materialCounts = useMemo(() => {
    const m = { madeira: 0, aluminio: 0 };
    for (const p of projects ?? []) {
      if (p.materialType === "madeira") m.madeira++;
      else if (p.materialType === "aluminio") m.aluminio++;
    }
    return m;
  }, [projects]);

  // Upcoming site visits — sort by date ascending, show future ones first
  const upcomingVisits = useMemo(() => {
    if (!siteVisits) return [];
    return [...siteVisits]
      .filter(v => { try { return !isPast(parseISO(v.date)) || isToday(parseISO(v.date)); } catch { return false; } })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [siteVisits]);

  const total = projects?.length ?? 0;

  const weekDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      const dayTasks = (allTasks ?? []).filter(t => {
        if (!t.dueDate || t.status === "done") return false;
        try {
          return startOfDay(parseISO(t.dueDate)).getTime() === date.getTime();
        } catch { return false; }
      });
      return { date, tasks: dayTasks, isToday: i === 0 };
    });
  }, [allTasks]);

  const taskStatusCounts = useMemo(() => {
    const c = { todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const t of allTasks ?? []) {
      if (t.status in c) c[t.status as keyof typeof c]++;
    }
    return [
      { key: "todo",        name: "A Fazer",      value: c.todo,         fill: "#94a3b8" },
      { key: "in_progress", name: "Em Andamento", value: c.in_progress,  fill: "#3b82f6" },
      { key: "review",      name: "Em Revisão",   value: c.review,       fill: "#f59e0b" },
      { key: "done",        name: "Concluída",    value: c.done,         fill: "#10b981" },
    ];
  }, [allTasks]);

  function scrollToAlerts(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById("central-alertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <OnboardingBanner />

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos projetos, equipe e alertas.</p>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid gap-4 grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Total de Projetos — com breakdown de material */}
          <Link href="/projects">
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total de Projetos</span>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground">{total}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Madeira <strong>{materialCounts.madeira}</strong>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  Alumínio <strong>{materialCounts.aluminio}</strong>
                </span>
              </div>
            </div>
          </Link>

          {/* Projetos Ativos */}
          <Link href="/projects">
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Projetos Ativos</span>
                <Layers className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(projects ?? []).filter(p => ACTIVE_STATUSES.has(p.status)).length}
              </div>
              <p className="text-xs text-muted-foreground">em projeto, produção ou instalação</p>
            </div>
          </Link>

          {/* Alertas */}
          <a href="#central-alertas" onClick={scrollToAlerts}>
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Alertas</span>
                <AlertCircle className={cn("h-4 w-4", actionableAlerts > 0 ? "text-red-500" : "text-muted-foreground")} />
              </div>
              <div className={cn("text-2xl font-bold", actionableAlerts > 0 ? "text-red-600" : "text-foreground")}>
                {actionableAlerts}
              </div>
              <p className="text-xs text-muted-foreground">
                {alertCounts.danger} críticos · {alertCounts.warning} atenção
              </p>
            </div>
          </a>

          {/* Tarefas Concluídas */}
          <Link href={summary?.overdueTasks ? "/tasks?vencidas=1" : "/tasks"}>
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</span>
                <CheckSquare className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {summary ? `${summary.doneTasks}/${summary.totalTasks}` : "—"}
              </div>
              <p className={cn("text-xs", summary?.overdueTasks ? "text-red-600 font-medium" : "text-muted-foreground")}>
                {summary?.overdueTasks ? `${summary.overdueTasks} tarefa(s) atrasada(s) — ver` : "nenhuma tarefa atrasada"}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Central de Alertas + Atrasadas por Responsável ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Central de Alertas */}
        <div id="central-alertas" className="lg:col-span-3 bg-card rounded-xl border border-border p-4 scroll-mt-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-1.5 h-4 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-foreground">Central de Alertas</h2>
            <div className="ml-auto flex items-center gap-1.5">
              {(["danger", "warning", "info"] as const).map(sev => (
                alertCounts[sev] > 0 && (
                  <span key={sev} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", SEVERITY_META[sev].chip)}>
                    {alertCounts[sev]} {SEVERITY_META[sev].label.toLowerCase()}
                  </span>
                )
              ))}
            </div>
          </div>
          {isTasksLoading || isProjectsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : centralAlerts.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" />
              <p className="text-sm text-muted-foreground">Nenhum alerta no momento. Tudo em dia!</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {centralAlerts.slice(0, 40).map(a => <AlertRow key={a.id} alert={a} />)}
              {centralAlerts.length > 40 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  +{centralAlerts.length - 40} outros alertas
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tarefas Atrasadas por Responsável */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Atrasadas por Responsável</h2>
          </div>
          {isTasksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : overdueByMember.rows.length === 0 && overdueByMember.unassignedOverdue === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" />
              <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {overdueByMember.rows.map(w => {
                const initials = w.member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Link key={w.member.id} href={`/tasks?responsavel=${w.member.id}&vencidas=1`}>
                    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 border bg-muted/30 border-border cursor-pointer hover:border-primary/40 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{w.member.name}</p>
                        <p className="text-[10px] text-muted-foreground">{w.open} aberta(s) no total</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-red-100 text-red-700 whitespace-nowrap">
                        {w.overdue} atrasada{w.overdue > 1 ? "s" : ""}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {overdueByMember.unassignedOverdue > 0 && (
                <Link href="/tasks?vencidas=1">
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 border bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <UserX className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Sem responsável</p>
                      <p className="text-[10px] text-muted-foreground">tarefas atrasadas sem dono</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-amber-100 text-amber-700">
                      {overdueByMember.unassignedOverdue}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mini Calendário 7 dias ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Próximos 7 Dias</h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">tarefas com prazo</span>
        </div>
        {isTasksLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 flex-1 rounded-lg" />)}
          </div>
        ) : (
          <div className="flex gap-2">
            {weekDays.map(({ date, tasks, isToday: dayIsToday }) => (
              <Link key={date.toISOString()} href="/tasks" className="flex-1 min-w-0">
                <div className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm min-h-[84px]",
                  dayIsToday
                    ? "bg-primary/5 border-primary/30"
                    : tasks.length > 0
                      ? "bg-muted/30 border-border"
                      : "border-border/40",
                )}>
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    dayIsToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(date, "EEE", { locale: ptBR })}
                  </span>
                  <span className={cn(
                    "text-lg font-bold leading-none",
                    dayIsToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(date, "d")}
                  </span>
                  {tasks.length > 0 ? (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5",
                      dayIsToday ? "bg-primary text-primary-foreground" : "bg-amber-100 text-amber-700"
                    )}>
                      {tasks.length}
                    </span>
                  ) : (
                    <span className="h-[18px]" />
                  )}
                  <div className="w-full space-y-0.5 mt-0.5">
                    {tasks.slice(0, 2).map(t => (
                      <p key={t.id} className="text-[9px] leading-tight text-muted-foreground truncate text-center">{t.title}</p>
                    ))}
                    {tasks.length > 2 && (
                      <p className="text-[9px] text-muted-foreground/60 text-center">+{tasks.length - 2}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Pipelines Madeira | Alumínio ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <PipelineChart
            title="Pipeline — Madeira"
            barColor="bg-amber-400"
            flowColor="bg-amber-200"
            textColor="text-amber-600"
            data={madeiraPipeline}
          />
          <PipelineChart
            title="Pipeline — Alumínio"
            barColor="bg-blue-400"
            flowColor="bg-blue-200"
            textColor="text-blue-600"
            data={aluminioPipeline}
          />
        </div>
      )}

      {/* ── Analytics: Status das Tarefas + Projetos Vencidos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task status donut — legenda clicável */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Status das Tarefas</h2>
            {!isTasksLoading && (
              <span className="ml-auto text-xs font-bold text-muted-foreground">
                {taskStatusCounts.reduce((s, c) => s + c.value, 0)} total
              </span>
            )}
          </div>
          {isTasksLoading ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <PieChart width={100} height={100}>
                  <Pie
                    data={taskStatusCounts}
                    cx={50} cy={50}
                    innerRadius={28} outerRadius={44}
                    dataKey="value"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {taskStatusCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {taskStatusCounts.map(s => (
                  <Link key={s.key} href={`/tasks?status=${s.key}`}>
                    <div className="flex items-center gap-2 rounded-md px-1.5 py-1 cursor-pointer hover:bg-muted/50 transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{s.name}</span>
                      <span className="text-xs font-bold text-foreground shrink-0">{s.value}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Projetos com Prazo Vencido */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-foreground">Projetos com Prazo Vencido</h2>
            {dateAlerts.filter(a => a.level === "overdue").length > 0 && (
              <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                {dateAlerts.filter(a => a.level === "overdue").length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (() => {
            const overdueAlerts = dateAlerts.filter(a => a.level === "overdue");
            if (overdueAlerts.length === 0) return (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 opacity-60" />
                <p className="text-sm text-muted-foreground">Nenhum projeto com prazo vencido.</p>
              </div>
            );
            const byProject = new Map<number, typeof overdueAlerts>();
            for (const a of overdueAlerts) {
              const id = a.project.id;
              if (!byProject.has(id)) byProject.set(id, []);
              byProject.get(id)!.push(a);
            }
            return (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {[...byProject.entries()].map(([pid, projectAlerts]) => {
                  const proj = projectAlerts[0].project;
                  const maxDelay = Math.max(...projectAlerts.map(a => Math.abs(a.daysLeft)));
                  return (
                    <Link key={pid} href={`/projects/${pid}`}>
                      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 border bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900 cursor-pointer hover:opacity-80 transition-opacity">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{proj.name}</p>
                          <p className="text-[10px] text-muted-foreground">{projectAlerts.length} prazo(s) vencido(s)</p>
                        </div>
                        <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                          {maxDelay}d atraso
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Próximos Vencimentos — 15 dias ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Próximos Vencimentos</h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">próximos 15 dias</span>
          {!isProjectsLoading && upcoming15.length > 0 && (
            <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {upcoming15.length}
            </span>
          )}
        </div>
        {isProjectsLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-48 shrink-0 rounded-lg" />)}
          </div>
        ) : upcoming15.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum vencimento nos próximos 15 dias.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mb-1">
            {upcoming15.map((item, i) => {
              const urgency =
                item.daysLeft === 0 ? "today" :
                item.daysLeft <= 3  ? "urgent" :
                item.daysLeft <= 7  ? "soon" : "normal";
              return (
                <Link key={i} href={`/projects/${item.project.id}`} className="shrink-0">
                  <div className={cn(
                    "w-52 rounded-lg border p-3 cursor-pointer hover:opacity-80 transition-opacity space-y-2",
                    urgency === "today"  ? "bg-red-50 border-red-200" :
                    urgency === "urgent" ? "bg-orange-50 border-orange-200" :
                    urgency === "soon"   ? "bg-amber-50 border-amber-200" :
                                          "bg-muted/40 border-border",
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                        urgency === "today"  ? "bg-red-100 text-red-700" :
                        urgency === "urgent" ? "bg-orange-100 text-orange-700" :
                        urgency === "soon"   ? "bg-amber-100 text-amber-700" :
                                              "bg-blue-100 text-blue-700",
                      )}>
                        {urgency === "today" ? "Hoje" : `${item.daysLeft}d`}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {fmtDate(item.date)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">
                      {item.project.name}
                    </p>
                    <p className={cn(
                      "text-[10px] font-medium",
                      urgency === "today"  ? "text-red-600" :
                      urgency === "urgent" ? "text-orange-600" :
                      urgency === "soon"   ? "text-amber-600" :
                                            "text-muted-foreground",
                    )}>
                      {item.fieldLabel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Projetos em Andamento + Próximas Visitas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tabela de projetos ativos */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Projetos em Andamento</h2>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {activeProjects.length} projetos
            </span>
          </div>
          {isProjectsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum projeto em andamento.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeProjects.map((p) => {
                const deadline = nearestDeadline(p);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="flex items-center gap-2 py-1.5 border-b last:border-0 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0",
                        STATUS_PILL[p.status],
                      )}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{p.name}</span>
                      {p.materialType && (
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                          p.materialType === "madeira"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700",
                        )}>
                          {p.materialType === "madeira" ? "Mad." : "Alum."}
                        </span>
                      )}
                      {deadline && (
                        <span className={cn(
                          "text-[10px] border rounded px-1 py-0.5 shrink-0",
                          deadline.overdue
                            ? "border-red-200 text-red-600 bg-red-50"
                            : "text-muted-foreground border-border",
                        )}>
                          {fmtDate(deadline.date)}
                        </span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas Visitas */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-foreground">Próximas Visitas</h2>
          </div>
          {isVisitsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : upcomingVisits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma visita programada.</p>
          ) : (
            <div className="space-y-2">
              {upcomingVisits.map((v) => {
                const { label, today } = visitDateLabel(v.date);
                return (
                  <div key={v.id} className="flex gap-2.5 pb-2 border-b last:border-0 last:pb-0">
                    <div className="text-center min-w-[44px]">
                      <div className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        today ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
                      )}>{label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 justify-center">
                        <CalendarDays className="w-2.5 h-2.5" />
                        {(() => { try { return format(parseISO(v.date), "dd/MM", { locale: ptBR }); } catch { return ""; } })()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/projects/${v.projectId}`}>
                        <p className="text-xs font-medium truncate hover:text-primary cursor-pointer">{v.projectName}</p>
                      </Link>
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 shrink-0" />{v.visitors}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Atividade Recente ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-4 rounded-full bg-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
        </div>
        {isActivityLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {(activity as ActivityItem[]).slice(0, 8).map((item, i, arr) => (
              <div key={`${item.type}-${item.id}`} className="flex gap-3 pb-3 relative">
                {i < arr.length - 1 && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                )}
                <div className="w-[18px] h-[18px] rounded-full bg-muted border border-border flex items-center justify-center text-[10px] shrink-0 z-10 mt-0.5">
                  {activityIcon(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{activityText(item)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.projectName && <span>{item.projectName} · </span>}
                    há {timeAgo(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
