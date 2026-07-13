import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListObraDiary,
  useCreateObraDiaryEntry,
  useDeleteObraDiaryEntry,
  getListObraDiaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Trash2,
  Cloud,
  Users,
  ClipboardList,
  AlertCircle,
  StickyNote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WEATHER_OPTIONS = ["Ensolarado", "Parcialmente nublado", "Nublado", "Chuvoso", "Tempestade", "Frio"];

interface Props {
  projectId: number;
}

const FIELD_LABELS = [
  { key: "activities", label: "Atividades executadas", icon: ClipboardList, required: true },
  { key: "observations", label: "Observações", icon: StickyNote, required: false },
  { key: "incidents", label: "Ocorrências / Problemas", icon: AlertCircle, required: false },
];

export function ProjectObraDiary({ projectId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weather: "",
    teamCount: "",
    activities: "",
    observations: "",
    incidents: "",
  });

  const { data: entries, isLoading } = useListObraDiary(projectId, {
    query: { queryKey: getListObraDiaryQueryKey(projectId) },
  });

  const create = useCreateObraDiaryEntry({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListObraDiaryQueryKey(projectId) });
        toast({ title: "Registro adicionado" });
        setOpen(false);
        setForm({ date: new Date().toISOString().slice(0, 10), weather: "", teamCount: "", activities: "", observations: "", incidents: "" });
      },
      onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
    },
  });

  const del = useDeleteObraDiaryEntry({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListObraDiaryQueryKey(projectId) });
        toast({ title: "Registro removido" });
      },
    },
  });

  function handleSubmit() {
    if (!form.activities.trim()) {
      toast({ title: "Atividades são obrigatórias", variant: "destructive" });
      return;
    }
    create.mutate({
      id: projectId,
      data: {
        date: form.date,
        weather: form.weather || undefined,
        teamCount: form.teamCount ? Number(form.teamCount) : undefined,
        activities: form.activities.trim(),
        observations: form.observations.trim() || undefined,
        incidents: form.incidents.trim() || undefined,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">Diário de Obra</span>
          {entries && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo Registro
        </Button>
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">
                        {format(parseISO(entry.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      {entry.weather && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Cloud className="h-3 w-3" /> {entry.weather}
                        </span>
                      )}
                      {entry.teamCount !== null && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {entry.teamCount} pessoas
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.activities}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t bg-muted/10 space-y-3">
                    {FIELD_LABELS.map(({ key, label, icon: Icon }) => {
                      const val = entry[key as keyof typeof entry];
                      if (!val) return null;
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                            <Icon className="h-3.5 w-3.5" /> {label}
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-line">{String(val)}</p>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {entry.authorName ? `Registrado por ${entry.authorName}` : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7"
                        onClick={() => del.mutate({ id: entry.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg bg-muted/20">
          Nenhum registro no diário ainda. <br />
          Clique em <strong>Novo Registro</strong> para começar.
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Registro de Obra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Efetivo (pessoas)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 8"
                  value={form.teamCount}
                  onChange={(e) => setForm((f) => ({ ...f, teamCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Clima</label>
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, weather: f.weather === w ? "" : w }))}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-colors",
                      form.weather === w
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border text-muted-foreground",
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Atividades executadas *</label>
              <Textarea
                placeholder="Descreva as atividades realizadas hoje..."
                rows={3}
                value={form.activities}
                onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                placeholder="Observações gerais, condições do local, etc."
                rows={2}
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ocorrências / Problemas</label>
              <Textarea
                placeholder="Acidentes, imprevistos, faltas de material..."
                rows={2}
                value={form.incidents}
                onChange={(e) => setForm((f) => ({ ...f, incidents: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "Salvando..." : "Salvar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
