import { useState } from "react";
import {
  useListCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
  getListCustomFieldsQueryKey,
} from "@workspace/api-client-react";
import type { CustomFieldDefinition } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Settings2,
  Plus,
  Trash2,
  Type,
  Hash,
  Calendar,
  List,
  Briefcase,
  CheckSquare,
} from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  text: { label: "Texto", icon: Type, color: "text-blue-600" },
  number: { label: "Número", icon: Hash, color: "text-purple-600" },
  date: { label: "Data", icon: Calendar, color: "text-amber-600" },
  select: { label: "Seleção", icon: List, color: "text-green-600" },
};

const ENTITY_META: Record<string, { label: string; icon: React.ElementType }> = {
  project: { label: "Projeto", icon: Briefcase },
  task: { label: "Tarefa", icon: CheckSquare },
};

interface FormState {
  name: string;
  type: "text" | "number" | "date" | "select";
  entityType: "project" | "task";
  optionsRaw: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  type: "text",
  entityType: "project",
  optionsRaw: "",
};

function FieldRow({ field, onDelete }: { field: CustomFieldDefinition; onDelete: () => void }) {
  const TypeIcon = TYPE_META[field.type]?.icon ?? Type;
  const typeColor = TYPE_META[field.type]?.color ?? "text-muted-foreground";
  const EntityIcon = ENTITY_META[field.entityType]?.icon ?? Briefcase;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
      <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
        <TypeIcon className={`h-4 w-4 ${typeColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground">{field.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <EntityIcon className="h-3 w-3" />
            {ENTITY_META[field.entityType]?.label}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{TYPE_META[field.type]?.label}</span>
          {field.options && field.options.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{field.options.join(", ")}</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        title="Excluir campo"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CamposPersonalizados() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<"all" | "project" | "task">("all");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: fields, isLoading } = useListCustomFields(
    entityFilter !== "all" ? { entityType: entityFilter } : {},
    { query: { queryKey: getListCustomFieldsQueryKey(entityFilter !== "all" ? { entityType: entityFilter } : {}) } },
  );

  const create = useCreateCustomField({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() });
        toast({ title: "Campo criado com sucesso" });
        setOpen(false);
        setForm(EMPTY_FORM);
      },
      onError: () => toast({ title: "Erro ao criar campo", variant: "destructive" }),
    },
  });

  const del = useDeleteCustomField({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() });
        toast({ title: "Campo excluído" });
      },
      onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
    },
  });

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const options =
      form.type === "select"
        ? form.optionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    if (form.type === "select" && (!options || options.length === 0)) {
      toast({ title: "Informe pelo menos uma opção para o campo de seleção", variant: "destructive" });
      return;
    }

    create.mutate({
      data: {
        name: form.name.trim(),
        type: form.type,
        entityType: form.entityType,
        options,
      },
    });
  }

  const projectFields = fields?.filter((f) => f.entityType === "project") ?? [];
  const taskFields = fields?.filter((f) => f.entityType === "task") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campos Personalizados</h1>
            <p className="text-sm text-muted-foreground">Adicione informações extras a projetos e tarefas</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Campo
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "project", "task"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setEntityFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              entityFilter === v
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {v === "all" ? "Todos" : v === "project" ? "Projetos" : "Tarefas"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Project fields */}
          {(entityFilter === "all" || entityFilter === "project") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Campos de Projeto
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {projectFields.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {projectFields.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                    Nenhum campo de projeto definido ainda.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {projectFields.map((f) => (
                      <FieldRow key={f.id} field={f} onDelete={() => del.mutate({ id: f.id })} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Task fields */}
          {(entityFilter === "all" || entityFilter === "task") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Campos de Tarefa
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {taskFields.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {taskFields.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                    Nenhum campo de tarefa definido ainda.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {taskFields.map((f) => (
                      <FieldRow key={f.id} field={f} onDelete={() => del.mutate({ id: f.id })} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {fields && fields.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum campo personalizado</p>
              <p className="text-sm mt-1">Crie campos para adicionar informações extras aos seus projetos e tarefas.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro campo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Campo Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome do campo *</label>
              <Input
                placeholder="Ex: Número do Contrato, Cidade, Metragem..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Aplica-se a</label>
                <Select
                  value={form.entityType}
                  onValueChange={(v) => setForm((f) => ({ ...f, entityType: v as FormState["entityType"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Projeto</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as FormState["type"], optionsRaw: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="select">Seleção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "select" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Opções *</label>
                <Input
                  placeholder="Opção 1, Opção 2, Opção 3"
                  value={form.optionsRaw}
                  onChange={(e) => setForm((f) => ({ ...f, optionsRaw: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Separe as opções por vírgula</p>
              </div>
            )}

            {/* Preview */}
            <div className="rounded-lg bg-muted/40 border px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-1">Pré-visualização</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = TYPE_META[form.type]?.icon ?? Type;
                  const color = TYPE_META[form.type]?.color ?? "";
                  return <Icon className={`h-4 w-4 ${color} shrink-0`} />;
                })()}
                <span className="text-sm font-medium text-foreground">{form.name || "Nome do campo"}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {ENTITY_META[form.entityType]?.label}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "Criando..." : "Criar Campo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
