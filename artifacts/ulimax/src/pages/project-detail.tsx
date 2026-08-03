import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { recordProjectVisit } from "@/hooks/useRecentProjects";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useGetProject,
  useGetProjectStats,
  useListTasks,
  useUpdateProject,
  useDeleteProject,
  useCreateProject,
  useCreateTask,
  useUpdateTask,
  useListProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
  useListMembers,
  useListSiteVisits,
  useCreateSiteVisit,
  useDeleteSiteVisit,
  useListProjectObservations,
  useCreateProjectObservation,
  useListProjectPhaseHistory,
  useApproveProject,
  useArchiveProject,
  useUnarchiveProject,
  getGetProjectQueryKey,
  getListTasksQueryKey,
  getGetProjectStatsQueryKey,
  getListProjectsQueryKey,
  getListProjectMembersQueryKey,
  getListSiteVisitsQueryKey,
  getListProjectObservationsQueryKey,
} from "@workspace/api-client-react";
import { ObraDocuments } from "@/components/obra-documents";
import { ChecklistSection } from "@/components/checklist-section";
import { ProjectMaterials } from "@/components/project-materials";
import { ProjectActionPlan } from "@/components/project-action-plan";
import { ProjectMilestones } from "@/components/project-milestones";
import { ProjectBurndown } from "@/components/project-burndown";
import { ProjectDates } from "@/components/project-dates";
import { VisitDetailDialog } from "@/components/visit-detail-dialog";
import { ActionPlanBadge } from "@/components/action-plan-badge";
import { useEffectiveRole } from "@/hooks/useViewAs";
import { useActionPlanMap } from "@/hooks/useActionPlanMap";
import { BatchCreateTasks } from "@/components/batch-create-tasks";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateWithDaysCalc } from "@/components/date-with-days-calc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Trash2,
  CheckSquare,
  Clock,
  Plus,
  AlertCircle,
  HardHat,
  Users,
  UserPlus,
  X,
  MapPin,
  Eye,
  MessageSquare,
  Send,
  History,
  ArrowRight,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Archive,
  ArchiveRestore,
  ListFilter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppUser, useIsGestor } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

const projectSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  status: z.enum(["a_iniciar", "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"]),
  priority: z.enum(["low", "medium", "high"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  finalDate: z.string().optional(),
  producaoStartDate: z.string().optional(),
  producaoEndDate: z.string().optional(),
  producaoFinalDate: z.string().optional(),
  medicaoDate: z.string().optional(),
  instalacaoStartDate: z.string().optional(),
  materialType: z.enum(["madeira", "aluminio"]).optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
});

const visitSchema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  responsibleId: z.string().optional(),
  visitors: z.string().min(1, "Informe quem foi à obra"),
  objective: z.string().min(1, "Objetivo obrigatório"),
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;
type TaskFormValues = z.infer<typeof taskSchema>;
type VisitFormValues = z.infer<typeof visitSchema>;

const STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluído",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Normal",
  low: "Normal",
};

