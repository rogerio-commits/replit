import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAttachments,
  useCreateAttachment,
  useDeleteAttachment,
  getListAttachmentsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Upload,
  Trash2,
  Download,
  Image,
  FileText,
  File,
  ZoomIn,
  X,
  Loader2,
  Camera,
  Folder,
} from "lucide-react";
import { useIsGestor } from "@/hooks/useAppUser";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

interface ProjectFilesProps {
  projectId: number;
  mode?: "photos" | "files" | "all";
}

export function ProjectFiles({ projectId, mode = "all" }: ProjectFilesProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isGestor = useIsGestor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: attachments, isLoading } = useListAttachments({
    entityType: "project",
    entityId: projectId,
  });

  const createAttachment = useCreateAttachment();
  const deleteAttachment = useDeleteAttachment();

  const photos = (attachments ?? []).filter((a) => a.mimeType.startsWith("image/"));
  const docs = (attachments ?? []).filter((a) => !a.mimeType.startsWith("image/"));

  const displayed = mode === "photos" ? photos : mode === "files" ? docs : attachments ?? [];

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAttachmentsQueryKey({ entityType: "project", entityId: projectId }) });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const urlResp = await fetch(`${BASE}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!urlResp.ok) throw new Error("Falha ao obter URL de upload");
        const { uploadURL, objectPath } = await urlResp.json();

        const uploadResp = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResp.ok) throw new Error("Falha ao enviar arquivo");

        await createAttachment.mutateAsync({
          data: {
            entityType: "project",
            entityId: projectId,
            filename: objectPath,
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          },
        });
      }
      toast({ title: "Arquivo(s) enviado(s) com sucesso" });
      invalidate();
    } catch (err) {
      toast({ title: "Erro ao enviar", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteAttachment.mutateAsync({ id });
      toast({ title: "Arquivo removido" });
      invalidate();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const accept =
    mode === "photos"
      ? "image/*"
      : mode === "files"
      ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.dwg,.dxf"
      : "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.dwg,.dxf";

  const emptyLabel =
    mode === "photos"
      ? "Nenhuma foto adicionada"
      : mode === "files"
      ? "Nenhum arquivo adicionado"
      : "Nenhum arquivo";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {displayed.length} {displayed.length === 1 ? "item" : "itens"}
        </span>
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          {mode !== "files" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 sm:hidden"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Foto
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Enviando..." : "Upload"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2 border border-dashed rounded-lg">
          {mode === "photos" ? <Camera className="h-8 w-8 opacity-20" /> : <Folder className="h-8 w-8 opacity-20" />}
          <p className="text-sm">{emptyLabel}</p>
          <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-xs gap-1">
            <Upload className="h-3.5 w-3.5" />
            Fazer upload
          </Button>
        </div>
      ) : mode === "photos" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {displayed.map((a) => (
            <div key={a.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/20">
              <img
                src={`${BASE}/api/storage/objects${a.filename}`}
                alt={a.originalName}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightboxSrc(`${BASE}/api/storage/objects${a.filename}`)}
                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3C/svg%3E"; }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  className="p-1.5 bg-white/90 rounded-full text-foreground hover:bg-white"
                  onClick={() => setLightboxSrc(`${BASE}/api/storage/objects${a.filename}`)}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <a
                  href={`${BASE}/api/storage/objects${a.filename}`}
                  download={a.originalName}
                  className="p-1.5 bg-white/90 rounded-full text-foreground hover:bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                {isGestor && (
                  <button
                    className="p-1.5 bg-red-500/90 rounded-full text-white hover:bg-red-600"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {a.originalName}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {displayed.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="shrink-0">{fileIcon(a.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.originalName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(a.sizeBytes)} · {a.uploaderName} · {format(new Date(a.createdAt), "dd MMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`${BASE}/api/storage/objects${a.filename}`}
                  download={a.originalName}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </a>
                {isGestor && (
                  <button
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remover"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={() => setLightboxSrc(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0">
          <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
          <button
            className="absolute top-2 right-2 z-10 p-1.5 bg-white/20 rounded-full text-white hover:bg-white/40"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="Visualização"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
