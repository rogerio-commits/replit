import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListProjects,
  useListTasks,
  useListMembers,
  useUpdateTask,
  useListProjectMilestones,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import type {
  ListProjectsQueryResult,
  ListTasksQueryResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/useAppUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TaskDrawer } from "@/components/task-drawer";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sun,
  Briefcase,
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronRight,
  Circle,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  Timer,
  Layers,
  Flag,
  CalendarClock,
  Play,
} from "lucide-react";

type Project = ListProjectsQueryResult[number];
type Task = ListTasksQueryResult[number];

const STATUS_LABEL: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Ag. Instalação",
  em_instalacao: "Em Instalação",
};

const STATUS_PILL: Record<string, string> = {
  a_iniciar: "bg-slate-100 text-slate-700 border-slate-200",
  em_projeto: "bg-violet-100 text-violet-700 border-violet-200",
  em_aprovacao: "bg-purple-100 text-purple-700 border-purple-200",
  em_producao: "bg-blue-100 text-blue-700 border-blue-200",
  aguardando_instalacao: "bg-amber-100 text-amber-700 border-amber-200",
  em_instalacao: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Em revisão",
  done: "Concluída",
};

const PRIORITY_PILL: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const DEADLINE_FIELDS: { key: keyof Project; label: string }[] = [
  { key: "endDate", label: "Fim Est. Projeto" },
  { key: "finalDate", label: "Final Projeto" },
  { key: "producaoEndDate", label: "Fim Est. Produção" },
  { key: "producaoFinalDate", label: "Final Produção" },
  { key: "medicaoDate", label: "Medição" },
];

function fmtDate(val?: string | null) {
  if (!val) return null;
  try { return format(parseISO(val), "dd/MM/yy", { locale: ptBR }); }
  catch { return null; }
}

interface Deadline {
  project: Project;
  fieldLabel: string;
  date: string;
  daysLeft: number;
  overdue: boolean;
}

function buildDeadlines(projects: Project[]): Deadline[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const items: Deadline[] = [];
  for (const p of projects) {
    for (const { key, label } of DEADLINE_FIELDS) {
      const val = p[key] as string | null | undefined;
      if (!val) continue;
      try {
        const diff = Math.floor((parseISO(val).getTime() - today.getTime()) / 86_400_000);
        if (diff <= 30) {
          items.push({ project: p, fieldLabel: label, date: val, daysLeft: diff, overdue: diff < 0 });
        }
      } catch { /* skip */ }
    }
  }
  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function taskDueInfo(t: Task): { label: string; color: string; urgent: boolean } {
  if (!t.dueDate) return { label: "Sem prazo", color: "text-muted-foreground", urgent: false };
  try {
    const d = parseISO(t.dueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, color: "text-red-600", urgent: true };
    if (diff === 0) return { label: "Hoje", color: "text-red-600", urgent: true };
    if (diff === 1) return { label: "Amanhã", color: "text-amber-600", urgent: false };
    return { label: format(d, "dd/MM", { locale: ptBR }), color: "text-muted-foreground", urgent: false };
  } catch { return { label: "—", color: "text-muted-foreground", urgent: false }; }
}

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function ProjectMilestones({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { data: milestones } = useListProjectMilestones(projectId);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const upcoming = useMemo(() => {
    if (!milestones) return [];
    return milestones
      .filter(m => !m.completedAt)
      .map(m => {
        const d = parseISO(m.dueDate);
        const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
        return { ...m, diff };
      })
      .filter(m => m.diff <= 14)
      .sort((a, b) => a.diff - b.diff);
  }, [milestones]);

  if (!upcoming.length) return null;

  return (
    <>
      {upcoming.map(m => {
        const urgency = m.diff < 0 ? "overdue" : m.diff === 0 ? "today" : m.diff <= 3 ? "urgent" : "soon";
        return (
          <div key={m.id} className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg border",
            urgency === "overdue" ? "bg-red-50 border-red-100" :
            urgency === "today"   ? "bg-red-50 border-red-100" :
            urgency === "urgent"  ? "bg-orange-50 border-orange-100" :
            "bg-amber-50 border-amber-100",
          )}>
            <Flag className={cn("h-3 w-3 shrink-0",
              urgency === "overdue" || urgency === "today" ? "text-red-500" :
              urgency === "urgent" ? "text-orange-500" : "text-amber-500")} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{m.title}</p>
              <p className="text-[10px] text-muted-foreground">{projectName}</p>
            </div>
            <span className={cn("text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full",
              urgency === "overdue" ? "bg-red-100 text-red-700" :
              urgency === "today"   ? "bg-red-100 text-red-700" :
              urgency === "urgent"  ? "bg-orange-100 text-orange-700" :
              "bg-amber-100 text-amber-700"
            )}>
              {m.diff < 0 ? `${Math.abs(m.diff)}d atraso` : m.diff === 0 ? "hoje" : `${m.diff}d`}
            </span>
          </div>
        );
      })}
    </>
  );
}

