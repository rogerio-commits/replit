import { useMemo } from "react";
import { Link } from "wouter";
import { useListProjects, useListTasks } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Madeira e Alumínio são unidades diferentes da empresa. Este comparativo mede
// o esforço de cada uma lado a lado — projetos ativos, tarefas em aberto,
// vencidas e concluídas.

const ACTIVE_STATUSES = new Set([
  "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao",
]);

type Unit = "madeira" | "aluminio";

interface UnitStats {
  projetos: number;
  ativos: number;
  aberto: number;
  vencidas: number;
  concluidas: number;
}

const emptyStats = (): UnitStats => ({ projetos: 0, ativos: 0, aberto: 0, vencidas: 0, concluidas: 0 });

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const META: Record<Unit, { label: string; dot: string; bar: string; text: string }> = {
  madeira:  { label: "Madeira",  dot: "bg-amber-500", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  aluminio: { label: "Alumínio", dot: "bg-blue-500",  bar: "bg-blue-500",  text: "text-blue-700 dark:text-blue-400" },
};

const ROWS: { key: keyof UnitStats; label: string; danger?: boolean; href: (u: Unit) => string }[] = [
  { key: "ativos",     label: "Projetos ativos",  href: () => "/kanban" },
  { key: "aberto",     label: "Tarefas em aberto", href: () => "/tasks" },
  { key: "vencidas",   label: "Vencidas",         danger: true, href: () => "/tasks?vencidas=1" },
  { key: "concluidas", label: "Concluídas",       href: () => "/tasks?status=done" },
];

export function MaterialSplit({ className }: { className?: string }) {
  const { data: projects, isLoading: lp } = useListProjects();
  const { data: tasks, isLoading: lt } = useListTasks();

  const stats = useMemo(() => {
    const today = todayStr();
    const out: Record<Unit, UnitStats> = { madeira: emptyStats(), aluminio: emptyStats() };
    const matByProject = new Map<number, Unit | undefined>();
    for (const p of projects ?? []) {
      const m = p.materialType as Unit | undefined;
      matByProject.set(p.id, m === "madeira" || m === "aluminio" ? m : undefined);
      if (m === "madeira" || m === "aluminio") {
        out[m].projetos++;
        if (ACTIVE_STATUSES.has(p.status)) out[m].ativos++;
      }
    }
    for (const t of tasks ?? []) {
      const m = matByProject.get(t.projectId);
      if (!m) continue;
      if (t.status === "done") out[m].concluidas++;
      else {
        out[m].aberto++;
        if (t.dueDate && t.dueDate < today) out[m].vencidas++;
      }
    }
    return out;
  }, [projects, tasks]);

  if (lp || lt) return <Skeleton className={cn("h-56 rounded-xl", className)} />;

  return (
    <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">Por unidade</h2>
        <span className="flex items-center gap-3 ml-auto text-[11px] font-medium">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Madeira</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Alumínio</span>
        </span>
      </div>
      <div className="space-y-2.5">
        {ROWS.map((row) => {
          const md = stats.madeira[row.key];
          const al = stats.aluminio[row.key];
          const total = md + al;
          const mdPct = total > 0 ? (md / total) * 100 : 50;
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="flex items-center gap-3 tabular-nums font-semibold">
                  <Link href={row.href("madeira")} className={cn("hover:underline", row.danger && md > 0 ? "text-red-600" : "text-amber-700 dark:text-amber-400")}>{md}</Link>
                  <span className="text-muted-foreground/30">·</span>
                  <Link href={row.href("aluminio")} className={cn("hover:underline", row.danger && al > 0 ? "text-red-600" : "text-blue-700 dark:text-blue-400")}>{al}</Link>
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                <div className="bg-amber-500" style={{ width: `${mdPct}%` }} />
                <div className="bg-blue-500" style={{ width: `${100 - mdPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
