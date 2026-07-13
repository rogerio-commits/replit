import { useState, useMemo } from "react";
import { useListProjects, useListTasks, useListMembers } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { differenceInDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  CalendarClock,
  Users,
  BarChart3,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Scale,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Health = "saudavel" | "atencao" | "critico";
type SortCol = "name" | "pct" | "daysLeft" | "riskScore" | "health" | null;
type SortDir = "asc" | "desc";

function getHealth(pctDone: number, daysLeft: number | null, status: string): Health {
  if (status === "instalado" || status === "concluido") return "saudavel";
  if (daysLeft !== null && daysLeft < 0) return "critico";
  if (daysLeft !== null && daysLeft <= 7 && pctDone < 80) return "atencao";
  if (pctDone >= 70) return "saudavel";
  if (pctDone >= 30) return "atencao";
  return "critico";
}

function getRiskScore(pct: number, daysLeft: number | null, health: Health): number {
  if (health === "saudavel") return Math.min(100, 65 + Math.round(pct * 0.35));
  let score = pct;
  if (daysLeft !== null) {
    if (daysLeft < 0) score = Math.max(0, score - 40);
    else if (daysLeft <= 3) score = Math.max(0, score - 25);
    else if (daysLeft <= 7) score = Math.max(0, score - 15);
    else if (daysLeft <= 14) score = Math.max(0, score - 5);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-700 dark:text-green-400";
  if (score >= 40) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 40) return "bg-amber-100 dark:bg-amber-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

const HEALTH_META: Record<Health, { label: string; color: string; bg: string; icon: React.ElementType; order: number }> = {
  saudavel: { label: "Saudável", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2, order: 0 },
  atencao:  { label: "Em Risco", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", icon: AlertTriangle, order: 1 },
  critico:  { label: "Crítico",  color: "text-red-700 dark:text-red-400",   bg: "bg-red-100 dark:bg-red-900/30",   icon: XCircle,     order: 2 },
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
  alta:   { label: "Alta",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  normal: { label: "Normal", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  baixa:  { label: "Baixa",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

function exportCSV(rows: ReturnType<typeof buildRows>) {
  const headers = ["Projeto", "Status", "Prioridade", "Progresso (%)", "Dias para prazo", "Score de Risco", "Saúde"];
  const data = rows.map(r => [
    r.project.name,
    STATUS_LABELS[r.project.status] ?? r.project.status,
    PRIORITY_META[r.project.priority ?? "normal"]?.label ?? "",
    r.pct,
    r.daysLeft !== null ? (r.daysLeft < 0 ? `-${Math.abs(r.daysLeft)}` : String(r.daysLeft)) : "",
    r.riskScore,
    HEALTH_META[r.health].label,
  ]);
  const csv = [headers, ...data]
    .map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildRows(projects: { id: number; name: string; status: string; priority?: string | null; endDate?: string | null }[], tasks: { projectId?: number | null; status: string }[]) {
  return projects.map((p) => {
    const ptasks = tasks.filter((t) => t.projectId === p.id);
    const total = ptasks.length;
    const done = ptasks.filter((t) => t.status === "done").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const daysLeft = p.endDate ? differenceInDays(parseISO(p.endDate), new Date()) : null;
    const health = getHealth(pct, daysLeft, p.status);
    const riskScore = getRiskScore(pct, daysLeft, health);
    return { project: p, total, done, pct, daysLeft, health, riskScore };
  });
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

function Th({ col, label, sortCol, sortDir, onSort, className }: { col: SortCol; label: string; sortCol: SortCol; sortDir: SortDir; onSort: (c: SortCol) => void; className?: string }) {
  return (
    <th
      className={cn("text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide cursor-pointer select-none hover:text-primary transition-colors", className)}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );
}

function ComparePanel({ rows, ids, onClose, onNavigate }: {
  rows: ReturnType<typeof buildRows>;
  ids: number[];
  onClose: () => void;
  onNavigate: (id: number) => void;
}) {
  const selected = rows.filter(r => ids.includes(r.project.id)).slice(0, 3);
  if (selected.length < 2) return null;

  const metrics = [
    { label: "Progresso", render: (r: typeof selected[0]) => `${r.pct}%` },
    { label: "Score de Risco", render: (r: typeof selected[0]) => String(r.riskScore) },
    { label: "Saúde", render: (r: typeof selected[0]) => HEALTH_META[r.health].label },
    { label: "Tarefas", render: (r: typeof selected[0]) => `${r.done}/${r.total}` },
    { label: "Prazo", render: (r: typeof selected[0]) => r.daysLeft === null ? "—" : r.daysLeft < 0 ? `${Math.abs(r.daysLeft)}d atraso` : `${r.daysLeft}d restantes` },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-2xl animate-in slide-in-from-bottom-4">
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Comparação de Projetos</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <td className="pr-4 py-1 text-xs text-muted-foreground font-medium uppercase w-28">Métrica</td>
                {selected.map(r => (
                  <td key={r.project.id} className="px-3 py-1 font-semibold text-foreground">
                    <button onClick={() => onNavigate(r.project.id)} className="hover:text-primary transition-colors text-left">
                      {r.project.name}
                    </button>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.map(m => (
                <tr key={m.label}>
                  <td className="pr-4 py-2 text-xs text-muted-foreground">{m.label}</td>
                  {selected.map(r => (
                    <td key={r.project.id} className="px-3 py-2 text-foreground text-sm font-medium">
                      {m.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="pr-4 py-2 text-xs text-muted-foreground">Progresso visual</td>
                {selected.map(r => (
                  <td key={r.project.id} className="px-3 py-2 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <Progress value={r.pct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{r.pct}%</span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: tasks,    isLoading: loadingTasks }    = useListTasks();
  const { data: members } = useListMembers();

  const [search,       setSearch]       = useState("");
  const [healthFilter, setHealthFilter] = useState<Health | "all">("all");
  const [prioFilter,   setPrioFilter]   = useState<string>("all");
  const [sortCol,      setSortCol]      = useState<SortCol>(null);
  const [sortDir,      setSortDir]      = useState<SortDir>("asc");
  const [compareIds,   setCompareIds]   = useState<Set<number>>(new Set());

  const allRows = useMemo(() => buildRows(projects ?? [], tasks ?? []), [projects, tasks]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.project.name.toLowerCase().includes(q));
    }
    if (healthFilter !== "all") rows = rows.filter(r => r.health === healthFilter);
    if (prioFilter   !== "all") rows = rows.filter(r => (r.project.priority ?? "normal") === prioFilter);
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      let va: number, vb: number;
      if (sortCol === "name")      { va = 0; vb = a.project.name.localeCompare(b.project.name); return sortDir === "asc" ? vb : -vb; }
      if (sortCol === "pct")       { va = a.pct;       vb = b.pct; }
      else if (sortCol === "daysLeft")  { va = a.daysLeft ?? 9999; vb = b.daysLeft ?? 9999; }
      else if (sortCol === "riskScore") { va = a.riskScore; vb = b.riskScore; }
      else                              { va = HEALTH_META[a.health].order; vb = HEALTH_META[b.health].order; }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [allRows, search, healthFilter, prioFilter, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function toggleCompare(id: number) {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  const counts = useMemo(() => ({
    saudavel: allRows.filter(r => r.health === "saudavel").length,
    atencao:  allRows.filter(r => r.health === "atencao").length,
    critico:  allRows.filter(r => r.health === "critico").length,
  }), [allRows]);

  const memberWorkload = useMemo(() => {
    if (!members || !tasks) return [];
    return members.map(m => {
      const myTasks = (tasks as { assignedTo?: number | null; status: string; dueDate?: string | null }[]).filter(t => t.assignedTo === m.id);
      const open = myTasks.filter(t => t.status !== "done").length;
      const overdue = myTasks.filter(t =>
        t.status !== "done" && t.dueDate && differenceInDays(parseISO(t.dueDate), new Date()) < 0
      ).length;
      const done = myTasks.filter(t => t.status === "done").length;
      return { member: m, open, overdue, done, total: myTasks.length };
    }).filter(w => w.total > 0).sort((a, b) => b.open - a.open);
  }, [members, tasks]);

  const isLoading = loadingProjects || loadingTasks;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfólio de Projetos</h1>
            <p className="text-sm text-muted-foreground">Visão executiva de saúde, progresso e risco</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filteredRows)} disabled={isLoading || filteredRows.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
        </Button>
      </div>

      {/* Summary cards — clickable as health filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { id: "all",      label: "Total",      value: allRows.length, icon: Briefcase,    color: "text-primary",      bg: "bg-primary/10" },
          { id: "saudavel", label: "Saudáveis",  value: counts.saudavel, icon: CheckCircle2, color: "text-green-600",    bg: "bg-green-100 dark:bg-green-900/30" },
          { id: "atencao",  label: "Em Risco",   value: counts.atencao,  icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/30" },
          { id: "critico",  label: "Críticos",   value: counts.critico,  icon: XCircle,      color: "text-red-600",      bg: "bg-red-100 dark:bg-red-900/30" },
        ] as const).map(({ id, label, value, icon: Icon, color, bg }) => (
          <button
            key={id}
            onClick={() => setHealthFilter(id)}
            className={cn(
              "rounded-xl border bg-card p-4 flex items-center gap-3 shadow-sm text-left transition-all",
              healthFilter === id ? "ring-2 ring-primary" : "hover:bg-muted/30"
            )}
          >
            <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar projeto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          {(["all", "alta", "normal", "baixa"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPrioFilter(p)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                prioFilter === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {p === "all" ? "Toda prioridade" : PRIORITY_META[p].label}
            </button>
          ))}
        </div>

        {(compareIds.size > 0) && (
          <button
            onClick={() => setCompareIds(new Set())}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20"
          >
            <Scale className="h-3.5 w-3.5" />
            {compareIds.size} selecionados para comparar
            <X className="h-3 w-3 ml-0.5" />
          </button>
        )}
      </div>

      {compareIds.size >= 1 && (
        <p className="text-xs text-muted-foreground -mt-2">
          {compareIds.size === 1 ? "Selecione mais 1 projeto para comparar (máx. 3)." : `${compareIds.size} projetos selecionados. Veja o painel de comparação abaixo.`}
        </p>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="w-8 px-4 py-3" />
                <Th col="name"      label="Projeto"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <Th col={null}      label="Status"        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                <Th col={null}      label="Prioridade"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                <Th col="pct"       label="Progresso"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <Th col="daysLeft"  label="Prazo"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                <Th col="riskScore" label="Score Risco"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                <Th col="health"    label="Saúde"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
                : filteredRows.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhum projeto encontrado com os filtros atuais.
                    </td>
                  </tr>
                )
                : filteredRows.map(({ project: p, total, done, pct, daysLeft, health, riskScore }) => {
                  const { label: hLabel, color: hColor, bg: hBg, icon: HIcon } = HEALTH_META[health];
                  const priority = PRIORITY_META[p.priority ?? "normal"];
                  const isSelected = compareIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={cn("transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/30")}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCompare(p.id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded accent-primary cursor-pointer"
                          title="Selecionar para comparar"
                        />
                      </td>
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => navigate(`/projects/${p.id}`)}
                      >
                        <div className="font-medium text-foreground truncate max-w-[200px]">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{done}/{total} tarefas</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" onClick={() => navigate(`/projects/${p.id}`)}>
                        <span className="text-xs text-muted-foreground cursor-pointer">
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={() => navigate(`/projects/${p.id}`)}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${priority.color}`}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[130px] cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-foreground w-8 shrink-0">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
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
                      <td className="px-4 py-3 hidden lg:table-cell cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold", scoreBg(riskScore), scoreColor(riskScore))}>
                          {riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
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

        {!isLoading && filteredRows.length > 0 && (
          <div className="border-t px-4 py-3 bg-muted/20 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Progresso médio: <strong className="text-foreground ml-0.5">{Math.round(filteredRows.reduce((a, r) => a + r.pct, 0) / filteredRows.length)}%</strong>
            </span>
            <span>
              Score médio de risco: <strong className="text-foreground">{Math.round(filteredRows.reduce((a, r) => a + r.riskScore, 0) / filteredRows.length)}</strong>
            </span>
            <span>
              Tarefas: <strong className="text-foreground">{filteredRows.reduce((a, r) => a + r.done, 0)}</strong> de <strong className="text-foreground">{filteredRows.reduce((a, r) => a + r.total, 0)}</strong> concluídas
            </span>
            <span className="ml-auto text-muted-foreground">{filteredRows.length} projetos exibidos</span>
          </div>
        )}
      </div>

      {/* Member workload */}
      {memberWorkload.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Carga da Equipe</span>
            <span className="text-xs text-muted-foreground ml-1">— tarefas abertas por membro</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Membro</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abertas</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vencidas</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Concluídas</th>
                  <th className="px-4 py-2 min-w-[120px] hidden md:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {memberWorkload.map(w => {
                  const openPct = w.total > 0 ? Math.round((w.open / w.total) * 100) : 0;
                  return (
                    <tr key={w.member.id} className="bg-card hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground text-sm">{w.member.name}</div>
                        <div className="text-xs text-muted-foreground">{w.member.role}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn("font-semibold", w.open > 5 ? "text-amber-600" : "text-foreground")}>
                          {w.open}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn("font-semibold", w.overdue > 0 ? "text-red-600" : "text-muted-foreground")}>
                          {w.overdue > 0 ? w.overdue : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{w.done}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${100 - openPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 shrink-0 text-right">{100 - openPct}% ok</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {compareIds.size >= 2 && (
        <ComparePanel
          rows={allRows}
          ids={[...compareIds]}
          onClose={() => setCompareIds(new Set())}
          onNavigate={id => navigate(`/projects/${id}`)}
        />
      )}
    </div>
  );
}
