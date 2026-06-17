import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListChecklistItems,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useListMembers,
  getListChecklistItemsQueryKey,
} from "@workspace/api-client-react";
import type { ChecklistItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
  Clock,
  User,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  nao_instalado: "Não Instalado",
  instalado: "Instalado",
  finalizado: "Finalizado",
};

const STATUS_COLORS: Record<string, string> = {
  nao_instalado: "bg-slate-100 text-slate-700 border-slate-200",
  instalado: "bg-blue-50 text-blue-700 border-blue-200",
  finalizado: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function getAlertInfo(item: ChecklistItem): { level: "overdue" | "soon" | null; daysLeft: number } {
  if (!item.actionDueDate || item.status === "finalizado") return { level: null, daysLeft: 0 };
  const today = new Date().toISOString().split("T")[0];
  const daysLeft = differenceInCalendarDays(parseISO(item.actionDueDate), parseISO(today));
  if (daysLeft < 0) return { level: "overdue", daysLeft };
  if (daysLeft <= 3) return { level: "soon", daysLeft };
  return { level: null, daysLeft };
}

interface Props {
  projectId: number;
  canEdit: boolean;
}

export function ChecklistSection({ projectId, canEdit }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useListChecklistItems(projectId, {
    query: { queryKey: getListChecklistItemsQueryKey(projectId) },
  });
  const { data: allMembers } = useListMembers();

  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPeca, setNewPeca] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingPlan, setEditingPlan] = useState<number | null>(null);
  const [planDraft, setPlanDraft] = useState<{
    actionDescription: string;
    responsibleId: string;
    actionDueDate: string;
  }>({ actionDescription: "", responsibleId: "", actionDueDate: "" });

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListChecklistItemsQueryKey(projectId) });

  const handleAddItem = () => {
    if (!newPeca.trim()) return;
    createItem.mutate(
      { id: projectId, data: { peca: newPeca.trim(), local: newLocal.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Item adicionado ao checklist" });
          setNewPeca("");
          setNewLocal("");
          setIsAddOpen(false);
          invalidate();
        },
        onError: () => toast({ title: "Erro ao adicionar item", variant: "destructive" }),
      }
    );
  };

  const handleStatusChange = (itemId: number, status: string) => {
    updateItem.mutate(
      { id: projectId, itemId, data: { status: status as "nao_instalado" | "instalado" | "finalizado" } },
      {
        onSuccess: () => invalidate(),
        onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
      }
    );
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItem.mutate(
      { id: projectId, itemId },
      {
        onSuccess: () => {
          toast({ title: "Item removido" });
          invalidate();
        },
        onError: () => toast({ title: "Erro ao remover item", variant: "destructive" }),
      }
    );
  };

  const startEditPlan = (item: ChecklistItem) => {
    setPlanDraft({
      actionDescription: item.actionDescription ?? "",
      responsibleId: item.responsibleId ? String(item.responsibleId) : "",
      actionDueDate: item.actionDueDate ?? "",
    });
    setEditingPlan(item.id);
  };

  const handleSavePlan = (itemId: number) => {
    updateItem.mutate(
      {
        id: projectId,
        itemId,
        data: {
          actionDescription: planDraft.actionDescription || null,
          responsibleId: planDraft.responsibleId ? Number(planDraft.responsibleId) : null,
          actionDueDate: planDraft.actionDueDate || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Plano de ação salvo" });
          setEditingPlan(null);
          invalidate();
        },
        onError: () => toast({ title: "Erro ao salvar plano de ação", variant: "destructive" }),
      }
    );
  };

  const handleClearPlan = (itemId: number) => {
    updateItem.mutate(
      {
        id: projectId,
        itemId,
        data: { actionDescription: null, responsibleId: null, actionDueDate: null },
      },
      {
        onSuccess: () => {
          toast({ title: "Plano de ação removido" });
          invalidate();
        },
        onError: () => toast({ title: "Erro ao remover plano", variant: "destructive" }),
      }
    );
  };

  const overdueItems = items?.filter((i) => getAlertInfo(i).level === "overdue") ?? [];
  const soonItems = items?.filter((i) => getAlertInfo(i).level === "soon") ?? [];
  const totalAlerts = overdueItems.length + soonItems.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Checklist de Instalação</CardTitle>
          {items && (
            <span className="text-xs text-muted-foreground font-normal">
              ({items.filter((i) => i.status === "finalizado").length}/{items.length})
            </span>
          )}
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="h-5 text-[10px] px-1.5 gap-0.5">
              <AlertTriangle className="h-3 w-3" />
              {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {canEdit && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Nova Esquadria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Adicionar Esquadria ao Checklist</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome da esquadria</label>
                  <Input
                    placeholder="Ex.: Porta Principal, Janela 01..."
                    value={newPeca}
                    onChange={(e) => setNewPeca(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Local de instalação</label>
                  <Input
                    placeholder="Ex.: Sala, Quarto 2, Fachada..."
                    value={newLocal}
                    onChange={(e) => setNewLocal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleAddItem} disabled={!newPeca.trim() || createItem.isPending}>
                  {createItem.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Alert banner */}
        {totalAlerts > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            {overdueItems.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{overdueItems.length}</strong> plano{overdueItems.length > 1 ? "s" : ""} de ação{" "}
                  <strong>em atraso</strong>:{" "}
                  {overdueItems.map((i) => i.peca).join(", ")}
                </span>
              </div>
            )}
            {soonItems.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{soonItems.length}</strong> plano{soonItems.length > 1 ? "s" : ""} vence{soonItems.length > 1 ? "m" : ""} em até 3 dias:{" "}
                  {soonItems.map((i) => i.peca).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-1.5">
            {items.map((item) => {
              const alert = getAlertInfo(item);
              const isExpanded = expandedIds.has(item.id);
              const hasPlan = !!(item.actionDescription || item.responsibleId || item.actionDueDate);

              return (
                <Collapsible
                  key={item.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(item.id)}
                >
                  <div
                    className={cn(
                      "rounded-lg border bg-card transition-colors",
                      alert.level === "overdue" && "border-destructive/40 bg-destructive/5",
                      alert.level === "soon" && "border-amber-400/40 bg-amber-50/50 dark:bg-amber-900/10"
                    )}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Status selector */}
                      <Select
                        value={item.status}
                        onValueChange={(v) => canEdit && handleStatusChange(item.id, v)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] cursor-pointer", STATUS_COLORS[item.status])}
                          >
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao_instalado">Não Instalado</SelectItem>
                          <SelectItem value="instalado">Instalado</SelectItem>
                          <SelectItem value="finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Esquadria name + local */}
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "block text-sm font-medium truncate",
                            item.status === "finalizado" && "line-through text-muted-foreground"
                          )}
                        >
                          {item.peca}
                        </span>
                        {item.local && (
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {item.local}
                          </span>
                        )}
                      </div>

                      {/* Alert badge */}
                      {alert.level === "overdue" && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1.5 shrink-0">
                          Atrasado {Math.abs(alert.daysLeft)}d
                        </Badge>
                      )}
                      {alert.level === "soon" && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-amber-500 hover:bg-amber-500 shrink-0">
                          {alert.daysLeft === 0 ? "Vence hoje" : `${alert.daysLeft}d`}
                        </Badge>
                      )}
                      {hasPlan && alert.level === null && item.actionDueDate && item.status !== "finalizado" && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground shrink-0">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {format(parseISO(item.actionDueDate), "d MMM", { locale: ptBR })}
                        </Badge>
                      )}

                      {/* Expand toggle for plan */}
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground"
                          title={hasPlan ? "Ver plano de ação" : "Adicionar plano de ação"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      {/* Delete */}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                          title="Remover item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Collapsible plan section */}
                    <CollapsibleContent>
                      <div className="border-t px-3 py-3 bg-muted/30 rounded-b-lg space-y-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Plano de Ação
                        </p>

                        {editingPlan === item.id ? (
                          /* Edit form */
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Descrição da ação
                              </label>
                              <Input
                                placeholder="Descreva a ação necessária..."
                                className="h-8 text-sm"
                                value={planDraft.actionDescription}
                                onChange={(e) =>
                                  setPlanDraft((d) => ({ ...d, actionDescription: e.target.value }))
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                  Responsável
                                </label>
                                <Select
                                  value={planDraft.responsibleId}
                                  onValueChange={(v) =>
                                    setPlanDraft((d) => ({ ...d, responsibleId: v }))
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Sem responsável</SelectItem>
                                    {allMembers?.map((m) => (
                                      <SelectItem key={m.id} value={String(m.id)}>
                                        {m.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                  Data de finalização
                                </label>
                                <Input
                                  type="date"
                                  className="h-8 text-xs"
                                  value={planDraft.actionDueDate}
                                  onChange={(e) =>
                                    setPlanDraft((d) => ({ ...d, actionDueDate: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSavePlan(item.id)}
                                disabled={updateItem.isPending}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setEditingPlan(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : hasPlan ? (
                          /* Read view */
                          <div className="space-y-2">
                            {item.actionDescription && (
                              <p className="text-sm text-foreground">{item.actionDescription}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {item.responsibleName && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {item.responsibleName}
                                </span>
                              )}
                              {item.actionDueDate && (
                                <span
                                  className={cn(
                                    "flex items-center gap-1",
                                    alert.level === "overdue" && "text-destructive font-medium",
                                    alert.level === "soon" && "text-amber-600 font-medium"
                                  )}
                                >
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(item.actionDueDate), "d 'de' MMMM yyyy", {
                                    locale: ptBR,
                                  })}
                                  {alert.level === "overdue" && " — ATRASADO"}
                                  {alert.level === "soon" &&
                                    (alert.daysLeft === 0
                                      ? " — vence hoje"
                                      : ` — falta ${alert.daysLeft} dia${alert.daysLeft > 1 ? "s" : ""}`)}
                                </span>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => startEditPlan(item)}
                                >
                                  Editar plano
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => handleClearPlan(item.id)}
                                >
                                  Remover plano
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Empty plan */
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground italic">
                              Nenhum plano de ação definido.
                            </p>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => startEditPlan(item)}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Definir plano
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center flex flex-col items-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">Nenhuma peça no checklist.</p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeira peça
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
