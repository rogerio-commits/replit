import { useState } from "react";
import { Link2, Plus, X, Loader2, AlertTriangle, CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListTaskDependencies,
  useAddTaskDependency,
  useRemoveTaskDependency,
  useListTasks,
  getListTaskDependenciesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluído",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  in_progress: <Circle className="h-3.5 w-3.5 text-blue-500" />,
  review: <Circle className="h-3.5 w-3.5 text-amber-500" />,
  todo: <Circle className="h-3.5 w-3.5 text-slate-400" />,
};

interface TaskDependenciesProps {
  taskId: number;
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const canEdit = useCanEdit();
  const qc = useQueryClient();

  const { data: deps, isLoading } = useListTaskDependencies(taskId);
  const addDep = useAddTaskDependency();
  const removeDep = useRemoveTaskDependency();
  const { data: allTasks } = useListTasks(undefined, { query: { queryKey: ["listTasks"], enabled: adding } });

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListTaskDependenciesQueryKey(taskId) });
  }

  const existingDepIds = new Set(deps?.map((d) => d.dependsOnTaskId) ?? []);
  const filteredTasks = (allTasks ?? []).filter(
    (t) => t.id !== taskId && !existingDepIds.has(t.id) &&
      (t.title.toLowerCase().includes(search.toLowerCase()) || (t.projectName ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  async function handleAdd(depTaskId: number) {
    await addDep.mutateAsync({ id: taskId, data: { dependsOnTaskId: depTaskId } });
    setAdding(false);
    setSearch("");
    invalidate();
  }

  async function handleRemove(depId: number) {
    await removeDep.mutateAsync({ id: taskId, depId });
    invalidate();
  }

  const blockedCount = deps?.filter((d) => d.dependsOnStatus !== "done").length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Bloqueada por
          {(deps?.length ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground font-normal ml-0.5">
              {deps!.length}
            </span>
          )}
          {blockedCount > 0 && (
            <span className="ml-1 flex items-center gap-0.5 text-xs text-amber-600 font-normal">
              <AlertTriangle className="h-3 w-3" />
              {blockedCount} pendente{blockedCount > 1 ? "s" : ""}
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

      {expanded && (
        <div className="space-y-1 pl-1">
          {isLoading && (
            <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
          )}

          {deps?.map((dep) => (
            <div
              key={dep.id}
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-md text-sm group",
                dep.dependsOnStatus !== "done" ? "bg-amber-50 border border-amber-100" : "bg-muted/30"
              )}
            >
              {STATUS_ICONS[dep.dependsOnStatus ?? "todo"] ?? STATUS_ICONS.todo}
              <span className={cn("flex-1 truncate", dep.dependsOnStatus === "done" && "line-through text-muted-foreground")}>
                {dep.dependsOnTitle}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {STATUS_LABELS[dep.dependsOnStatus ?? "todo"] ?? dep.dependsOnStatus}
              </span>
              {canEdit && (
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => handleRemove(dep.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {(!deps || deps.length === 0) && !isLoading && !adding && (
            <p className="text-xs text-muted-foreground py-1 px-2">Nenhuma dependência.</p>
          )}

          {adding && (
            <div className="mt-2 border rounded-md p-2 space-y-2">
              <Input
                autoFocus
                placeholder="Buscar tarefa..."
                className="h-7 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredTasks.slice(0, 10).map((t) => (
                  <button
                    key={t.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm text-left"
                    onClick={() => handleAdd(t.id)}
                    disabled={addDep.isPending}
                  >
                    {STATUS_ICONS[t.status] ?? STATUS_ICONS.todo}
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{t.title}</p>
                      {t.projectName && <p className="text-xs text-muted-foreground truncate">{t.projectName}</p>}
                    </div>
                  </button>
                ))}
                {filteredTasks.length === 0 && search && (
                  <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma tarefa encontrada.</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => { setAdding(false); setSearch(""); }}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
