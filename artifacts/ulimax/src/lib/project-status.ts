// Fases de projeto — rótulos e cores canônicos (enum project_status do banco).
// Fonte única para telas novas; evita cada página manter sua própria cópia
// (Projetos e Kanban ainda têm cópias locais anteriores a este arquivo).

export const PROJECT_STATUSES = [
  "a_iniciar",
  "em_projeto",
  "em_aprovacao",
  "em_producao",
  "aguardando_instalacao",
  "em_instalacao",
] as const;

export type ProjectStatusId = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

export function projectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status] ?? status;
}

/** Classes de chip (badge) por fase — mesma paleta de Projetos/Kanban. */
export function projectStatusChip(status: string): string {
  switch (status) {
    case "a_iniciar":             return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
    case "em_projeto":            return "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/40";
    case "em_aprovacao":          return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40";
    case "em_producao":           return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40";
    case "aguardando_instalacao": return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40";
    case "em_instalacao":         return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40";
    default:                      return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
  }
}