export default function MeuDia() {
  const { data: me, isLoading: isLoadingMe } = useAppUser();
  const { data: projects, isLoading: isLoadingProjects } = useListProjects({});
  const { data: allTasks, isLoading: isLoadingTasks } = useListTasks();
  const { data: members, isLoading: isLoadingMembers } = useListMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const updateTask = useUpdateTask();

  /** Ação rápida: adiar o prazo em N dias a partir de hoje */
  function postpone(taskId: number, days: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    updateTask.mutate({ id: taskId, data: { dueDate: format(d, "yyyy-MM-dd") } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: `Prazo adiado para ${format(d, "dd/MM", { locale: ptBR })}.` });
      },
      onError: () => toast({ title: "Erro ao adiar prazo", variant: "destructive" }),
    });
  }

  const loading = isLoadingMe || isLoadingProjects || isLoadingTasks || isLoadingMembers;

  const myMember = useMemo(() => {
    if (!members || !me) return null;
    return members.find(m => m.email === me.email) ?? null;
  }, [members, me]);

  const myProjects = useMemo(() => {
    if (!projects || !myMember) return [];
    return (projects as Project[]).filter(p =>
      p.participants?.some(part => part.memberId === myMember.id)
    );
  }, [projects, myMember]);

  const myTasks = useMemo(() => {
    if (!allTasks || !myMember) return [];
    return (allTasks as Task[])
      .filter(t => t.assignedTo === myMember.id && t.status !== "done")
      .sort((a, b) => {
        const da = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
        return da - db;
      });
  }, [allTasks, myMember]);

  const myDeadlines = useMemo(() => buildDeadlines(myProjects), [myProjects]);

  const urgentTasks = myTasks.filter(t => {
    if (!t.dueDate) return false;
    try {
      const diff = Math.floor((parseISO(t.dueDate).getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
      return diff <= 0;
    } catch { return false; }
  });

  const firstName = me?.email.split("@")[0] ?? "";
  const greeting = greetingByTime();
  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <Sun className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}{me ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayLabel}</p>
        </div>
      </div>

      {/* KPI strip */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{myProjects.length}</p>
              <p className="text-xs text-muted-foreground">Projetos atribuídos</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <CheckSquare className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-600">{myTasks.length}</p>
              <p className="text-xs text-muted-foreground">Tarefas abertas</p>
            </div>
          </div>
          <div className={cn(
            "bg-card rounded-xl border p-4 flex items-center gap-3",
            urgentTasks.length > 0 ? "border-red-200 bg-red-50/50" : "border-border",
          )}>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              urgentTasks.length > 0 ? "bg-red-100" : "bg-slate-50",
            )}>
              <AlertCircle className={cn("h-5 w-5", urgentTasks.length > 0 ? "text-red-600" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("text-2xl font-bold", urgentTasks.length > 0 ? "text-red-600" : "text-foreground")}>
                {urgentTasks.length}
              </p>
              <p className="text-xs text-muted-foreground">Atrasadas / vencem hoje</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Tasks — col 3 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-foreground">Minhas Atividades</h2>
                {myTasks.length > 0 && (
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">{myTasks.length}</span>
                )}
              </div>
              <Link href="/tasks">
                <span className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>

            {isLoadingTasks || isLoadingMembers ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : myTasks.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade aberta atribuída a você.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map((t) => {
                  const due = taskDueInfo(t);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                        due.urgent
                          ? "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
                          : t.status === "in_progress"
                            ? "bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30"
                            : "bg-muted/30 border-border",
                      )}
                      onClick={() => { setSelectedTask(t); setDrawerOpen(true); }}
                    >
                      <button
                        className="shrink-0 mt-0.5 group"
                        title="Marcar como concluída"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTask.mutate(
                            { id: t.id, data: { status: "done" } },
                            {
                              onSuccess: () => {
                                void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
                                toast({ title: "Tarefa concluída!" });
                              },
                              onError: () => toast({ title: "Erro ao concluir tarefa", variant: "destructive" }),
                            }
                          );
                        }}
                      >
                        <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:hidden" />
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 hidden group-hover:block" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {t.projectName && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Layers className="h-2.5 w-2.5" />{t.projectName}
                            </span>
                          )}
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            TASK_STATUS_LABEL[t.status] ? "bg-muted text-muted-foreground" : "",
                          )}>
                            {TASK_STATUS_LABEL[t.status] ?? t.status}
                          </span>
                          {t.priority && (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PRIORITY_PILL[t.priority])}>
                              {PRIORITY_LABEL[t.priority] ?? t.priority}
                            </span>
                          )}
                        </div>
                        {t.status === "todo" && (
                          <button
                            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                            title="Marcar como em andamento"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTask.mutate(
                                { id: t.id, data: { status: "in_progress" } },
                                {
                                  onSuccess: () => {
                                    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
                                    toast({ title: "Tarefa iniciada!" });
                                  },
                                  onError: () => toast({ title: "Erro ao iniciar tarefa", variant: "destructive" }),
                                }
                              );
                            }}
                          >
                            <Play className="h-3 w-3" />
                            Iniciar
                          </button>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {t.dueDate && (
                          <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", due.color)}>
                            <Timer className="h-2.5 w-2.5" />{due.label}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                              title="Adiar prazo"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => postpone(t.id, 1)}>Amanhã</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => postpone(t.id, 3)}>Em 3 dias</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => postpone(t.id, 7)}>Próxima semana</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — col 2 */}
        <div className="lg:col-span-2 space-y-4">
          {/* My Projects */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-foreground">Meus Projetos</h2>
              </div>
              <Link href="/projects">
                <span className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                  Ver <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            </div>

            {isLoadingProjects || isLoadingMembers ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : myProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Você ainda não está em nenhum projeto.
              </p>
            ) : (
              <div className="space-y-1.5">
                {myProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0",
                        STATUS_PILL[p.status],
                      )}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{p.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Marcos */}
          {myProjects.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-foreground">Marcos — próximos 14 dias</h2>
              </div>
              <div className="space-y-1.5">
                {myProjects.map(p => (
                  <ProjectMilestones key={p.id} projectId={p.id} projectName={p.name} />
                ))}
              </div>
            </div>
          )}

          {/* Deadlines */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Prazos — próximos 30 dias</h2>
              {myDeadlines.length > 0 && (
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {myDeadlines.length}
                </span>
              )}
            </div>

            {isLoadingProjects || isLoadingMembers ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : myDeadlines.length === 0 ? (
              <div className="py-4 text-center flex flex-col items-center gap-1.5">
                <Clock className="h-6 w-6 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">Nenhum prazo nos próximos 30 dias.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {myDeadlines.map((d, i) => {
                  const urgency = d.overdue ? "overdue" : d.daysLeft === 0 ? "today" : d.daysLeft <= 3 ? "urgent" : d.daysLeft <= 7 ? "soon" : "normal";
                  return (
                    <Link key={i} href={`/projects/${d.project.id}`}>
                      <div className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                        urgency === "overdue" || urgency === "today" ? "bg-red-50 border-red-100" :
                        urgency === "urgent" ? "bg-orange-50 border-orange-100" :
                        urgency === "soon" ? "bg-amber-50 border-amber-100" :
                        "bg-muted/30 border-border",
                      )}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{d.project.name}</p>
                          <p className={cn(
                            "text-[10px]",
                            urgency === "overdue" || urgency === "today" ? "text-red-500" :
                            urgency === "urgent" ? "text-orange-500" :
                            urgency === "soon" ? "text-amber-500" :
                            "text-muted-foreground",
                          )}>
                            {d.fieldLabel} · {fmtDate(d.date)}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full",
                          urgency === "overdue" ? "bg-red-100 text-red-700" :
                          urgency === "today" ? "bg-red-100 text-red-700" :
                          urgency === "urgent" ? "bg-orange-100 text-orange-700" :
                          urgency === "soon" ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground",
                        )}>
                          {d.overdue ? `${Math.abs(d.daysLeft)}d atraso` : d.daysLeft === 0 ? "hoje" : `${d.daysLeft}d`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskDrawer
        task={selectedTask as Parameters<typeof TaskDrawer>[0]["task"]}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        }}
      />
    </div>
  );
}
