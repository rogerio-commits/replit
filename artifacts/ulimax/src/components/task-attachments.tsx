import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAttachments,
  useCreateAttachment,
  useDeleteAttachment,
  useRequestUploadUrl,
  getListAttachmentsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Paperclip, Trash2, Download, Upload, Camera } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";
import { useUser } from "@clerk/react";

interface TaskAttachmentsProps {
  entityType: "task" | "project";
  entityId: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  return "📎";
}

export function TaskAttachments({ entityType, entityId }: TaskAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments, isLoading } = useListAttachments({ entityType, entityId });
  const requestUploadUrl = useRequestUploadUrl();
  const createAttachment = useCreateAttachment();
  const deleteAttachment = useDeleteAttachment();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isGestor = useIsGestor();
  const { user } = useUser();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAttachmentsQueryKey({ entityType, entityId }) });

  const handleUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande (máx 20MB)", variant: "destructive" });
      return;
    }
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      await createAttachment.mutateAsync({
        data: {
          entityType,
          entityId,
          filename: objectPath,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });
      invalidate();
      toast({ title: "Arquivo enviado com sucesso" });
    } catch {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAttachment.mutateAsync({ id });
      invalidate();
      toast({ title: "Anexo removido" });
    } catch {
      toast({ title: "Erro ao remover anexo", variant: "destructive" });
    }
  };

  const handleDownload = (filename: string, originalName: string) => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const objectPath = filename.startsWith("/objects/") ? filename.slice(1) : filename;
    const url = `${basePath}/api/storage/${objectPath}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    a.click();
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isUploading = requestUploadUrl.isPending || createAttachment.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Paperclip className="h-4 w-4" />
          <span>Anexos {attachments ? `(${attachments.length})` : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 sm:hidden"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="h-3.5 w-3.5" />
            Foto
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-3.5 w-3.5" />
            {isUploading ? "Enviando..." : "Enviar"}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : attachments && attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-md border bg-muted/30 group">
              <span className="text-lg shrink-0">{getFileIcon(a.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{a.originalName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(a.sizeBytes)} · {a.uploaderName} · {format(new Date(a.createdAt), "dd/MM/yy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  className="p-2 -m-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => handleDownload(a.filename, a.originalName)}
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </button>
                {(isGestor || a.uploaderName === user?.emailAddresses?.[0]?.emailAddress) && (
                  <button
                    className="p-2 -m-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleDelete(a.id)}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhum anexo ainda.</p>
      )}
    </div>
  );
}
