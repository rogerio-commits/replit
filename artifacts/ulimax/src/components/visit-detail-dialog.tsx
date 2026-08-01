import { useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAttachVisitReport,
  useListVisitActionItems,
  useCreateVisitActionItem,
  useToggleVisitActionItem,
  useDeleteVisitActionItem,
  getListVisitActionItemsQueryKey,
  getListSiteVisitsQueryKey,
} from "@workspace/api-client-react";
import type { SiteVisit } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Eye,
  FileText,
  Upload,
  Trash2,
  Plus,
  Check,
  Loader2,
  User,
  Target,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Member {
  id: number;
  name: string;
}

interface Props {
  visit: SiteVisit | null;
  projectId: number;
  members: Member[];
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
}

export function VisitDetailDialog({ visit, projectId, members, canEdit, open, onClose }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemResponsible, setNewItemResponsible] = useState("none");
  const [newItemDue, setNewItemDue] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const visitId = visit?.id ?? 0;

  const { data: actionItems, isLoading: itemsLoading } = useListVisitActionItems(projectId, visitId, {
    query: { enabled: !!visit, queryKey: getListVisitActionItemsQueryKey(projectId, visitId) },
  });

  const attachReport = useAttachVisitReport();
  const createItem = useCreateVisitActionItem();
  const toggleItem = useToggleVisitActionItem();
  const deleteItem = useDeleteVisitActionItem();

  const invalidateItems = () =>
    qc.invalidateQueries({ queryKey: getListVisitActionItemsQueryKey(projectId, visitId) });
  const invalidateVisits = () =>
    qc.invalidateQueries({ queryKey: getListSiteVisitsQueryKey(projectId) });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !visit) return;
    setUploading(true);
    try {
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

      await attachReport.mutateAsync({ id: projectId, visitId: visit.id, data: { reportFileKey: objectPath } });
      invalidateVisits();
      toast({ title: "Relatório anexado com sucesso" });
    } catch (err) {
      toast({ title: "Erro ao enviar", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveReport() {
    if (!visit) return;
    await attachReport.mutateAsync({ id: projectId, visitId: visit.id, data: { reportFileKey: null } });
    invalidateVisits();
    toast({ title: "Relatório removido" });
  }

  async function handleAddItem() {
    if (!newItemDesc.trim() || !visit) return;
    setAddingItem(true);
    try {
      await createItem.mutateAsync({
        id: projectId,
        visitId: visit.id,
        data: {
          description: newItemDesc.trim(),
          responsibleId: newItemResponsible !== "none" ? Number(newItemResponsible) : undefined,
          dueDate: newItemDue || undefined,
        },
      });
      invalidateItems();
      setNewItemDesc("");
      setNewItemResponsible("none");
      setNewItemDue("");
    } catch {
      toast({ title: "Erro ao adicionar item", variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  }

  async function handleToggle(itemId: number) {
    await toggleItem.mutateAsync({ itemId });
    invalidateItems();
  }

  async function handleDeleteItem(itemId: number) {
    await deleteItem.mutateAsync({ itemId });
    invalidateItems();
  }

  if (!visit) return null;

  const reportUrl = visit.reportFileKey
    ? `${BASE}/api/storage${visit.reportFileKey}`
    : null;

  const pendingItems = (actionItems ?? []).filter((i) => !i.completedAt);
  const doneItems = (actionItems ?? []).filter((i) => i.completedAt);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-orange-500" />
            Visita — {visit.date
              ? format(new Date(visit.date + "T00:00:00"), "dd 'de' MMMM yyyy", { locale: ptBR })
              : "—"}
          </DialogTitle>
        </DialogHeader>

        {/* Visit details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Eye className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Quem foi</p>
              <p className="font-medium">{visit.visitors}</p>
            </div>
          </div>
          {visit.responsibleName && (
            <div className="flex items-start gap-2">
              <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Responsável</p>
                <Badge variant="outline" className="text-orange-700 border-orange-200 bg-orange-50">
                  {visit.responsibleName}
                </Badge>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 col-span-2">
            <Target className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Objetivo</p>
              <p>{visit.objective}</p>
            </div>
          </div>
          {visit.notes && (
            <div className="flex items-start gap-2 col-span-2">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Observações</p>
                <p className="text-muted-foreground">{visit.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Report PDF */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-red-500" />
              Relatório de Visita (PDF)
            </div>
            {canEdit && !reportUrl && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {uploading ? "Enviando..." : "Anexar PDF"}
                </Button>
              </>
            )}
          </div>

          {reportUrl ? (
            <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2">
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Abrir relatório
              </a>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={handleRemoveReport}
                  title="Remover relatório"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {canEdit
                ? "Nenhum relatório anexado. Use o botão acima para enviar o PDF gerado no seu aplicativo."
                : "Nenhum relatório anexado."}
            </p>
          )}
        </div>

        {/* Action plan */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Check className="h-4 w-4 text-primary" />
            Plano de Ação
            {actionItems && actionItems.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {doneItems.length}/{actionItems.length} concluídos
              </span>
            )}
          </div>

          {itemsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-1.5">
              {pendingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group rounded-md border bg-background px-3 py-2">
                  <button
                    onClick={() => handleToggle(item.id)}
                    disabled={!canEdit}
                    className={cn(
                      "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                      "border-muted-foreground/40 hover:border-primary"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.responsibleName && (
                        <span className="text-xs text-muted-foreground">{item.responsibleName}</span>
                      )}
                      {item.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          até {format(new Date(item.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}

              {doneItems.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer select-none py-1">
                    {doneItems.length} item(s) concluído(s)
                  </summary>
                  <div className="space-y-1.5 mt-1.5">
                    {doneItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group rounded-md border bg-muted/30 px-3 py-2">
                        <button
                          onClick={() => handleToggle(item.id)}
                          disabled={!canEdit}
                          className="h-4 w-4 shrink-0 rounded border-2 border-primary bg-primary flex items-center justify-center"
                        >
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </button>
                        <p className="text-sm text-muted-foreground line-through flex-1">{item.description}</p>
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {pendingItems.length === 0 && doneItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  Nenhum item de ação ainda.{" "}
                  {canEdit ? "Adicione pontos levantados na visita que precisam de acompanhamento." : ""}
                </p>
              )}
            </div>
          )}

          {/* Add item form */}
          {canEdit && (
            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground">Novo item de ação</p>
              <Input
                placeholder="Descreva o ponto de ação..."
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newItemDesc.trim()) handleAddItem(); }}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newItemResponsible} onValueChange={setNewItemResponsible}>
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem responsável —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newItemDue}
                  onChange={(e) => setNewItemDue(e.target.value)}
                  className="text-sm h-8"
                  title="Prazo"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddItem}
                disabled={!newItemDesc.trim() || addingItem}
                className="w-full"
              >
                {addingItem ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Adicionar item
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
