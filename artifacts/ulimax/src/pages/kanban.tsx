import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTasks,
  useUpdateTask,
  useListProjects,
  useListMembers,
  useCreateTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import type { ListTasksQueryResult } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateWithDaysCalc } from "@/components/date-with-days-calc";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CalendarDays, GripVertical, Plus, User, AlertCircle,
  Loader2, CheckSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types & Constants ─────────────────────────────────────────────────────────

type TaskStatus = "todo" | "in_progress" | "review" | "done";

type TaskItem = ListTasksQueryResult[number];

const TASK_COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "todo",        label: "A Fazer",      color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800/60" },
  { id: "in_progress", label: "Em Andamento", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "review",      label: "Revisão",      color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  { id: "done",        label: "Concluído",    color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
];


const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-slate-100 text-slate-600 border-slate-200",
};
const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Normal", low: "Normal" };

function isOverdue(dueDate: string | null | undefined, status: string) {
  if (!dueDate || status === "done" || status === "em_instalacao" || status === "em_aprovacao") return false;
  return new Date(dueDate) < new Date();
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ── Shared Droppable Column Shell ─────────────────────────────────────────────

function KanbanColumn({
  colId, label, color, bg, count, onAdd, children,
}: {
  colId: string; label: string; color: string; bg: string;
  count: number; onAdd: () => void; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-lg border border-b-0", bg)}>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", color)}>{label}</span>
          <span className={cn("text-xs font-bold rounded-full px-2 py-0.5 tabular-nums border border-current/20", color)}>
            {count}
          </span>
        </div>
        <Button variant="ghost" size="icon" className={cn("h-6 w-6 hover:bg-black/5", color)} onClick={onAdd}
          data-testid={`kanban-add-${colId}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[480px] flex flex-col gap-2 p-2 rounded-b-lg border transition-colors",
          isOver ? "bg-primary/5 border-primary/30 border-dashed" : "border-border/60 bg-muted/20"
        )}
      >
        {children}
        {count === 0 && (
          <div className={cn(
            "flex-1 flex items-center justify-center text-xs text-muted-foreground/60 rounded-md border border-dashed mt-1 min-h-[80px]",
            isOver && "border-primary/40 text-primary/60"
          )}>
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, isDragging = false }: { task: TaskItem; isDragging?: boolean }) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div data-testid={`kanban-card-task-${task.id}`} className={cn(
      "bg-card border rounded-lg p-3 space-y-2 shadow-sm select-none",
      isDragging ? "shadow-xl rotate-1 opacity-90 ring-2 ring-primary/30" : "hover:shadow-md transition-shadow",
      overdue && "border-red-300"
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </Badge>
        {task.projectName && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20 max-w-[100px] truncate">
            {task.projectName}
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {task.assigneeName
          ? <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><User className="h-3 w-3" /><span className="truncate max-w-[90px]">{task.assigneeName}</span></div>
          : <span />
        }
        {task.dueDate && (
          <div className={cn("flex items-center gap-1 text-[11px]", overdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
            {overdue ? <AlertCircle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task }: { task: TaskItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task-${task.id}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0 : 1 }}>
      <TaskCard task={task} />
    </div>
  );
}

// ── New Task Dialog ───────────────────────────────────────────────────────────

const newTaskSchema = z.object({
  title:       z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  projectId:   z.string().min(1, "Projeto obrigatório"),
  assignedTo:  z.string().optional(),
  priority:    z.enum(["low", "medium", "high"]),
  dueDate:     z.string().optional(),
});

function NewTaskDialog({ open, defaultStatus, onOpenChange }: {
  open: boolean; defaultStatus: TaskStatus; onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();
  const { data: members }  = useListMembers();
  const createTask = useCreateTask();
  const form = useForm<z.infer<typeof newTaskSchema>>({
    resolver: zodResolver(newTaskSchema),
    defaultValues: { title: "", description: "", projectId: "", assignedTo: "", priority: "medium", dueDate: "" },
  });

  function onSubmit(values: z.infer<typeof newTaskSchema>) {
    createTask.mutate({ data: {
      title: values.title, description: values.description || undefined,
      projectId: Number(values.projectId),
      assignedTo: values.assignedTo && values.assignedTo !== "none" ? Number(values.assignedTo) : undefined,
      priority: values.priority, status: defaultStatus,
      dueDate: values.dueDate || undefined,
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Tarefa criada com sucesso." });
        form.reset(); onOpenChange(false);
      },
      onError: () => toast({ title: "Erro ao criar tarefa.", variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Título</FormLabel>
                <FormControl><Input data-testid="input-task-title" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem><FormLabel>Projeto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-project"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{projects?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="assignedTo" render={({ field }) => (
                <FormItem><FormLabel>Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-assignee"><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {members?.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select></FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Prazo</FormLabel>
                  <FormControl><Input type="date" data-testid="input-due-date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTask.isPending} data-testid="button-create-task">
                {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Tasks Board ───────────────────────────────────────────────────────────────

function TasksBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterProject, setFilterProject] = useState<string>("all");
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; status: TaskStatus }>({ open: false, status: "todo" });

  const params = filterProject !== "all" ? { projectId: Number(filterProject) } : undefined;
  const { data: tasks, isLoading } = useListTasks(params, { query: { queryKey: getListTasksQueryKey(params) } });
  const { data: projects } = useListProjects();
  const updateTask = useUpdateTask();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = { todo: [], in_progress: [], review: [], done: [] };
    tasks?.forEach((t) => { if (map[t.status as TaskStatus]) map[t.status as TaskStatus].push(t); });
    return map;
  }, [tasks]);

  function handleDragStart(e: DragStartEvent) {
    const id = Number(String(e.active.id).replace("task-", ""));
    setActiveTask(tasks?.find((t) => t.id === id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = Number(String(active.id).replace("task-", ""));
    const newStatus = over.id as TaskStatus;
    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    queryClient.setQueryData(getListTasksQueryKey(params), (old: TaskItem[] | undefined) =>
      old?.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    updateTask.mutate({ id: taskId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
      onError: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        toast({ title: "Erro ao mover tarefa.", variant: "destructive" });
      },
    });
  }

  if (isLoading) return <BoardSkeleton />;

  return (
    <>
      <div className="flex items-center gap-3 shrink-0">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48" data-testid="select-filter-project">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialog({ open: true, status: "todo" })} data-testid="button-new-task">
          <Plus className="h-4 w-4 mr-2" />Nova Tarefa
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
          {TASK_COLUMNS.map((col) => (
            <KanbanColumn key={col.id} colId={col.id} label={col.label} color={col.color} bg={col.bg}
              count={tasksByColumn[col.id].length} onAdd={() => setDialog({ open: true, status: col.id })}>
              {tasksByColumn[col.id].map((t) => <DraggableTaskCard key={t.id} task={t} />)}
            </KanbanColumn>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <NewTaskDialog open={dialog.open} defaultStatus={dialog.status}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} />
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="min-w-[260px] w-[260px] space-y-3">
          <Skeleton className="h-10 rounded-lg" />
          {[1, 2, 3].map((j) => <Skeleton key={j} className="h-28 rounded-lg" />)}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Kanban() {
  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Kanban de Tarefas</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Arraste os cards para atualizar o status.</p>
      </div>
      <TasksBoard />
    </div>
  );
}
