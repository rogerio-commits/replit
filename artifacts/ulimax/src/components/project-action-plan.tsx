import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectActionItems,
  useCreateProjectActionItem,
  useToggleProjectActionItem,
  useDeleteProjectActionItem,
  getListProjectActionItemsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Trash2,
  Plus,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: number;
  name: string;
}

interface Props {
  projectId: number;
  members: Member[];
  canEdit: boolean;
}

export function ProjectActionPlan({ projectId, members, canEdit }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newDesc, setNewDesc] = useState("");
  const [newResponsible, setNewResponsible] = useState("none");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { data: items, isLoading } = useListProjectActionItems(projectId);
  const createItem = useCreateProjectActionItem();
  const toggleItem = useToggleProjectActionItem();
  const deleteItem = useDeleteProjectActionItem();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListProjectActionItemsQueryKey(projectId) });

  const pending = (items ?? []).filter((i) => !i.completedAt);
  const done = (items ?? []).filter((i) => i.completedAt);

  async function handleAdd() {
    if (!newDesc.trim()) return;
    setAdding(true);
    try {
      await createItem.mutateAsync({
        id: projectId,
        data: {
          description: newDesc.trim(),
          responsibleId: newResponsible !== "none" ? Number(newResponsible) : undefined,
          dueDate: newDue || undefined,
        },
      });
      invalidate();
      setNewDesc("");
      setNewResponsible("none");
      setNewDue("");
    } catch {
      toast({ title: "Erro ao adicionar item", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(itemId: number) {
    try {
      await toggleItem.mutateAsync({ itemId });
      invalidate();
    } catch {
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
    }
  }

  async function handleDelete(itemId: number) {
    try {
      await deleteItem.mutateAsync({ itemId });
      invalidate();
    } catch {
      toast({ title: "Erro ao remover item", variant: "destructive" });
    }
  }

  return (
    <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 dark:border-red-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-red-600 to-orange-500">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Plano de Ação da Obra</h2>
            <p className="text-xs text-red-100">
              {pending.length > 0
                ? `${pending.length} item${pending.length > 1 ? "s" : ""} pendente${pending.length > 1 ? "s" : ""}`
                : items && items.length > 0
                ? "Todos os itens concluídos"
                : "Registre ações críticas da obra"}
            </p>
          </div>
        </div>
        {items && items.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-100 font-medium">
              {done.length}/{items.length} concluídos
            </span>
            <div className="h-2 w-24 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${items.length > 0 ? (done.length / items.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <>
            {/* Pending items */}
            {pending.length === 0 && done.length === 0 && (
              <div className="text-center py-6">
                <AlertTriangle className="h-10 w-10 mx-auto text-orange-300 mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhum item de ação registrado.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione pontos críticos levantados em vistorias, reuniões ou durante a instalação.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 group rounded-lg border border-red-100 bg-white dark:bg-red-950/10 px-4 py-3 shadow-sm"
                >
                  <button
                    onClick={() => handleToggle(item.id)}
                    disabled={!canEdit}
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                      "border-red-300 hover:border-red-500 hover:bg-red-50"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {item.responsibleName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                          {item.responsibleName}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Prazo: {format(new Date(item.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Done items collapsible */}
            {done.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDone((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 hover:text-foreground transition-colors"
                >
                  {showDone ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {done.length} item{done.length > 1 ? "s" : ""} concluído{done.length > 1 ? "s" : ""}
                </button>
                {showDone && (
                  <div className="space-y-2 mt-1.5">
                    {done.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 group rounded-lg border border-muted bg-muted/30 px-4 py-3"
                      >
                        <button
                          onClick={() => handleToggle(item.id)}
                          disabled={!canEdit}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-white" />
                        </button>
                        <p className="text-sm text-muted-foreground line-through flex-1">{item.description}</p>
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add form */}
            {canEdit && (
              <div className="rounded-lg border border-red-100 bg-white dark:bg-red-950/10 p-4 space-y-3 mt-2">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
                  Novo item de ação
                </p>
                <Input
                  placeholder="Descreva o ponto crítico de ação..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newDesc.trim()) handleAdd(); }}
                  className="border-red-100 focus-visible:ring-red-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newResponsible} onValueChange={setNewResponsible}>
                    <SelectTrigger className="text-sm border-red-100">
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem responsável —</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={newDue}
                    onChange={(e) => setNewDue(e.target.value)}
                    className="border-red-100"
                    title="Prazo"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!newDesc.trim() || adding}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white border-0"
                >
                  {adding
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Plus className="h-4 w-4 mr-2" />}
                  Adicionar item crítico
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
