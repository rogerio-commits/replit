import { useState, type ReactNode } from "react";
import {
  useCreateProjectActionPlan,
  useCreateProjectActionItem,
  useListMembers,
  getListActionPlanSummariesQueryKey,
  getListProjectActionPlansQueryKey,
  getListChaseItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Cria um plano de ação (conjunto de tarefas da obra) já com a primeira tarefa,
 * para o plano nascer "ativo". Pode ser disparado de qualquer lugar (selo de
 * plano na lista de projetos, portfólio, detalhe da obra, cobranças).
 */
export function NewActionPlanDialog({
  projectId,
  projectName,
  trigger,
}: {
  projectId: number;
  projectName?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [responsibleId, setResponsibleId] = useState("none");
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: members } = useListMembers();
  const createPlan = useCreateProjectActionPlan();
  const createItem = useCreateProjectActionItem();

  const saving = createPlan.isPending || createItem.isPending;

  async function handleSubmit() {
    if (!title.trim() || !desc.trim()) {
      toast({ title: "Preencha o título do plano e a primeira tarefa", variant: "destructive" });
      return;
    }
    try {
      const plan = await createPlan.mutateAsync({ id: projectId, data: { title: title.trim() } });
      await createItem.mutateAsync({
        planId: plan.id,
        data: {
          description: desc.trim(),
          responsibleId: responsibleId !== "none" ? Number(responsibleId) : undefined,
          dueDate: dueDate || undefined,
        },
      });
      toast({ title: "Plano de ação criado" });
      qc.invalidateQueries({ queryKey: getListActionPlanSummariesQueryKey() });
      qc.invalidateQueries({ queryKey: getListProjectActionPlansQueryKey(projectId) });
      qc.invalidateQueries({ queryKey: getListChaseItemsQueryKey() });
      setOpen(false);
      setTitle(""); setDesc(""); setDueDate(""); setResponsibleId("none");
    } catch {
      toast({ title: "Erro ao criar o plano de ação", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Criar plano de ação{projectName ? ` — ${projectName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título do plano</label>
            <Input placeholder="Ex.: Ajustes pós-instalação" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primeira tarefa</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">O que precisa ser feito</label>
              <Input placeholder="Ex.: Ajustar porta do armário" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prazo (opcional)</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsável (opcional)</label>
                <Select value={responsibleId} onValueChange={setResponsibleId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Criando..." : "Criar plano"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
