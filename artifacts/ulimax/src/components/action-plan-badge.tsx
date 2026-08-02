import { Link } from "wouter";
import type { ProjectActionPlanSummary } from "@workspace/api-client-react";
import { ClipboardList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewActionPlanDialog } from "@/components/new-action-plan-dialog";

/**
 * Selo de plano de ação por obra:
 * - com plano ativo (itens abertos): mostra "Plano: N" (vermelho se houver vencidos) e leva ao projeto;
 * - com plano concluído: selo discreto;
 * - sem plano: botão "Criar plano" (a menos que `readOnly`).
 *
 * O resumo (`summary`) vem de useListActionPlanSummaries, buscado uma vez pela
 * página e passado por obra — evita uma chamada por selo.
 */
export function ActionPlanBadge({
  projectId,
  projectName,
  summary,
  readOnly = false,
  className,
}: {
  projectId: number;
  projectName?: string;
  summary?: ProjectActionPlanSummary;
  readOnly?: boolean;
  className?: string;
}) {
  // Sem plano cadastrado
  if (!summary || summary.totalItems === 0) {
    if (readOnly) return null;
    return (
      <NewActionPlanDialog
        projectId={projectId}
        projectName={projectName}
        trigger={
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors",
              className,
            )}
            title="Criar plano de ação"
          >
            <Plus className="h-3 w-3" /> Plano de ação
          </button>
        }
      />
    );
  }

  // Plano concluído (tem itens, nenhum aberto)
  if (summary.openItems === 0) {
    return (
      <Link href={`/projects/${projectId}`} onClick={(e) => e.stopPropagation()}>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border",
            className,
          )}
          title="Plano de ação concluído"
        >
          <ClipboardList className="h-3 w-3" /> Plano ✓
        </span>
      </Link>
    );
  }

  // Plano ativo
  const hasOverdue = summary.overdueItems > 0;
  return (
    <Link href={`/projects/${projectId}`} onClick={(e) => e.stopPropagation()}>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
          hasOverdue
            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40"
            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40",
          className,
        )}
        title={`Plano de ação ativo — ${summary.openItems} em aberto${hasOverdue ? `, ${summary.overdueItems} vencido(s)` : ""}`}
      >
        <ClipboardList className="h-3 w-3" />
        Plano: {summary.openItems}
        {hasOverdue ? ` · ${summary.overdueItems} venc.` : ""}
      </span>
    </Link>
  );
}
