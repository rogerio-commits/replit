import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  getListTaskCommentsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/react";
import { useIsGestor } from "@/hooks/useAppUser";

interface TaskCommentsProps {
  taskId: number;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { data: comments, isLoading } = useListTaskComments(taskId);
  const createComment = useCreateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const isGestor = useIsGestor();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      await createComment.mutateAsync({ id: taskId, data: { content: newComment.trim() } });
      setNewComment("");
      invalidate();
    } catch {
      toast({ title: "Erro ao adicionar comentário", variant: "destructive" });
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await deleteComment.mutateAsync({ id: taskId, commentId });
      invalidate();
    } catch {
      toast({ title: "Erro ao remover comentário", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="h-4 w-4" />
        <span>Comentários {comments ? `(${comments.length})` : ""}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((c) => {
            const initials = c.authorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const isOwn = user?.emailAddresses?.[0]?.emailAddress === c.authorName || isGestor;
            return (
              <div key={c.id} className="flex gap-3 group">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                    </span>
                    {isOwn && (
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-auto"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhum comentário ainda.</p>
      )}

      <div className="flex gap-2 pt-1">
        <Textarea
          placeholder="Adicionar comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[72px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
      </div>
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!newComment.trim() || createComment.isPending}
        className="w-full"
      >
        {createComment.isPending ? "Enviando..." : "Comentar"}
      </Button>
    </div>
  );
}
