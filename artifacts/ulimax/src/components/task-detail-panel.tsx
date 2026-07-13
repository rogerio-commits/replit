import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskComments } from "@/components/task-comments";
import { TaskTimeEntries } from "@/components/task-time-entries";
import { TaskAttachments } from "@/components/task-attachments";
import { TaskSubtasks } from "@/components/task-subtasks";
import { TaskTags } from "@/components/task-tags";
import { TaskDependencies } from "@/components/task-dependencies";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CheckSquare, Clock, AlertCircle, HardHat, Briefcase } from "lucide-react";

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluído",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Normal",
  high: "Alta",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  projectName?: string | null;
  assigneeName?: string | null;
  createdAt: string;
  tags?: Array<{ id: number; name: string; color: string }>;
}

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailPanel({ task, open, onClose }: TaskDetailPanelProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-start gap-3">
            <CheckSquare className={`h-5 w-5 mt-0.5 shrink-0 ${task.status === "done" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-snug text-left">{task.title}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className={STATUS_COLORS[task.status] ?? "bg-slate-100 text-slate-700"}>
                  {TASK_STATUS_LABELS[task.status] ?? task.status}
                </Badge>
                <Badge variant="outline" className={
                  task.priority === "high" ? "bg-red-50 text-red-700 border-red-200" :
                  task.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-slate-50 text-slate-700 border-slate-200"
                }>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {PRIORITY_LABELS[task.priority] ?? task.priority}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 pb-6">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {task.projectName && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {task.projectName}
                </span>
              )}
              {task.assigneeName && (
                <span className="flex items-center gap-1.5 bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 font-medium">
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

            <TaskTags taskId={task.id} taskTags={task.tags ?? []} />

            <Separator />

            <TaskDependencies taskId={task.id} />

            <Separator />

            {task.description ? (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Descrição</p>
                <MarkdownRenderer content={task.description} />
              </div>
            ) : null}

            {task.description && <Separator />}

            <TaskSubtasks taskId={task.id} />

            <Separator />

            <TaskAttachments entityType="task" entityId={task.id} />

            <Separator />

            <TaskTimeEntries taskId={task.id} />

            <Separator />

            <TaskComments taskId={task.id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
