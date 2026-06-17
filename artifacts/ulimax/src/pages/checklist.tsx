import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import {
  useListAllChecklistItems,
  useListProjects,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  getListAllChecklistItemsQueryKey,
} from "@workspace/api-client-react";
import type { ChecklistItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/useAppUser";
import {
  ClipboardList,
  MapPin,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
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

export default function ChecklistPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  const { data: items, isLoading } = useListAllChecklistItems({
    query: { queryKey: getListAllChecklistItemsQueryKey() },
  });
  const { data: projects } = useListProjects();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAllChecklistItemsQueryKey() });

  const handleStatusChange = (item: ChecklistItem, status: string) => {
    updateItem.mutate(
      {
        id: item.projectId,
        itemId: item.id,
        data: { status: status as "nao_instalado" | "instalado" | "finalizado" },
      },
      {
        onSuccess: () => invalidate(),
        onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (item: ChecklistItem) => {
    deleteItem.mutate(
      { id: item.projectId, itemId: item.id },
      {
        onSuccess: () => {
          toast({ title: "Item removido" });
          invalidate();
        },
        onError: () => toast({ title: "Erro ao remover item", variant: "destructive" }),
      }
    );
  };

  const filtered = (items ?? []).filter((item) => {
    if (filterProject !== "all" && String(item.projectId) !== filterProject) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, { projectName: string; items: ChecklistItem[] }>>(
    (acc, item) => {
      const key = String(item.projectId);
      if (!acc[key]) acc[key] = { projectName: item.projectName ?? `Projeto ${item.projectId}`, items: [] };
      acc[key].items.push(item);
      return acc;
    },
    {}
  );

  const totalAlerts = (items ?? []).filter((i) => getAlertInfo(i).level !== null).length;
  const overdueCount = (items ?? []).filter((i) => getAlertInfo(i).level === "overdue").length;
  const finalizedCount = (items ?? []).filter((i) => i.status === "finalizado").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Checklist de Instalação</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Acompanhe o status de instalação das esquadrias em todos os projetos.
        </p>
      </div>

      {/* Summary cards */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Finalizadas</p>
            <p className="text-2xl font-bold text-emerald-600">{finalizedCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Alertas</p>
            <p className="text-2xl font-bold text-amber-600">{totalAlerts}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="nao_instalado">Não Instalado</SelectItem>
            <SelectItem value="instalado">Instalado</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {items?.length === 0
                ? "Nenhuma esquadria cadastrada. Abra um projeto e adicione itens ao checklist."
                : "Nenhum item corresponde aos filtros selecionados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([projectId, group]) => (
            <Card key={projectId}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{group.projectName}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    ({group.items.filter((i) => i.status === "finalizado").length}/{group.items.length})
                  </span>
                  {group.items.some((i) => getAlertInfo(i).level === "overdue") && (
                    <Badge variant="destructive" className="h-5 text-[10px] px-1.5 gap-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      atrasado
                    </Badge>
                  )}
                </div>
                <Link href={`/projects/${projectId}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1">
                    Ver projeto
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {group.items.map((item) => {
                  const alert = getAlertInfo(item);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        alert.level === "overdue" && "border-destructive/40 bg-destructive/5",
                        alert.level === "soon" && "border-amber-400/40 bg-amber-50/50 dark:bg-amber-900/10"
                      )}
                    >
                      {/* Status icon */}
                      {item.status === "finalizado" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : item.status === "instalado" ? (
                        <Loader2 className="h-4 w-4 shrink-0 text-blue-500" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}

                      {/* Name + local */}
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
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {item.local}
                          </span>
                        )}
                      </div>

                      {/* Alert badges */}
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
                      {item.actionDueDate && alert.level === null && item.status !== "finalizado" && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground shrink-0">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {format(parseISO(item.actionDueDate), "d MMM", { locale: ptBR })}
                        </Badge>
                      )}

                      {/* Status selector */}
                      {canEdit && (
                        <Select
                          value={item.status}
                          onValueChange={(v) => handleStatusChange(item, v)}
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[128px] text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
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
                      )}

                      {/* Delete */}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item)}
                          title="Remover item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
