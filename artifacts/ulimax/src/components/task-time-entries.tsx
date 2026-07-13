import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListTimeEntries,
  useCreateTimeEntry,
  useDeleteTimeEntry,
  getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskTimeEntriesProps {
  taskId: number;
}

export function TaskTimeEntries({ taskId }: TaskTimeEntriesProps) {
  const [showForm, setShowForm] = useState(false);
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useListTimeEntries(taskId);

  const createEntry = useCreateTimeEntry({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey(taskId) });
        setShowForm(false);
        setHours("");
        setDescription("");
        toast({ title: "Horas registradas com sucesso" });
      },
      onError: () => toast({ title: "Erro ao registrar horas", variant: "destructive" }),
    },
  });

  const deleteEntry = useDeleteTimeEntry({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey(taskId) });
      },
      onError: () => toast({ title: "Erro ao excluir registro", variant: "destructive" }),
    },
  });

  function handleSubmit() {
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 24) {
      toast({ title: "Informe um número de horas válido (0.01–24)", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Informe a data", variant: "destructive" });
      return;
    }
    createEntry.mutate({
      id: taskId,
      data: { hours: h, date, description: description.trim() || undefined },
    });
  }

  const totalHours = entries?.reduce((sum, e) => sum + Number(e.hours), 0) ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Registro de Horas
          {totalHours > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              — {totalHours.toFixed(1)}h total
            </span>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3 w-3" />
          Registrar
        </Button>
      </div>

      {showForm && (
        <div className="p-3 border border-dashed border-border rounded-lg space-y-2.5 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Horas</label>
              <Input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Ex.: 2.5"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Descrição <span className="font-normal opacity-60">(opcional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="O que foi feito…"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={!hours || !date || createEntry.isPending}
            >
              {createEntry.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : !entries?.length ? (
        <p className="text-xs text-muted-foreground italic">Nenhuma hora registrada ainda.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground text-sm w-11 shrink-0 tabular-nums">
                  {Number(entry.hours).toFixed(1)}h
                </span>
                <div className="min-w-0">
                  {entry.description && (
                    <p className="text-foreground truncate">{entry.description}</p>
                  )}
                  <p className="text-muted-foreground">
                    {entry.memberName ?? "Você"} ·{" "}
                    {format(new Date(entry.date + "T12:00:00"), "d MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteEntry.mutate({ id: entry.id })}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                title="Excluir registro"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
