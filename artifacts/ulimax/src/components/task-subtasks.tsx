import { useState } from "react";
import { CheckSquare, Plus, Circle, CheckCircle2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useListSubtasks, useCreateSubtask, useUpdateTask, getListSubtasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluído",
};

interface TaskSubtasksProps {
  taskId: number;
}

export function TaskSubtasks({ taskId }: TaskSubtasksProps) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const canEdit = useCanEdit();
  const qc = useQueryClient();

  const { data: subtasks, isLoading } = useListSubtasks(taskId);
  const createSubtask = useCreateSubtask();
  const updateTask = useUpdateTask();

  const total = subtasks?.length ?? 0;
  const done = subtasks?.filter((s) => s.status === "done").length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(taskId) });
  }

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    await createSubtask.mutateAsync({ id: taskId, data: { title } });
    setNewTitle("");
    setAdding(false);
    invalidate();
  }

  async function toggleDone(subtaskId: number, currentStatus: string) {
    const next = currentStatus === "done" ? "todo" : "done";
    await updateTask.mutateAsync({ id: subtaskId, data: { status: next } });
    invalidate();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          Subtarefas
          {total > 0 && (
            <span className="text-xs text-muted-foreground font-normal ml-0.5">
              {done}/{total}
            </span>
          )}
        </button>

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => { setAdding(true); setExpanded(true); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
        </div>
      )}

      {expanded && (
        <div className="space-y-1 pl-1">
          {isLoading && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando...
            </div>
          )}

          {subtasks?.map((sub) => (
            <div
              key={sub.id}
              className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group transition-colors"
            >
              <button
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                disabled={!canEdit || updateTask.isPending}
                onClick={() => toggleDone(sub.id, sub.status)}
              >
                {sub.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <span className={cn("text-sm", sub.status === "done" && "line-through text-muted-foreground")}>
                  {sub.title}
                </span>
                {sub.status !== "todo" && sub.status !== "done" && (
                  <span className="ml-2 text-xs text-muted-foreground">{STATUS_LABELS[sub.status] ?? sub.status}</span>
                )}
              </div>
            </div>
          ))}

          {total === 0 && !isLoading && !adding && (
            <p className="text-xs text-muted-foreground py-1 px-2">Nenhuma subtarefa ainda.</p>
          )}

          {adding && (
            <div className="flex items-center gap-2 px-2 pt-1">
              <Input
                autoFocus
                className="h-7 text-sm"
                placeholder="Título da subtarefa..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                }}
              />
              <Button
                size="sm"
                className="h-7 px-3 text-xs shrink-0"
                disabled={!newTitle.trim() || createSubtask.isPending}
                onClick={handleAdd}
              >
                {createSubtask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={() => { setAdding(false); setNewTitle(""); }}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
