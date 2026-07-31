import { useState } from "react";
import {
  useListProjectMilestones,
  useCreateMilestone,
  useToggleMilestone,
  useDeleteMilestone,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useIsGestor } from "@/hooks/useAppUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Flag,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Props {
  projectId: number;
}

function milestoneStatus(dueDate: string, completedAt: string | null) {
  if (completedAt) return "done";
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  return "upcoming";
}

const STATUS_META = {
  done:     { color: "text-green-600 dark:text-green-400",  icon: CheckCircle2, label: "Concluído" },
  overdue:  { color: "text-red-600 dark:text-red-400",     icon: CalendarClock, label: "Vencido" },
  soon:     { color: "text-amber-600 dark:text-amber-400", icon: CalendarClock, label: "Em breve" },
  upcoming: { color: "text-muted-foreground",               icon: Circle,        label: "A concluir" },
};

export function ProjectMilestones({ projectId }: Props) {
  const queryClient = useQueryClient();
  const isGestor = useIsGestor();

  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: milestones, isLoading } = useListProjectMilestones(projectId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}/milestones`] });

  const createMutation = useCreateMilestone({ mutation: { onSuccess: invalidate } });
  const toggleMutation = useToggleMilestone({ mutation: { onSuccess: invalidate } });
  const deleteMutation = useDeleteMilestone({ mutation: { onSuccess: invalidate } });

  function handleCreate() {
    if (!title.trim() || !dueDate) return;
    createMutation.mutate(
      { id: projectId, data: { title: title.trim(), dueDate } },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate("");
          setShowForm(false);
        },
      }
    );
  }

  const sorted = [...(milestones ?? [])].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  );

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
      >
        <Flag className="h-4 w-4 text-primary" />
        <span>Marcos do Projeto</span>
        <span className="text-xs font-normal text-muted-foreground ml-1">
          ({milestones?.length ?? 0})
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
      </button>
      <p className="text-xs text-muted-foreground pl-6 -mt-1">Datas-chave e entregas importantes que definem o avanço do projeto</p>

      {open && (
        <div className="space-y-2 pl-2">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))
            : sorted.length === 0 && !showForm
            ? (
              <p className="text-xs text-muted-foreground py-2">
                Nenhum marco definido ainda.
              </p>
            )
            : sorted.map(m => {
              const status = milestoneStatus(m.dueDate, m.completedAt ?? null);
              const { color, icon: Icon } = STATUS_META[status];
              const days = differenceInDays(parseISO(m.dueDate), new Date());
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                    status === "done"
                      ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                      : status === "overdue"
                      ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                      : "bg-card border-border"
                  )}
                >
                  <button
                    onClick={() => toggleMutation.mutate({ id: m.id })}
                    className={cn("shrink-0 hover:opacity-70 transition-opacity", color)}
                    title={status === "done" ? "Marcar como pendente" : "Marcar como concluído"}
                  >
                    <Icon className="h-4 w-4" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-medium", status === "done" && "line-through text-muted-foreground")}>
                      {m.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(m.dueDate), "d MMM yyyy", { locale: ptBR })}
                      </span>
                      {!m.completedAt && (
                        <span className={cn("text-xs font-medium", color)}>
                          {days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? "hoje" : `${days}d restantes`}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="text-xs text-green-600">
                          Concluído em {format(new Date(m.completedAt), "d MMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>

                  {isGestor && (
                    <button
                      onClick={() => deleteMutation.mutate({ id: m.id })}
                      className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Excluir marco"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

          {showForm ? (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5">
              <Input
                placeholder="Nome do marco (ex: Aprovação do projeto)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-8 px-2 rounded-md border border-input bg-background text-sm text-foreground flex-1"
                />
                <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !dueDate || createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setTitle(""); setDueDate(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : isGestor ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar marco
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
