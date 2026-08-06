import { useMemo, useState, useRef } from "react";
import { useListProjects, useListTasks } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays, addDays, startOfWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Briefcase, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-400",
  done: "bg-emerald-500",
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  a_iniciar: "bg-slate-400",
  em_projeto: "bg-violet-500",
  em_aprovacao: "bg-purple-500",
  em_producao: "bg-blue-500",
  aguardando_instalacao: "bg-amber-400",
  em_instalacao: "bg-emerald-500",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluída",
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Na Arquitetura",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguard. Instalação",
  em_instalacao: "Em Instalação",
};

type ZoomLevel = "week" | "month" | "quarter";

const ZOOM_DAYS: Record<ZoomLevel, number> = {
  week: 21,
  month: 60,
  quarter: 120,
};

function getBarStyle(startDate: Date | null, endDate: Date | null, viewStart: Date, viewEnd: Date) {
  const totalDays = differenceInDays(viewEnd, viewStart) || 1;
  const s = startDate && startDate > viewStart ? startDate : viewStart;
  const e = endDate && endDate < viewEnd ? endDate : viewEnd;
  if (!startDate && !endDate) return null;
  const sd = startDate ? Math.max(0, differenceInDays(s, viewStart)) : 0;
  const ed = endDate ? Math.min(totalDays, differenceInDays(endDate > viewEnd ? viewEnd : endDate, viewStart) + 1) : totalDays;
  if (ed <= sd) return null;
  const left = (sd / totalDays) * 100;
  const width = ((ed - sd) / totalDays) * 100;
  return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
}

