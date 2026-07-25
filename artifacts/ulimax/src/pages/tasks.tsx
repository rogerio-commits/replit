import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useListTasks, 
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjects,
  useListMembers,
  useBulkUpdateTasks,
  getListTasksQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search, Plus, CheckSquare, Clock, AlertCircle, HardHat, Briefcase,
  Trash2, Edit, MessageSquare, Download, X, CheckCheck, TrendingUp, User,
  Bookmark, BookmarkCheck, Copy, Pencil, CheckCircle2, CalendarClock, Hourglass,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/useAppUser";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { BatchCreateTasks } from "@/components/batch-create-tasks";
import { TagBadge } from "@/components/task-tags";
import { MarkdownEditor } from "@/components/markdown-editor";
import { cn } from "@/lib/utils";

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluída",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Normal",
  low: "Baixa",
};

/** Interpreta uma string de data (YYYY-MM-DD ou ISO) como data local à meia-noite */
function parseLocalDate(s: string): Date {
  return new Date(s.split("T")[0] + "T00:00:00");
}

/** Dias entre a data (parte de data apenas) e hoje, ambos à meia-noite local */
function daysFromToday(s: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalDate(s).getTime() - today.getTime()) / 86_400_000);
}

function getTaskDueInfo(dueDate?: string | null): { label: string; cls: string; iconCls: string } | null {
  if (!dueDate) return null;
  const d = parseLocalDate(dueDate);
  const diff = daysFromToday(dueDate);
  if (diff < 0)  return { label: `${Math.abs(diff)}d atraso`,   cls: "text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 font-semibold", iconCls: "text-red-500" };
  if (diff === 0) return { label: "Vence hoje",                  cls: "text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 font-semibold", iconCls: "text-red-500" };
  if (diff <= 2)  return { label: `${diff}d restante${diff > 1 ? "s" : ""}`, cls: "text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-semibold", iconCls: "text-amber-500" };
  return { label: format(d, "d MMM yyyy", { locale: ptBR }), cls: "text-muted-foreground", iconCls: "text-muted-foreground" };
}

