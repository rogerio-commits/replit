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

const STATUS_CONFIG = {
  nao_instalado: { label: "Não Instalado", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  instalado: { label: "Instalado", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  finalizado: { label: "Finalizado", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
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

  const grouped = filtered.reduce<Record<string, { projectName: string; projectId: number; items: ChecklistItem[] }>>(
    (acc, item) => {
      const key = String(item.projectId);
      if (!acc[key]) acc[key] = { projectName: item.projectName ?? `Projeto ${item.projectId}`, projectId: item.projectId, items: [] };
      acc[key].items.push(item);
      return acc;
    },
    {}
  );

  const allItems = items ?? [];
  const totalAlerts = allItems.filter((i) => getAlertInfo(i).level !== null).length;
  const overdueCount = allItems.filter((i) => getAlertInfo(i).level === "overdue").length;
  const finalizedCount = allItems.filter((i) => i.status === "finalizado").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Checklist de Instalação</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as esquadrias</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: allItems.length, color: "text-foreground" },
          { label: "Finalizadas", value: finalizedCount, color: "text-emerald-600" },
          { label: "Alertas", value: totalAlerts, color: "text-amber-600" },
          { label: "Atrasadas", value: overdueCount, color: "text-destructive" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

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
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {allItems.length === 0
              ? "Nenhuma esquadria cadastrada. Abra um projeto e adicione itens ao checklist."
              : "Nenhum item corresponde aos filtros selecionados."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-8 px-4 py-3" />
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Esquadria</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Local</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Alerta</th>
                {canEdit && <th className="w-8 px-4 py-3" />}
              </tr>
            </thead>
            {Object.entries(grouped).map(([projectKey, group]) => (
              <tbody key={projectKey}>
                  {/* Group header row */}
                  <tr className="border-t bg-muted/20">
                    <td colSpan={canEdit ? 6 : 5} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.projectName}
                        </span>
                        <Link href={`/projects/${group.projectId}`}>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Ver projeto <ExternalLink className="h-3 w-3" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {/* Item rows */}
                  {group.items.map((item, idx) => {
                    const alert = getAlertInfo(item);
                    const s = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                    const isLast = idx === group.items.length - 1;

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          !isLast && "border-b border-border/50",
                          isLast && "border-b",
                          alert.level === "overdue" && "bg-destructive/5 hover:bg-destructive/10",
                          alert.level === "soon" && "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-900/10"
                        )}
                      >
                        {/* Status icon */}
                        <td className="px-4 py-2.5 text-center">
                          {item.status === "finalizado" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : item.status === "instalado" ? (
                            <Loader2 className="h-4 w-4 text-blue-500 mx-auto" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                          )}
                        </td>

                        {/* Esquadria */}
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "font-medium text-foreground",
                            item.status === "finalizado" && "line-through text-muted-foreground"
                          )}>
                            {item.peca}
                          </span>
                          {/* Local shown inline on mobile */}
                          {item.local && (
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground mt-0.5 sm:hidden">
                              <MapPin className="h-2.5 w-2.5" /> {item.local}
                            </span>
                          )}
                        </td>

                        {/* Local */}
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          {item.local ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {item.local}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-2.5">
                          {canEdit ? (
                            <Select
                              value={item.status}
                              onValueChange={(v) => handleStatusChange(item, v)}
                            >
                              <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md",
                                  s.color
                                )}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                                  {s.label}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nao_instalado">Não Instalado</SelectItem>
                                <SelectItem value="instalado">Instalado</SelectItem>
                                <SelectItem value="finalizado">Finalizado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md",
                              s.color
                            )}>
                              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                              {s.label}
                            </span>
                          )}
                        </td>

                        {/* Alerta */}
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          {alert.level === "overdue" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                              <AlertTriangle className="h-3 w-3" />
                              {Math.abs(alert.daysLeft)}d atraso
                            </span>
                          ) : alert.level === "soon" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                              <Clock className="h-3 w-3" />
                              {alert.daysLeft === 0 ? "Vence hoje" : `${alert.daysLeft}d`}
                            </span>
                          ) : item.actionDueDate && item.status !== "finalizado" ? (
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(item.actionDueDate), "d MMM", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>

                        {/* Delete */}
                        {canEdit && (
                          <td className="px-3 py-2.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(item)}
                              title="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}
