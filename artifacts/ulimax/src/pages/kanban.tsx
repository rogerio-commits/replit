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
  useUpdateProject,
  useListMembers,
  useCreateTask,
  useCreateProject,
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
import {
  CalendarDays, GripVertical, Plus, User, AlertCircle,
  Loader2, CheckSquare, Briefcase, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types & Constants ─────────────────────────────────────────────────────────

type KanbanView = "tasks" | "projects";
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type ProjectStatus = "a_iniciar" | "em_projeto" | "em_aprovacao" | "em_producao" | "aguardando_instalacao" | "em_instalacao";

type TaskItem = ListTasksQueryResult[number];
type ProjectItem = ListProjectsQueryResult[number];

const TASK_COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "todo",        label: "A Fazer",      color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800/60" },
  { id: "in_progress", label: "Em Andamento", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "review",      label: "Revisão",      color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  { id: "done",        label: "Concluído",    color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
];

const PROJECT_COLUMNS: { id: ProjectStatus; label: string; color: string; bg: string }[] = [
  { id: "a_iniciar",            label: "A Iniciar",             color: "text-slate-600",   bg: "bg-slate-100 dark:bg-slate-800/60" },
  { id: "em_projeto",           label: "Em Projeto",            color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-900/20" },
  { id: "em_aprovacao",         label: "Em Aprovação",          color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-900/20" },
  { id: "em_producao",          label: "Em Produção",           color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "aguardando_instalacao",label: "Aguardando Instalação", color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20" },
  { id: "em_instalacao",        label: "Em Instalação",         color: "text-green-600",   bg: "bg-green-50 dark:bg-green-900/20" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-slate-100 text-slate-600 border-slate-200",
};
const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

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

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, isDragging = false, onEdit }: { project: ProjectItem; isDragging?: boolean; onEdit?: () => void }) {
  return (
    <div data-testid={`kanban-card-project-${project.id}`} className={cn(
      "bg-card border rounded-lg p-3 space-y-2 shadow-sm select-none",
      isDragging ? "shadow-xl rotate-1 opacity-90 ring-2 ring-primary/30" : "hover:shadow-md transition-shadow",
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{project.name}</p>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && !isDragging && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Editar projeto"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
        </div>
      </div>
      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[project.priority])}>
          {PRIORITY_LABELS[project.priority]}
        </Badge>
        {project.instalacaoStartDate && (
          <div className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
            <CalendarDays className="h-3 w-3" />
            <span>Inst. {formatDate(project.instalacaoStartDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableProjectCard({ project, onEdit }: { project: ProjectItem; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `project-${project.id}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0 : 1 }}>
      <ProjectCard project={project} onEdit={onEdit} />
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
                      <SelectItem value="medium">Média</SelectItem>
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

// ── New Project Dialog ────────────────────────────────────────────────────────

const newProjectSchema = z.object({
  name:             z.string().min(1, "Nome obrigatório"),
  description:      z.string().optional(),
  priority:         z.enum(["low", "medium", "high"]),
  startDate:        z.string().optional(),
  endDate:          z.string().optional(),
  finalDate:        z.string().optional(),
  producaoStartDate:   z.string().optional(),
  producaoEndDate:     z.string().optional(),
  producaoFinalDate:   z.string().optional(),
  medicaoDate:         z.string().optional(),
  instalacaoStartDate: z.string().optional(),
  materialType: z.enum(["madeira", "aluminio"]).optional(),
});

function NewProjectDialog({ open, defaultStatus, onOpenChange }: {
  open: boolean; defaultStatus: ProjectStatus; onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const form = useForm<z.infer<typeof newProjectSchema>>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: { name: "", description: "", priority: "medium", startDate: "", endDate: "", finalDate: "", producaoStartDate: "", producaoEndDate: "", producaoFinalDate: "", medicaoDate: "", instalacaoStartDate: "", materialType: undefined },
  });

  function onSubmit(values: z.infer<typeof newProjectSchema>) {
    createProject.mutate({ data: {
      name: values.name, description: values.description || undefined,
      priority: values.priority, status: defaultStatus,
      startDate: values.startDate || undefined, endDate: values.endDate || undefined,
      finalDate: values.finalDate || undefined,
      producaoStartDate: values.producaoStartDate || undefined,
      producaoEndDate: values.producaoEndDate || undefined,
      producaoFinalDate: values.producaoFinalDate || undefined,
      medicaoDate: values.medicaoDate || undefined,
      instalacaoStartDate: values.instalacaoStartDate || undefined,
      materialType: values.materialType || undefined,
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Projeto criado com sucesso." });
        form.reset(); onOpenChange(false);
      },
      onError: () => toast({ title: "Erro ao criar projeto.", variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel>
                <FormControl><Input data-testid="input-project-name" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem><FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-project-priority"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select></FormItem>
            )} />
            <div className="grid grid-cols-3 gap-2">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Início do Projeto</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>Fim Estimado</FormLabel>
                  <FormControl><DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("startDate")} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="finalDate" render={({ field }) => (
                <FormItem><FormLabel>Data Final</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FormField control={form.control} name="producaoStartDate" render={({ field }) => (
                <FormItem><FormLabel>Início da Produção</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="producaoEndDate" render={({ field }) => (
                <FormItem><FormLabel>Fim Est. Produção</FormLabel>
                  <FormControl><DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("producaoStartDate")} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="producaoFinalDate" render={({ field }) => (
                <FormItem><FormLabel>Final da Produção</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="medicaoDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Medição</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="instalacaoStartDate" render={({ field }) => (
                <FormItem><FormLabel>Início Est. da Instalação</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="materialType" render={({ field }) => (
              <FormItem><FormLabel>Tipo de Material</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="madeira">Madeira</SelectItem>
                    <SelectItem value="aluminio">Alumínio</SelectItem>
                  </SelectContent>
                </Select></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={createProject.isPending} data-testid="button-create-project">
                {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Project Dialog ────────────────────────────────────────────────────────

const editProjectSchema = z.object({
  name:                z.string().min(1, "Nome obrigatório"),
  description:         z.string().optional(),
  status:              z.enum(["a_iniciar", "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"]),
  priority:            z.enum(["low", "medium", "high"]),
  startDate:           z.string().optional(),
  endDate:             z.string().optional(),
  finalDate:           z.string().optional(),
  producaoStartDate:   z.string().optional(),
  producaoEndDate:     z.string().optional(),
  producaoFinalDate:   z.string().optional(),
  medicaoDate:         z.string().optional(),
  instalacaoStartDate: z.string().optional(),
  materialType: z.enum(["madeira", "aluminio"]).optional(),
});

function EditProjectDialog({ project, open, onOpenChange }: {
  project: ProjectItem | null; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const form = useForm<z.infer<typeof editProjectSchema>>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: { name: "", description: "", status: "a_iniciar", priority: "medium", startDate: "", endDate: "", finalDate: "", producaoStartDate: "", producaoEndDate: "", producaoFinalDate: "", medicaoDate: "", instalacaoStartDate: "" },
  });

  // Populate form whenever the target project changes
  const prevId = form.getValues("name");
  if (project && (prevId !== project.name || !open)) {
    form.reset({
      name: project.name,
      description: project.description ?? "",
      status: project.status as z.infer<typeof editProjectSchema>["status"],
      priority: project.priority as z.infer<typeof editProjectSchema>["priority"],
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      endDate: project.endDate ? project.endDate.split("T")[0] : "",
      finalDate: project.finalDate ? project.finalDate.split("T")[0] : "",
      producaoStartDate: project.producaoStartDate ? project.producaoStartDate.split("T")[0] : "",
      producaoEndDate: project.producaoEndDate ? project.producaoEndDate.split("T")[0] : "",
      producaoFinalDate: project.producaoFinalDate ? project.producaoFinalDate.split("T")[0] : "",
      medicaoDate: project.medicaoDate ? project.medicaoDate.split("T")[0] : "",
      instalacaoStartDate: project.instalacaoStartDate ? project.instalacaoStartDate.split("T")[0] : "",
      materialType: (project.materialType as "madeira" | "aluminio" | undefined) ?? undefined,
    });
  }

  function onSubmit(values: z.infer<typeof editProjectSchema>) {
    if (!project) return;
    updateProject.mutate({ id: project.id, data: {
      name: values.name, description: values.description || undefined,
      status: values.status, priority: values.priority,
      startDate: values.startDate || undefined, endDate: values.endDate || undefined,
      finalDate: values.finalDate || undefined,
      producaoStartDate: values.producaoStartDate || undefined,
      producaoEndDate: values.producaoEndDate || undefined,
      producaoFinalDate: values.producaoFinalDate || undefined,
      medicaoDate: values.medicaoDate || undefined,
      instalacaoStartDate: values.instalacaoStartDate || undefined,
      materialType: values.materialType || undefined,
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Projeto atualizado com sucesso." });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Erro ao atualizar projeto.", variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel>
                <FormControl><Input placeholder="Nome do projeto" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Descrição opcional" rows={2} {...field} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="a_iniciar">A Iniciar</SelectItem>
                      <SelectItem value="em_projeto">Em Projeto</SelectItem>
                      <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                      <SelectItem value="em_producao">Em Produção</SelectItem>
                      <SelectItem value="aguardando_instalacao">Aguard. Instalação</SelectItem>
                      <SelectItem value="em_instalacao">Em Instalação</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Início do Projeto</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>Fim Estimado</FormLabel>
                  <FormControl><DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("startDate")} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="finalDate" render={({ field }) => (
                <FormItem><FormLabel>Data Final</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FormField control={form.control} name="producaoStartDate" render={({ field }) => (
                <FormItem><FormLabel>Início da Produção</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="producaoEndDate" render={({ field }) => (
                <FormItem><FormLabel>Fim Est. Produção</FormLabel>
                  <FormControl><DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("producaoStartDate")} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="producaoFinalDate" render={({ field }) => (
                <FormItem><FormLabel>Final da Produção</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="medicaoDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Medição</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="instalacaoStartDate" render={({ field }) => (
                <FormItem><FormLabel>Início Est. da Instalação</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="materialType" render={({ field }) => (
              <FormItem><FormLabel>Tipo de Material</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="madeira">Madeira</SelectItem>
                    <SelectItem value="aluminio">Alumínio</SelectItem>
                  </SelectContent>
                </Select></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
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

// ── Projects Board ────────────────────────────────────────────────────────────

function ProjectsBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; status: ProjectStatus }>({ open: false, status: "a_iniciar" });
  const [editProject, setEditProject] = useState<ProjectItem | null>(null);

  const { data: projects, isLoading } = useListProjects();
  const updateProject = useUpdateProject();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const projectsByColumn = useMemo(() => {
    const map: Record<ProjectStatus, ProjectItem[]> = { a_iniciar: [], em_projeto: [], em_aprovacao: [], em_producao: [], aguardando_instalacao: [], em_instalacao: [] };
    projects?.forEach((p) => { if (map[p.status as ProjectStatus]) map[p.status as ProjectStatus].push(p); });
    return map;
  }, [projects]);

  function handleDragStart(e: DragStartEvent) {
    const id = Number(String(e.active.id).replace("project-", ""));
    setActiveProject(projects?.find((p) => p.id === id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveProject(null);
    const { active, over } = e;
    if (!over) return;
    const projectId = Number(String(active.id).replace("project-", ""));
    const newStatus = over.id as ProjectStatus;
    const project = projects?.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    queryClient.setQueryData(getListProjectsQueryKey(), (old: ProjectItem[] | undefined) =>
      old?.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );
    updateProject.mutate({ id: projectId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
      onError: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Erro ao mover projeto.", variant: "destructive" });
      },
    });
  }

  if (isLoading) return <BoardSkeleton />;

  return (
    <>
      <div className="flex items-center gap-3 shrink-0">
        <Button onClick={() => setDialog({ open: true, status: "a_iniciar" })} data-testid="button-new-project">
          <Plus className="h-4 w-4 mr-2" />Novo Projeto
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
          {PROJECT_COLUMNS.map((col) => (
            <KanbanColumn key={col.id} colId={col.id} label={col.label} color={col.color} bg={col.bg}
              count={projectsByColumn[col.id].length} onAdd={() => setDialog({ open: true, status: col.id })}>
              {projectsByColumn[col.id].map((p) => <DraggableProjectCard key={p.id} project={p} onEdit={() => setEditProject(p)} />)}
            </KanbanColumn>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeProject ? <ProjectCard project={activeProject} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <NewProjectDialog open={dialog.open} defaultStatus={dialog.status}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} />
      <EditProjectDialog project={editProject} open={editProject !== null}
        onOpenChange={(v) => { if (!v) setEditProject(null); }} />
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
  const [view, setView] = useState<KanbanView>("projects");

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Arraste os cards para atualizar o status.</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1 shrink-0" data-testid="kanban-view-toggle">
          <button
            onClick={() => setView("projects")}
            data-testid="toggle-projects"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "projects" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Briefcase className="h-4 w-4" />Projetos
          </button>
          <button
            onClick={() => setView("tasks")}
            data-testid="toggle-tasks"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "tasks" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckSquare className="h-4 w-4" />Tarefas
          </button>
        </div>
      </div>

      {view === "tasks" ? <TasksBoard /> : <ProjectsBoard />}
    </div>
  );
}