const taskSchema = z.object({
  projectId: z.coerce.number().min(1, "Projeto obrigatório"),
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.coerce.number().optional().nullable(),
  dueDate: z.string().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceEndDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

function getTaskStatusColor(status: string) {
  switch (status) {
    case "todo": return "bg-slate-100 text-slate-700 border-slate-200";
    case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
    case "review": return "bg-amber-50 text-amber-700 border-amber-200";
    case "done": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high": return "text-destructive";
    case "medium": return "text-amber-500";
    case "low": return "text-emerald-500";
    default: return "text-slate-500";
  }
}

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<{
    id: number; title: string; description?: string | null; status: string;
    priority: string; dueDate?: string | null; projectName?: string | null;
    assigneeName?: string | null; createdAt: string;
    tags?: Array<{ id: number; name: string; color: string }>;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineDateId, setInlineDateId] = useState<number | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const SAVED_FILTERS_KEY = "ulimax-saved-filters-v1";
  interface SavedFilter { id: string; name: string; status: string; project: string; priority: string; }
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) ?? "[]") as SavedFilter[]; }
    catch { return []; }
  });
  const [saveFilterName, setSaveFilterName] = useState("");
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);

  const searchStr = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  useEffect(() => {
    if (autoOpenedRef.current) return;
    const p = new URLSearchParams(searchStr);
    if (p.get("create") === "1" && canEdit) {
      setIsCreateOpen(true);
      autoOpenedRef.current = true;
    }
  }, [searchStr, canEdit]);

  // Filtros vindos da URL (ex.: links do Dashboard) — aplicados uma única vez
  const urlFiltersRef = useRef(false);
  useEffect(() => {
    if (urlFiltersRef.current) return;
    const p = new URLSearchParams(searchStr);
    const st = p.get("status");
    if (st && ["todo", "in_progress", "review", "done"].includes(st)) setStatusFilter(st);
    const resp = p.get("responsavel");
    if (resp && /^\d+$/.test(resp)) setAssigneeFilter(resp);
    if (p.get("vencidas") === "1") setOverdueOnly(true);
    urlFiltersRef.current = true;
  }, [searchStr]);

  const { data: tasks, isLoading: isTasksLoading } = useListTasks();
  const { data: projects } = useListProjects();
  const { data: members } = useListMembers();
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdate = useBulkUpdateTasks();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      projectId: 0,
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignedTo: null,
      dueDate: "",
      recurrence: "none",
      recurrenceEndDate: "",
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    if (editingTask === null) {
      createTask.mutate({ data: { ...data, assignedTo: data.assignedTo || undefined } }, {
        onSuccess: () => {
          toast({ title: "Tarefa criada com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setIsCreateOpen(false);
          form.reset();
        },
        onError: () => toast({ title: "Erro ao criar tarefa", variant: "destructive" }),
      });
    } else {
      updateTask.mutate({ id: editingTask, data: { ...data, assignedTo: data.assignedTo || undefined } }, {
        onSuccess: () => {
          toast({ title: "Tarefa atualizada com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setIsCreateOpen(false);
          setEditingTask(null);
          form.reset();
        },
        onError: () => toast({ title: "Erro ao atualizar tarefa", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (task: any) => {
    form.reset({
      projectId: task.projectId,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo || null,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      recurrence: (task as any).recurrence ?? "none",
      recurrenceEndDate: (task as any).recurrenceEndDate ?? "",
    });
    setEditingTask(task.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Tarefa removida" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      },
      onError: () => toast({ title: "Erro ao remover tarefa", variant: "destructive" }),
    });
  };

  const handleDuplicate = (task: any) => {
    createTask.mutate({
      data: {
        projectId: task.projectId,
        title: `Cópia de ${task.title}`,
        description: task.description || undefined,
        status: "todo",
        priority: task.priority,
        assignedTo: task.assignedTo || undefined,
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Tarefa duplicada" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => toast({ title: "Erro ao duplicar tarefa", variant: "destructive" }),
    });
  };

  const handleBulkAssign = (memberId: number) => {
    bulkUpdate.mutate({ data: { ids: Array.from(selectedIds), assignedTo: memberId } }, {
      onSuccess: (res) => {
        toast({ title: `${res.updated} tarefa(s) atribuída(s)` });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => toast({ title: "Erro ao atribuir tarefas", variant: "destructive" }),
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => fetch(`/api/tasks/${id}`, { method: "DELETE" })));
    toast({ title: `${ids.length} tarefa(s) excluída(s)` });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    setSelectedIds(new Set());
  };

  const handleInlineSave = (taskId: number) => {
    if (!inlineTitle.trim()) { setInlineEditId(null); return; }
    updateTask.mutate({ id: taskId, data: { title: inlineTitle.trim() } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setInlineEditId(null);
      },
      onError: () => toast({ title: "Erro ao renomear tarefa", variant: "destructive" }),
    });
  };

  const filteredTasks = tasks?.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesProject = projectFilter === "all" || t.projectId.toString() === projectFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const assignedTo = (t as unknown as { assignedTo?: number | null }).assignedTo;
    const matchesAssignee = assigneeFilter === "all" || (assignedTo != null && assignedTo.toString() === assigneeFilter);
    let matchesOverdue = true;
    if (overdueOnly) {
      if (t.status === "done" || !t.dueDate) {
        matchesOverdue = false;
      } else {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due = new Date(t.dueDate.split("T")[0] + "T00:00:00");
        matchesOverdue = due < today;
      }
    }
    return matchesSearch && matchesStatus && matchesProject && matchesPriority && matchesAssignee && matchesOverdue;
  });

  function handleExportCSV() {
    if (!filteredTasks || filteredTasks.length === 0) return;
    const headers = ["ID", "Título", "Status", "Prioridade", "Projeto", "Responsável", "Prazo", "Criada Em"];
    const rows = filteredTasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      TASK_STATUS_LABELS[t.status] ?? t.status,
      PRIORITY_LABELS[t.priority] ?? t.priority,
      t.projectName ? `"${t.projectName.replace(/"/g, '""')}"` : "",
      t.assigneeName ? `"${t.assigneeName.replace(/"/g, '""')}"` : "",
      t.dueDate ? t.dueDate.split("T")[0] : "",
      t.createdAt ? t.createdAt.split("T")[0] : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tarefas_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (!filteredTasks) return;
    const allIds = filteredTasks.map((t) => t.id);
    if (allIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function handleBulkStatus(status: string) {
    const ids = Array.from(selectedIds);
    bulkUpdate.mutate({ data: { ids, status: status as any } }, {
      onSuccess: () => {
        toast({ title: `${ids.length} tarefa(s) atualizadas` });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setSelectedIds(new Set());
      },
      onError: () => toast({ title: "Erro ao atualizar tarefas", variant: "destructive" }),
    });
  }

  function handleBulkPriority(priority: string) {
    const ids = Array.from(selectedIds);
    bulkUpdate.mutate({ data: { ids, priority: priority as any } }, {
      onSuccess: () => {
        toast({ title: `${ids.length} tarefa(s) atualizadas` });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setSelectedIds(new Set());
      },
      onError: () => toast({ title: "Erro ao atualizar tarefas", variant: "destructive" }),
    });
  }

  function handleCycleStatus(taskId: number, currentStatus: string) {
    const cycle: Record<string, string> = { todo: "in_progress", in_progress: "review", review: "done", done: "todo" };
    const next = cycle[currentStatus] ?? "todo";
    updateTask.mutate({ id: taskId, data: { status: next as any } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
      onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
    });
  }

  /** Ação rápida: concluir sem abrir a tarefa */
  function handleQuickDone(taskId: number) {
    updateTask.mutate({ id: taskId, data: { status: "done" as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Tarefa concluída!" });
      },
      onError: () => toast({ title: "Erro ao concluir tarefa", variant: "destructive" }),
    });
  }

  /** Ação rápida: adiar o prazo em N dias a partir de hoje */
  function handlePostpone(taskId: number, days: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    updateTask.mutate({ id: taskId, data: { dueDate: format(d, "yyyy-MM-dd") } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: `Prazo adiado para ${format(d, "dd/MM", { locale: ptBR })}.` });
      },
      onError: () => toast({ title: "Erro ao adiar prazo", variant: "destructive" }),
    });
  }

  function handleSaveFilter() {
    if (!saveFilterName.trim()) return;
    const f: SavedFilter = { id: Date.now().toString(), name: saveFilterName.trim(), status: statusFilter, project: projectFilter, priority: priorityFilter };
    const updated = [...savedFilters, f];
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    setSaveFilterName("");
    setIsSavePopoverOpen(false);
    toast({ title: "Filtro salvo!" });
  }

  function handleDeleteSavedFilter(id: string) {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    if (activeFilterId === id) setActiveFilterId(null);
  }

  function handleApplySavedFilter(f: SavedFilter) {
    setStatusFilter(f.status);
    setProjectFilter(f.project);
    setPriorityFilter(f.priority);
    setAssigneeFilter("all");
    setOverdueOnly(false);
    setActiveFilterId(f.id);
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setProjectFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setOverdueOnly(false);
    setActiveFilterId(null);
  }

  const allFiltered = filteredTasks?.map((t) => t.id) ?? [];
  const allSelected = allFiltered.length > 0 && allFiltered.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tarefas</h1>
          <p className="text-muted-foreground mt-1">Gerencie entregas em todos os projetos.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredTasks || filteredTasks.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>

          {canEdit && <BatchCreateTasks projects={projects ?? []} />}

          {canEdit && (
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setEditingTask(null);
                form.reset({ projectId: 0, title: "", description: "", status: "todo", priority: "medium", assignedTo: null, dueDate: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projeto</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? field.value.toString() : undefined}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl><Input placeholder="Ex.: Concretagem fase 1" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <MarkdownEditor
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="todo">A Fazer</SelectItem>
                                <SelectItem value="in_progress">Em Andamento</SelectItem>
                                <SelectItem value="review">Em Revisão</SelectItem>
                                <SelectItem value="done">Concluído</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Normal</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsável</FormLabel>
                            <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? field.value.toString() : undefined}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {members?.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prazo</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="recurrence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recorrência</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sem recorrência</SelectItem>
                              <SelectItem value="daily">Diária</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch("recurrence") && form.watch("recurrence") !== "none" && (
                      <FormField
                        control={form.control}
                        name="recurrenceEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim da recorrência (opcional)</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <DialogFooter>
                      <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                        {createTask.isPending || updateTask.isPending ? "Salvando..." : (editingTask ? "Atualizar" : "Criar Tarefa")}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && canEdit && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 animate-in slide-in-from-top-2 duration-200 flex-wrap">
          <CheckCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Status:
            </span>
            {["todo", "in_progress", "review", "done"].map((s) => (
              <Button key={s} variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkStatus(s)} disabled={bulkUpdate.isPending}>
                {TASK_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Prioridade:
            </span>
            {["low", "medium", "high"].map((p) => (
              <Button key={p} variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkPriority(p)} disabled={bulkUpdate.isPending}>
                {PRIORITY_LABELS[p]}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Responsável:
            </span>
            <Select onValueChange={(v) => handleBulkAssign(Number(v))}>
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue placeholder="Atribuir a..." />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)} className="text-xs">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        </div>
      )}

      {savedFilters.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-border pb-3 -mx-1 px-1 overflow-x-auto">
          <BookmarkCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
          <button
            onClick={handleClearFilters}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border font-medium transition-all whitespace-nowrap shrink-0",
              activeFilterId === null
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "text-muted-foreground border-border hover:border-primary/30 hover:text-foreground bg-card"
            )}
          >
            Todas
          </button>
          {savedFilters.map((f) => (
            <div key={f.id} className="flex items-center shrink-0">
              <button
                onClick={() => handleApplySavedFilter(f)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-l-md border-y border-l font-medium transition-all whitespace-nowrap",
                  activeFilterId === f.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "text-muted-foreground border-border hover:border-primary/30 hover:text-foreground bg-card"
                )}
              >
                {f.name}
              </button>
              <button
                onClick={() => handleDeleteSavedFilter(f.id)}
                title="Remover visão"
                className={cn(
                  "text-xs px-1.5 py-1.5 rounded-r-md border-y border-r transition-all leading-none",
                  activeFilterId === f.id
                    ? "bg-primary/80 text-primary-foreground border-primary hover:bg-destructive hover:border-destructive"
                    : "text-muted-foreground/50 border-border hover:text-destructive hover:border-destructive/30 bg-card"
                )}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda Prioridade</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Normal</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Responsáveis</SelectItem>
                  {members?.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant={overdueOnly ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setOverdueOnly((v) => !v)}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Atrasadas
              </Button>
              {(statusFilter !== "all" || projectFilter !== "all" || priorityFilter !== "all") && (
                <Popover open={isSavePopoverOpen} onOpenChange={setIsSavePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5">
                      <Bookmark className="h-3.5 w-3.5" />
                      Salvar filtro
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <p className="text-sm font-medium mb-2">Nome do filtro</p>
                    <div className="flex gap-2">
                      <Input
                        value={saveFilterName}
                        onChange={(e) => setSaveFilterName(e.target.value)}
                        placeholder="Ex.: Tarefas atrasadas"
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                        autoFocus
                      />
                      <Button size="sm" className="h-8" onClick={handleSaveFilter} disabled={!saveFilterName.trim()}>
                        OK
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isTasksLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredTasks && filteredTasks.length > 0 ? (
            <div className="space-y-2">
              {canEdit && (
                <div className="flex items-center gap-2 px-1 pb-1">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer select-none">
                    {allSelected ? "Desmarcar tudo" : `Selecionar todos (${filteredTasks.length})`}
                  </label>
                </div>
              )}
              {filteredTasks.map((task) => (
                <Card key={task.id} className={cn("overflow-hidden transition-colors", selectedIds.has(task.id) && "ring-2 ring-primary/30 bg-primary/5")}>
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {canEdit && (
                        <Checkbox
                          checked={selectedIds.has(task.id)}
                          onCheckedChange={() => toggleSelect(task.id)}
                          className="mt-0.5"
                        />
                      )}
                      <CheckSquare className={`h-5 w-5 mt-0.5 shrink-0 ${task.status === "done" ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {canEdit && inlineEditId === task.id ? (
                            <input
                              autoFocus
                              className="font-medium bg-background border border-primary/40 rounded px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary min-w-[160px] max-w-full"
                              value={inlineTitle}
                              onChange={(e) => setInlineTitle(e.target.value)}
                              onBlur={() => handleInlineSave(task.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); handleInlineSave(task.id); }
                                if (e.key === "Escape") { setInlineEditId(null); }
                              }}
                            />
                          ) : (
                            <span
                              className={cn("font-medium", canEdit && "cursor-text hover:underline decoration-dotted decoration-muted-foreground/50")}
                              onDoubleClick={() => { if (canEdit) { setInlineEditId(task.id); setInlineTitle(task.title); } }}
                              title={canEdit ? "Duplo clique para renomear" : undefined}
                            >
                              {task.title}
                            </span>
                          )}
                          {canEdit ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCycleStatus(task.id, task.status); }}
                              className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border transition-all hover:opacity-70 hover:scale-105 cursor-pointer select-none", getTaskStatusColor(task.status))}
                              title="Clique para avançar o status"
                            >
                              {TASK_STATUS_LABELS[task.status] ?? task.status}
                            </button>
                          ) : (
                            <Badge variant="outline" className={getTaskStatusColor(task.status)}>
                              {TASK_STATUS_LABELS[task.status] ?? task.status}
                            </Badge>
                          )}
                        </div>
                        {(task as any).tags && (task as any).tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {((task as any).tags as Array<{ id: number; name: string; color: string }>).map((t) => (
                              <TagBadge key={t.id} name={t.name} color={t.color} />
                            ))}
                          </div>
                        )}
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className={`font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            {PRIORITY_LABELS[task.priority] ?? task.priority}
                          </span>
                          {task.projectName && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {task.projectName}
                            </span>
                          )}
                          {task.assigneeName && (
                            <span className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 rounded-full px-2 py-0.5 font-medium">
                              <HardHat className="h-3 w-3" />
                              {task.assigneeName}
                            </span>
                          )}
                          {task.status === "todo" && (() => {
                            const age = -daysFromToday(task.createdAt);
                            return age >= 7 ? (
                              <span
                                className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-full px-2 py-0.5 font-medium"
                                title={`Criada há ${age} dias e ainda em "A Fazer"`}
                              >
                                <Hourglass className="h-3 w-3" /> Parada há {age}d
                              </span>
                            ) : null;
                          })()}
                          {inlineDateId === task.id && canEdit ? (
                            <input
                              type="date"
                              autoFocus
                              defaultValue={task.dueDate?.split("T")[0] ?? ""}
                              className="text-xs border border-primary/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary bg-background w-32"
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateTask.mutate({ id: task.id, data: { dueDate: e.target.value } as any }, {
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
                                      setInlineDateId(null);
                                    },
                                  });
                                }
                              }}
                              onBlur={() => setInlineDateId(null)}
                              onKeyDown={(e) => { if (e.key === "Escape") setInlineDateId(null); }}
                            />
                          ) : task.dueDate ? (() => {
                            const due = getTaskDueInfo(task.dueDate);
                            return due ? (
                              <span
                                className={cn("flex items-center gap-1 text-xs", due.cls, canEdit && "cursor-pointer hover:opacity-70 transition-opacity")}
                                onClick={() => canEdit && setInlineDateId(task.id)}
                                title={canEdit ? "Clique para editar a data" : undefined}
                              >
                                <Clock className={cn("h-3.5 w-3.5 shrink-0", due.iconCls)} />
                                {due.label}
                              </span>
                            ) : null;
                          })() : canEdit ? (
                            <button
                              className="text-xs text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-0.5 transition-colors"
                              onClick={() => setInlineDateId(task.id)}
                              title="Adicionar prazo"
                            >
                              <Clock className="h-3 w-3" />
                              <span>+prazo</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {canEdit && task.status !== "done" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Concluir tarefa"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => handleQuickDone(task.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Adiar prazo">
                                <CalendarClock className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePostpone(task.id, 1)}>Amanhã</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePostpone(task.id, 3)}>Em 3 dias</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePostpone(task.id, 7)}>Próxima semana</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setSelectedTask(task as any)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                        Detalhes
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" title="Renomear" onClick={() => { setInlineEditId(task.id); setInlineTitle(task.title); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Duplicar tarefa" onClick={() => handleDuplicate(task)} disabled={createTask.isPending}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Excluir Tarefa</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button variant="destructive" onClick={() => handleDelete(task.id)} disabled={deleteTask.isPending}>
                                  {deleteTask.isPending ? "Excluindo..." : "Excluir"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-3 border border-dashed rounded-lg bg-muted/20">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-1">
                <CheckSquare className="h-8 w-8 text-muted-foreground opacity-30" />
              </div>
              {search || statusFilter !== "all" || projectFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all" || overdueOnly ? (
                <>
                  <p className="font-medium text-foreground">Nenhuma tarefa corresponde aos filtros</p>
                  <p className="text-sm text-muted-foreground">Tente remover ou alterar os filtros para ver mais resultados.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">Nenhuma tarefa criada ainda</p>
                  <p className="text-sm text-muted-foreground">Use o botão <strong>+ Criar</strong> no topo ou o botão acima para criar a primeira tarefa.</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailPanel
        task={selectedTask}
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
