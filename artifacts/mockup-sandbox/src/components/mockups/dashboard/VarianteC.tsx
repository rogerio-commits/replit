import { cn } from "@/lib/utils";

const ACTIVITY = [
  { type: "task_done",     text: "Montagem esquadrias concluída",          project: "Apart. Faria Lima",  time: "há 10 min",  icon: "✅" },
  { type: "project",       text: "Projeto avançou para Em Produção",       project: "Casa dos Jardins",   time: "há 42 min",  icon: "🔵" },
  { type: "comment",       text: "Novo comentário na tarefa de medição",   project: "Edifício Aurora",    time: "há 1h",      icon: "💬" },
  { type: "task_created",  text: "3 tarefas adicionadas ao projeto",       project: "Residência Silva",   time: "há 2h",      icon: "➕" },
  { type: "deadline",      text: "Prazo de finalização venceu ontem",      project: "Loja Comercial",     time: "há 3h",      icon: "⚠️" },
  { type: "task_done",     text: "Aprovação planta técnica concluída",     project: "Edifício Aurora",    time: "Ontem",      icon: "✅" },
];

const PHASES = [
  { label: "A Iniciar",      count: 3,  total: 27, color: "#94a3b8" },
  { label: "Em Projeto",     count: 5,  total: 27, color: "#8b5cf6" },
  { label: "Em Aprovação",   count: 2,  total: 27, color: "#a855f7" },
  { label: "Em Produção",    count: 7,  total: 27, color: "#3b82f6" },
  { label: "Ag. Instalação", count: 4,  total: 27, color: "#f59e0b" },
  { label: "Em Instalação",  count: 6,  total: 27, color: "#10b981" },
];

const ALERTS = [
  { name: "Residência Silva", field: "Fim Produção", days: -3, level: "overdue" },
  { name: "Edifício Aurora",  field: "Final Proj.",  days: -1, level: "overdue" },
  { name: "Loja Centro",      field: "Medição",      days: 2,  level: "soon" },
  { name: "Faria Lima",       field: "Fim Proj.",    days: 5,  level: "soon" },
];

function DonutSegment({ phases }: { phases: typeof PHASES }) {
  const r = 52, cx = 64, cy = 64, strokeW = 14;
  const circ = 2 * Math.PI * r;
  const total = phases.reduce((s, p) => s + p.count, 0);
  let offset = 0;

  return (
    <svg width={128} height={128} className="rotate-[-90deg]">
      {phases.map((p, i) => {
        const pct = p.count / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={p.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export function VarianteC() {
  return (
    <div className="min-h-screen bg-white p-6 space-y-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sexta, 5 jul 2026 · Ulimax &amp; Co.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">Atualizado agora</div>
        </div>
      </div>

      {/* KPIs - spacious */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total de Projetos", value: 27, sub: "↑ 2 este mês", icon: "📁", accent: "" },
          { label: "Projetos Ativos",   value: 24, sub: "88% do total",  icon: "⚡", accent: "text-blue-600" },
          { label: "Alertas de Prazo",  value: 4,  sub: "2 urgentes",    icon: "🚨", accent: "text-red-600" },
          { label: "Tarefas Concluídas",value: "53%", sub: "18 de 34",  icon: "✅", accent: "text-emerald-600" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-[#fafafa] p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <span className="text-base">{k.icon}</span>
            </div>
            <p className={cn("text-3xl font-bold", k.accent || "text-foreground")}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {/* Atividade recente */}
        <div className="col-span-3 rounded-xl border border-border bg-[#fafafa] p-4">
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
                <div className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center text-[10px] shrink-0 z-10">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.project} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donuts + Alertas */}
        <div className="col-span-4 space-y-4">
          {/* Donut de fases */}
          <div className="rounded-xl border border-border bg-[#fafafa] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-violet-500" />
              <h2 className="text-sm font-semibold text-foreground">Projetos por Fase</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <DonutSegment phases={PHASES} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground">27</span>
                  <span className="text-[9px] text-muted-foreground">projetos</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
                {PHASES.map(p => (
                  <div key={p.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-[10px] text-muted-foreground flex-1 truncate">{p.label}</span>
                    <span className="text-[10px] font-bold text-foreground">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="rounded-xl border border-border bg-[#fafafa] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-red-500" />
              <h2 className="text-sm font-semibold text-foreground">Alertas de Prazo</h2>
              <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">4</span>
            </div>
            <div className="space-y-2">
              {ALERTS.map((a, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  a.level === "overdue" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"
                )}>
                  <span className="text-sm">{a.level === "overdue" ? "🔴" : "🟡"}</span>
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
        </div>
      </div>
    </div>
  );
}
