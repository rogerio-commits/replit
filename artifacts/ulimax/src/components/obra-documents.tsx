import { useState, useRef } from "react";
import {
  useListAttachments,
  useCreateAttachment,
  useDeleteAttachment,
  getListAttachmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";
import { FileText, Upload, Download, Trash2, Loader2, FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Arquivo de documentos da obra: RDO, diários e relatórios de visita feitos em
// outro app, arquivados por projeto. Reaproveita a infra de anexos (Supabase
// Storage) com uma categoria.
const CATEGORIES: { value: string; label: string }[] = [
  { value: "planta", label: "Planta / desenho" },
  { value: "aprovacao", label: "Aprovação do cliente" },
  { value: "rdo", label: "RDO" },
  { value: "diario", label: "Diário de obra" },
  { value: "visita", label: "Relatório de visita" },
  { value: "outro", label: "Outro documento" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const CAT_CHIP: Record<string, string> = {
  planta: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
  aprovacao: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/40",
  rdo: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40",
  diario: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  visita: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40",
  outro: "bg-muted text-muted-foreground border-border",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ObraDocuments({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isGestor = useIsGestor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("rdo");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: attachments, isLoading } = useListAttachments({ entityType: "project", entityId: projectId });
  const createAttachment = useCreateAttachment();
  const deleteAttachment = useDeleteAttachment();

  const docs = (attachments ?? [])
    .filter((a) => !!a.category)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
            category,
          },
        });
      }
      toast({ title: "Documento arquivado" });
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
      toast({ title: "Documento removido" });
      invalidate();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
        <FolderArchive className="h-4 w-4 text-primary" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">RDO e Documentos da Obra</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">Arquive RDOs, diários e relatórios de visita (arquivo feito em outro app)</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : docs.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum documento arquivado ainda. Escolha o tipo e clique em Enviar.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {docs.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{a.originalName}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(a.createdAt)} · {fmtSize(a.sizeBytes)} · {a.uploaderName}</p>
              </div>
              <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", CAT_CHIP[a.category!] ?? CAT_CHIP.outro)}>
                {CAT_LABEL[a.category!] ?? a.category}
              </span>
              <a
                href={`${BASE}/api/storage${a.filename}`}
                download={a.originalName}
                className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Baixar"
              >
                <Download className="h-4 w-4" />
              </a>
              {isGestor && (
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="shrink-0 p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors dark:hover:bg-red-950/30"
                  title="Remover"
                >
                  {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
