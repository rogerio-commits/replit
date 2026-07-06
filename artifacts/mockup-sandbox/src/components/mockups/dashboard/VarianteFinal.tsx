import { cn } from "@/lib/utils";

const PHASE_CONFIG = [
  { id: "a_iniciar",    label: "A Iniciar",      color: "text-slate-600",   bar: "bg-slate-400",   madeira: 2, aluminio: 1 },
  { id: "em_projeto",   label: "Em Projeto",     color: "text-violet-700",  bar: "bg-violet-500",  madeira: 3, aluminio: 2 },
  { id: "em_aprovacao", label: "Em Aprovação",   color: "text-purple-700",  bar: "bg-purple-500",  madeira: 1, aluminio: 1 },
  { id: "em_producao",  label: "Em Produção",    color: "text-blue-700",    bar: "bg-blue-500",    madeira: 4, aluminio: 3 },
  { id: "ag_instalacao",label: "Ag. Instalação", color: "text-amber-700",   bar: "bg-amber-500",   madeira: 2, aluminio: 2 },
  { id: "em_instalacao",label: "Em Instalação",  color: "text-emerald-700", bar: "bg-emerald-500", madeira: 3, aluminio: 3 },
];

const maxCount = Math.max(...PHASE_CONFIG.map(p => p.madeira + p.aluminio));

const PROJECTS = [
  { name: "Residência Silva",      status: "em_producao",   priority: "high",   tasks: 8,  done: 5, dueDate: "03/07", overdue: true  },
  { name: "Edifício Aurora",       status: "em_aprovacao",  priority: "high",   tasks: 12, done: 3, dueDate: "06/07", overdue: true  },
  { name: "Loja Comercial Centro", status: "em_instalacao", priority: "medium", tasks: 6,  done: 6, dueDate: "08/07", overdue: false },
  { name: "Apart. Faria Lima",     status: "ag_instalacao", priority: "medium", tasks: 9,  done: 7, dueDate: "12/07", overdue: false },
  { name: "Casa dos Jardins",      status: "em_projeto",    priority: "low",    tasks: 4,  done: 1, dueDate: "20/07", overdue: false },
];

const STATUS_LABEL: Record<string, string> = {
  em_projeto: "Em Projeto", em_aprovacao: "Em Aprovação", em_producao: "Em Produção",
  ag_instalacao: "Ag. Instalação", em_instalacao: "Em Instalação", a_iniciar: "A Iniciar",
};
const STATUS_PILL: Record<string, string> = {
  em_projeto:    "bg-violet-100 text-violet-700",
  em_aprovacao:  "bg-purple-100 text-purple-700",
  em_producao:   "bg-blue-100 text-blue-700",
  ag_instalacao: "bg-amber-100 text-amber-700",
  em_instalacao: "bg-emerald-100 text-emerald-700",
  a_iniciar:     "bg-slate-100 text-slate-600",
};
const STATUS_BAR: Record<string, string> = {
  em_projeto:    "bg-violet-500",
  em_aprovacao:  "bg-purple-500",
  em_producao:   "bg-blue-500",
  ag_instalacao: "bg-amber-500",
  em_instalacao: "bg-emerald-500",
  a_iniciar:     "bg-slate-400",
};

const TEAM = [
  { name: "Carlos Mendes", initials: "CM", tasks: 7,  done: 5 },
  { name: "Ana Ferreira",  initials: "AF", tasks: 3,  done: 3 },
  { name: "Pedro Souza",   initials: "PS", tasks: 9,  done: 4 },
  { name: "Júlia Alves",   initials: "JA", tasks: 5,  done: 5 },
];

const VISITS = [
  { date: "Hoje",   project: "Edifício Aurora",  time: "09:00", people: "Carlos, Ana",  today: true  },
  { date: "Amanhã", project: "Residência Silva", time: "14:00", people: "Pedro",        today: false },
  { date: "10/07",  project: "Loja Centro",      time: "10:00", people: "Ana, Júlia",  today: false },
];

const ACTIVITY = [
  { icon: "✅", text: "Montagem esquadrias concluída",        project: "Apart. Faria Lima", time: "10 min" },
  { icon: "🔵", text: "Projeto avançou para Em Produção",    project: "Casa dos Jardins",  time: "42 min" },
  { icon: "💬", text: "Novo comentário na tarefa de medição", project: "Edifício Aurora",   time: "1h"     },
  { icon: "➕", text: "3 tarefas adicionadas ao projeto",    project: "Residência Silva",  time: "2h"     },
  { icon: "⚠️", text: "Prazo de finalização venceu ontem",   project: "Loja Comercial",    time: "3h"     },
];

