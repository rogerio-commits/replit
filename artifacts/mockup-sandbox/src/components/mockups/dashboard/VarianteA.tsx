import { cn } from "@/lib/utils";

const PHASE_CONFIG = [
  { id: "a_iniciar",             label: "A Iniciar",       color: "text-slate-600",   bg: "bg-slate-100",   bar: "bg-slate-400",   count: 3 },
  { id: "em_projeto",            label: "Em Projeto",      color: "text-violet-700",  bg: "bg-violet-100",  bar: "bg-violet-500",  count: 5 },
  { id: "em_aprovacao",          label: "Em Aprovação",    color: "text-purple-700",  bg: "bg-purple-100",  bar: "bg-purple-500",  count: 2 },
  { id: "em_producao",           label: "Em Produção",     color: "text-blue-700",    bg: "bg-blue-100",    bar: "bg-blue-500",    count: 7 },
  { id: "aguardando_instalacao", label: "Ag. Instalação",  color: "text-amber-700",   bg: "bg-amber-100",   bar: "bg-amber-500",   count: 4 },
  { id: "em_instalacao",         label: "Em Instalação",   color: "text-emerald-700", bg: "bg-emerald-100", bar: "bg-emerald-500", count: 6 },
];

const total = PHASE_CONFIG.reduce((s, p) => s + p.count, 0);

const ALERTS = [
  { name: "Residência Silva", field: "Fim Est. Prod.", days: -3, level: "overdue" },
  { name: "Edifício Aurora", field: "Final Proj.", days: -1, level: "overdue" },
  { name: "Loja Comercial Centro", field: "Medição", days: 2, level: "soon" },
  { name: "Apart. Faria Lima", field: "Fim Est. Proj.", days: 5, level: "soon" },
];

const TASKS = [
  { project: "Residência Silva", title: "Corte de perfis alumínio", status: "in_progress" },
  { project: "Edifício Aurora", title: "Aprovação planta técnica", status: "review" },
  { project: "Loja Centro", title: "Entrega de vidros", status: "todo" },
  { project: "Apart. Faria Lima", title: "Montagem esquadrias", status: "done" },
  { project: "Casa Jardins", title: "Vistoria final", status: "done" },
];

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string | number; sub: string; accent?: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={cn("text-2xl font-bold", accent ?? "text-foreground")}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

export function VarianteA() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 space-y-5 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos projetos e alertas.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon="📁" label="Total de Projetos" value={total} sub="3 a iniciar · 6 em instalação" />
        <KpiCard icon="⚡" label="Projetos Ativos" value={24} sub="em projeto, produção ou instalação" />
        <KpiCard icon="⚠️" label="Alertas de Prazo" value={4} sub="2 vencidos · 2 próximos" accent="text-red-600" />
        <KpiCard icon="✅" label="Tarefas Concluídas" value="18/34" sub="3 tarefas atrasadas" />
      </div>

      {/* Pipeline de Fases */}
      <div className="bg-white rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Pipeline de Projetos</h2>
        <div className="flex gap-2 items-end h-28">
          {PHASE_CONFIG.map((phase, i) => (
            <div key={phase.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex flex-col-reverse rounded-md overflow-hidden" style={{ height: 80 }}>
                <div
                  className={cn("transition-all w-full rounded-md", phase.bar)}
                  style={{ height: `${Math.round((phase.count / Math.max(...PHASE_CONFIG.map(p => p.count))) * 80)}px` }}
                />
              </div>
              <div className={cn("text-lg font-bold", phase.color)}>{phase.count}</div>
              <div className="text-[10px] text-center leading-tight text-muted-foreground font-medium">{phase.label}</div>
            </div>
          ))}
        </div>
        {/* flow arrow */}
        <div className="mt-3 flex items-center gap-0">
          {PHASE_CONFIG.map((phase, i) => (
            <div key={phase.id} className="flex-1 flex items-center">
              <div className={cn("h-1.5 flex-1 rounded-sm", phase.bar, "opacity-40")} />
              {i < PHASE_CONFIG.length - 1 && (
                <div className="text-muted-foreground text-xs px-0.5">▶</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Tarefas */}
        <div className="col-span-3 bg-white rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Tarefas Recentes</h2>
          <div className="space-y-2">
            {TASKS.map((t, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  t.status === "done" ? "bg-emerald-500" : t.status === "in_progress" ? "bg-blue-500" : t.status === "review" ? "bg-amber-500" : "bg-slate-300"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.project}</p>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                  t.status === "done" ? "bg-emerald-100 text-emerald-700" :
                  t.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  t.status === "review" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {t.status === "done" ? "Concluída" : t.status === "in_progress" ? "Em Andamento" : t.status === "review" ? "Revisão" : "A Fazer"}
                </span>
              </div>
            ))}
          </div>
          {/* mini progress */}
          <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progresso Geral</span><span className="font-medium text-foreground">18 / 34 (53%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "53%" }} />
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="col-span-2 bg-white rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> Alertas de Prazo
          </h2>
          <div className="space-y-2">
            {ALERTS.map((a, i) => (
              <div key={i} className={cn(
                "rounded-lg px-3 py-2 text-sm",
                a.level === "overdue" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
              )}>
                <div className="font-medium text-foreground truncate text-xs">{a.name}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{a.field}</span>
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    a.level === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {a.level === "overdue" ? `${Math.abs(a.days)}d atraso` : a.days === 0 ? "hoje" : `${a.days}d`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Material */}
          <div className="mt-4 pt-3 border-t space-y-3">
            <h3 className="text-xs font-semibold text-foreground">Material</h3>
            {[{ label: "Madeira", count: 15, color: "bg-amber-400" }, { label: "Alumínio", count: 12, color: "bg-blue-400" }].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-medium">{m.count} ({Math.round(m.count / total * 100)}%)</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", m.color)} style={{ width: `${Math.round(m.count / total * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
