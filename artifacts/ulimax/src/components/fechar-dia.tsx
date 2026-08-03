import { useMemo, useState } from "react";
import {
  useListAllSiteVisits,
  useListTasks,
  useListChaseItems,
  useListAllChecklistItems,
  useListObraDiary,
  useCreateObraDiaryEntry,
  getListObraDiaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Moon, FileText, CheckCircle2 } from "lucide-react";

// ── Fechar o dia (RDO automático) ────────────────────────────────────────────
// Padrão Procore Daily Log: o diário não é um formulário em branco no fim do
// dia — o app monta o rascunho com o que aconteceu hoje (visitas, tarefas
// concluídas, pendências abertas, situação da instalação) e o gestor só revisa
// e confirma. Vira uma entrada do Diário de Obra do projeto.

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ObraDoDia {
  projectId: number;
  projectName: string;
  linhas: string[];
}

export function FecharDia() {
  const today = hoje();
  const { data: visits } = useListAllSiteVisits();
  const { data: tasks } = useListTasks();
  const { data: chase } = useListChaseItems();
  const { data: checklist } = useListAllChecklistItems();
  const [obraAberta, setObraAberta] = useState<ObraDoDia | null>(null);

  const obras = useMemo(() => {
    const map = new Map<number, ObraDoDia>();
    const get = (id: number, name: string) => {
      let o = map.get(id);
      if (!o) {
        o = { projectId: id, projectName: name, linhas: [] };
        map.set(id, o);
      }
      return o;
    };

    for (const v of visits ?? []) {
      if (v.date !== today) continue;
      get(v.projectId, v.projectName).linhas.push(
        `Visita realizada — ${v.objective}${v.responsibleName ? ` (${v.responsibleName})` : ""}. Presentes: ${v.visitors}.`,
      );
    }
    for (const t of tasks ?? []) {
      if (!t.completedAt || t.completedAt.slice(0, 10) !== today) continue;
      if (!t.projectName) continue;
      get(t.projectId, t.projectName).linhas.push(`Tarefa concluída: ${t.title}.`);
    }
    for (const c of chase ?? []) {
      if (c.createdAt.slice(0, 10) !== today || !c.projectName) continue;
      const resp = c.responsibleName ?? c.responsibleExternal;
      get(c.projectId, c.projectName).linhas.push(
        `Pendência aberta: ${c.description}${resp ? ` (resp.: ${resp})` : ""}.`,
      );
    }

    // Situação da instalação entra como contexto nas obras que já têm atividade
    const byProject = new Map<number, { total: number; instaladas: number }>();
    for (const item of checklist ?? []) {
      const e = byProject.get(item.projectId) ?? { total: 0, instaladas: 0 };
      e.total++;
      if (item.status !== "nao_instalado") e.instaladas++;
      byProject.set(item.projectId, e);
    }
    for (const o of map.values()) {
      const c = byProject.get(o.projectId);
      if (c && c.total > 0) o.linhas.push(`Instalação: ${c.instaladas}/${c.total} esquadrias instaladas.`);
    }

    return [...map.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [visits, tasks, chase, checklist, today]);

  if (obras.length === 0) return null;

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Moon className="h-4 w-4 text-indigo-500" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-tight">Fechar o dia</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">O RDO já está montado com o que você registrou hoje — só revisar e confirmar</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{obras.length} obra{obras.length > 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-border">
          {obras.map((o) => (
            <div key={o.projectId} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{o.projectName}</p>
                <p className="text-xs text-muted-foreground truncate">{o.linhas.length} registro{o.linhas.length > 1 ? "s" : ""} hoje</p>
              </div>
              <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setObraAberta(o)}>
                <FileText className="h-3.5 w-3.5" /> Gerar RDO
              </Button>
            </div>
          ))}
        </div>
      </div>

      {obraAberta && (
        <RdoDialog obra={obraAberta} today={today} onClose={() => setObraAberta(null)} />
      )}
    </>
  );
}

function RdoDialog({ obra, today, onClose }: { obra: ObraDoDia; today: string; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: diary, isLoading } = useListObraDiary(obra.projectId, {
    query: { queryKey: getListObraDiaryQueryKey(obra.projectId) },
  });
  const createEntry = useCreateObraDiaryEntry();

  const [activities, setActivities] = useState(obra.linhas.map((l) => `• ${l}`).join("\n"));
  const [weather, setWeather] = useState("");
  const [teamCount, setTeamCount] = useState("");
  const [observations, setObservations] = useState("");

  const jaFechado = (diary ?? []).some((d) => d.date === today);

  function handleSave() {
    if (!activities.trim()) {
      toast({ title: "Descreva as atividades do dia", variant: "destructive" });
      return;
    }
    createEntry.mutate(
      {
        id: obra.projectId,
        data: {
          date: today,
          activities: activities.trim(),
          weather: weather.trim() || undefined,
          teamCount: teamCount ? Number(teamCount) : undefined,
          observations: observations.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "RDO registrado no Diário de Obra" });
          qc.invalidateQueries({ queryKey: getListObraDiaryQueryKey(obra.projectId) });
          onClose();
        },
        onError: () => toast({ title: "Erro ao registrar o RDO", variant: "destructive" }),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>RDO de hoje — {obra.projectName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : (
          <div className="space-y-3">
            {jaFechado && (
              <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Já existe um RDO de hoje para esta obra — salvar cria um registro adicional.
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Atividades do dia (montado automaticamente)</label>
              <Textarea rows={7} value={activities} onChange={(e) => setActivities(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Clima (opcional)</label>
                <Input placeholder="Ex.: sol, chuva à tarde" value={weather} onChange={(e) => setWeather(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Equipe em obra (opcional)</label>
                <Input type="number" min={0} placeholder="nº de pessoas" value={teamCount} onChange={(e) => setTeamCount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={createEntry.isPending}>
            {createEntry.isPending ? "Salvando..." : "Confirmar RDO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