const ALERTS = [
  { name: "Residência Silva", field: "Fim Produção", days: -3, level: "overdue" },
  { name: "Edifício Aurora",  field: "Final Proj.",  days: -1, level: "overdue" },
  { name: "Loja Centro",      field: "Medição",      days: 2,  level: "soon"    },
  { name: "Faria Lima",       field: "Fim Proj.",    days: 5,  level: "soon"    },
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

export function VarianteFinal() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 space-y-5 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos projetos, equipe e alertas.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total de Projetos — com breakdown de material */}
        <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total de Projetos</span>
            <span className="text-lg">📁</span>
          </div>
          <div className="text-2xl font-bold text-foreground">27</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              Madeira <strong>15</strong>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              Alumínio <strong>12</strong>
            </span>
          </div>
        </div>
        <KpiCard icon="⚡" label="Projetos Ativos"   value={24} sub="em projeto, produção ou instalação" accent="text-blue-600" />
        <KpiCard icon="🚨" label="Alertas de Prazo"  value={4}  sub="2 vencidos · 2 próximos" accent="text-red-600" />
        <KpiCard icon="✅" label="Tarefas Concluídas" value="53%" sub="18 de 34 tarefas" accent="text-emerald-600" />
      </div>

      {/* Pipeline de Fases */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Pipeline de Projetos</h2>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400 shrink-0" /> Madeira
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-400 shrink-0" /> Alumínio
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-end" style={{ height: 96 }}>
          {PHASE_CONFIG.map((phase) => {
            const total = phase.madeira + phase.aluminio;
            const barH = Math.round((total / maxCount) * 72);
            const mH = Math.round((phase.madeira / total) * barH);
            const aH = barH - mH;
            return (
              <div key={phase.id} className="flex-1 flex flex-col items-center gap-1.5">
                {/* stacked bar: alumínio on top, madeira on bottom */}
                <div className="w-full flex flex-col-reverse rounded-lg overflow-hidden" style={{ height: 72 }}>
                  <div className="w-full bg-amber-400 shrink-0" style={{ height: mH }} title={`Madeira: ${phase.madeira}`} />
                  <div className="w-full bg-blue-400 shrink-0" style={{ height: aH }} title={`Alumínio: ${phase.aluminio}`} />
                </div>
                {/* count chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-amber-600">{phase.madeira}</span>
                  <span className="text-[9px] text-muted-foreground">/</span>
                  <span className="text-[10px] font-bold text-blue-600">{phase.aluminio}</span>
                </div>
                <div className="text-[10px] text-center leading-tight text-muted-foreground font-medium px-0.5">{phase.label}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-0.5">
          {PHASE_CONFIG.map((phase, i) => (
            <div key={phase.id} className="flex-1 flex items-center">
              <div className={cn("h-1.5 flex-1 rounded-sm opacity-30", phase.bar)} />
              {i < PHASE_CONFIG.length - 1 && <span className="text-muted-foreground text-[10px] px-0.5">▶</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Middle row: projetos + sidebar */}
      <div className="grid grid-cols-5 gap-4">
        {/* Tabela de projetos */}
        <div className="col-span-3 bg-white rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Projetos em Andamento</h2>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{PROJECTS.length} projetos</span>
          </div>
          <div className="space-y-3">
            {PROJECTS.map((p, i) => {
              const pct = Math.round((p.done / p.tasks) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", STATUS_PILL[p.status])}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{p.done}/{p.tasks}</span>
                    <span className={cn(
                      "text-[10px] border rounded px-1 shrink-0",
                      p.overdue ? "border-red-200 text-red-600 bg-red-50" : "text-muted-foreground"
                    )}>{p.dueDate}</span>
                    <span className={cn(
                      "text-[10px] font-semibold w-8 text-right shrink-0",
                      pct === 100 ? "text-emerald-600" : pct > 50 ? "text-blue-600" : "text-amber-600"
                    )}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", STATUS_BAR[p.status])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: equipe + visitas */}
        <div className="col-span-2 space-y-4">
          {/* Carga da equipe */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Carga da Equipe</h2>
            <div className="space-y-2.5">
              {TEAM.map((m, i) => {
                const pct = Math.round((m.done / m.tasks) * 100);
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">{m.name.split(" ")[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{m.done}/{m.tasks}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-violet-400")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Próximas visitas */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              📍 Próximas Visitas
            </h2>
            <div className="space-y-2">
              {VISITS.map((v, i) => (
                <div key={i} className="flex gap-2.5 pb-2 border-b last:border-0 last:pb-0">
                  <div className="text-center min-w-[44px]">
                    <div className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      v.today ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    )}>{v.date}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{v.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.project}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{v.people}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: alertas + feed */}
      <div className="grid grid-cols-5 gap-4">
        {/* Alertas */}
        <div className="col-span-2 bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-foreground">Alertas de Prazo</h2>
            <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">4</span>
          </div>
          <div className="space-y-2">
            {ALERTS.map((a, i) => (
              <div key={i} className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2",
                a.level === "overdue" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"
              )}>
                <span>{a.level === "overdue" ? "🔴" : "🟡"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.field}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  a.level === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                )}>
                  {a.level === "overdue" ? `${Math.abs(a.days)}d atraso` : `${a.days}d`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed de atividade */}
        <div className="col-span-3 bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
          </div>
          <div className="space-y-0">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex gap-3 pb-3 relative">
                {i < ACTIVITY.length - 1 && (
                  <div className="absolute left-[10px] top-5 bottom-0 w-px bg-border" />
                )}
                <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] shrink-0 z-10">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.project} · há {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
