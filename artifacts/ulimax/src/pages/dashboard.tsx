import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
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
import { computeHealthMap, FAROL_META, attentionScore } from "@/lib/project-health";
import { projectStatusLabel } from "@/lib/project-status";
import { useCanEdit, useIsGestor } from "@/hooks/useAppUser";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { MaterialSplit } from "@/components/material-split";
import { FarolLegend } from "@/components/farol-legend";
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

const ACTIVE_STATUSES = new Set([
  "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao",
]);

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

// ── Sub-components ────────────────────────────────────────────────────────────

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

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects({});
  const { data: siteVisits, isLoading: isVisitsLoading } = useListAllSiteVisits();
  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity();
  const { data: allTasks, isLoading: isTasksLoading } = useListTasks();
  const { data: members } = useListMembers();
  const allAlerts = useAlerts();
  const canEdit = useCanEdit();
  const isGestor = useIsGestor();
  const [, navigate] = useLocation();
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

  const farol = useMemo(() => {
    const map = computeHealthMap(projects ?? [], allTasks ?? []);
    // Projetos que pedem atenção, do mais urgente para o menos urgente
    const attention = (projects ?? [])
      .filter((p) => (map.get(p.id)?.level ?? "green") !== "green")
      .sort((a, b) => attentionScore(b, map.get(b.id)!) - attentionScore(a, map.get(a.id)!));
    const red = attention.filter((p) => map.get(p.id)!.level === "red").length;
    const yellow = attention.length - red;
    const green = (projects ?? []).length - attention.length;
    return { map, attention, red, yellow, green };
  }, [projects, allTasks]);

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

      {/* ── Comparativo por unidade (Madeira × Alumínio) ── */}
      {!loading && <MaterialSplit />}

      {/* ── Onde focar agora ── */}
      {!loading && !isTasksLoading && (projects?.length ?? 0) > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">🚦 Onde focar agora</h2>
            <FarolLegend />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">🔴 {farol.red}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🟡 {farol.yellow}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 {farol.green}</span>
            </span>
            <Link href="/projects" className="ml-auto flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Ver painel completo <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {farol.attention.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Todos os projetos em dia — nenhum precisa de atenção especial.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {farol.attention.slice(0, 5).map((p) => {
                const h = farol.map.get(p.id)!;
                const meta = FAROL_META[h.level];
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.dot)} />
                      <span className="text-sm font-medium text-foreground truncate max-w-[240px] shrink-0">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0 hidden md:inline">{projectStatusLabel(p.status)}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">{h.reasons.slice(0, 2).join(" · ")}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                );
              })}
              {farol.attention.length > 5 && (
                <Link href="/projects">
                  <p className="text-xs text-muted-foreground pt-2 cursor-pointer hover:text-primary transition-colors">
                    +{farol.attention.length - 5} outro{farol.attention.length - 5 > 1 ? "s" : ""} projeto{farol.attention.length - 5 > 1 ? "s" : ""} precisando de atenção — ver painel completo
                  </p>
                </Link>
              )}
            </div>
          )}
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

      {/* ── Status das Tarefas + Próximas Visitas ── */}
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
                    {v.totalActionItemsCount > 0 && (
                      v.pendingActionItemsCount === 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 border border-green-200 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 border border-orange-200 shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          {v.pendingActionItemsCount}
                        </span>
                      )
                    )}
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
