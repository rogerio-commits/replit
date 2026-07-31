import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListProjectMaterials,
  useCreateProjectMaterial,
  useDeleteProjectMaterial,
  getListProjectMaterialsQueryKey,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Trash2, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  entrada: { label: "Entrada", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: TrendingUp },
  saida: { label: "Saída", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: TrendingDown },
  estoque: { label: "Estoque", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", icon: Layers },
};

interface Props {
  projectId: number;
}

interface FormState {
  name: string;
  unit: string;
  quantity: string;
  type: "entrada" | "saida" | "estoque";
  unitPrice: string;
  date: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  unit: "",
  quantity: "",
  type: "entrada",
  unitPrice: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function ProjectMaterials({ projectId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: materials, isLoading } = useListProjectMaterials(projectId, {
    query: { queryKey: getListProjectMaterialsQueryKey(projectId) },
  });

  const create = useCreateProjectMaterial({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListProjectMaterialsQueryKey(projectId) });
        toast({ title: "Material registrado" });
        setOpen(false);
        setForm(EMPTY_FORM);
      },
      onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
    },
  });

  const del = useDeleteProjectMaterial({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListProjectMaterialsQueryKey(projectId) });
        toast({ title: "Registro removido" });
      },
    },
  });

  const summary = useMemo(() => {
    if (!materials) return { totalEntrada: 0, totalSaida: 0, totalValue: 0 };
    const totalEntrada = materials.filter((m) => (m.type as string) === "entrada").reduce((s, m) => s + m.quantity, 0);
    const totalSaida = materials.filter((m) => (m.type as string) === "saida").reduce((s, m) => s + m.quantity, 0);
    const totalValue = materials.reduce((s, m) => {
      if (m.unitPrice != null) return s + m.quantity * m.unitPrice;
      return s;
    }, 0);
    return { totalEntrada, totalSaida, totalValue };
  }, [materials]);

  function handleSubmit() {
    const qty = Number(form.quantity);
    if (!form.name.trim() || !form.unit.trim() || isNaN(qty) || qty <= 0 || !form.date) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    create.mutate({
      id: projectId,
      data: {
        name: form.name.trim(),
        unit: form.unit.trim(),
        quantity: qty,
        type: form.type,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
        date: form.date,
        notes: form.notes.trim() || undefined,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <div>
            <span className="font-semibold text-foreground">Controle de Materiais</span>
            <p className="text-xs text-muted-foreground font-normal">Entradas, saídas e estoque de materiais utilizados no projeto</p>
          </div>
          {materials && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {materials.length}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Registrar
        </Button>
      </div>

      {/* Summary cards */}
      {materials && materials.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-3">
            <p className="text-xs text-muted-foreground">Total Entradas</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{summary.totalEntrada.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-900/10 p-3">
            <p className="text-xs text-muted-foreground">Total Saídas</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{summary.totalSaida.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-lg font-bold text-primary">
              {summary.totalValue > 0
                ? summary.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : materials && materials.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Material</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qtd</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Data</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Valor unit.</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {materials.map((m) => {
                const meta = TYPE_META[(m.type ?? "entrada") as string] ?? TYPE_META.entrada;
                const TypeIcon = meta.icon;
                return (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors bg-card">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{m.name}</div>
                      {m.notes && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{m.notes}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", meta.bg, meta.color)}>
                        <TypeIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-foreground">
                      {m.quantity} <span className="text-muted-foreground text-xs">{m.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {format(parseISO(m.date), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                      {m.unitPrice != null
                        ? m.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => del.mutate({ id: m.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg bg-muted/20">
          Nenhum material registrado ainda. <br />
          Clique em <strong>Registrar</strong> para adicionar.
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome do material *</label>
              <Input
                placeholder="Ex: Cimento Portland"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Unidade *</label>
                <Input
                  placeholder="Ex: sacos, m², kg"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo *</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as FormState["type"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="estoque">Estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantidade *</label>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valor unitário (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data *</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                placeholder="Fornecedor, nota fiscal, local de armazenamento..."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
