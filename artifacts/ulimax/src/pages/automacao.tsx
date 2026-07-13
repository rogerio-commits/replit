import { useState } from "react";
import {
  useListAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  getListAutomationRulesQueryKey,
} from "@workspace/api-client-react";
import type { AutomationRule, AutomationRuleInputTrigger, AutomationRuleInputActionType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Zap, ArrowRight, Loader2, Info, PlayCircle } from "lucide-react";
import { formatDistanceToNow as fdn, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS: Record<string, string> = {
  task_completed: "Tarefa concluída",
  task_status_changed: "Status da tarefa alterado",
  project_completed: "Projeto concluído",
  task_assigned: "Tarefa atribuída a membro",
  project_status_changed: "Status do projeto alterado",
};

const ACTION_LABELS: Record<string, string> = {
  notify_assignee: "Notificar responsável",
  notify_all: "Notificar toda a equipe do projeto",
  notify_gestor: "Notificar gestores",
  advance_task_status: "Avançar status da tarefa",
};

const TRIGGER_COLORS: Record<string, string> = {
  task_completed: "bg-emerald-100 text-emerald-700 border-0",
  task_status_changed: "bg-blue-100 text-blue-700 border-0",
  project_completed: "bg-amber-100 text-amber-700 border-0",
  task_assigned: "bg-violet-100 text-violet-700 border-0",
  project_status_changed: "bg-orange-100 text-orange-700 border-0",
};

const ACTION_COLORS: Record<string, string> = {
  notify_assignee: "bg-violet-100 text-violet-700 border-0",
  notify_all: "bg-rose-100 text-rose-700 border-0",
  notify_gestor: "bg-amber-100 text-amber-700 border-0",
  advance_task_status: "bg-sky-100 text-sky-700 border-0",
};

interface RuleFormData {
  name: string;
  trigger: string;
  actionType: string;
}

const defaultForm: RuleFormData = { name: "", trigger: "", actionType: "" };

export default function Automacao() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);

  const { data: rules, isLoading } = useListAutomationRules();

  const createRule = useCreateAutomationRule({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAutomationRulesQueryKey() });
        setIsCreateOpen(false);
        setForm(defaultForm);
        toast({ title: "Regra criada com sucesso" });
      },
      onError: () => toast({ title: "Erro ao criar regra", variant: "destructive" }),
    },
  });

  const updateRule = useUpdateAutomationRule({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAutomationRulesQueryKey() });
      },
      onError: () => toast({ title: "Erro ao atualizar regra", variant: "destructive" }),
    },
  });

  const deleteRule = useDeleteAutomationRule({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAutomationRulesQueryKey() });
        setDeleteId(null);
        toast({ title: "Regra excluída" });
      },
      onError: () => toast({ title: "Erro ao excluir regra", variant: "destructive" }),
    },
  });

  function handleCreate() {
    if (!form.name.trim() || !form.trigger || !form.actionType) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    createRule.mutate({ data: { name: form.name.trim(), trigger: form.trigger as AutomationRuleInputTrigger, actionType: form.actionType as AutomationRuleInputActionType } });
  }

  function handleToggle(rule: AutomationRule) {
    updateRule.mutate({
      id: rule.id,
      data: {
        name: rule.name,
        trigger: rule.trigger as unknown as AutomationRuleInputTrigger,
        actionType: rule.actionType as unknown as AutomationRuleInputActionType,
        isActive: !rule.isActive,
      },
    });
  }

  const activeCount = rules?.filter((r) => r.isActive).length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Automações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Regras que disparam ações automaticamente com base em eventos do sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total</p>
            <p className="text-2xl font-bold text-foreground mt-1">{rules?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Ativas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Inativas</p>
            <p className="text-2xl font-bold text-muted-foreground mt-1">
              {(rules?.length ?? 0) - activeCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 text-sm text-blue-700 dark:text-blue-400">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Como funciona:</span> Quando um gatilho ocorre no sistema (ex: tarefa concluída), todas as regras ativas com esse gatilho disparam automaticamente suas ações configuradas.
        </div>
      </div>

      {/* Rules list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Regras configuradas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !rules?.length ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma regra criada</p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                Crie regras para automatizar notificações e fluxos de trabalho
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Criar primeira regra
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 transition-colors",
                    !rule.isActive && "opacity-60",
                  )}
                >
                  {/* Toggle */}
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggle(rule)}
                    title={rule.isActive ? "Desativar" : "Ativar"}
                  />

                  {/* Rule info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{rule.name}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge className={cn("text-xs py-0", TRIGGER_COLORS[rule.trigger] ?? "")}>
                        {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Badge className={cn("text-xs py-0", ACTION_COLORS[rule.actionType] ?? "")}>
                        {ACTION_LABELS[rule.actionType] ?? rule.actionType}
                      </Badge>
                    </div>
                  </div>

                  {/* Meta + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <PlayCircle className="h-3 w-3" />
                        {rule.executionCount} execuç{rule.executionCount === 1 ? "ão" : "ões"}
                      </span>
                      {rule.lastFiredAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          última: {fdn(parseISO(rule.lastFiredAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">nunca executada</span>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteId(rule.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir regra"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(o) => { if (!o) { setIsCreateOpen(false); setForm(defaultForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Nova Regra de Automação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da regra</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Notificar equipe quando tarefa for concluída"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Gatilho (quando?)</label>
              <Select value={form.trigger} onValueChange={(v) => setForm((f) => ({ ...f, trigger: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gatilho…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ação (o quê fazer?)</label>
              <Select value={form.actionType} onValueChange={(v) => setForm((f) => ({ ...f, actionType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.trigger && form.actionType && (
              <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>
                  Quando <strong className="text-foreground">{TRIGGER_LABELS[form.trigger]}</strong>, então <strong className="text-foreground">{ACTION_LABELS[form.actionType]}</strong>.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={createRule.isPending || !form.name.trim() || !form.trigger || !form.actionType}
            >
              {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteId !== null && deleteRule.mutate({ id: deleteId })}
              disabled={deleteRule.isPending}
            >
              {deleteRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
