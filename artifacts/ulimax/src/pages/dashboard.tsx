import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
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
import { useAlerts } from "@/hooks/useAlerts";
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

// Cada tipo de evento tem seu ícone e sua frase — a data vem do próprio
// acontecimento (conclusão, início, aprovação), não da criação do registro.
const EVENTO_META: Record<string, { icone: string; texto: (t: string) => string }> = {
  task_done:         { icone: "✅", texto: (t) => `Tarefa concluída: ${t}` },
  task_started:      { icone: "⚙️", texto: (t) => `Tarefa iniciada: ${t}` },
  task_created:      { icone: "📝", texto: (t) => `Nova tarefa: ${t}` },
  project_created:   { icone: "🔵", texto: (t) => `Projeto criado: ${t}` },
  project_approved:  { icone: "🟢", texto: (t) => `Arquitetura aprovou: ${t}` },
  project_rejected:  { icone: "🔴", texto: (t) => `Arquitetura reprovou: ${t}` },
  visit_registered:  { icone: "📍", texto: (t) => `Visita registrada: ${t}` },
};

function eventoMeta(kind: string) {
  return EVENTO_META[kind] ?? { icone: "•", texto: (t: string) => t };
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

// Central de Alertas resumida: uma linha por ASSUNTO (tipo de alerta), com a
// contagem e o link para a tela canônica — a lista item a item vive lá.
const ALERT_GROUP_META: Record<string, { label: string; href: string }> = {
  overdue_task:            { label: "Tarefas atrasadas",                href: "/tasks?vencidas=1" },
  overdue_obra_date:       { label: "Datas de obra vencidas",           href: "/obra?tab=pendencias" },
  overdue_installation:    { label: "Instalações atrasadas",            href: "/projects" },
  overdue_sample:          { label: "Amostras atrasadas",               href: "/obra?tab=operacao" },
  overdue_chase_item:      { label: "Itens de plano de ação atrasados", href: "/obra?tab=pendencias" },
  approaching_installation:{ label: "Instalações nos próximos 7 dias",  href: "/obra?tab=pendencias" },
  approaching_sample:      { label: "Amostras vencendo",                href: "/obra?tab=operacao" },
  approaching_chase_item:  { label: "Itens de plano vencendo",          href: "/obra?tab=pendencias" },
  stalled_project:         { label: "Projetos parados em A Iniciar",    href: "/projects" },
  no_assignee:             { label: "Tarefas sem responsável",          href: "/tasks" },
  stale_task:              { label: "Tarefas paradas há 7+ dias",       href: "/tasks" },
  no_installation_date:    { label: "Projetos sem data de instalação",  href: "/projects" },
};

const SEVERITY_META = {
  danger:  { label: "Críticos",     icon: AlertCircle, row: "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30",       iconColor: "text-red-500",   chip: "bg-red-100 text-red-700" },
  warning: { label: "Atenção",      icon: Clock,       row: "bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30", iconColor: "text-amber-500", chip: "bg-amber-100 text-amber-700" },
  info:    { label: "Informativos", icon: Info,        row: "bg-muted/30 border-border",                                                  iconColor: "text-blue-500",  chip: "bg-blue-100 text-blue-700" },
} as const;

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

  // Uma linha por assunto, ordenada por gravidade e volume.
  const alertGroups = useMemo(() => {
    const sevOrder: Record<string, number> = { danger: 0, warning: 1, info: 2 };
    const map = new Map<string, { type: string; severity: "danger" | "warning" | "info"; count: number }>();
    for (const a of centralAlerts) {
      const g = map.get(a.type);
      if (g) g.count += 1;
      else map.set(a.type, { type: a.type, severity: a.severity, count: 1 });
    }
    return [...map.values()].sort(
      (a, b) => sevOrder[a.severity] - sevOrder[b.severity] || b.count - a.count,
    );
  }, [centralAlerts]);

  // Tarefas atrasadas por responsável
  function scrollToAlerts(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById("central-alertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const total = projects?.length ?? 0;

  const ativos = useMemo(
    () => (projects ?? []).filter((p) => ACTIVE_STATUSES.has(p.status)).length,
    [projects],
  );

  // Projetos com entrega nos próximos 30 dias — o que aperta no mês.
  const entregas30 = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return (projects ?? []).filter((p) => {
      if (p.archived || !p.endDate) return false;
      try {
        const d = Math.floor((parseISO(p.endDate).getTime() - hoje.getTime()) / 86_400_000);
        return d >= 0 && d <= 30;
      } catch { return false; }
    }).length;
  }, [projects]);

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

      {/* ── Números do dia: 4 respostas rápidas, todas clicáveis ── */}
      {loading ? (
        <div className="grid gap-4 grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Link href="/projects">
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Projetos ativos</span>
                <Layers className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{ativos}</div>
              <p className="text-xs text-muted-foreground">de {total} no total</p>
            </div>
          </Link>

          <a href="#central-alertas" onClick={scrollToAlerts}>
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Precisam de atenção</span>
                <AlertCircle className={cn("h-4 w-4", farol.red > 0 ? "text-red-500" : "text-muted-foreground")} />
              </div>
              <div className={cn("text-2xl font-bold", farol.red > 0 ? "text-red-600" : "text-foreground")}>
                {farol.red + farol.yellow}
              </div>
              <p className="text-xs text-muted-foreground">🔴 {farol.red} críticos · 🟡 {farol.yellow} atenção</p>
            </div>
          </a>

          <Link href="/tasks?vencidas=1">
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tarefas atrasadas</span>
                <CheckSquare className={cn("h-4 w-4", (summary?.overdueTasks ?? 0) > 0 ? "text-red-500" : "text-emerald-500")} />
              </div>
              <div className={cn("text-2xl font-bold", (summary?.overdueTasks ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                {summary?.overdueTasks ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary ? `${summary.doneTasks}/${summary.totalTasks} tarefas concluídas` : "—"}
              </p>
            </div>
          </Link>

          <Link href="/projects">
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Entregas em 30 dias</span>
                <CalendarDays className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{entregas30}</div>
              <p className="text-xs text-muted-foreground">projetos com prazo de entrega chegando</p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Onde focar agora: um radar, duas lentes (por obra × por assunto) ── */}
      {!loading && !isTasksLoading && (projects?.length ?? 0) > 0 && (
        <div id="central-alertas" className="bg-card rounded-xl border border-border p-4 scroll-mt-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            {/* Lente 1: quais obras abrir primeiro */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Por obra</h3>
              {farol.attention.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Todos os projetos em dia.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {farol.attention.slice(0, 6).map((p) => {
                    const h = farol.map.get(p.id)!;
                    const meta = FAROL_META[h.level];
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`}>
                        <div className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.dot)} />
                          <span className="text-sm font-medium text-foreground truncate shrink-0 max-w-[180px]">{p.name}</span>
                          <span className="text-xs text-muted-foreground truncate flex-1">{h.reasons.slice(0, 2).join(" · ")}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                  {farol.attention.length > 6 && (
                    <Link href="/projects">
                      <p className="text-xs text-muted-foreground pt-2 cursor-pointer hover:text-primary transition-colors">
                        +{farol.attention.length - 6} outro{farol.attention.length - 6 > 1 ? "s" : ""} — ver painel completo
                      </p>
                    </Link>
                  )}
                </div>
              )}
            </div>
            {/* Lente 2: que tipo de pendência atacar/delegar */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Por assunto</h3>
              {alertGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Nenhum alerta no momento.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {alertGroups.map((g) => {
                    const meta = ALERT_GROUP_META[g.type] ?? { label: g.type, href: "/projects" };
                    const sev = SEVERITY_META[g.severity];
                    const Icon = sev.icon;
                    return (
                      <Link key={g.type} href={meta.href}>
                        <div className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 border cursor-pointer hover:opacity-80 transition-opacity",
                          sev.row,
                        )}>
                          <Icon className={cn("h-4 w-4 shrink-0", sev.iconColor)} />
                          <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{meta.label}</p>
                          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0", sev.chip)}>
                            {g.count}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Comparativo por unidade (Madeira × Alumínio) ── */}
      {!loading && <MaterialSplit />}

      {/* ── Atividade Recente ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-4 rounded-full bg-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">O que andou</h2>
          <span className="text-[11px] text-muted-foreground">últimos acontecimentos</span>
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
              <div key={`${item.kind}-${item.id}`} className="flex gap-3 pb-3 relative">
                {i < arr.length - 1 && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                )}
                <div className="w-[18px] h-[18px] rounded-full bg-muted border border-border flex items-center justify-center text-[10px] shrink-0 z-10 mt-0.5">
                  {eventoMeta(item.kind).icone}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{eventoMeta(item.kind).texto(item.title)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.projectName && <span>{item.projectName} · </span>}
                    {item.actorName && <span>{item.actorName} · </span>}
                    há {timeAgo(item.at)}
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