function getStatusColor(status: string) {
  switch (status) {
    case "a_iniciar": return "bg-slate-500/10 text-slate-600 border-slate-200";
    case "em_projeto": return "bg-violet-500/10 text-violet-600 border-violet-200";
    case "em_aprovacao": return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "em_producao": return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "aguardando_instalacao": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "em_instalacao": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    default: return "bg-slate-500/10 text-slate-600 border-slate-200";
  }
}

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

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id || "0", 10);
  const planMap = useActionPlanMap();
  const isCampo = useEffectiveRole() === "gestor_obras";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isGestor = useIsGestor();
  const { data: me } = useAppUser();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<number | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [visitFilter, setVisitFilter] = useState<"all" | "pending" | "completed" | "no_plan">("all");

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  useEffect(() => {
    if (project?.id && project?.name) {
      recordProjectVisit(project.id, project.name);
    }
  }, [project?.id, project?.name]);
  const { data: stats, isLoading: isStatsLoading } = useGetProjectStats(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectStatsQueryKey(projectId) },
  });
  const { data: tasks, isLoading: isTasksLoading } = useListTasks({ projectId }, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) },
  });
  const { data: projectMembers, isLoading: isMembersLoading } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) },
  });
  const { data: allMembers } = useListMembers();
  const { data: siteVisits } = useListSiteVisits(projectId, {
    query: { enabled: !!projectId, queryKey: getListSiteVisitsQueryKey(projectId) },
  });
  const { data: observations } = useListProjectObservations(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectObservationsQueryKey(projectId) },
  });
  const { data: phaseHistory } = useListProjectPhaseHistory(projectId, {
    query: { enabled: !!projectId, queryKey: ["projectPhaseHistory", projectId] },
  });

  interface ProjectActivityItem {
    id: string;
    type: "task_created" | "task_completed" | "task_commented";
    actorName: string;
    description: string;
    entityId: number;
    entityTitle: string;
    createdAt: string;
  }

  const { data: activityItems } = useQuery<ProjectActivityItem[]>({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/projects/${projectId}/activity`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: !!projectId,
  });

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const addProjectMember = useAddProjectMember();
  const removeProjectMember = useRemoveProjectMember();
  const createSiteVisit = useCreateSiteVisit();
  const deleteSiteVisit = useDeleteSiteVisit();
  const createObservation = useCreateProjectObservation();
  const approveProjectMutation = useApproveProject();

  const [obsText, setObsText] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [isApproveOpen, setIsApproveOpen] = useState(false);

  const handleApprove = (action: "approved" | "rejected") => {
    approveProjectMutation.mutate(
      { id: projectId, data: { action, note: approvalNote || undefined } },
      {
        onSuccess: () => {
          toast({ title: action === "approved" ? "Projeto aprovado!" : "Projeto rejeitado" });
          setIsApproveOpen(false);
          setApprovalNote("");
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        },
        onError: () => toast({ title: "Erro ao processar aprovação", variant: "destructive" }),
      }
    );
  };

  // Participation check for executors
  const myMember = allMembers?.find(
    (m) => m.email.toLowerCase() === (me?.email ?? "").toLowerCase()
  );
  const isParticipant = projectMembers?.some((pm) => pm.memberId === myMember?.id) ?? false;
  const isExecutor = me?.role === "executor";
  const canEdit = isGestor || (isExecutor && isParticipant);

  // Members available to add (not yet in the project)
  const participantMemberIds = new Set(projectMembers?.map((pm) => pm.memberId) ?? []);
  const availableToAdd = allMembers?.filter((m) => !participantMemberIds.has(m.id)) ?? [];

  // Selected member for add dialog
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    values: project
      ? {
          name: project.name,
          description: project.description || "",
          status: project.status as ProjectFormValues["status"],
          priority: project.priority as ProjectFormValues["priority"],
          startDate: project.startDate ? project.startDate.split("T")[0] : "",
          endDate: project.endDate ? project.endDate.split("T")[0] : "",
          finalDate: project.finalDate ? project.finalDate.split("T")[0] : "",
          producaoStartDate: project.producaoStartDate ? project.producaoStartDate.split("T")[0] : "",
          producaoEndDate: project.producaoEndDate ? project.producaoEndDate.split("T")[0] : "",
          producaoFinalDate: project.producaoFinalDate ? project.producaoFinalDate.split("T")[0] : "",
          medicaoDate: project.medicaoDate ? project.medicaoDate.split("T")[0] : "",
          instalacaoStartDate: project.instalacaoStartDate ? project.instalacaoStartDate.split("T")[0] : "",
          materialType: (project.materialType as "madeira" | "aluminio" | undefined) ?? undefined,
        }
      : undefined,
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", status: "todo", priority: "medium", dueDate: "" },
  });

  const visitForm = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: { date: "", responsibleId: "none", visitors: "", objective: "", notes: "" },
  });

  const onUpdateProject = (data: ProjectFormValues) => {
    if (!data.materialType) {
      projectForm.setError("materialType", { message: "Selecione o tipo de material" });
      return;
    }
    updateProject.mutate({ id: projectId, data }, {
      onSuccess: () => {
        toast({ title: "Projeto atualizado com sucesso" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["projectPhaseHistory", projectId] });
        setIsEditOpen(false);
      },
      onError: () => toast({ title: "Erro ao atualizar projeto", variant: "destructive" }),
    });
  };

  const onAddObservation = () => {
    if (!obsText.trim()) return;
    createObservation.mutate(
      { id: projectId, data: { text: obsText.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectObservationsQueryKey(projectId) });
          setObsText("");
        },
        onError: () => toast({ title: "Erro ao salvar observação", variant: "destructive" }),
      }
    );
  };

  const onDeleteProject = () => {
    deleteProject.mutate({ id: projectId }, {
      onSuccess: () => {
        toast({ title: "Projeto excluído" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation("/projects");
      },
      onError: () => toast({ title: "Erro ao excluir projeto", variant: "destructive" }),
    });
  };

  const onArchiveProject = () => {
    archiveProject.mutate({ id: projectId }, {
      onSuccess: () => {
        toast({ title: "Projeto arquivado" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
      onError: () => toast({ title: "Erro ao arquivar projeto", variant: "destructive" }),
    });
  };

  const onUnarchiveProject = () => {
    unarchiveProject.mutate({ id: projectId }, {
      onSuccess: () => {
        toast({ title: "Projeto reativado" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
      onError: () => toast({ title: "Erro ao reativar projeto", variant: "destructive" }),
    });
  };

  const createProject = useCreateProject();
  const onDuplicateProject = () => {
    if (!project) return;
    createProject.mutate({
      data: {
        name: `Cópia de ${project.name}`,
        description: project.description || undefined,
        status: "a_iniciar",
        priority: project.priority,
      } as any,
    }, {
      onSuccess: (newProject) => {
        toast({ title: "Projeto duplicado" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation(`/projects/${newProject.id}`);
      },
      onError: () => toast({ title: "Erro ao duplicar projeto", variant: "destructive" }),
    });
  };

  const openEditTask = (task: { id: number; title: string; description?: string | null; status: string; priority: string; dueDate?: string | null }) => {
    setEditingTaskId(task.id);
    taskForm.reset({
      title: task.title,
      description: task.description ?? "",
      status: task.status as TaskFormValues["status"],
      priority: task.priority as TaskFormValues["priority"],
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setIsCreateTaskOpen(true);
  };

  const onCreateTask = (data: TaskFormValues) => {
    if (editingTaskId !== null) {
      updateTask.mutate({ id: editingTaskId, data }, {
        onSuccess: () => {
          toast({ title: "Tarefa atualizada com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
          setIsCreateTaskOpen(false);
          setEditingTaskId(null);
          taskForm.reset();
        },
        onError: () => toast({ title: "Erro ao atualizar tarefa", variant: "destructive" }),
      });
      return;
    }
    createTask.mutate({ data: { ...data, projectId } }, {
      onSuccess: () => {
        toast({ title: "Tarefa criada com sucesso" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
        setIsCreateTaskOpen(false);
        taskForm.reset();
      },
      onError: () => toast({ title: "Erro ao criar tarefa", variant: "destructive" }),
    });
  };

  const toggleTaskDone = (task: { id: number; title: string; status: string; priority: string; description?: string | null; dueDate?: string | null }) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const markingDone = newStatus === "done";
    setTogglingTaskId(task.id);
    updateTask.mutate(
      {
        id: task.id,
        data: {
          title: task.title,
          description: task.description ?? undefined,
          status: newStatus,
          priority: task.priority as TaskFormValues["priority"],
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
        },
        onSettled: () => setTogglingTaskId(null),
      }
    );
  };

  const onAddMember = () => {
    if (!selectedMemberId) return;
    addProjectMember.mutate(
      { id: projectId, data: { memberId: Number(selectedMemberId) } },
      {
        onSuccess: () => {
          toast({ title: "Participante adicionado com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          setIsAddMemberOpen(false);
          setSelectedMemberId("");
        },
        onError: () => toast({ title: "Erro ao adicionar participante", variant: "destructive" }),
      }
    );
  };

  const onRemoveMember = (memberId: number, memberName: string) => {
    removeProjectMember.mutate(
      { id: projectId, memberId },
      {
        onSuccess: () => {
          toast({ title: `${memberName} removido do projeto` });
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
        },
        onError: () => toast({ title: "Erro ao remover participante", variant: "destructive" }),
      }
    );
  };

  const onCreateVisit = (data: VisitFormValues) => {
    createSiteVisit.mutate(
      {
        id: projectId,
        data: {
          date: data.date,
          visitors: data.visitors,
          objective: data.objective,
          notes: data.notes || undefined,
          responsibleId: data.responsibleId && data.responsibleId !== "none" ? Number(data.responsibleId) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Visita registrada com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListSiteVisitsQueryKey(projectId) });
          setIsAddVisitOpen(false);
          visitForm.reset({ date: "", responsibleId: "none", visitors: "", objective: "", notes: "" });
        },
        onError: () => toast({ title: "Erro ao registrar visita", variant: "destructive" }),
      }
    );
  };

  const onDeleteVisit = (visitId: number) => {
    deleteSiteVisit.mutate(
      { id: projectId, visitId },
      {
        onSuccess: () => {
          toast({ title: "Visita removida" });
          queryClient.invalidateQueries({ queryKey: getListSiteVisitsQueryKey(projectId) });
        },
        onError: () => toast({ title: "Erro ao remover visita", variant: "destructive" }),
      }
    );
  };

  if (isProjectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Projeto não encontrado</h2>
        <Button className="mt-4" onClick={() => setLocation("/projects")}>Voltar para Projetos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Archived banner */}
      {project.archived && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
          <Archive className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Este projeto está arquivado e não aparece na lista padrão de projetos.</p>
          {(me?.role === "gestor" || me?.role === "gestor_obras") && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40"
              onClick={onUnarchiveProject}
              disabled={unarchiveProject.isPending}
            >
              <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
              Reativar
            </Button>
          )}
        </div>
      )}
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground" onClick={() => setLocation("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Projetos
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {STATUS_LABELS[project.status] ?? project.status}
              </Badge>
              <ActionPlanBadge projectId={projectId} projectName={project.name} summary={planMap.get(projectId)} />
              {isExecutor && !isGestor && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  isParticipant
                    ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-800"
                )}>
                  {isParticipant ? "Você é participante" : "Somente visualização"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2 max-w-3xl">{project.description || "Sem descrição."}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation(`/projects/${projectId}/relatorio`)}>
              Relatório
            </Button>
            {canEdit && (
              <>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Projeto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Editar Projeto</DialogTitle>
                    </DialogHeader>
                    <Form {...projectForm}>
                      <form onSubmit={projectForm.handleSubmit(onUpdateProject)} className="space-y-4">
                        <FormField control={projectForm.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Projeto</FormLabel>
                            <FormControl><Input placeholder="Ex.: Edifício Alpha" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={projectForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl><Input placeholder="Breve descrição do projeto..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={projectForm.control} name="status" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="a_iniciar">A Iniciar</SelectItem>
                                  <SelectItem value="em_projeto">Em Projeto</SelectItem>
                                  <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                                  <SelectItem value="em_producao">Em Produção</SelectItem>
                                  <SelectItem value="aguardando_instalacao">Aguardando Instalação</SelectItem>
                                  <SelectItem value="em_instalacao">Em Instalação</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={projectForm.control} name="priority" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioridade</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="medium">Normal</SelectItem>
                                  <SelectItem value="high">Alta</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={projectForm.control} name="startDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Início do Projeto</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={projectForm.control} name="endDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fim Est. Projeto</FormLabel>
                              <FormControl>
                                <DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={projectForm.watch("startDate")} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={projectForm.control} name="finalDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Final</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={projectForm.control} name="producaoStartDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Início da Produção</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={projectForm.control} name="producaoEndDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fim Est. Produção</FormLabel>
                              <FormControl>
                                <DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={projectForm.watch("producaoStartDate")} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={projectForm.control} name="producaoFinalDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Final da Produção</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={projectForm.control} name="medicaoDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Medição</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={projectForm.control} name="instalacaoStartDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Início Est. da Instalação</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={projectForm.control} name="materialType" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Material</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="madeira">Madeira</SelectItem>
                                <SelectItem value="aluminio">Alumínio</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <DialogFooter>
                          <Button type="submit" disabled={updateProject.isPending}>
                            {updateProject.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="icon" onClick={onDuplicateProject} disabled={createProject.isPending} title="Duplicar projeto">
                  <Copy className="h-4 w-4" />
                </Button>
                {(me?.role === "gestor" || me?.role === "gestor_obras") && (
                  project.archived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onUnarchiveProject}
                      disabled={unarchiveProject.isPending}
                      title="Reativar projeto"
                    >
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      {unarchiveProject.isPending ? "Reativando..." : "Reativar"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onArchiveProject}
                      disabled={archiveProject.isPending}
                      title="Arquivar projeto"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {archiveProject.isPending ? "Arquivando..." : "Arquivar"}
                    </Button>
                  )
                )}
                <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setDeleteConfirmName(""); }}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Excluir Projeto</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Esta ação é <span className="font-semibold text-destructive">irreversível</span> e removerá todas as tarefas associadas. Para confirmar, digite o nome do projeto:
                      </p>
                      <p className="text-sm font-medium text-foreground bg-muted rounded px-3 py-1.5 break-all">
                        {project.name}
                      </p>
                      <Input
                        placeholder="Digite o nome do projeto para confirmar"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={onDeleteProject}
                        disabled={deleteProject.isPending || deleteConfirmName !== project.name}
                      >
                        {deleteProject.isPending ? "Excluindo..." : "Excluir Projeto"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className={`h-4 w-4 ${getPriorityColor(project.priority)}`} />
            <span className="font-medium text-foreground">{PRIORITY_LABELS[project.priority] ?? project.priority}</span>
          </div>
          <ProjectDates
            hideProducao={isCampo}
            project={project}
            emptyHint={isGestor ? "Nenhuma data preenchida ainda — clique em “Editar Projeto” para incluir as datas." : undefined}
          />
        </div>
      </div>

      {/* Approval Panel */}
      {project.status === "em_aprovacao" && (
        <Card className={cn(
          "border-2",
          project.approvalStatus === "approved" ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10" :
          project.approvalStatus === "rejected" ? "border-red-300 bg-red-50/50 dark:bg-red-900/10" :
          "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10"
        )}>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              {project.approvalStatus === "approved" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
               project.approvalStatus === "rejected" ? <XCircle className="h-4 w-4 text-red-600" /> :
               <Clock className="h-4 w-4 text-amber-600" />}
              <CardTitle className="text-sm font-semibold">
                {project.approvalStatus === "approved" ? "Projeto Aprovado" :
                 project.approvalStatus === "rejected" ? "Projeto Rejeitado" :
                 "Aguardando Aprovação"}
              </CardTitle>
              {project.approvalAt && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(new Date(project.approvalAt), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 py-3">
            {project.approvalNote && (
              <p className="text-sm text-foreground mb-3 bg-white/60 dark:bg-black/10 rounded p-2 border border-border/50">
                <span className="font-medium">Nota: </span>{project.approvalNote}
              </p>
            )}
            {!project.approvalStatus && isGestor && (
              <>
                {!isApproveOpen ? (
                  <Button size="sm" variant="outline" onClick={() => setIsApproveOpen(true)} className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Revisar e Decidir
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Nota de revisão (opcional)..."
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprove("approved")}
                        disabled={approveProjectMutation.isPending}
                      >
                        {approveProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleApprove("rejected")}
                        disabled={approveProjectMutation.isPending}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        Rejeitar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsApproveOpen(false); setApprovalNote(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            {!project.approvalStatus && !isGestor && (
              <p className="text-sm text-muted-foreground">Aguardando revisão de um gestor.</p>
            )}
            {project.approvalStatus && isGestor && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => setIsApproveOpen(!isApproveOpen)}
              >
                Rever decisão
              </Button>
            )}
            {project.approvalStatus && isGestor && isApproveOpen && (
              <div className="space-y-3 mt-2">
                <Textarea
                  placeholder="Nova nota (opcional)..."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove("approved")} disabled={approveProjectMutation.isPending}>
                    <ThumbsUp className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleApprove("rejected")} disabled={approveProjectMutation.isPending}>
                    <ThumbsDown className="h-4 w-4" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsApproveOpen(false); setApprovalNote(""); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <h2 className="text-lg font-semibold">Atividades da Equipe</h2>
      {isStatsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-slate-50 dark:bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">A Fazer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todo}</div>
              <p className="text-xs text-muted-foreground mt-1">Tarefas ainda não iniciadas</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-500 uppercase tracking-wider">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">Sendo executadas agora</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-500 uppercase tracking-wider">Em Revisão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{stats.review}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando verificação</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-500 uppercase tracking-wider">Concluído</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.done}</div>
              <p className="text-xs text-muted-foreground mt-1">Tarefas finalizadas</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Plano de Ação da Obra */}
      <ProjectActionPlan
        projectId={projectId}
        projectName={project?.name ?? "Projeto"}
        members={(allMembers ?? []).map((m) => ({ id: m.id, name: m.name }))}
        canEdit={canEdit}
      />

      {/* Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Participantes</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">Membros da equipe com acesso e responsabilidade neste projeto</p>
            </div>
            {projectMembers && (
              <span className="text-xs text-muted-foreground font-normal">({projectMembers.length})</span>
            )}
          </div>
          {isGestor && (
            <Dialog open={isAddMemberOpen} onOpenChange={(open) => { setIsAddMemberOpen(open); if (!open) setSelectedMemberId(""); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={availableToAdd.length === 0}>
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[380px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Participante</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Membro da equipe</label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um membro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            <span className="flex flex-col">
                              <span className="font-medium">{m.name}</span>
                              <span className="text-xs text-muted-foreground">{m.role}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={onAddMember} disabled={!selectedMemberId || addProjectMember.isPending}>
                    {addProjectMember.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isMembersLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-10 rounded-full" />)}
            </div>
          ) : projectMembers && projectMembers.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {projectMembers.map((pm) => (
                <div key={pm.id} className="group relative flex items-center gap-2 rounded-full border bg-background pl-1 pr-3 py-1 text-sm hover:bg-muted/50 transition-colors">
                  <Avatar className="h-7 w-7 border">
                    {pm.memberAvatarUrl ? (
                      <AvatarImage src={pm.memberAvatarUrl} alt={pm.memberName} />
                    ) : (
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {pm.memberName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="leading-tight">
                    <div className="font-medium text-xs">{pm.memberName}</div>
                    <div className="text-[10px] text-muted-foreground">{pm.memberRole}</div>
                  </div>
                  {isGestor && (
                    <button
                      onClick={() => onRemoveMember(pm.memberId, pm.memberName)}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      title="Remover participante"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Users className="h-4 w-4 opacity-40" />
              <span>{isGestor ? "Nenhum participante. Clique em Adicionar para incluir membros." : "Nenhum participante definido."}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visitas na Obra */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2">
              <MapPin className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle>Visitas na Obra</CardTitle>
              <CardDescription>
                {siteVisits && siteVisits.length > 0
                  ? `${siteVisits.length} visita${siteVisits.length > 1 ? "s" : ""} registrada${siteVisits.length > 1 ? "s" : ""}`
                  : "Nenhuma visita registrada ainda"}
              </CardDescription>
            </div>
          </div>
          {canEdit && (
            <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Visita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Visita na Obra</DialogTitle>
                </DialogHeader>
                <Form {...visitForm}>
                  <form onSubmit={visitForm.handleSubmit(onCreateVisit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={visitForm.control} name="date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Visita</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={visitForm.control} name="responsibleId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">— Sem responsável —</SelectItem>
                              {allMembers?.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={visitForm.control} name="visitors" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quem foi à obra</FormLabel>
                        <FormControl><Input placeholder="Ex.: João Silva, Maria Souza" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={visitForm.control} name="objective" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo da visita</FormLabel>
                        <FormControl><Input placeholder="Ex.: Vistoria de instalação, medição..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={visitForm.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                        <FormControl><Input placeholder="Detalhes adicionais..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button type="submit" disabled={createSiteVisit.isPending}>
                        {createSiteVisit.isPending ? "Salvando..." : "Registrar Visita"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {siteVisits && siteVisits.length > 0 ? (
            <>
              {/* Filter bar */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
                {(
                  [
                    { value: "all", label: "Todas" },
                    { value: "pending", label: "Com pendências" },
                    { value: "completed", label: "Concluídas" },
                    { value: "no_plan", label: "Sem plano de ação" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setVisitFilter(opt.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                      visitFilter === opt.value
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-background text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(() => {
                const filteredVisits = (siteVisits ?? []).filter((v) => {
                  if (visitFilter === "all") return true;
                  if (visitFilter === "pending") return v.pendingActionItemsCount > 0;
                  if (visitFilter === "completed") return v.totalActionItemsCount > 0 && v.pendingActionItemsCount === 0;
                  if (visitFilter === "no_plan") return v.totalActionItemsCount === 0;
                  return true;
                });

                if (filteredVisits.length === 0) {
                  return (
                    <div className="py-10 text-center flex flex-col items-center">
                      <ListFilter className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
                      <p className="text-muted-foreground text-sm">Nenhuma visita corresponde ao filtro selecionado.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Quem foi</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Responsável</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Objetivo</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Observações</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Plano de Ação</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {visit.date ? format(new Date(visit.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{visit.visitors}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {visit.responsibleName ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-100">
                            {visit.responsibleName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-[220px]">
                        <span className="text-foreground">{visit.objective}</span>
                      </td>
                      <td className="px-3 py-3 max-w-[180px]">
                        <span className="text-muted-foreground text-xs">{visit.notes || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        {visit.totalActionItemsCount > 0 ? (
                          visit.pendingActionItemsCount === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Concluído
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-200">
                              <Clock className="h-3 w-3" />
                              {visit.pendingActionItemsCount} pendente{visit.pendingActionItemsCount !== 1 ? "s" : ""}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {visit.reportFileKey && (
                            <span title="Relatório anexado" className="text-muted-foreground">
                              <Camera className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setSelectedVisitId(visit.id)}
                          >
                            Abrir
                          </Button>
                          {canEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteVisit(visit.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <MapPin className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-muted-foreground">Nenhuma visita registrada ainda.</p>
              {canEdit && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsAddVisitOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar primeira visita
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit detail dialog */}
      <VisitDetailDialog
        visit={siteVisits?.find((v) => v.id === selectedVisitId) ?? null}
        projectId={projectId}
        members={(allMembers ?? []).map((m) => ({ id: m.id, name: m.name }))}
        canEdit={canEdit}
        open={selectedVisitId !== null}
        onClose={() => setSelectedVisitId(null)}
      />

      {/* Checklist de instalação — o vão como unidade (agrupado por ambiente, 1 toque) */}
      <ChecklistSection projectId={projectId} canEdit={canEdit} />

      {/* Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="mr-auto">
            <CardTitle>Atividades da Equipe</CardTitle>
            <CardDescription>Atividades internas da equipe vinculadas a este projeto.</CardDescription>
          </div>
          {canEdit && project && (
            <BatchCreateTasks projects={[{ id: project.id, name: project.name }]} defaultProjectId={project.id} />
          )}
          {canEdit && (
            <Dialog open={isCreateTaskOpen} onOpenChange={(open) => {
              setIsCreateTaskOpen(open);
              if (!open) { setEditingTaskId(null); taskForm.reset(); }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Atividade
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingTaskId ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
                </DialogHeader>
                <Form {...taskForm}>
                  <form key={editingTaskId ?? "new"} onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-4">
                    <FormField control={taskForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Atividade</FormLabel>
                        <FormControl><Input placeholder="Ex.: Concretagem fase 1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={taskForm.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl><Input placeholder="Detalhes sobre a tarefa..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={taskForm.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
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
                      )} />
                      <FormField control={taskForm.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="medium">Normal</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={taskForm.control} name="dueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                        {createTask.isPending || updateTask.isPending ? "Salvando..." : editingTaskId ? "Salvar Alterações" : "Criar Atividade"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isTasksLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <CheckSquare className={cn("h-4 w-4 mt-0.5 shrink-0", task.status === "done" ? "text-emerald-500" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-medium text-sm", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</span>
                      <Badge variant="outline" className={cn("text-xs", getTaskStatusColor(task.status))}>
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {task.assigneeName && (
                        <span className="flex items-center gap-1">
                          <HardHat className="h-3 w-3" />
                          {task.assigneeName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.dueDate), "d MMM yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckSquare className="h-3 w-3" />
                          Concluída em {format(new Date(task.completedAt), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      {task.status !== "done" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => toggleTaskDone(task)}
                          disabled={togglingTaskId === task.id}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {togglingTaskId === task.id ? "..." : "Concluir"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleTaskDone(task)}
                          disabled={togglingTaskId === task.id}
                        >
                          {togglingTaskId === task.id ? "..." : "Reabrir"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditTask(task)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <CheckSquare className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-muted-foreground">Nenhuma tarefa ainda.</p>
              {canEdit && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira tarefa
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RDO e Documentos da Obra */}
      <ObraDocuments projectId={projectId} />

      {/* Marcos + Burndown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <ProjectMilestones projectId={projectId} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ProjectBurndown projectId={projectId} />
          </CardContent>
        </Card>
      </div>

      {/* Controle de Materiais */}
      <Card>
        <CardContent className="p-4">
          <ProjectMaterials projectId={projectId} />
        </CardContent>
      </Card>

      {/* Observations */}
      {(() => {
        const userObs = (observations ?? []).filter((o) => !o.text.startsWith("✓ Tarefa concluída:"));

        function renderObsFeed(list: typeof userObs, isSystemFeed: boolean) {
          const sorted = [...list].reverse();
          const items: React.ReactNode[] = [];
          let lastDateLabel = "";

          sorted.forEach((obs) => {
            const d = new Date(obs.createdAt);
            const dateLabel = isToday(d)
              ? "Hoje"
              : isYesterday(d)
              ? "Ontem"
              : format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

            if (dateLabel !== lastDateLabel) {
              lastDateLabel = dateLabel;
              items.push(
                <div key={`sep-${dateLabel}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] font-medium text-muted-foreground px-1 whitespace-nowrap uppercase tracking-wide">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }

            items.push(
              <div key={obs.id} className="flex gap-3 py-2.5">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  isSystemFeed ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-primary/10"
                )}>
                  {isSystemFeed
                    ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    : <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{obs.text}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span className="font-medium">{obs.authorName}</span>
                    <span>·</span>
                    <span>{format(d, "HH:mm")}</span>
                  </div>
                </div>
              </div>
            );
          });

          return items;
        }

        return (
          <>
            {/* User observations */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">Observações</CardTitle>
                    <p className="text-xs text-muted-foreground font-normal">Anotações livres da equipe sobre o andamento do projeto</p>
                  </div>
                  {userObs.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {userObs.length}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escreva uma observação sobre este projeto..."
                      className="min-h-[80px] resize-none text-sm flex-1"
                      value={obsText}
                      onChange={(e) => setObsText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onAddObservation();
                      }}
                    />
                    <Button
                      size="sm"
                      className="self-end"
                      onClick={onAddObservation}
                      disabled={!obsText.trim() || createObservation.isPending}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {userObs.length > 0 ? (
                  <div>{renderObsFeed(userObs, false)}</div>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground opacity-20" />
                    <p className="text-sm text-muted-foreground">Nenhuma observação ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </>
        );
      })()}

      {/* ── Histórico de Fases ── */}
      {phaseHistory && phaseHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Histórico de Fases</CardTitle>
                <p className="text-xs text-muted-foreground font-normal">Registro de todas as mudanças de status do projeto ao longo do tempo</p>
              </div>
              <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {phaseHistory.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...phaseHistory].reverse().map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {h.fromStatus ? (
                      <>
                        <span className="text-xs text-muted-foreground truncate">{STATUS_LABELS[h.fromStatus] ?? h.fromStatus}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground italic">criado</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </>
                    )}
                    <span className="text-xs font-medium text-foreground truncate">{STATUS_LABELS[h.toStatus] ?? h.toStatus}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                    {format(new Date(h.changedAt), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      {activityItems && activityItems.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-sm font-semibold">Histórico de Atividades</CardTitle>
                <p className="text-xs text-muted-foreground font-normal">Linha do tempo de todas as ações realizadas neste projeto</p>
              </div>
              <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {activityItems.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative pl-8 pr-4 py-4">
              <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border" />
              <div className="space-y-4">
                {activityItems.map((item) => {
                  const date = new Date(item.createdAt);
                  const dateLabel = isToday(date)
                    ? `Hoje às ${format(date, "HH:mm")}`
                    : isYesterday(date)
                    ? `Ontem às ${format(date, "HH:mm")}`
                    : format(date, "d MMM yyyy 'às' HH:mm", { locale: ptBR });

                  const dotColor =
                    item.type === "task_completed"
                      ? "bg-emerald-500"
                      : item.type === "task_commented"
                      ? "bg-blue-500"
                      : "bg-slate-400";

                  const Icon =
                    item.type === "task_completed"
                      ? CheckSquare
                      : item.type === "task_commented"
                      ? MessageSquare
                      : Plus;

                  return (
                    <div key={item.id} className="relative flex gap-3 items-start">
                      <div className={`absolute -left-5 mt-0.5 h-4 w-4 rounded-full border-2 border-background ${dotColor} flex items-center justify-center shrink-0`}>
                        <Icon className="h-2 w-2 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{item.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.actorName} · {dateLabel}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
