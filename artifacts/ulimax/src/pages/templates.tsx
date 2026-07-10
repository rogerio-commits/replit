import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useGetTemplate,
  useAddTemplateTask,
  useDeleteTemplateTask,
  useApplyTemplate,
  getListTemplatesQueryKey,
  getGetTemplateQueryKey,
} from "@workspace/api-client-react";
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
  DialogFooter,
  DialogClose,
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
import {
  Layers,
  Plus,
  Trash2,
  Play,
  ChevronRight,
  CheckSquare,
  Clock,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Normal",
  low: "Baixa",
};

const getPriorityColor = (p: string) => {
  if (p === "high") return "text-destructive border-destructive/30 bg-destructive/5";
  if (p === "medium") return "text-amber-600 border-amber-200 bg-amber-50";
  return "text-emerald-600 border-emerald-200 bg-emerald-50";
};

const templateSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
});

const templateTaskSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  offsetDays: z.coerce.number().int().min(0),
});

const applySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Data de início obrigatória"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;
type TemplateTaskFormValues = z.infer<typeof templateTaskSchema>;
type ApplyFormValues = z.infer<typeof applySchema>;

export default function Templates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isGestor = useIsGestor();

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applyTargetId, setApplyTargetId] = useState<number | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const { data: templates, isLoading } = useListTemplates();
  const { data: selectedTemplate } = useGetTemplate(selectedTemplateId ?? 0, {
    query: { enabled: selectedTemplateId !== null, queryKey: getGetTemplateQueryKey(selectedTemplateId ?? 0) },
  });

  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const addTemplateTask = useAddTemplateTask();
  const deleteTemplateTask = useDeleteTemplateTask();
  const applyTemplate = useApplyTemplate();

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", description: "", priority: "medium" },
  });

  const taskForm = useForm<TemplateTaskFormValues>({
    resolver: zodResolver(templateTaskSchema),
    defaultValues: { title: "", description: "", priority: "medium", offsetDays: 0 },
  });

  const applyForm = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: { name: "", description: "", startDate: "" },
  });

  const onCreateTemplate = (data: TemplateFormValues) => {
    createTemplate.mutate({ data }, {
      onSuccess: (t) => {
        toast({ title: "Template criado" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        setIsCreateOpen(false);
        templateForm.reset();
        setSelectedTemplateId(t.id);
      },
      onError: () => toast({ title: "Erro ao criar template", variant: "destructive" }),
    });
  };

  const onDeleteTemplate = (id: number) => {
    deleteTemplate.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Template excluído" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        if (selectedTemplateId === id) setSelectedTemplateId(null);
      },
      onError: () => toast({ title: "Erro ao excluir template", variant: "destructive" }),
    });
  };

  const onAddTask = (data: TemplateTaskFormValues) => {
    if (!selectedTemplateId) return;
    addTemplateTask.mutate({ id: selectedTemplateId, data }, {
      onSuccess: () => {
        toast({ title: "Tarefa adicionada" });
        queryClient.invalidateQueries({ queryKey: getGetTemplateQueryKey(selectedTemplateId) });
        setIsAddTaskOpen(false);
        taskForm.reset({ title: "", description: "", priority: "medium", offsetDays: 0 });
      },
      onError: () => toast({ title: "Erro ao adicionar tarefa", variant: "destructive" }),
    });
  };

  const onDeleteTask = (taskId: number) => {
    if (!selectedTemplateId) return;
    deleteTemplateTask.mutate({ id: selectedTemplateId, taskId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTemplateQueryKey(selectedTemplateId) });
      },
      onError: () => toast({ title: "Erro ao remover tarefa", variant: "destructive" }),
    });
  };

  const openApply = (id: number, name: string) => {
    setApplyTargetId(id);
    applyForm.reset({ name: `Projeto - ${name}`, description: "", startDate: new Date().toISOString().slice(0, 10) });
    setIsApplyOpen(true);
  };

  const onApply = (data: ApplyFormValues) => {
    if (!applyTargetId) return;
    applyTemplate.mutate({ id: applyTargetId, data }, {
      onSuccess: (project) => {
        toast({ title: "Projeto criado a partir do template!" });
        queryClient.invalidateQueries({ queryKey: ["listProjects"] });
        setIsApplyOpen(false);
        setLocation(`/projects/${project.id}`);
      },
      onError: () => toast({ title: "Erro ao aplicar template", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Templates de Projeto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie templates reutilizáveis para agilizar a criação de novos projetos.
          </p>
        </div>
        {isGestor && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : !templates || templates.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-lg bg-muted/20">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum template criado ainda.</p>
              {isGestor && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsCreateOpen(true)}>
                  Criar primeiro template
                </Button>
              )}
            </div>
          ) : (
            templates.map((t) => (
              <Card
                key={t.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/40",
                  selectedTemplateId === t.id && "border-primary ring-1 ring-primary/20"
                )}
                onClick={() => setSelectedTemplateId(t.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-[10px] font-medium", getPriorityColor(t.priority))}>
                          {PRIORITY_LABELS[t.priority]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" /> {t.taskCount ?? 0} tarefas
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isGestor && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                            title="Usar template"
                            onClick={(e) => { e.stopPropagation(); openApply(t.id, t.name); }}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Excluir template"
                            onClick={(e) => { e.stopPropagation(); onDeleteTemplate(t.id); }}
                            disabled={deleteTemplate.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", selectedTemplateId === t.id && "rotate-90")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Template detail */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                  {selectedTemplate.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedTemplate.description}</p>
                  )}
                </div>
                {isGestor && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => openApply(selectedTemplate.id, selectedTemplate.name)}>
                      <Play className="h-3.5 w-3.5" /> Usar Template
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAddTaskOpen(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Adicionar Tarefa
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedTemplate.tasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed rounded-lg bg-muted/10">
                    <CheckSquare className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa neste template.</p>
                    {isGestor && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => setIsAddTaskOpen(true)}>
                        Adicionar tarefa
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTemplate.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn("text-[10px] font-medium", getPriorityColor(task.priority))}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Dia {task.offsetDays}
                          </span>
                          {isGestor && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteTask(task.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed rounded-lg bg-muted/10">
              <div className="text-center">
                <Layers className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Selecione um template para ver seus detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create template dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Template de Projeto</DialogTitle>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(onCreateTemplate)} className="space-y-4">
              <FormField control={templateForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Template</FormLabel>
                  <FormControl><Input placeholder="Ex.: Projeto Residencial" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={templateForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={templateForm.control} name="priority" render={({ field }) => (
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
              )} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? "Criando..." : "Criar Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add task to template dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Tarefa ao Template</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onAddTask)} className="space-y-4">
              <FormField control={taskForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Tarefa</FormLabel>
                  <FormControl><Input placeholder="Ex.: Vistoria inicial" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={taskForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={taskForm.control} name="priority" render={({ field }) => (
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
                )} />
                <FormField control={taskForm.control} name="offsetDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias após início</FormLabel>
                    <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={addTemplateTask.isPending}>
                  {addTemplateTask.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Apply template dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Projeto a partir do Template</DialogTitle>
          </DialogHeader>
          <Form {...applyForm}>
            <form onSubmit={applyForm.handleSubmit(onApply)} className="space-y-4">
              <FormField control={applyForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Projeto</FormLabel>
                  <FormControl><Input placeholder="Ex.: Edifício Alpha" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={applyForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={applyForm.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={applyTemplate.isPending}>
                  {applyTemplate.isPending ? "Criando..." : "Criar Projeto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
