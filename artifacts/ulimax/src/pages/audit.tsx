import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import type { ListAuditLogsQueryResult } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Plus, Pencil, Trash2, ArrowRightLeft,
  UserPlus, UserMinus, CheckSquare, Briefcase,
} from "lucide-react";

type AuditEntry = ListAuditLogsQueryResult[number];

// ── helpers ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  created:        { label: "Criado",           color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",   Icon: Plus },
  updated:        { label: "Atualizado",        color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",        Icon: Pencil },
  deleted:        { label: "Excluído",          color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",             Icon: Trash2 },
  status_changed: { label: "Status alterado",  color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",   Icon: ArrowRightLeft },
  assigned:       { label: "Atribuído",         color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400", Icon: UserPlus },
  unassigned:     { label: "Desatribuído",      color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",      Icon: UserMinus },
};

const ENTITY_META: Record<string, { label: string; Icon: React.FC<{ className?: string }> }> = {
  task:    { label: "Tarefa",  Icon: CheckSquare },
  project: { label: "Projeto", Icon: Briefcase },
  member:  { label: "Membro",  Icon: UserPlus },
};

const FIELD_LABELS: Record<string, string> = {
  status: "status", priority: "prioridade", assignedTo: "responsável",
  dueDate: "prazo", title: "título", name: "nome",
};

function StatusBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? ACTION_META.updated;
  const { Icon } = meta;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function EntityIcon({ type }: { type: string }) {
  const { Icon } = ENTITY_META[type] ?? ENTITY_META.task;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
}

function ChangesPill({ changes }: { changes: AuditEntry["changes"] }) {
  if (!changes || changes.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {changes.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{FIELD_LABELS[c.field] ?? c.field}:</span>
          <span className="line-through opacity-60">{String(c.from ?? "—")}</span>
          <ArrowRightLeft className="h-2.5 w-2.5 opacity-40 shrink-0" />
          <span className="font-medium text-foreground/80">{String(c.to ?? "—")}</span>
        </div>
      ))}
    </div>
  );
}

function AuditItem({ entry }: { entry: AuditEntry }) {
  return (
    <div className="flex gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1.5">
        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
        <div className="flex-1 w-px bg-border mt-1" />
      </div>

      {/* Card */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <StatusBadge action={entry.action} />
          <div className="flex items-center gap-1 text-sm">
            <EntityIcon type={entry.entityType} />
            <span className="font-semibold text-foreground truncate max-w-[220px]">{entry.entityName}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Por <span className="font-medium text-foreground/70">{entry.actorName}</span>
          {" · "}
          {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm", { locale: ptBR })}
        </p>
        <ChangesPill changes={entry.changes} />
      </div>
    </div>
  );
}

function groupByDate(entries: AuditEntry[]): { date: string; items: AuditEntry[] }[] {
  const map = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    const key = format(new Date(e.createdAt), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }));
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [entityType, setEntityType] = useState<string>("all");

  const { data, isLoading } = useListAuditLogs({
    entityType: entityType !== "all" ? (entityType as "task" | "project" | "member") : undefined,
    limit: 200,
  });

  const groups = groupByDate(data ?? []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Auditoria</h1>
          {data && (
            <span className="text-sm text-muted-foreground">({data.length} registros)</span>
          )}
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="task">Tarefas</SelectItem>
            <SelectItem value="project">Projetos</SelectItem>
            <SelectItem value="member">Membros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="space-y-4 max-w-2xl">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum registro de auditoria ainda.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">As ações em tarefas e projetos aparecerão aqui.</p>
          </div>
        ) : (
          <div className="max-w-2xl">
            {groups.map(({ date, items }) => (
              <div key={date} className="mb-6">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1.5 mb-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    {format(new Date(date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </Badge>
                </div>
                <div>
                  {items.map((entry) => (
                    <AuditItem key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
