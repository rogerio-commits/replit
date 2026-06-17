import { cn } from "@/lib/utils";
import { MapPin, AlertTriangle, CheckCircle2, Circle, Loader2, ExternalLink, Clock } from "lucide-react";

const PROJECTS = [
  {
    id: 1,
    name: "Residencial Bela Vista",
    items: [
      { id: 1, peca: "Porta Principal", local: "Hall de Entrada", status: "finalizado", alert: null },
      { id: 2, peca: "Janela Sala 01", local: "Sala de Estar", status: "instalado", alert: "soon" },
      { id: 3, peca: "Janela Sala 02", local: "Sala de Estar", status: "nao_instalado", alert: "overdue" },
      { id: 4, peca: "Porta Quarto 01", local: "Quarto Principal", status: "finalizado", alert: null },
      { id: 5, peca: "Janela Quarto 02", local: "Quarto Filho", status: "instalado", alert: null },
    ],
  },
  {
    id: 2,
    name: "Comercial Torre Norte",
    items: [
      { id: 6, peca: "Fachada Vidro", local: "Fachada Principal", status: "nao_instalado", alert: "overdue" },
      { id: 7, peca: "Porta Acesso", local: "Garagem B2", status: "instalado", alert: null },
      { id: 8, peca: "Esquadria Lateral", local: "Corredor 3", status: "nao_instalado", alert: null },
    ],
  },
  {
    id: 3,
    name: "Reforma Apt 42",
    items: [
      { id: 9, peca: "Janela Varanda", local: "Varanda", status: "finalizado", alert: null },
      { id: 10, peca: "Porta Serviço", local: "Cozinha", status: "instalado", alert: null },
    ],
  },
];

const STATUS_ICON = {
  finalizado: CheckCircle2,
  instalado: Loader2,
  nao_instalado: Circle,
};
const STATUS_ICON_COLOR = {
  finalizado: "text-emerald-500",
  instalado: "text-blue-500",
  nao_instalado: "text-gray-300",
};
const STATUS_LABEL = {
  nao_instalado: "Não Instalado",
  instalado: "Instalado",
  finalizado: "Finalizado",
};

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

export function CardsView() {
  const allItems = PROJECTS.flatMap(p => p.items);
  const total = allItems.length;
  const finalizadas = allItems.filter(i => i.status === "finalizado").length;
  const alertas = allItems.filter(i => i.alert).length;
  const atrasadas = allItems.filter(i => i.alert === "overdue").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Checklist de Instalação</h1>
          <p className="text-sm text-gray-500 mt-0.5">Acompanhe o progresso por projeto</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: total, color: "text-gray-900" },
            { label: "Finalizadas", value: finalizadas, color: "text-emerald-600" },
            { label: "Alertas", value: alertas, color: "text-amber-600" },
            { label: "Atrasadas", value: atrasadas, color: "text-red-600" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Project cards */}
        <div className="space-y-4">
          {PROJECTS.map(project => {
            const done = project.items.filter(i => i.status === "finalizado").length;
            const hasOverdue = project.items.some(i => i.alert === "overdue");
            const hasSoon = project.items.some(i => i.alert === "soon");

            return (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Project header */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-900">{project.name}</h2>
                        {hasOverdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                            <AlertTriangle className="h-2.5 w-2.5" /> ATRASADO
                          </span>
                        )}
                        {!hasOverdue && hasSoon && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                            <Clock className="h-2.5 w-2.5" /> VENCE EM BREVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{done} de {project.items.length} esquadrias finalizadas</p>
                    </div>
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 shrink-0">
                      Ver projeto <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <ProgressBar value={done} total={project.items.length} />
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {project.items.map(item => {
                    const Icon = STATUS_ICON[item.status as keyof typeof STATUS_ICON];
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors",
                          item.alert === "overdue" && "bg-red-50/40 hover:bg-red-50/60",
                          item.alert === "soon" && "bg-amber-50/40 hover:bg-amber-50/60"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", STATUS_ICON_COLOR[item.status as keyof typeof STATUS_ICON_COLOR])} />

                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-sm font-medium text-gray-800",
                            item.status === "finalizado" && "line-through text-gray-400"
                          )}>
                            {item.peca}
                          </span>
                          {item.local && (
                            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 mt-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {item.local}
                            </span>
                          )}
                        </div>

                        {item.alert === "overdue" && (
                          <span className="text-[10px] font-semibold text-red-500 shrink-0">● ATRASADA</span>
                        )}
                        {item.alert === "soon" && (
                          <span className="text-[10px] font-semibold text-amber-500 shrink-0">● 2d</span>
                        )}

                        <span className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0",
                          item.status === "finalizado" && "bg-emerald-50 text-emerald-700",
                          item.status === "instalado" && "bg-blue-50 text-blue-700",
                          item.status === "nao_instalado" && "bg-gray-100 text-gray-500",
                        )}>
                          {STATUS_LABEL[item.status as keyof typeof STATUS_LABEL]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
