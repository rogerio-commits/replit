import { useMemo } from "react";
import { Link } from "wouter";
import { format, parseISO, isToday, isTomorrow, isPast, addDays, startOfDay } from "date-fns";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ptBR } from "date-fns/locale";
import {
  useGetDashboardSummary,
  useListProjects,
  useListAllSiteVisits,
  useGetRecentActivity,
  useGetMemberProductivity,
  useListTasks,
  useListMembers,
} from "@workspace/api-client-react";
import type {
  ListProjectsQueryResult,
  GetRecentActivityQueryResult,
  GetMemberProductivityQueryResult,
  ListTasksQueryResult,
} from "@workspace/api-client-react";
import { useAppUser } from "@/hooks/useAppUser";
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
  Circle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Project = ListProjectsQueryResult[number];
type ActivityItem = GetRecentActivityQueryResult[number];
type MemberRow = GetMemberProductivityQueryResult[number];

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

const STATUS_BAR: Record<string, string> = {
  a_iniciar: "bg-slate-400", em_projeto: "bg-violet-500", em_aprovacao: "bg-purple-500",
  em_producao: "bg-blue-500", aguardando_instalacao: "bg-amber-500", em_instalacao: "bg-emerald-500",
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
  accent,
  flowColor,
  barColor,
  textColor,
  data,
}: {
  title: string;
  accent: string;
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

// ── Page ─────────────────────────────────────────────────────────────────────

type TaskItem2 = ListTasksQueryResult[number];

function taskDueLabel(t: TaskItem2): { label: string; urgent: boolean; done: boolean } {
  const done = t.status === "done";
  if (done) return { label: "Concluída", urgent: false, done: true };
  if (!t.dueDate) return { label: "Sem prazo", urgent: false, done: false };
  try {
    const d = parseISO(t.dueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, urgent: true, done: false };
    if (diff === 0) return { label: "Hoje", urgent: true, done: false };
    if (diff === 1) return { label: "Amanhã", urgent: false, done: false };
    return { label: format(d, "dd/MM", { locale: ptBR }), urgent: false, done: false };
  } catch { return { label: "—", urgent: false, done: false }; }
}

export default function Dashboard() {
  const { data: me } = useAppUser();
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects({});
  const { data: siteVisits, isLoading: isVisitsLoading } = useListAllSiteVisits();
  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity();
  const { data: productivity, isLoading: isProductivityLoading } = useGetMemberProductivity();
  const { data: allTasks, isLoading: isTasksLoading } = useListTasks();
  const { data: members } = useListMembers();

  const loading = isSummaryLoading || isProjectsLoading;

  const myMemberId = useMemo(() => {
    if (!members || !me) return null;
    const m = members.find(mb => mb.email === me.email);
    return m?.id ?? null;
  }, [members, me]);

  const myTasks = useMemo(() => {
    if (!allTasks || myMemberId === null) return [];
    return (allTasks as TaskItem2[])
      .filter(t => t.assignedTo === myMemberId && t.status !== "done")
      .sort((a, b) => {
        const dateA = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [allTasks, myMemberId]);

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
      return {
        ...ph,
        madeira: counts.madeira,
        aluminio: counts.aluminio,
      };
    });
  }, [projects]);

  const madeiraPipeline = pipelineData.map(p => ({ ...p, count: p.madeira }));
  const aluminioPipeline = pipelineData.map(p => ({ ...p, count: p.aluminio }));

  const alerts = useMemo(() => buildAlerts(projects ?? []), [projects]);
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
    const today = new Date(); today.setHours(0, 0, 0, 0);
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
      { name: "A Fazer",      value: c.todo,        fill: "#94a3b8" },
      { name: "Em Andamento", value: c.in_progress,  fill: "#3b82f6" },
      { name: "Em Revisão",   value: c.review,       fill: "#f59e0b" },
      { name: "Concluída",    value: c.done,          fill: "#10b981" },
    ];
  }, [allTasks]);

  const memberBarData = useMemo(() => {
    return (productivity as MemberRow[] ?? []).slice(0, 7).map(m => ({
      name: m.memberName.split(" ")[0],
      Concluídas: m.doneTasks,
      Pendentes: m.totalTasks - m.doneTasks,
    }));
  }, [productivity]);

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
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5">
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

          {/* Projetos Ativos */}
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Projetos Ativos</span>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {(projects ?? []).filter(p => ACTIVE_STATUSES.has(p.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">em projeto, produção ou instalação</p>
          </div>

          {/* Alertas de Prazo */}
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Alertas de Prazo</span>
              <AlertCircle className={cn("h-4 w-4", alerts.length > 0 ? "text-red-500" : "text-muted-foreground")} />
            </div>
            <div className={cn("text-2xl font-bold", alerts.length > 0 ? "text-red-600" : "text-foreground")}>
              {alerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {alerts.filter(a => a.level === "overdue").length} vencidos · {alerts.filter(a => a.level === "soon").length} próximos
            </p>
          </div>

          {/* Tarefas Concluídas */}
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</span>
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {summary ? `${summary.doneTasks}/${summary.totalTasks}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.overdueTasks ? `${summary.overdueTasks} tarefa(s) atrasada(s)` : "nenhuma tarefa atrasada"}
            </p>
          </div>
        </div>
      )}

      {/* ── Minhas Tarefas ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Minhas Tarefas</h2>
          </div>
          <Link href="/tasks">
            <span className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
              Ver todas <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
        {isTasksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : myTasks.length === 0 ? (
          <div className="py-6 text-center flex flex-col items-center gap-2">
            <CheckCircle2 className="h-7 w-7 text-emerald-500 opacity-60" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída a você.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {myTasks.map((t) => {
              const due = taskDueLabel(t);
              return (
                <Link key={t.id} href={`/tasks`}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                    due.urgent ? "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30" : "bg-muted/30 border-border",
                  )}>
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      {t.projectName && (
                        <p className="text-[10px] text-muted-foreground truncate">{t.projectName}</p>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap",
                      due.urgent
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}>
                      {due.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
            accent="text-amber-600"
            barColor="bg-amber-400"
            flowColor="bg-amber-200"
            textColor="text-amber-600"
            data={madeiraPipeline}
          />
          <PipelineChart
            title="Pipeline — Alumínio"
            accent="text-blue-600"
            barColor="bg-blue-400"
            flowColor="bg-blue-200"
            textColor="text-blue-600"
            data={aluminioPipeline}
          />
        </div>
      )}

      {/* ── Analytics: Status + Membros ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Task status donut */}
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
              <div className="flex-1 space-y-2 min-w-0">
                {taskStatusCounts.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-bold text-foreground shrink-0">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Member bar chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Tarefas por Membro</h2>
          </div>
          {isProductivityLoading ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : memberBarData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Sem dados disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={memberBarData} barSize={10} barCategoryGap="35%" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="Concluídas" fill="#10b981" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="Pendentes" fill="#94a3b8" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
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

      {/* ── Projetos em Andamento + Sidebar ── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Tabela de projetos ativos */}
        <div className="col-span-3 bg-card rounded-xl border border-border p-4">
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

        {/* Sidebar: equipe + visitas */}
        <div className="col-span-2 space-y-4">
          {/* Carga da Equipe */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-foreground">Carga da Equipe</h2>
            </div>
            {isProductivityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : !productivity || productivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum membro com tarefas.</p>
            ) : (
              <div className="space-y-2.5">
                {(productivity as MemberRow[]).slice(0, 5).map((m) => {
                  const pct = m.totalTasks > 0 ? Math.round((m.doneTasks / m.totalTasks) * 100) : 0;
                  const initials = m.memberName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.memberId} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium truncate">{m.memberName.split(" ")[0]}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{m.doneTasks}/{m.totalTasks}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-violet-400")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Próximas Visitas */}
          <div className="bg-card rounded-xl border border-border p-4">
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
      </div>

      {/* ── Alertas + Atividade Recente ── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Alertas de Prazo */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-foreground">Alertas de Prazo</h2>
            {alerts.length > 0 && (
              <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                {alerts.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <CheckSquare className="h-7 w-7 text-emerald-500 opacity-60" />
              <p className="text-sm text-muted-foreground">Nenhum prazo vencido ou próximo.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {alerts.map((a, idx) => (
                <Link key={idx} href={`/projects/${a.project.id}`}>
                  <div className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 border cursor-pointer hover:opacity-80 transition-opacity",
                    a.level === "overdue" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100",
                  )}>
                    {a.level === "overdue"
                      ? <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      : <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.project.name}</p>
                      <p className="text-[10px] text-muted-foreground">{a.fieldLabel}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap",
                      a.level === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
                    )}>
                      {a.level === "overdue" ? `${Math.abs(a.daysLeft)}d atraso` : a.daysLeft === 0 ? "hoje" : `${a.daysLeft}d`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Atividade Recente */}
        <div className="col-span-3 bg-card rounded-xl border border-border p-4">
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
    </div>
  );
}
