import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListTasks,
  useListMembers,
  useUpdateTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import type { ListTasksQueryResult } from "@workspace/api-client-react";
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
  CheckSquare, Circle, CheckCircle2, ArrowRight, Timer, Layers,
  CalendarClock, Play,
} from "lucide-react";

// ── Minhas Atividades ────────────────────────────────────────────────────────
// Card com as tarefas abertas atribuídas ao usuário logado, com ações rápidas
// (concluir, iniciar, adiar prazo) e o drawer de detalhe. Extraído do Meu Dia
// para viver também na Prancheta — a home única do projetista.

type Task = ListTasksQueryResult[number];

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

export function MinhasAtividades() {
  const { data: me } = useAppUser();
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

  const myMember = useMemo(() => {
    if (!members || !me) return null;
    return members.find((m) => m.email === me.email) ?? null;
  }, [members, me]);

  const myTasks = useMemo(() => {
    if (!allTasks || !myMember) return [];
    return (allTasks as Task[])
      .filter((t) => t.assignedTo === myMember.id && t.status !== "done")
      .sort((a, b) => {
        const da = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
        return da - db;
      });
  }, [allTasks, myMember]);

  return (
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
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
