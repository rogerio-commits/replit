import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  useGetProject, 
  useGetProjectStats,
  useListTasks,
  useUpdateProject,
  useDeleteProject,
  useCreateTask,
  getGetProjectQueryKey,
  getListTasksQueryKey,
  getGetProjectStatsQueryKey,
  getListProjectsQueryKey
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
import { ArrowLeft, Calendar, Edit, Trash2, CheckSquare, Clock, Plus, AlertCircle, HardHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["a_iniciar", "em_projeto", "em_producao", "aguardando_instalacao", "em_instalacao"]),
  priority: z.enum(["low", "medium", "high"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;
type TaskFormValues = z.infer<typeof taskSchema>;

const STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

function getStatusColor(status: string) {
  switch (status) {
    case "a_iniciar": return "bg-slate-500/10 text-slate-600 border-slate-200";
    case "em_projeto": return "bg-violet-500/10 text-violet-600 border-violet-200";
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: stats, isLoading: isStatsLoading } = useGetProjectStats(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectStatsQueryKey(projectId) }
  });

  const { data: tasks, isLoading: isTasksLoading } = useListTasks({ projectId }, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) }
  });

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    values: project ? {
      name: project.name,
      description: project.description || "",
      status: project.status as "a_iniciar" | "em_projeto" | "em_producao" | "aguardando_instalacao" | "em_instalacao",
      priority: project.priority,
      startDate: project.startDate ? project.startDate.split('T')[0] : "",
      endDate: project.endDate ? project.endDate.split('T')[0] : "",
    } : undefined,
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
    },
  });

  const onUpdateProject = (data: ProjectFormValues) => {
    updateProject.mutate({ id: projectId, data }, {
      onSuccess: () => {
        toast({ title: "Project updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsEditOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to update project", variant: "destructive" });
      }
    });
  };

  const onDeleteProject = () => {
    deleteProject.mutate({ id: projectId }, {
      onSuccess: () => {
        toast({ title: "Project deleted" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation("/projects");
      },
      onError: () => {
        toast({ title: "Failed to delete project", variant: "destructive" });
      }
    });
  };

  const onCreateTask = (data: TaskFormValues) => {
    createTask.mutate({ data: { ...data, projectId } }, {
      onSuccess: () => {
        toast({ title: "Task created successfully" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
        setIsCreateTaskOpen(false);
        taskForm.reset();
      },
      onError: () => {
        toast({ title: "Failed to create task", variant: "destructive" });
      }
    });
  };

  if (isProjectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Button className="mt-4" onClick={() => setLocation("/projects")}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground" onClick={() => setLocation("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {STATUS_LABELS[project.status] ?? project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 max-w-3xl">{project.description || "No description provided."}</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                </DialogHeader>
                <Form {...projectForm}>
                  <form onSubmit={projectForm.handleSubmit(onUpdateProject)} className="space-y-4">
                    <FormField
                      control={projectForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Edifício Alpha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={projectForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief overview of the project..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={projectForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="a_iniciar">A Iniciar</SelectItem>
                                <SelectItem value="em_projeto">Em Projeto</SelectItem>
                                <SelectItem value="em_producao">Em Produção</SelectItem>
                                <SelectItem value="aguardando_instalacao">Aguardando Instalação</SelectItem>
                                <SelectItem value="em_instalacao">Em Instalação</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={projectForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={updateProject.isPending}>
                        {updateProject.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  Are you sure you want to delete this project? This action cannot be undone and will delete all associated tasks.
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={onDeleteProject} disabled={deleteProject.isPending}>
                    {deleteProject.isPending ? "Deleting..." : "Delete Project"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-border/50 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className={`h-4 w-4 ${getPriorityColor(project.priority)}`} />
            <span className="font-medium text-foreground capitalize">{project.priority} Priority</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Started: <span className="font-medium text-foreground">{project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'N/A'}</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Target End: <span className="font-medium text-foreground">{project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : 'N/A'}</span></span>
          </div>
        </div>
      </div>

      {isStatsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-slate-50 dark:bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">To Do</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todo}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-500 uppercase tracking-wider">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-500 uppercase tracking-wider">In Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{stats.review}</div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-500 uppercase tracking-wider">Done</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.done}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Project Tasks</CardTitle>
            <CardDescription>All tasks associated with this project.</CardDescription>
          </div>
          <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <Form {...taskForm}>
                <form onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-4">
                  <FormField
                    control={taskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Concrete pouring phase 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={taskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Details about the task..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={taskForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={taskForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createTask.isPending}>
                      {createTask.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isTasksLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="divide-y border border-border rounded-md overflow-hidden">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckSquare className={`h-5 w-5 mt-0.5 ${task.status === 'done' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={`font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                          <AlertCircle className="h-3 w-3" />
                          <span className="capitalize">{task.priority}</span>
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        {task.assigneeName && (
                          <span className="flex items-center gap-1">
                            <HardHat className="h-3 w-3" />
                            {task.assigneeName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={getTaskStatusColor(task.status)}>
                    {task.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground border border-dashed rounded-md">
              No tasks created yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
