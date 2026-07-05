import { cn } from "@/lib/utils";

const PROJECTS = [
  { name: "Residência Silva",       status: "em_producao",           priority: "high",   tasks: 8,  done: 5,  dueDate: "03/07" },
  { name: "Edifício Aurora",        status: "em_aprovacao",          priority: "high",   tasks: 12, done: 3,  dueDate: "06/07" },
  { name: "Loja Comercial Centro",  status: "em_instalacao",         priority: "medium", tasks: 6,  done: 6,  dueDate: "08/07" },
  { name: "Apart. Faria Lima",      status: "aguardando_instalacao", priority: "medium", tasks: 9,  done: 7,  dueDate: "12/07" },
  { name: "Casa dos Jardins",       status: "em_projeto",            priority: "low",    tasks: 4,  done: 1,  dueDate: "20/07" },
];

const STATUS_LABEL: Record<string, string> = {
  em_projeto: "Em Projeto", em_aprovacao: "Em Aprovação", em_producao: "Em Produção",
  aguardando_instalacao: "Ag. Instalação", em_instalacao: "Em Instalação", a_iniciar: "A Iniciar",
};
const STATUS_COLOR: Record<string, string> = {
  em_projeto: "bg-violet-100 text-violet-700", em_aprovacao: "bg-purple-100 text-purple-700",
  em_producao: "bg-blue-100 text-blue-700", aguardando_instalacao: "bg-amber-100 text-amber-700",
  em_instalacao: "bg-emerald-100 text-emerald-700", a_iniciar: "bg-slate-100 text-slate-600",
};
const STATUS_BAR: Record<string, string> = {
  em_projeto: "bg-violet-500", em_aprovacao: "bg-purple-500", em_producao: "bg-blue-500",
  aguardando_instalacao: "bg-amber-500", em_instalacao: "bg-emerald-500", a_iniciar: "bg-slate-400",
};

const TEAM = [
  { name: "Carlos Mendes", role: "Executor", tasks: 7, done: 5 },
  { name: "Ana Ferreira",  role: "Gestora",  tasks: 3, done: 3 },
  { name: "Pedro Souza",   role: "Executor", tasks: 9, done: 4 },
  { name: "Júlia Alves",   role: "Executora",tasks: 5, done: 5 },
];

const VISITS = [
  { date: "Hoje",   project: "Edifício Aurora",    time: "09:00", people: "Carlos, Ana" },
  { date: "Amanhã", project: "Residência Silva",   time: "14:00", people: "Pedro" },
  { date: "10/07",  project: "Loja Centro",        time: "10:00", people: "Ana, Júlia" },
];

export function VarianteB() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] p-5 space-y-4 font-sans">
      {/* Header com KPIs inline */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Operacional</h1>
          <p className="text-xs text-muted-foreground">Sexta-feira, 5 de julho de 2026</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: "Projetos", value: 27, color: "text-foreground" },
            { label: "Ativos", value: 24, color: "text-blue-600" },
            { label: "Alertas", value: 4, color: "text-red-600" },
            { label: "Tarefas concluídas", value: "53%", color: "text-emerald-600" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-lg border border-border px-4 py-2.5 text-center min-w-[90px]">
              <div className={cn("text-xl font-bold", k.color)}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Projetos Ativos - tabela densa */}
        <div className="col-span-2 bg-white rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Projetos em Andamento</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{PROJECTS.length} projetos</span>
          </div>
          <div className="space-y-2.5">
            {PROJECTS.map((p, i) => {
              const pct = Math.round((p.done / p.tasks) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", STATUS_COLOR[p.status])}>
                      {STATUS_LABEL[p.status]}
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{p.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{p.done}/{p.tasks} tarefas</span>
                      <span className="text-[10px] text-muted-foreground border rounded px-1">{p.dueDate}</span>
                      <span className={cn(
                        "text-[10px] font-semibold w-8 text-right",
                        pct === 100 ? "text-emerald-600" : pct > 50 ? "text-blue-600" : "text-amber-600"
                      )}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", STATUS_BAR[p.status])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipe + Visitas */}
        <div className="space-y-4">
          {/* Carga da equipe */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Carga da Equipe</h2>
            <div className="space-y-2.5">
              {TEAM.map((m, i) => {
                const pct = Math.round((m.done / m.tasks) * 100);
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium truncate">{m.name.split(" ")[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{m.done}/{m.tasks}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
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
                      i === 0 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
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

      {/* Fases em chips */}
      <div className="bg-white rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Distribuição por Fase</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "A Iniciar", count: 3, bg: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-400" },
            { label: "Em Projeto", count: 5, bg: "bg-violet-100", text: "text-violet-700", bar: "bg-violet-500" },
            { label: "Em Aprovação", count: 2, bg: "bg-purple-100", text: "text-purple-700", bar: "bg-purple-500" },
            { label: "Em Produção", count: 7, bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
            { label: "Ag. Instalação", count: 4, bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500" },
            { label: "Em Instalação", count: 6, bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" },
          ].map(f => (
            <div key={f.label} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 border", f.bg, "border-transparent")}>
              <div className={cn("w-2 h-2 rounded-full", f.bar)} />
              <span className={cn("text-xs font-medium", f.text)}>{f.label}</span>
              <span className={cn("text-sm font-bold ml-1", f.text)}>{f.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
