import { useState } from "react";
import { format } from "date-fns";
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

const taskSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
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
    // If we're creating
    if (editingTask === null) {
      createTask.mutate({ data: {
        ...data,
        assignedTo: data.assignedTo || undefined
      }}, {
        onSuccess: () => {
          toast({ title: "Task created successfully" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setIsCreateOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to create task", variant: "destructive" });
        }
      });
    } else {
      updateTask.mutate({ id: editingTask, data: {
        ...data,
        assignedTo: data.assignedTo || undefined
      }}, {
        onSuccess: () => {
          toast({ title: "Task updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setIsCreateOpen(false);
          setEditingTask(null);
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to update task", variant: "destructive" });
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
        toast({ title: "Task deleted" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete task", variant: "destructive" });
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage deliverables across all projects.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
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
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? field.value.toString() : undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
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
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Concrete pouring phase 1" {...field} />
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? field.value.toString() : undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
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
                        <FormLabel>Due Date</FormLabel>
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
                    {createTask.isPending || updateTask.isPending ? "Saving..." : (editingTask ? "Update Task" : "Create Task")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
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
                            {task.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className={`font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="capitalize">{task.priority} Priority</span>
                          </span>
                          {task.projectName && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {task.projectName}
                            </span>
                          )}
                          {task.assigneeName && (
                            <span className="flex items-center gap-1">
                              <HardHat className="h-3.5 w-3.5" />
                              {task.assigneeName}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
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
                            <DialogTitle>Delete Task</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            Are you sure you want to delete this task? This action cannot be undone.
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={() => handleDelete(task.id)} disabled={deleteTask.isPending}>
                              {deleteTask.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center border border-dashed rounded-md bg-muted/20">
              <CheckSquare className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No tasks found</h3>
              <p className="text-muted-foreground mt-1">
                {search || statusFilter !== "all" || projectFilter !== "all"
                  ? "Try adjusting your filters" 
                  : "Get started by creating a new task"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
