import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAttachVisitReport,
  getListSiteVisitsQueryKey,
  getListAllSiteVisitsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dica } from "@/components/dica";
import { FileText, Upload, Loader2 } from "lucide-react";

// ── RDO da visita, direto na linha ───────────────────────────────────────────
// Toda visita realizada deve ter um RDO (arquivo feito fora, ex.: PDF com fotos
// e comentários). Aqui anexa (upload → reportFileKey) ou baixa. Usado na página
// do projeto e nas abas de Obras — por isso invalida as duas listas de visitas.

export function VisitRdoActions({
  visit, projectId, canEdit,
}: {
  visit: { id: number; reportFileKey?: string | null };
  projectId: number;
  canEdit: boolean;
}) {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { toast } = useToast();
  const qc = useQueryClient();
  const attachReport = useAttachVisitReport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlResp = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlResp.ok) throw new Error("Falha ao obter URL de upload");
      const { uploadURL, objectPath } = await urlResp.json();
      const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Falha ao enviar arquivo");
      await attachReport.mutateAsync({ id: projectId, visitId: visit.id, data: { reportFileKey: objectPath } });
      toast({ title: "RDO anexado à visita" });
      qc.invalidateQueries({ queryKey: getListSiteVisitsQueryKey(projectId) });
      qc.invalidateQueries({ queryKey: getListAllSiteVisitsQueryKey() });
    } catch (err) {
      toast({ title: "Erro ao anexar RDO", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (visit.reportFileKey) {
    return (
      <Dica texto="Baixa o RDO desta visita — o arquivo com fotos e comentários que você anexou.">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
          <a href={`${BASE}/api/storage${visit.reportFileKey}`} target="_blank" rel="noopener noreferrer">
            <FileText className="h-3.5 w-3.5" /> RDO
          </a>
        </Button>
      </Dica>
    );
  }
  if (!canEdit) return null;
  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
      <Dica texto="Anexa o relatório da visita (PDF, DOC ou foto) feito no seu app de vistoria. Toda visita realizada precisa do RDO — sem ele, ela aparece em Pendências.">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={uploading}
          onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Enviando..." : "Anexar RDO"}
        </Button>
      </Dica>
    </>
  );
}
