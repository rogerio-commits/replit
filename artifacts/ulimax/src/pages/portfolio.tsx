// Painel de Projetos — visão rápida do gestor: status de todos os projetos e
// onde focar a atenção. Usa o MESMO farol do Dashboard/Kanban (lib/project-health),
// para nunca contradizer o resto do sistema.

import { useState, useMemo } from "react";
import { useListProjects, useListTasks, useListMembers } from "@workspace/api-client-react";
import type { ListProjectsQueryResult, ListTasksQueryResult } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeHealthMap,
  attentionScore,
  daysFromToday,
  parseLocalDate,
  FAROL_META,
  type FarolLevel,
  type ProjectHealth,
} from "@/lib/project-health";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  projectStatusChip,
} from "@/lib/project-status";
import { ActionPlanBadge } from "@/components/action-plan-badge";
import { useActionPlanMap } from "@/hooks/useActionPlanMap";

type Project = ListProjectsQueryResult[number];
type TaskItem = ListTasksQueryResult[number];

const FAROL_ORDER: Record<FarolLevel, number> = { red: 0, yellow: 1, green: 2 };

type SortCol = "name" | "farol" | "fase" | "progresso" | "prazo" | null;
type SortDir = "asc" | "desc";

interface Row {
  project: Project;
  health: ProjectHealth;
  score: number;
  pct: number | null;
  daysLeft: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRows(projects: Project[], tasks: TaskItem[]): Row[] {
  const healthMap = computeHealthMap(projects, tasks);
  return projects.map((p) => {
    const health = healthMap.get(p.id)!;
    const total = p.taskTotal ?? 0;
    const done = p.taskDone ?? 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : null;
    const daysLeft = p.endDate ? daysFromToday(p.endDate) : null;
    return { project: p, health, score: attentionScore(p, health), pct, daysLeft };
  });
}

function fmtShortDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function prazoText(r: Row): { text: string; className: string } {
  if (!r.project.endDate || r.daysLeft === null) return { text: "sem prazo", className: "text-muted-foreground/60" };
  if (r.daysLeft < 0) return { text: `venceu há ${-r.daysLeft}d`, className: "text-red-600 dark:text-red-400 font-semibold" };
  if (r.daysLeft === 0) return { text: "vence hoje", className: "text-red-600 dark:text-red-400 font-semibold" };
  if (r.daysLeft <= 7) return { text: `vence em ${r.daysLeft}d`, className: "text-amber-600 dark:text-amber-400 font-medium" };
  return { text: fmtShortDate(r.project.endDate), className: "text-muted-foreground" };
}

function exportCSV(rows: Row[]) {
  const headers = ["Projeto", "Fase", "Prioridade", "Farol", "Motivos", "Tarefas concluídas", "Tarefas totais", "Progresso (%)", "Prazo final", "Dias para o prazo"];
  const data = rows.map((r) => [
    r.project.name,
    projectStatusLabel(r.project.status),
    r.project.priority === "high" ? "Alta" : r.project.priority === "low" ? "Baixa" : "Normal",
    FAROL_META[r.health.level].label,
    r.health.reasons.join(" · "),
    String(r.project.taskDone ?? 0),
    String(r.project.taskTotal ?? 0),
    r.pct !== null ? String(r.pct) : "",
    r.project.endDate ? fmtShortDate(r.project.endDate) : "",
    r.daysLeft !== null ? String(r.daysLeft) : "",
  ]);
  const csv = [headers, ...data]
    .map((row) => row.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `painel-projetos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componentes de tabela ────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

function Th({ col, label, sortCol, sortDir, onSort, className }: {
  col: SortCol; label: string; sortCol: SortCol; sortDir: SortDir;
  onSort: (c: SortCol) => void; className?: string;
}) {
  return (
    <th
      className={cn("text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide cursor-pointer select-none hover:text-primary transition-colors whitespace-nowrap", className)}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const [, navigate] = useLocation();
  const planMap = useActionPlanMap();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: tasks, isLoading: loadingTasks } = useListTasks();
  const { data: members } = useListMembers();

  const [search, setSearch] = useState("");
  const [farolFilter, setFarolFilter] = useState<FarolLevel | "all">("all");
  const [faseFilter, setFaseFilter] = useState<string>("all");
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const isLoading = loadingProjects || loadingTasks;

  const allRows = useMemo(() => buildRows(projects ?? [], tasks ?? []), [projects, tasks]);

  const farolCounts = useMemo(() => ({
    red: allRows.filter((r) => r.health.level === "red").length,
    yellow: allRows.filter((r) => r.health.level === "yellow").length,
    green: allRows.filter((r) => r.health.level === "green").length,
  }), [allRows]);

  const faseCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of allRows) c[r.project.status] = (c[r.project.status] ?? 0) + 1;
    return c;
  }, [allRows]);

  // Projetos que pedem atenção, do mais urgente para o menos urgente
  const focusRows = useMemo(
    () => allRows.filter((r) => r.health.level !== "green").sort((a, b) => b.score - a.score),
    [allRows],
  );

  // Projetos sem nenhuma tarefa: o farol não tem o que avaliar neles
  const semTarefas = useMemo(
    () => allRows.filter((r) => (r.project.taskTotal ?? 0) === 0),
    [allRows],
  );

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.project.name.toLowerCase().includes(q));
    }
    if (farolFilter !== "all") rows = rows.filter((r) => r.health.level === farolFilter);
    if (faseFilter !== "all") rows = rows.filter((r) => r.project.status === faseFilter);

    const sorted = [...rows];
    if (!sortCol) {
      // Ordem padrão: mais urgente primeiro (mesma lógica do "Onde focar agora")
      sorted.sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name));
      return sorted;
    }
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name") cmp = a.project.name.localeCompare(b.project.name);
      else if (sortCol === "farol") cmp = FAROL_ORDER[a.health.level] - FAROL_ORDER[b.health.level] || b.score - a.score;
      else if (sortCol === "fase") cmp = PROJECT_STATUSES.indexOf(a.project.status as typeof PROJECT_STATUSES[number]) - PROJECT_STATUSES.indexOf(b.project.status as typeof PROJECT_STATUSES[number]);
      else if (sortCol === "progresso") cmp = (a.pct ?? -1) - (b.pct ?? -1);
      else if (sortCol === "prazo") cmp = (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [allRows, search, farolFilter, faseFilter, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  // Carga da equipe (tarefas em aberto/vencidas por pessoa)
  const workload = useMemo(() => {
    if (!members || !tasks) return [];
    return members
      .map((m) => {
        const mine = tasks.filter((t) => t.assignedTo === m.id);
        const open = mine.filter((t) => t.status !== "done").length;
        const overdue = mine.filter((t) => t.status !== "done" && t.dueDate && daysFromToday(t.dueDate) < 0).length;
        const done = mine.filter((t) => t.status === "done").length;
        return { member: m, open, overdue, done, total: mine.length };
      })
      .filter((w) => w.total > 0)
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open);
  }, [members, tasks]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Projetos</h1>
            <p className="text-sm text-muted-foreground">Status de todos os projetos e onde focar sua atenção</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filteredRows)} disabled={isLoading || filteredRows.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : allRows.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-16 text-center flex flex-col items-center gap-3">
          <Briefcase className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado ainda.</p>
          <Button size="sm" onClick={() => navigate("/projects?create=1")}>Criar primeiro projeto</Button>
        </div>
      ) : (
        <>
          {/* Resumo do farol — cartões clicáveis que filtram a lista */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { id: "all" as const, label: "Todos os projetos", value: allRows.length, emoji: "📋" },
              { id: "red" as const, label: "Críticos", value: farolCounts.red, emoji: "🔴" },
              { id: "yellow" as const, label: "Atenção", value: farolCounts.yellow, emoji: "🟡" },
              { id: "green" as const, label: "Em dia", value: farolCounts.green, emoji: "🟢" },
            ]).map(({ id, label, value, emoji }) => (
              <button
                key={id}
                onClick={() => setFarolFilter(id)}
                className={cn(
                  "rounded-xl border bg-card p-4 flex items-center gap-3 shadow-sm text-left transition-all",
                  farolFilter === id ? "ring-2 ring-primary border-primary/50" : "hover:bg-muted/30",
                )}
              >
                <span className="text-xl">{emoji}</span>
                <div>
                  <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Onde focar agora */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-red-500" />
              <h2 className="text-sm font-semibold text-foreground">🚦 Onde focar agora</h2>
              {focusRows.length > 0 && (
                <span className="text-[11px] text-muted-foreground">do mais urgente para o menos urgente</span>
              )}
            </div>
            {focusRows.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Nenhum projeto precisa de atenção especial agora — todos em dia. 🎉
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {focusRows.map((r) => {
                  const meta = FAROL_META[r.health.level];
                  const prazo = prazoText(r);
                  return (
                    <button
                      key={r.project.id}
                      onClick={() => navigate(`/projects/${r.project.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-md text-left cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 shrink-0", meta.chip)}>
                        {meta.emoji} {meta.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">{r.project.name}</span>
                          {r.project.priority === "high" && (
                            <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-px dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40">Alta</span>
                          )}
                          <span className={cn("text-[10px] font-medium border rounded px-1.5 py-px", projectStatusChip(r.project.status))}>
                            {projectStatusLabel(r.project.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{r.health.reasons.join(" · ")}</p>
                      </div>
                      <div className="shrink-0 text-right hidden sm:block">
                        <div className={cn("text-xs", prazo.className)}>{prazo.text}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {(r.project.taskTotal ?? 0) > 0 ? `${r.project.taskDone}/${r.project.taskTotal} tarefas` : "sem tarefas"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projetos sem tarefas — o farol não consegue avaliá-los */}
          {semTarefas.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">{semTarefas.length} projeto{semTarefas.length > 1 ? "s" : ""} sem nenhuma tarefa cadastrada</span>{" "}
                — o farol não tem como avaliá-{semTarefas.length > 1 ? "los" : "lo"}. Cadastre as tarefas para acompanhar de verdade:{" "}
                {semTarefas.map((r, i) => (
                  <span key={r.project.id}>
                    {i > 0 && ", "}
                    <button className="underline font-medium hover:text-amber-950 dark:hover:text-amber-200" onClick={() => navigate(`/projects/${r.project.id}`)}>
                      {r.project.name}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Todos os projetos */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 pb-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-foreground">Todos os Projetos</h2>
                <span className="text-[11px] text-muted-foreground">({filteredRows.length} de {allRows.length})</span>
                <div className="ml-auto relative w-full sm:w-56">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar projeto…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              {/* Filtro por fase */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFaseFilter("all")}
                  className={cn(
                    "text-[11px] font-medium border rounded-full px-2.5 py-1 transition-colors",
                    faseFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted",
                  )}
                >
                  Todas as fases
                </button>
                {PROJECT_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFaseFilter(faseFilter === s ? "all" : s)}
                    className={cn(
                      "text-[11px] font-medium border rounded-full px-2.5 py-1 transition-all",
                      projectStatusChip(s),
                      faseFilter === s ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100",
                    )}
                  >
                    {projectStatusLabel(s)} <strong>{faseCounts[s] ?? 0}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-muted/40">
                  <tr>
                    <Th col="name" label="Projeto" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="farol" label="Farol" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="fase" label="Fase" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                    <Th col="progresso" label="Progresso" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                    <Th col="prazo" label="Prazo" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Nenhum projeto encontrado com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const meta = FAROL_META[r.health.level];
                      const prazo = prazoText(r);
                      return (
                        <tr
                          key={r.project.id}
                          onClick={() => navigate(`/projects/${r.project.id}`)}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{r.project.name}</span>
                              {r.project.priority === "high" && (
                                <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-px dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40">Alta</span>
                              )}
                            </div>
                            {r.project.materialType && (
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {r.project.materialType === "aluminio" ? "Alumínio" : "Madeira"}
                              </span>
                            )}
                            <div className="mt-1">
                              <ActionPlanBadge projectId={r.project.id} projectName={r.project.name} summary={planMap.get(r.project.id)} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn("inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap", meta.chip)}
                              title={r.health.reasons.join(" · ")}
                            >
                              {meta.emoji} {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={cn("text-[11px] font-medium border rounded px-1.5 py-0.5 whitespace-nowrap", projectStatusChip(r.project.status))}>
                              {projectStatusLabel(r.project.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell min-w-[140px]">
                            {r.pct === null ? (
                              <span className="text-xs text-muted-foreground/60">sem tarefas</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Progress value={r.pct} className="h-1.5 w-20" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {r.project.taskDone}/{r.project.taskTotal}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className={cn("px-4 py-3 text-xs whitespace-nowrap", prazo.className)}>{prazo.text}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Carga da Equipe */}
          {workload.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Carga da Equipe</h2>
                <span className="text-[11px] text-muted-foreground">quem está com mais tarefas vencidas aparece primeiro</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {workload.map((w) => {
                  const pctDone = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
                  return (
                    <div key={w.member.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-32 truncate shrink-0">{w.member.name}</span>
                      <Progress value={pctDone} className="h-1.5 flex-1" />
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                        {w.open} aberta{w.open === 1 ? "" : "s"}
                        {w.overdue > 0 && (
                          <span className="text-red-600 dark:text-red-400 font-semibold"> · {w.overdue} vencida{w.overdue === 1 ? "" : "s"}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
