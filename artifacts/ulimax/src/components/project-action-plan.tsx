import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectActionPlans,
  useCreateProjectActionPlan,
  useDeleteProjectActionPlan,
  useCreateProjectActionItem,
  useToggleProjectActionItem,
  useDeleteProjectActionItem,
  getListProjectActionPlansQueryKey,
} from "@workspace/api-client-react";
import type { ProjectActionPlan as APlan, ProjectActionItem as AItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileDown,
  Check,
  Loader2,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: number;
  name: string;
}

interface Props {
  projectId: number;
  projectName?: string;
  members: Member[];
  canEdit: boolean;
}

// ── PDF export ────────────────────────────────────────────────────────────────

function exportPlanToPdf(plan: APlan, projectName: string) {
  const logoUrl = `${window.location.origin}/logo-ulimax.png`;
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const pending = plan.items.filter((i) => !i.completedAt);
  const done = plan.items.filter((i) => i.completedAt);

  function itemRow(item: AItem, isDone: boolean) {
    const resp = item.responsibleName ?? item.responsibleExternal ?? "—";
    const due = item.dueDate
      ? format(new Date(item.dueDate + "T00:00:00"), "dd/MM/yyyy")
      : "—";
    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 8px;vertical-align:top;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:16px;height:16px;border-radius:50%;
              background:${isDone ? "#10b981" : "#d1d5db"};
              flex-shrink:0;margin-top:2px;"></span>
            <span style="${isDone ? "text-decoration:line-through;color:#9ca3af;" : ""}font-size:13px;">
              ${escHtml(item.description)}
            </span>
          </div>
          ${item.notes ? `<div style="margin-top:4px;margin-left:22px;font-size:12px;color:#6b7280;">${escHtml(item.notes)}</div>` : ""}
        </td>
        <td style="padding:10px 8px;font-size:12px;color:#374151;white-space:nowrap;">${escHtml(resp)}</td>
        <td style="padding:10px 8px;font-size:12px;color:#374151;white-space:nowrap;">${due}</td>
        <td style="padding:10px 8px;text-align:center;">
          <span style="font-size:11px;padding:2px 8px;border-radius:12px;
            background:${isDone ? "#d1fae5" : "#fef3c7"};
            color:${isDone ? "#065f46" : "#92400e"};">
            ${isDone ? "Concluído" : "Pendente"}
          </span>
        </td>
      </tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Plano de Ação — ${escHtml(plan.title)}</title>
  <style>
    @page { margin: 20mm 18mm; }
    body { font-family: -apple-system, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f3f4f6; padding: 8px; font-size: 12px; text-align: left; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb;">
    <div>
      <img src="${logoUrl}" alt="Ulimax & Co." style="height:32px;margin-bottom:8px;display:block;" crossorigin="anonymous"/>
      <div style="font-size:11px;color:#6b7280;">Sistema de Gestão de Projetos</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#6b7280;">Emitido em ${now}</div>
      <div style="font-size:11px;color:#6b7280;">Projeto: ${escHtml(projectName)}</div>
    </div>
  </div>

  <!-- Plan title -->
  <div style="margin-bottom:20px;">
    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Plano de Ação</div>
    <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;">${escHtml(plan.title)}</h1>
    <div style="font-size:12px;color:#6b7280;">Criado em ${format(new Date(plan.createdAt), "dd/MM/yyyy", { locale: ptBR })}</div>
  </div>

  <!-- Summary badges -->
  <div style="display:flex;gap:12px;margin-bottom:20px;">
    <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;min-width:90px;">
      <div style="font-size:22px;font-weight:700;">${plan.items.length}</div>
      <div style="font-size:11px;color:#6b7280;">Total de itens</div>
    </div>
    <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;min-width:90px;">
      <div style="font-size:22px;font-weight:700;color:#92400e;">${pending.length}</div>
      <div style="font-size:11px;color:#92400e;">Pendentes</div>
    </div>
    <div style="background:#d1fae5;border-radius:8px;padding:12px 16px;min-width:90px;">
      <div style="font-size:22px;font-weight:700;color:#065f46;">${done.length}</div>
      <div style="font-size:11px;color:#065f46;">Concluídos</div>
    </div>
  </div>

  <!-- Items table -->
  ${plan.items.length === 0 ? `<div style="text-align:center;padding:40px;color:#9ca3af;border:1px dashed #e5e7eb;border-radius:8px;">Nenhum item registrado neste plano.</div>` : `
  <table>
    <thead>
      <tr>
        <th>Descrição do Problema / Ação</th>
        <th style="width:160px;">Responsável</th>
        <th style="width:110px;">Data Estimada</th>
        <th style="width:90px;text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${pending.map((i) => itemRow(i, false)).join("")}
      ${done.map((i) => itemRow(i, true)).join("")}
    </tbody>
  </table>
  `}

  <!-- Footer -->
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
    Ulimax &amp; Co. — Sistema de Gestão de Projetos
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Add item form (inside a plan) ─────────────────────────────────────────────

function AddItemForm({
  planId,
  members,
  onAdded,
}: {
  planId: number;
  members: Member[];
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const createItem = useCreateProjectActionItem();
  const [desc, setDesc] = useState("");
  const [responsibleType, setResponsibleType] = useState<"internal" | "external">("internal");
  const [responsibleId, setResponsibleId] = useState("none");
  const [responsibleExternal, setResponsibleExternal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!desc.trim()) return;
    setSaving(true);
    try {
      await createItem.mutateAsync({
        planId,
        data: {
          description: desc.trim(),
          responsibleId: responsibleType === "internal" && responsibleId !== "none" ? Number(responsibleId) : undefined,
          responsibleExternal: responsibleType === "external" && responsibleExternal.trim() ? responsibleExternal.trim() : undefined,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        },
      });
      onAdded();
      setDesc("");
      setResponsibleId("none");
      setResponsibleExternal("");
      setDueDate("");
      setNotes("");
    } catch {
      toast({ title: "Erro ao adicionar item", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Novo item</p>
      <Textarea
        placeholder="Descrição do problema ou ação necessária..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        className="resize-none text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        {/* Responsible type toggle */}
        <div className="space-y-1.5">
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setResponsibleType("internal")}
              className={cn("flex-1 py-1.5 font-medium transition-colors", responsibleType === "internal" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted")}
            >
              Interno
            </button>
            <button
              type="button"
              onClick={() => setResponsibleType("external")}
              className={cn("flex-1 py-1.5 font-medium transition-colors", responsibleType === "external" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted")}
            >
              Externo
            </button>
          </div>
          {responsibleType === "internal" ? (
            <Select value={responsibleId} onValueChange={setResponsibleId}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Responsável interno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem responsável —</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Nome do responsável externo"
              value={responsibleExternal}
              onChange={(e) => setResponsibleExternal(e.target.value)}
              className="text-sm h-9"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Data estimada</label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-sm h-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Observações adicionais</label>
        <Textarea
          placeholder="Contexto, detalhes ou instruções complementares..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="resize-none text-sm"
        />
      </div>
      <Button onClick={handleAdd} disabled={!desc.trim() || saving} size="sm" className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
        Adicionar item
      </Button>
    </div>
  );
}

// ── Single plan card ──────────────────────────────────────────────────────────

function PlanCard({
  plan,
  projectName,
  members,
  canEdit,
  onInvalidate,
}: {
  plan: APlan;
  projectName: string;
  members: Member[];
  canEdit: boolean;
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const toggleItem = useToggleProjectActionItem();
  const deleteItem = useDeleteProjectActionItem();
  const deletePlan = useDeleteProjectActionPlan();
  // Colapsado por padrão: com vários planos, a página virava um paredão de itens.
  const [expanded, setExpanded] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const pending = plan.items.filter((i) => !i.completedAt);
  const done = plan.items.filter((i) => i.completedAt);
  const todayIso = new Date().toISOString().slice(0, 10);
  const overdue = pending.filter((i) => i.dueDate && i.dueDate < todayIso);

  async function handleToggle(itemId: number) {
    try {
      await toggleItem.mutateAsync({ itemId });
      onInvalidate();
    } catch {
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
    }
  }

  async function handleDeleteItem(itemId: number) {
    try {
      await deleteItem.mutateAsync({ itemId });
      onInvalidate();
    } catch {
      toast({ title: "Erro ao remover item", variant: "destructive" });
    }
  }

  async function handleDeletePlan() {
    if (!confirm(`Remover o plano "${plan.title}" e todos os seus itens?`)) return;
    try {
      await deletePlan.mutateAsync({ planId: plan.id });
      onInvalidate();
    } catch {
      toast({ title: "Erro ao remover plano", variant: "destructive" });
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Plan header */}
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{plan.title}</CardTitle>
              {overdue.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs font-medium">
                  {overdue.length} vencido{overdue.length > 1 ? "s" : ""}
                </Badge>
              )}
              {pending.length > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs font-medium">
                  {pending.length} pendente{pending.length > 1 ? "s" : ""}
                </Badge>
              )}
              {plan.items.length > 0 && pending.length === 0 && (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs font-medium">
                  Concluído
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Criado em {format(new Date(plan.createdAt), "dd/MM/yyyy", { locale: ptBR })} · {plan.items.length} item{plan.items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={(e) => { e.stopPropagation(); exportPlanToPdf(plan, projectName); }}
              title="Baixar PDF"
            >
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </Button>
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDeletePlan(); }}
                title="Excluir plano"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {plan.items.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(done.length / plan.items.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {done.length}/{plan.items.length}
            </span>
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Pending items */}
          {pending.length === 0 && done.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Nenhum item registrado. Adicione o primeiro item abaixo.
            </div>
          )}

          <div className="space-y-2">
            {pending.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                onToggle={() => handleToggle(item.id)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
          </div>

          {/* Done items */}
          {done.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 hover:text-foreground transition-colors"
              >
                {showDone ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {done.length} item{done.length > 1 ? "s" : ""} concluído{done.length > 1 ? "s" : ""}
              </button>
              {showDone && (
                <div className="space-y-2 mt-1.5">
                  {done.map((item) => (
                    <ActionItemRow
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      onToggle={() => handleToggle(item.id)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add item */}
          {canEdit && (
            showAddForm ? (
              <AddItemForm
                planId={plan.id}
                members={members}
                onAdded={() => { onInvalidate(); setShowAddForm(false); }}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-muted-foreground border-dashed"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar item
              </Button>
            )
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ActionItemRow({
  item,
  canEdit,
  onToggle,
  onDelete,
}: {
  item: AItem;
  canEdit: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isDone = !!item.completedAt;
  const resp = item.responsibleName ?? item.responsibleExternal ?? null;

  return (
    <div className={cn(
      "group rounded-lg border px-4 py-3 text-sm",
      isDone ? "bg-muted/30 border-muted" : "bg-card border-border"
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          disabled={!canEdit}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
            isDone
              ? "border-emerald-500 bg-emerald-500"
              : "border-muted-foreground/40 hover:border-foreground"
          )}
        >
          {isDone && <Check className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn("font-medium", isDone && "line-through text-muted-foreground")}>
            {item.description}
          </p>

          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {resp && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {resp}
                {item.responsibleExternal && !item.responsibleId && (
                  <span className="text-xs text-muted-foreground/70">(externo)</span>
                )}
              </span>
            )}
            {item.dueDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(item.dueDate + "T00:00:00"), "dd/MM/yyyy")}
              </span>
            )}
            {item.notes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {item.notes}
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectActionPlan({ projectId, projectName = "Projeto", members, canEdit }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createPlan = useCreateProjectActionPlan();
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: plans, isLoading } = useListProjectActionPlans(projectId);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListProjectActionPlansQueryKey(projectId) });

  async function handleCreatePlan() {
    if (!newPlanTitle.trim()) return;
    setCreating(true);
    try {
      await createPlan.mutateAsync({ id: projectId, data: { title: newPlanTitle.trim() } });
      invalidate();
      setNewPlanTitle("");
      setDialogOpen(false);
    } catch {
      toast({ title: "Erro ao criar plano", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Planos de Ação</h2>
          {(plans?.length ?? 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              {plans!.length}
            </Badge>
          )}
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Criar Plano de Ação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome do plano</label>
                  <Input
                    placeholder="Ex: Vistoria 01 — Jul/2026"
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newPlanTitle.trim()) handleCreatePlan(); }}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Cada plano é independente. Você pode criar vários ao longo da instalação.
                  </p>
                </div>
                <Button
                  onClick={handleCreatePlan}
                  disabled={!newPlanTitle.trim() || creating}
                  className="w-full"
                >
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Criar plano
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Plans list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (plans ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum plano de ação criado.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie planos para registrar ações levantadas em vistorias ou reuniões.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              projectName={projectName}
              members={members}
              canEdit={canEdit}
              onInvalidate={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
