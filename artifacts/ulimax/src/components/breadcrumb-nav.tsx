import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { useListProjects } from "@workspace/api-client-react";

const ROUTE_LABELS: Record<string, string> = {
  "/meu-dia": "Meu Dia",
  "/dashboard": "Dashboard",
  "/projects": "Projetos",
  "/tasks": "Trabalho",
  "/members": "Equipe",
  "/obra": "Central da Obra",
  "/checklist": "Instalações",
  "/calendario": "Calendário",
  "/assistencia-tecnica": "Assistência Técnica",  // redireciona → /obra
  "/controle-amostras": "Amostras",              // redireciona → /obra
  "/gantt": "Gantt",
  "/templates": "Templates",
  "/campos-personalizados": "Campos Personalizados",
  "/automacao": "Automações",
  "/auditoria": "Auditoria",
  "/ajuda": "Ajuda",
};

export function BreadcrumbNav() {
  const [location] = useLocation();
  const { data: projects } = useListProjects({});

  const projectDetailMatch = location.match(/^\/projects\/(\d+)/);
  const projectId = projectDetailMatch ? parseInt(projectDetailMatch[1], 10) : null;
  const project = projectId ? projects?.find((p) => p.id === projectId) : null;

  const segments: { label: string; href?: string }[] = [];

  if (projectId) {
    segments.push({ label: "Projetos", href: "/projects" });
    segments.push({ label: project?.name ?? "Projeto" });
  } else {
    const label = ROUTE_LABELS[location];
    if (label) segments.push({ label });
  }

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      <span className="text-muted-foreground/50 text-xs font-medium">Ulimax</span>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          {seg.href ? (
            <a
              href={seg.href}
              className="text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
            >
              {seg.label}
            </a>
          ) : (
            <span className="text-foreground text-xs font-semibold truncate max-w-[200px]">
              {seg.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
