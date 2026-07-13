import { useMemo } from "react";
import { useListProjects, useListTasks } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { differenceInDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  CalendarClock,
  Users,
  BarChart3,
} from "lucide-react";

type Health = "saudavel" | "atencao" | "critico";

function getHealth(pctDone: number, daysLeft: number | null, status: string): Health {
  if (status === "instalado" || status === "concluido") return "saudavel";
  if (daysLeft !== null && daysLeft < 0) return "critico";
  if (daysLeft !== null && daysLeft <= 7 && pctDone < 80) return "atencao";
  if (pctDone >= 70) return "saudavel";
  if (pctDone >= 30) return "atencao";
  return "critico";
}

const HEALTH_META: Record<Health, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  saudavel: { label: "Saudável", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 },
  atencao: { label: "Em Risco", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", icon: AlertTriangle },
  critico: { label: "Crítico", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle },
};

const STATUS_LABELS: Record<string, string> = {
  "a-iniciar": "A Iniciar",
  "em-projeto": "Em Projeto",
  "em-aprovacao": "Em Aprovação",
  "em-producao": "Em Produção",
  "ag-instalacao": "Ag. Instalação",
  "em-instalacao": "Em Instalação",
  instalado: "Instalado",
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  normal: { label: "Normal", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  baixa: { label: "Baixa", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

export default function Portfolio() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: tasks, isLoading: loadingTasks } = useListTasks();

  const rows = useMemo(() => {
    if (!projects || !tasks) return [];
    return projects.map((p) => {
      const ptasks = tasks.filter((t) => t.projectId === p.id);
      const total = ptasks.length;
      const done = ptasks.filter((t) => t.status === "done").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const daysLeft = p.endDate ? differenceInDays(parseISO(p.endDate), new Date()) : null;
      const health = getHealth(pct, daysLeft, p.status);
      return { project: p, total, done, pct, daysLeft, health };
    });
  }, [projects, tasks]);

  const counts = useMemo(() => ({
    saudavel: rows.filter((r) => r.health === "saudavel").length,
    atencao: rows.filter((r) => r.health === "atencao").length,
    critico: rows.filter((r) => r.health === "critico").length,
  }), [rows]);

  const isLoading = loadingProjects || loadingTasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfólio de Projetos</h1>
          <p className="text-sm text-muted-foreground">Visão executiva de saúde e progresso de todos os projetos</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: rows.length, icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
          { label: "Saudáveis", value: counts.saudavel, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
          { label: "Em Risco", value: counts.atencao, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
          { label: "Críticos", value: counts.critico, icon: XCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border bg-card p-4 flex items-center gap-3 shadow-sm">
            <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Projeto</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide hidden md:table-cell">Prioridade</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Progresso</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide hidden md:table-cell">Prazo</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Saúde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
                : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhum projeto encontrado.
                    </td>
                  </tr>
                )
                : rows.map(({ project: p, total, done, pct, daysLeft, health }) => {
                  const { label: hLabel, color: hColor, bg: hBg, icon: HIcon } = HEALTH_META[health];
                  const priority = PRIORITY_META[p.priority ?? "normal"];
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground truncate max-w-[220px]">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{done}/{total} tarefas</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-foreground w-8 shrink-0">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {daysLeft === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : daysLeft < 0 ? (
                          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {Math.abs(daysLeft)}d atraso
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {daysLeft}d restantes
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${hBg} ${hColor}`}>
                          <HIcon className="h-3 w-3" />
                          {hLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {!isLoading && rows.length > 0 && (
          <div className="border-t px-4 py-3 bg-muted/20 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Progresso médio: <strong className="text-foreground ml-0.5">{Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length)}%</strong>
            </span>
            <span>
              Tarefas totais: <strong className="text-foreground">{rows.reduce((a, r) => a + r.total, 0)}</strong>
            </span>
            <span>
              Concluídas: <strong className="text-foreground">{rows.reduce((a, r) => a + r.done, 0)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
