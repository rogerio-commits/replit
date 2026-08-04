import { useState, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
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
  useUpdateProject,
  useListMembers,
  useCreateTask,
  getListTasksQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import type { ListTasksQueryResult, ListProjectsQueryResult } from "@workspace/api-client-react";
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
import { computeHealthMap, FAROL_META, daysFromToday, type FarolLevel } from "@/lib/project-health";
import {
  CalendarDays, GripVertical, Plus, User, AlertCircle,
  Loader2, CheckSquare, Briefcase, GanttChartSquare, Columns3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GanttView from "./gantt";
import Tasks from "./tasks";
import { TaskDetailPanel } from "@/components/task-detail-panel";

// ── Types & Constants ─────────────────────────────────────────────────────────

type TaskStatus = "todo" | "in_progress" | "review" | "done";

type TaskItem = ListTasksQueryResult[number];

const TASK_COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "todo",        label: "A Fazer",      color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800/60" },
  { id: "in_progress", label: "Em Andamento", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "review",      label: "Revisão",      color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  { id: "done",        label: "Concluído",    color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
];

type ProjectStatusId = "a_iniciar" | "em_projeto" | "em_aprovacao" | "em_producao" | "aguardando_instalacao" | "em_instalacao";

type ProjectItem = ListProjectsQueryResult[number];

const PROJECT_COLUMNS: { id: ProjectStatusId; label: string; color: string; bg: string }[] = [
  { id: "a_iniciar",             label: "A Iniciar",             color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800/60" },
  { id: "em_projeto",            label: "Em Projeto",            color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
  { id: "em_aprovacao",          label: "Em Aprovação",          color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { id: "em_producao",           label: "Em Produção",           color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "aguardando_instalacao", label: "Aguardando Instalação", color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  { id: "em_instalacao",         label: "Em Instalação",         color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
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

function DraggableTaskCard({ task, onOpen }: { task: TaskItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task-${task.id}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onOpen}
      style={{ opacity: isDragging ? 0 : 1 }} className="cursor-pointer">
      <TaskCard task={task} />
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, farol, isDragging = false }: { project: ProjectItem; farol?: FarolLevel; isDragging?: boolean }) {
  const overdue = project.endDate ? daysFromToday(project.endDate) < 0 : false;
  const meta = farol ? FAROL_META[farol] : null;
  return (
    <div data-testid={`kanban-card-project-${project.id}`} className={cn(
      "bg-card border rounded-lg p-3 space-y-2 shadow-sm select-none cursor-pointer",
      isDragging ? "shadow-xl rotate-1 opacity-90 ring-2 ring-primary/30" : "hover:shadow-md transition-shadow",
      overdue && "border-red-300"
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{project.name}</p>
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {meta && (
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-1.5 py-0.5", meta.chip)}>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
            {meta.label}
          </span>
        )}
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[project.priority])}>
          {PRIORITY_LABELS[project.priority]}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {project.taskTotal > 0
          ? <span className="text-[11px] text-muted-foreground tabular-nums">{project.taskDone}/{project.taskTotal} tarefas</span>
          : <span />
        }
        {project.endDate && (
          <div className={cn("flex items-center gap-1 text-[11px]", overdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
            {overdue ? <AlertCircle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
            <span>{formatDate(project.endDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableProjectCard({ project, farol, onOpen }: { project: ProjectItem; farol?: FarolLevel; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `project-${project.id}` });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0 : 1 }}
      onClick={onOpen}
    >
      <ProjectCard project={project} farol={farol} />
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
  const [filterMaterial, setFilterMaterial] = useState<string>("all");
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; status: TaskStatus }>({ open: false, status: "todo" });
  // Evita o "clique fantasma" que dispara logo após soltar um cartão arrastado
  const draggedRecentlyRef = useRef(false);

  function openTask(t: TaskItem) {
    if (draggedRecentlyRef.current) return;
    setDetailTask(t);
  }

  const params = filterProject !== "all" ? { projectId: Number(filterProject) } : undefined;
  const { data: tasks, isLoading } = useListTasks(params, { query: { queryKey: getListTasksQueryKey(params) } });
  const { data: projects } = useListProjects();
  const updateTask = useUpdateTask();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Madeira e Alumínio são unidades diferentes — o filtro por material usa o
  // material do projeto de cada tarefa.
  const materialByProject = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p.materialType])),
    [projects],
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = { todo: [], in_progress: [], review: [], done: [] };
    tasks?.forEach((t) => {
      if (filterMaterial !== "all" && materialByProject.get(t.projectId) !== filterMaterial) return;
      if (map[t.status as TaskStatus]) map[t.status as TaskStatus].push(t);
    });
    return map;
  }, [tasks, filterMaterial, materialByProject]);

  function handleDragStart(e: DragStartEvent) {
    draggedRecentlyRef.current = true;
    const id = Number(String(e.active.id).replace("task-", ""));
    setActiveTask(tasks?.find((t) => t.id === id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    setTimeout(() => { draggedRecentlyRef.current = false; }, 150);
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
        <Select value={filterMaterial} onValueChange={setFilterMaterial}>
          <SelectTrigger className="w-44" data-testid="select-filter-material">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Madeira e Alumínio</SelectItem>
            <SelectItem value="madeira">Madeira</SelectItem>
            <SelectItem value="aluminio">Alumínio</SelectItem>
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
              {tasksByColumn[col.id].map((t) => <DraggableTaskCard key={t.id} task={t} onOpen={() => openTask(t)} />)}
            </KanbanColumn>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <NewTaskDialog open={dialog.open} defaultStatus={dialog.status}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} />
      <TaskDetailPanel task={detailTask} open={detailTask !== null} onClose={() => setDetailTask(null)} />
    </>
  );
}

// ── Projects Board ────────────────────────────────────────────────────────────

export function ProjectsBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [filterMaterial, setFilterMaterial] = useState<string>("all");
  // Evita o "clique fantasma" que dispara logo após soltar um cartão arrastado
  const draggedRecentlyRef = useRef(false);

  const { data: projects, isLoading } = useListProjects();
  const { data: allTasks } = useListTasks();
  const updateProject = useUpdateProject();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const healthMap = useMemo(
    () => computeHealthMap(projects ?? [], allTasks ?? []),
    [projects, allTasks]
  );

  const projectsByColumn = useMemo(() => {
    const map: Record<ProjectStatusId, ProjectItem[]> = {
      a_iniciar: [], em_projeto: [], em_aprovacao: [],
      em_producao: [], aguardando_instalacao: [], em_instalacao: [],
    };
    projects?.forEach((p) => {
      if (filterMaterial !== "all" && p.materialType !== filterMaterial) return;
      if (map[p.status as ProjectStatusId]) map[p.status as ProjectStatusId].push(p);
    });
    return map;
  }, [projects, filterMaterial]);

  function openProject(id: number) {
    if (draggedRecentlyRef.current) return;
    navigate(`/projects/${id}`);
  }

  function endDragCleanup() {
    setActiveProject(null);
    setTimeout(() => { draggedRecentlyRef.current = false; }, 150);
  }

  function handleDragStart(e: DragStartEvent) {
    draggedRecentlyRef.current = true;
    const id = Number(String(e.active.id).replace("project-", ""));
    setActiveProject(projects?.find((p) => p.id === id) ?? null);
  }

  function handleDragCancel() {
    endDragCleanup();
  }

  function handleDragEnd(e: DragEndEvent) {
    endDragCleanup();
    const { active, over } = e;
    if (!over) return;
    const projectId = Number(String(active.id).replace("project-", ""));
    const newStatus = over.id as ProjectStatusId;
    const project = projects?.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    const previous = queryClient.getQueryData<ProjectItem[]>(getListProjectsQueryKey());
    queryClient.setQueryData(getListProjectsQueryKey(), (old: ProjectItem[] | undefined) =>
      old?.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );
    updateProject.mutate({ id: projectId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
      onError: () => {
        queryClient.setQueryData(getListProjectsQueryKey(), previous);
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Erro ao mover projeto.", variant: "destructive" });
      },
    });
  }

  if (isLoading) return <BoardSkeleton />;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 shrink-0 mb-3">
        <Select value={filterMaterial} onValueChange={setFilterMaterial}>
          <SelectTrigger className="w-44" data-testid="select-filter-material-projetos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Madeira e Alumínio</SelectItem>
            <SelectItem value="madeira">Madeira</SelectItem>
            <SelectItem value="aluminio">Alumínio</SelectItem>
          </SelectContent>
        </Select>
      </div>
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
        {PROJECT_COLUMNS.map((col) => (
          <KanbanColumn key={col.id} colId={col.id} label={col.label} color={col.color} bg={col.bg}
            count={projectsByColumn[col.id].length} onAdd={() => navigate("/projects?create=1")}>
            {projectsByColumn[col.id].map((p) => (
              <DraggableProjectCard key={p.id} project={p} farol={healthMap.get(p.id)?.level} onOpen={() => openProject(p.id)} />
            ))}
          </KanbanColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeProject ? <ProjectCard project={activeProject} farol={healthMap.get(activeProject.id)?.level} isDragging /> : null}
      </DragOverlay>
    </DndContext>
    </div>
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
// Hub "Trabalho": lista, quadro e linha do tempo numa tela só — antes eram duas
// páginas de menu (Tarefas e Kanban) para os mesmos dados. A aba ativa vem da
// URL (?tab=), então deep-links como /tasks?vencidas=1 caem na Lista filtrada.

const TRABALHO_TABS = ["lista", "quadro", "fases", "linha"];

export default function Trabalho() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const raw = params.get("tab") ?? "lista";
  const tab = TRABALHO_TABS.includes(raw) ? raw : "lista";

  function goTab(v: string) {
    params.set("tab", v);
    navigate(`/tasks?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Trabalho</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Tarefas e projetos — em lista, quadro ou linha do tempo.</p>
      </div>
      <Tabs value={tab} onValueChange={goTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-4 shrink-0">
          <TabsTrigger value="lista" className="gap-1.5" data-testid="button-trabalho-lista">
            <CheckSquare className="h-3.5 w-3.5" /> Lista
          </TabsTrigger>
          <TabsTrigger value="quadro" className="gap-1.5" data-testid="button-kanban-tarefas">
            <Columns3 className="h-3.5 w-3.5" /> Tarefas
          </TabsTrigger>
          <TabsTrigger value="fases" className="gap-1.5" data-testid="button-kanban-projetos">
            <Briefcase className="h-3.5 w-3.5" /> Fases dos Projetos
          </TabsTrigger>
          <TabsTrigger value="linha" className="gap-1.5">
            <GanttChartSquare className="h-3.5 w-3.5" /> Linha do Tempo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="flex-1 min-h-0 mt-3 overflow-y-auto">
          <Tasks embedded />
        </TabsContent>
        <TabsContent value="quadro" className="flex-1 min-h-0 mt-3 data-[state=active]:flex data-[state=active]:flex-col">
          <TasksBoard />
        </TabsContent>
        <TabsContent value="fases" className="flex-1 min-h-0 mt-3 data-[state=active]:flex data-[state=active]:flex-col">
          <ProjectsBoard />
        </TabsContent>
        <TabsContent value="linha" className="flex-1 min-h-0 mt-3 data-[state=active]:flex data-[state=active]:flex-col">
          <GanttView asTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