function TimelineHeader({ viewStart, viewEnd, zoom }: { viewStart: Date; viewEnd: Date; zoom: ZoomLevel }) {
  const totalDays = differenceInDays(viewEnd, viewStart) || 1;
  const months: { label: string; left: number; width: number }[] = [];
  let cur = startOfMonth(viewStart);
  while (cur <= viewEnd) {
    const ms = cur < viewStart ? viewStart : cur;
    const me = endOfMonth(cur) > viewEnd ? viewEnd : endOfMonth(cur);
    const left = (differenceInDays(ms, viewStart) / totalDays) * 100;
    const width = ((differenceInDays(me, ms) + 1) / totalDays) * 100;
    months.push({ label: format(cur, zoom === "week" ? "MMMM yyyy" : "MMM yy", { locale: ptBR }), left, width });
    cur = addMonths(cur, 1);
  }

  const weeks: { left: number; label: string }[] = [];
  if (zoom !== "quarter") {
    let wd = startOfWeek(viewStart, { weekStartsOn: 1 });
    while (wd <= viewEnd) {
      const left = (Math.max(0, differenceInDays(wd, viewStart)) / totalDays) * 100;
      weeks.push({ left, label: format(wd, "d", { locale: ptBR }) });
      wd = addDays(wd, 7);
    }
  }

  return (
    <div className="border-b border-border bg-muted/40 shrink-0">
      <div className="relative h-6 border-b border-border/50">
        {months.map((m, i) => (
          <div key={i} className="absolute top-0 h-full flex items-center px-2 border-r border-border/30 text-[11px] font-medium text-muted-foreground capitalize truncate" style={{ left: `${m.left}%`, width: `${m.width}%` }}>
            {m.label}
          </div>
        ))}
      </div>
      {zoom !== "quarter" && (
        <div className="relative h-5">
          {weeks.map((w, i) => (
            <div key={i} className="absolute top-0 h-full flex items-center px-1 border-r border-border/20 text-[10px] text-muted-foreground/60" style={{ left: `${w.left}%` }}>
              {w.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayLine({ viewStart, viewEnd }: { viewStart: Date; viewEnd: Date }) {
  const today = new Date();
  if (today < viewStart || today > viewEnd) return null;
  const totalDays = differenceInDays(viewEnd, viewStart) || 1;
  const left = (differenceInDays(today, viewStart) / totalDays) * 100;
  return (
    <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10 pointer-events-none" style={{ left: `${left}%` }}>
      <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-red-400" />
    </div>
  );
}

export default function Gantt({ asTab = false }: { asTab?: boolean } = {}) {
  const [, setLocation] = useLocation();
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [offset, setOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [filterMaterial, setFilterMaterial] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: projectsAll, isLoading: isProjectsLoading } = useListProjects();
  const { data: tasks, isLoading: isTasksLoading } = useListTasks();
  const isLoading = isProjectsLoading || isTasksLoading;

  // Madeira e Alumínio são unidades diferentes — filtra a linha do tempo por unidade.
  const projects = useMemo(
    () => (projectsAll ?? []).filter((p) => filterMaterial === "all" || p.materialType === filterMaterial),
    [projectsAll, filterMaterial],
  );

  const { viewStart, viewEnd } = useMemo(() => {
    const base = new Date();
    const totalDays = ZOOM_DAYS[zoom];
    const start = addDays(base, -Math.floor(totalDays * 0.25) + offset * Math.floor(totalDays * 0.5));
    const end = addDays(start, totalDays);
    return { viewStart: start, viewEnd: end };
  }, [zoom, offset]);

  const tasksByProject = useMemo(() => {
    const map = new Map<number, typeof tasks>();
    if (!tasks) return map;
    for (const t of tasks) {
      if (!map.has(t.projectId)) map.set(t.projectId, []);
      map.get(t.projectId)!.push(t);
    }
    return map;
  }, [tasks]);

  const totalDays = differenceInDays(viewEnd, viewStart) || 1;

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    let cur = startOfWeek(viewStart, { weekStartsOn: 1 });
    while (cur <= viewEnd) {
      const left = (Math.max(0, differenceInDays(cur, viewStart)) / totalDays) * 100;
      lines.push(left);
      cur = addDays(cur, zoom === "quarter" ? 14 : 7);
    }
    return lines;
  }, [viewStart, viewEnd, totalDays, zoom]);

  function toggleProject(id: number) {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const zoomLevels: ZoomLevel[] = ["week", "month", "quarter"];
  const zoomLabels: Record<ZoomLevel, string> = { week: "Semana", month: "Mês", quarter: "Trimestre" };

  const zoomControls = (
    <div className="flex items-center gap-2 shrink-0">
      <Select value={filterMaterial} onValueChange={setFilterMaterial}>
        <SelectTrigger className="w-40" data-testid="select-filter-material-gantt">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Madeira e Alumínio</SelectItem>
          <SelectItem value="madeira">Madeira</SelectItem>
          <SelectItem value="aluminio">Alumínio</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center rounded-md border border-border overflow-hidden text-sm">
        {zoomLevels.map(z => (
          <button key={z} onClick={() => { setZoom(z); setOffset(0); }} className={cn("px-3 py-1.5 transition-colors", zoom === z ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}>
            {zoomLabels[z]}
          </button>
        ))}
      </div>
      <Button variant="outline" size="icon" onClick={() => setOffset(o => o - 1)} title="Anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => setOffset(0)}>Hoje</Button>
      <Button variant="outline" size="icon" onClick={() => setOffset(o => o + 1)} title="Próximo">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className={cn("flex flex-col animate-in fade-in duration-500", asTab ? "h-full" : "h-[calc(100vh-8rem)]")}>
      {/* Page Header */}
      {asTab ? (
        <div className="flex justify-end mb-3 shrink-0">{zoomControls}</div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gantt</h1>
            <p className="text-muted-foreground mt-1">Linha do tempo de projetos e tarefas.</p>
          </div>
          {zoomControls}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
          <Briefcase className="h-10 w-10 opacity-20" />
          <p>Nenhum projeto encontrado.</p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          {/* Left Labels Column */}
          <div className="w-56 shrink-0 border-r border-border flex flex-col">
            <div className={cn("shrink-0 border-b border-border bg-muted/40", zoom !== "quarter" ? "h-11" : "h-6")} />
            <div className="flex-1 overflow-hidden">
              {projects.map(project => {
                const projTasks = tasksByProject.get(project.id) ?? [];
                const isExpanded = expandedProjects.has(project.id);
                return (
                  <div key={project.id} className="border-b border-border/50 last:border-0">
                    <div
                      className="flex items-center gap-2 px-3 h-10 cursor-pointer hover:bg-muted/30 transition-colors group"
                      onClick={() => toggleProject(project.id)}
                    >
                      <button className="shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground">
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                      </button>
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                      <span
                        className="text-xs font-semibold text-foreground truncate flex-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={(e) => { e.stopPropagation(); setLocation(`/projects/${project.id}`); }}
                        title={project.name}
                      >
                        {project.name}
                      </span>
                    </div>
                    {isExpanded && projTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-3 h-8 pl-8 border-t border-border/30 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => setLocation("/tasks")}
                        title={task.title}
                      >
                        <CheckSquare className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                        <span className="text-[11px] text-muted-foreground truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-x-auto" ref={scrollRef}>
            <TimelineHeader viewStart={viewStart} viewEnd={viewEnd} zoom={zoom} />

            <div className="flex-1 overflow-y-auto relative">
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                {gridLines.map((left, i) => (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: `${left}%` }} />
                ))}
                <TodayLine viewStart={viewStart} viewEnd={viewEnd} />
              </div>

              {/* Project rows */}
              {projects.map(project => {
                const projTasks = tasksByProject.get(project.id) ?? [];
                const isExpanded = expandedProjects.has(project.id);

                const projStart = project.startDate ? new Date(project.startDate) : null;
                const projEnd = project.endDate ? new Date(project.endDate) : project.finalDate ? new Date(project.finalDate) : null;
                const projBar = getBarStyle(projStart, projEnd, viewStart, viewEnd);
                const colorClass = PROJECT_STATUS_COLORS[project.status] ?? "bg-slate-400";

                return (
                  <div key={project.id} className="border-b border-border/50 last:border-0">
                    {/* Project row */}
                    <div className="relative h-10 group">
                      {projBar && (
                        <div
                          className={cn("absolute top-1/2 -translate-y-1/2 h-5 rounded-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2 overflow-hidden shadow-sm", colorClass)}
                          style={projBar}
                          onClick={() => setLocation(`/projects/${project.id}`)}
                          title={`${project.name} — ${STATUS_LABELS[project.status] ?? project.status}`}
                        >
                          <span className="text-[10px] text-white font-medium truncate whitespace-nowrap">{project.name}</span>
                        </div>
                      )}
                      {!projBar && (
                        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                          <span className="text-[10px] text-muted-foreground/30 italic">sem datas definidas</span>
                        </div>
                      )}
                    </div>

                    {/* Task sub-rows */}
                    {isExpanded && projTasks.map(task => {
                      const taskStart = task.createdAt ? new Date(task.createdAt) : null;
                      const taskEnd = task.dueDate ? new Date(task.dueDate) : task.status === "done" && task.completedAt ? new Date(task.completedAt) : null;
                      const taskBar = getBarStyle(taskStart, taskEnd, viewStart, viewEnd);
                      const taskColor = STATUS_COLORS[task.status] ?? "bg-slate-400";
                      return (
                        <div key={task.id} className="relative h-8 border-t border-border/30">
                          {taskBar && (
                            <div
                              className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-1.5 overflow-hidden", taskColor)}
                              style={taskBar}
                              title={`${task.title} — ${STATUS_LABELS[task.status] ?? task.status}`}
                            >
                              <span className="text-[9px] text-white font-medium truncate whitespace-nowrap">{task.title}</span>
                            </div>
                          )}
                          {task.dueDate && (() => {
                            const due = new Date(task.dueDate);
                            if (due < viewStart || due > viewEnd) return null;
                            const left = (differenceInDays(due, viewStart) / totalDays) * 100;
                            return (
                              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-2 border-amber-400 bg-card z-10" style={{ left: `calc(${left}% - 4px)` }} title={`Prazo: ${format(due, "d MMM yyyy", { locale: ptBR })}`} />
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 shrink-0 text-[11px] text-muted-foreground">
        <span className="font-medium">Legenda:</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-emerald-500 inline-block" /> Concluída</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-blue-500 inline-block" /> Em Andamento</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-amber-400 inline-block" /> Em Revisão</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-slate-400 inline-block" /> A Fazer</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 border-2 border-amber-400 bg-card inline-block" /> Prazo</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-red-400 inline-block" /> Hoje</span>
        <span className="ml-auto italic opacity-60">Clique no nome do projeto para expandir tarefas</span>
      </div>
    </div>
  );
}
