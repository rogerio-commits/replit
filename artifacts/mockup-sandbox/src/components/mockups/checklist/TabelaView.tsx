import { cn } from "@/lib/utils";
import { MapPin, AlertTriangle, Clock, CheckCircle2, Circle, Loader2, ExternalLink } from "lucide-react";

const MOCK_ITEMS = [
  { id: 1, projectId: 1, projectName: "Residencial Bela Vista", peca: "Porta Principal", local: "Hall de Entrada", status: "finalizado", actionDueDate: null, alert: null },
  { id: 2, projectId: 1, projectName: "Residencial Bela Vista", peca: "Janela Sala 01", local: "Sala de Estar", status: "instalado", actionDueDate: "2026-06-19", alert: "soon" },
  { id: 3, projectId: 1, projectName: "Residencial Bela Vista", peca: "Janela Sala 02", local: "Sala de Estar", status: "nao_instalado", actionDueDate: "2026-06-10", alert: "overdue" },
  { id: 4, projectId: 1, projectName: "Residencial Bela Vista", peca: "Porta Quarto 01", local: "Quarto Principal", status: "finalizado", actionDueDate: null, alert: null },
  { id: 5, projectId: 2, projectName: "Comercial Torre Norte", peca: "Fachada Vidro", local: "Fachada Principal", status: "nao_instalado", actionDueDate: "2026-06-08", alert: "overdue" },
  { id: 6, projectId: 2, projectName: "Comercial Torre Norte", peca: "Porta Acesso", local: "Garagem B2", status: "instalado", actionDueDate: "2026-06-25", alert: null },
  { id: 7, projectId: 2, projectName: "Comercial Torre Norte", peca: "Esquadria Lateral", local: "Corredor 3", status: "nao_instalado", actionDueDate: null, alert: null },
  { id: 8, projectId: 3, projectName: "Reforma Apt 42", peca: "Janela Varanda", local: "Varanda", status: "finalizado", actionDueDate: null, alert: null },
  { id: 9, projectId: 3, projectName: "Reforma Apt 42", peca: "Porta Serviço", local: "Cozinha", status: "instalado", actionDueDate: "2026-06-20", alert: null },
];

const STATUS_CONFIG = {
  nao_instalado: { label: "Não Instalado", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  instalado: { label: "Instalado", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  finalizado: { label: "Finalizado", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

export function TabelaView() {
  const total = MOCK_ITEMS.length;
  const finalizadas = MOCK_ITEMS.filter(i => i.status === "finalizado").length;
  const alertas = MOCK_ITEMS.filter(i => i.alert).length;
  const atrasadas = MOCK_ITEMS.filter(i => i.alert === "overdue").length;

  let lastProject = "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Checklist de Instalação</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão consolidada de todas as esquadrias</p>
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-8"></th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Esquadria</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Local</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Alerta</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ITEMS.map((item, idx) => {
                const showGroup = item.projectName !== lastProject;
                lastProject = item.projectName;
                const s = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                const isLast = idx === MOCK_ITEMS.length - 1 || MOCK_ITEMS[idx + 1].projectName !== item.projectName;

                return (
                  <>
                    {showGroup && (
                      <tr key={`group-${item.projectId}`} className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={5} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{item.projectName}</span>
                            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                              Ver projeto <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-gray-50/80 transition-colors",
                        !isLast && "border-b border-gray-50",
                        isLast && "border-b border-gray-100"
                      )}
                    >
                      <td className="px-4 py-2.5 text-center">
                        {item.status === "finalizado" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : item.status === "instalado" ? (
                          <Loader2 className="h-4 w-4 text-blue-500 mx-auto" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("font-medium text-gray-800", item.status === "finalizado" && "line-through text-gray-400")}>
                          {item.peca}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {item.local ? (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {item.local}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md", s.color)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {item.alert === "overdue" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
                            <AlertTriangle className="h-3 w-3" /> Atrasada
                          </span>
                        ) : item.alert === "soon" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                            <Clock className="h-3 w-3" /> 2d restantes
                          </span>
                        ) : item.actionDueDate ? (
                          <span className="text-xs text-gray-400">25 Jun</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
