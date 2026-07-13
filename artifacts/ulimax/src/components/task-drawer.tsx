import { useState } from "react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Info,
  Trash2,
  Send,
  Loader2,
  User,
  Calendar,
  Flag,
  Briefcase,
} from "lucide-react";
import {
  useListTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  getListTaskCommentsQueryKey,
  getListTaskCommentsQueryOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  done: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  medium: "text-amber-500",
  high: "text-rose-500",
};

export interface TaskForDrawer {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  dueDate?: string | null;
  projectId?: number | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
  projectName?: string | null;
}

interface TaskDrawerProps {
  task: TaskForDrawer | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDrawer({ task, open, onClose }: TaskDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const taskId = task?.id ?? 0;

  const { data: comments, isLoading: commentsLoading } = useListTaskComments(taskId, {
    query: { enabled: open && taskId > 0, queryKey: getListTaskCommentsQueryKey(taskId) },
  });

  const createComment = useCreateTaskComment({
    mutation: {
      onSuccess: () => {
        setCommentText("");
        void queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
      },
      onError: () => toast({ title: "Erro ao enviar comentário", variant: "destructive" }),
    },
  });

  const deleteComment = useDeleteTaskComment({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
      },
      onError: () => toast({ title: "Erro ao excluir comentário", variant: "destructive" }),
    },
  });

  function handleSubmitComment() {
    if (!commentText.trim() || !task) return;
    createComment.mutate({ id: taskId, data: { content: commentText.trim() } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
  }

  if (!task) return null;

  const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== "done";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-base font-semibold leading-snug pr-6">
            {task.title}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={cn("text-xs", STATUS_COLORS[task.status] ?? "")}>
              {STATUS_LABELS[task.status] ?? task.status}
            </Badge>
            {task.priority && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  PRIORITY_COLORS[task.priority] ?? "text-muted-foreground",
                )}
              >
                <Flag className="h-3 w-3" />
                {PRIORITY_LABELS[task.priority] ?? task.priority}
              </span>
            )}
            {dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-rose-500 font-medium" : "text-muted-foreground",
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(dueDate, "dd/MM/yyyy")}
                {isOverdue && " · atrasada"}
              </span>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 h-9 rounded-md grid grid-cols-2 w-auto self-start shrink-0">
            <TabsTrigger value="details" className="flex items-center gap-1.5 text-xs px-4">
              <Info className="h-3.5 w-3.5" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-1.5 text-xs px-4">
              <MessageSquare className="h-3.5 w-3.5" />
              Comentários
              {comments && comments.length > 0 && (
                <span className="ml-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full px-1.5 leading-4">
                  {comments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
            <div className="space-y-5">
              {task.description ? (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Descrição
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {task.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sem descrição</p>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                {task.assigneeName && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Responsável
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {task.assigneeName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-foreground text-sm">{task.assigneeName}</span>
                    </div>
                  </div>
                )}
                {task.projectName && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Projeto
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground text-sm truncate">{task.projectName}</span>
                    </div>
                  </div>
                )}
                {!task.assigneeName && task.assigneeId && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Responsável
                    </p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-sm">Membro #{task.assigneeId}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="flex-1 flex flex-col overflow-hidden mt-0">
            <ScrollArea className="flex-1 px-6 py-4">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !comments?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhum comentário ainda</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Seja o primeiro a comentar</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {comments.map((comment) => (
                    <div key={comment.id} className="group flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {comment.authorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(parseISO(comment.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              deleteComment.mutate({ id: taskId, commentId: comment.id })
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                            title="Excluir comentário"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mt-1">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="px-6 py-4 border-t border-border shrink-0">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva um comentário… (Ctrl+Enter para enviar)"
                  className="resize-none text-sm min-h-[68px] flex-1"
                  rows={2}
                />
                <Button
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || createComment.isPending}
                  title="Enviar (Ctrl+Enter)"
                >
                  {createComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                Ctrl+Enter para enviar
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
