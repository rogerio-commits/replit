// Controle de acesso por papel (client-side): quais rotas cada papel enxerga
// e qual é a página inicial de cada um. A autorização real continua no servidor.

export type SystemRole = "gestor" | "gestor_obras" | "executor" | "observador";

const HOME_BY_ROLE: Record<SystemRole, string> = {
  gestor: "/meu-dia",
  gestor_obras: "/obra",
  executor: "/prancheta",
  observador: "/dashboard",
};

// Rotas permitidas por papel (gestor tem acesso total).
const EXECUTOR_PREFIXES = [
  "/prancheta",
  "/meu-dia",
  "/tasks",
  "/kanban",
  "/projects",
  "/checklist",
  "/calendario",
  "/ajuda",
];

// Gestor de Obras: toda a operação (obra + projetos/tarefas), sem as áreas
// administrativas (equipe, templates, automações, auditoria etc.).
const GESTOR_OBRAS_PREFIXES = [
  "/painel-obra",
  "/obra",
  "/cobrancas",
  "/agenda",
  "/meu-dia",
  "/tasks",
  "/kanban",
  "/projects",
  "/checklist",
  "/calendario",
  "/assistencia-tecnica",
  "/controle-amostras",
  "/gantt",
  "/ajuda",
];

const OBSERVADOR_PREFIXES = [
  "/dashboard",
  "/projects",
  "/calendario",
  "/ajuda",
];

// Caminhos antigos que redirecionam imediatamente — sempre liberados para o
// redirect poder rodar (o destino é validado de novo pelo guard).
// URLs antigos de AT/Amostras agora redirecionam para /obra — sempre liberar
// para o <Redirect> poder rodar antes de qualquer RoleGate.
const LEGACY_PATHS = ["/alertas", "/produtividade", "/access", "/portfolio", "/assistencia-tecnica", "/controle-amostras", "/gantt"];

function matchesAny(prefixes: string[], path: string): boolean {
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}

export function homeForRole(role: string | undefined | null): string {
  return HOME_BY_ROLE[(role as SystemRole) ?? "executor"] ?? "/meu-dia";
}

export function canAccessRoute(role: string | undefined | null, path: string): boolean {
  if (!role || role === "gestor") return true;
  if (matchesAny(LEGACY_PATHS, path)) return true;
  if (role === "gestor_obras") return matchesAny(GESTOR_OBRAS_PREFIXES, path);
  if (role === "executor") return matchesAny(EXECUTOR_PREFIXES, path);
  if (role === "observador") return matchesAny(OBSERVADOR_PREFIXES, path);
  return true;
}
