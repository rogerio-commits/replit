import {
  Briefcase, CheckSquare, AlertTriangle, Users, ArrowRight,
  TrendingUp, Clock, CheckCircle2, Circle, ChevronRight, Calendar,
} from "lucide-react";

const kpis = [
  { label: "Projetos ativos", value: "8", icon: Briefcase,     color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",  delta: "+1 este mês" },
  { label: "Tarefas abertas", value: "23", icon: CheckSquare,  color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", delta: "5 vencem hoje" },
  { label: "Vencidas",        value: "4",  icon: AlertTriangle,color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100",    delta: "↑ 2 desde ontem" },
  { label: "Equipe",          value: "12", icon: Users,        color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-100",delta: "3 em campo" },
];

const phases = [
  { label: "A Iniciar",   count: 1, color: "bg-slate-400" },
  { label: "Em Projeto",  count: 2, color: "bg-blue-400" },
  { label: "Em Aprovação",count: 1, color: "bg-amber-400" },
  { label: "Em Produção", count: 2, color: "bg-violet-500" },
  { label: "Ag. Instal.", count: 1, color: "bg-orange-400" },
  { label: "Instalação",  count: 1, color: "bg-emerald-500" },
];

const myTasks = [
  { title: "Aprovar planta baixa — Residência Santos", due: "Hoje", done: false, urgent: true },
  { title: "Enviar orçamento revisado — Comercial XYZ", due: "Amanhã", done: false, urgent: false },
  { title: "Confirmar medidas — Arq. Lima", due: "Concluída", done: true, urgent: false },
];

const activity = [
  { text: "Projeto Torre Azul avançou para Em Produção", time: "2h atrás", icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
  { text: "Tarefa vencida: Revisão estrutural — Apt 304", time: "3h atrás", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  { text: "Carlos concluiu: Medição Residência Park", time: "Ontem", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
];

export function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-xs text-slate-400">Terça, 08 de julho de 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AF</span>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4 flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">{k.label}</p>
                  <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[11px] text-slate-400">{k.delta}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Minhas tarefas</h2>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">Ver todas <ArrowRight className="h-3 w-3" /></button>
            </div>
            <div className="space-y-2">
              {myTasks.map((t, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${t.done ? "bg-slate-50 border-slate-100 opacity-60" : t.urgent ? "bg-red-50 border-red-100" : "bg-white border-slate-100"}`}>
                  {t.done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.done ? "line-through text-slate-400" : "text-slate-700"} truncate`}>{t.title}</p>
                  </div>
                  <span className={`text-[11px] shrink-0 font-medium px-2 py-0.5 rounded-full ${t.done ? "bg-emerald-100 text-emerald-600" : t.urgent ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                    {t.due}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Fases dos projetos</h2>
            <div className="space-y-2">
              {phases.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${p.color}`} />
                  <span className="text-xs text-slate-600 flex-1">{p.label}</span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Atividade recente</h2>
            <button className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">Ver tudo <ChevronRight className="h-3 w-3" /></button>
          </div>
          <div className="space-y-2">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`h-7 w-7 rounded-lg ${a.color.split(" ")[1]} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${a.color.split(" ")[0]}`} />
                  </div>
                  <p className="text-sm text-slate-600 flex-1">{a.text}</p>
                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{a.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
