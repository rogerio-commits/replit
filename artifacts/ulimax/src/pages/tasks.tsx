import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useListTasks, 
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjects,
  useListMembers,
  getListTasksQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Search, Plus, CheckSquare, Clock, AlertCircle, HardHat, Briefcase, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/useAppUser";

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluído",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Normal",
  medium: "Normal",
  high: "Alta",
};

const taskSchema = z.object({
  projectId: z.coerce.number().min(1, "Projeto obrigatório"),
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.coerce.number().optional().nullable(),
  dueDate: z.string().optional(),
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  const { data: tasks, isLoading: isTasksLoading } = useListTasks();
  const { data: projects } = useListProjects();
  const { data: members } = useListMembers();
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

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
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    if (editingTask === null) {
      createTask.mutate({ data: {
        ...data,
        assignedTo: data.assignedTo || undefined
      }}, {
        onSuccess: () => {
          toast({ title: "Tarefa criada com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setIsCreateOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Erro ao criar tarefa", variant: "destructive" });
        }
      });
    } else {
      updateTask.mutate({ id: editingTask, data: {
        ...data,
        assignedTo: data.assignedTo || undefined
      }}, {
        onSuccess: () => {
          toast({ title: "Tarefa atualizada com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setIsCreateOpen(false);
          setEditingTask(null);
          form.reset();
        },
        onError: () => {
          toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
        }
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
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : "",
    });
    setEditingTask(task.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Tarefa removida" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => {
        toast({ title: "Erro ao remover tarefa", variant: "destructive" });
      }
    });
  };

  const filteredTasks = tasks?.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesProject = projectFilter === "all" || t.projectId.toString() === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tarefas</h1>
          <p className="text-muted-foreground mt-1">Gerencie entregas em todos os projetos.</p>
        </div>

        {canEdit && <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingTask(null);
            form.reset({
              projectId: 0,
              title: "",
              description: "",
              status: "todo",
              priority: "medium",
              assignedTo: null,
              dueDate: "",
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
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
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o projeto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
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
                      <FormLabel>Título da Tarefa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Concretagem fase 1" {...field} />
                      </FormControl>
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
                        <Input placeholder="Detalhes sobre a tarefa..." {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                            <SelectTrigger>
                              <SelectValue placeholder="Sem responsável" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {members?.map(m => (
                              <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                            ))}
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
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                    {createTask.isPending || updateTask.isPending ? "Salvando..." : (editingTask ? "Atualizar Tarefa" : "Criar Tarefa")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex w-full md:w-auto gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isTasksLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredTasks && filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CheckSquare className={`h-5 w-5 mt-0.5 ${task.status === 'done' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{task.title}</span>
                          <Badge variant="outline" className={getTaskStatusColor(task.status)}>
                            {TASK_STATUS_LABELS[task.status] ?? task.status}
                          </Badge>
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className={`font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{PRIORITY_LABELS[task.priority] ?? task.priority}</span>
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
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Prazo: {format(new Date(task.dueDate), "d MMM yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {canEdit && <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                        <Edit className="h-4 w-4" />
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
                          <div className="py-4">
                            Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
                          </div>
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
                    </div>}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center border border-dashed rounded-md bg-muted/20">
              <CheckSquare className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">Nenhuma tarefa encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {search || statusFilter !== "all" || projectFilter !== "all"
                  ? "Tente ajustar os filtros" 
                  : "Comece criando uma nova tarefa"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
