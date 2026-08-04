import { useState, useRef, type ReactNode } from "react";
import { useCreateAttachment, getListAttachmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Drop-zone global do projeto ──────────────────────────────────────────────
// A página inteira aceita arquivos: arrastou um PDF/imagem sobre o projeto →
// overlay "Solte para anexar" → UMA pergunta (o que é isto?) → arquivado com
// categoria no acervo de documentos da obra. Mata o "onde eu anexo?".

const CATEGORIES: { value: string; label: string }[] = [
  { value: "planta", label: "Planta / desenho" },
  { value: "aprovacao", label: "Aprovação do cliente" },
  { value: "rdo", label: "RDO" },
  { value: "diario", label: "Diário de obra" },
  { value: "visita", label: "Relatório de visita" },
  { value: "outro", label: "Outro documento" },
];

export function ProjectDropzone({ projectId, children }: { projectId: number; children: ReactNode }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createAttachment = useCreateAttachment();
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const depth = useRef(0);

  function onDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) setPending(files);
  }

  async function uploadAll(category: string) {
    if (!pending) return;
    setUploading(true);
    try {
      for (const file of pending) {
        const urlResp = await fetch(`${BASE}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!urlResp.ok) throw new Error("Falha ao obter URL de upload");
        const { uploadURL, objectPath } = await urlResp.json();
        const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!put.ok) throw new Error("Falha ao enviar arquivo");
        await createAttachment.mutateAsync({
          data: {
            entityType: "project",
            entityId: projectId,
            filename: objectPath,
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            category,
          },
        });
      }
      toast({ title: `Anexado como ${CATEGORIES.find((c) => c.value === category)?.label ?? category}` });
      qc.invalidateQueries({ queryKey: getListAttachmentsQueryKey({ entityType: "project", entityId: projectId }) });
      setPending(null);
    } catch (err) {
      toast({ title: "Erro ao enviar", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="relative"
      onDragEnter={onDragEnter}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}

      {dragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-[2px] pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card px-10 py-8 shadow-xl">
            <UploadCloud className="h-10 w-10 text-primary" />
            <p className="text-sm font-semibold text-foreground">Solte para anexar a este projeto</p>
          </div>
        </div>
      )}

      <Dialog open={pending !== null} onOpenChange={(v) => !v && !uploading && setPending(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>O que é este arquivo?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {pending?.map((f) => f.name).join(", ")}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <Button
                  key={c.value}
                  variant="outline"
                  disabled={uploading}
                  className={cn("h-12 justify-start text-sm", uploading && "opacity-60")}
                  onClick={() => uploadAll(c.value)}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={uploading}>Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
