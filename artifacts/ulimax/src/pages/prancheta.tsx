import { useMemo } from "react";
import { Link } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { projectStatusLabel, projectStatusChip, PROJECT_STATUSES } from "@/lib/project-status";
import { daysFromToday } from "@/lib/project-health";
import { PencilRuler, ChevronRight, XCircle, CalendarClock, Hourglass, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Minha Prancheta ──────────────────────────────────────────────────────────
// Home do projetista: bater o olho e saber o que precisa dele hoje — cliente
// reprovou, fim do projeto vencendo, aprovação parada, medição pendente.
// Cada linha leva direto ao projeto (o Trilho de Fases resolve lá).

type Atencao = {
  project: Project;
  icon: React.ElementType;
  tone: string;
  titulo: string;
  detalhe: string;
  rank: number;
};

export default function Prancheta() {
  const { data: projects, isLoading } = useListProjects();

  const { atencao, porFase } = useMemo(() => {
    const atencao: Atencao[] = [];
    const porFase = new Map<string, number>();

    for (const p of projects ?? []) {
      if (p.archived) continue;
      porFase.set(p.status, (porFase.get(p.status) ?? 0) + 1);

      if (p.approvalStatus === "rejected") {
        atencao.push({
          project: p, icon: XCircle, tone: "text-red-600", rank: 0,
          titulo: "Cliente reprovou — revisar o projeto",
          detalhe: p.approvalNote ? `Nota: "${p.approvalNote}"` : "Sem nota do cliente.",
        });
        continue;
      }
      if (p.status === "em_projeto" && p.endDate) {
        const d = daysFromToday(p.endDate);
        if (d <= 3) {
          atencao.push({
            project: p, icon: CalendarClock, tone: d < 0 ? "text-red-600" : "text-amber-600", rank: d < 0 ? 1 : 2,
            titulo: d < 0 ? `Fim do projeto venceu há ${-d}d` : d === 0 ? "Fim do projeto vence HOJE" : `Fim do projeto vence em ${d}d`,
            detalhe: "Conclua o desenho e avance a fase, ou ajuste a data no trilho.",
          });
          continue;
        }
      }
      if (p.status === "em_aprovacao" && p.approvalStatus !== "approved") {
        atencao.push({
          project: p, icon: Hourglass, tone: "text-blue-600", rank: 3,
          titulo: "Aguardando aprovação do cliente",
          detalhe: "Desenho enviado por e-mail — cobre a resposta se estiver parado.",
        });
        continue;
      }
      if (p.status === "a_iniciar" && p.medicaoDate && daysFromToday(p.medicaoDate) < 0) {
        atencao.push({
          project: p, icon: Ruler, tone: "text-violet-600", rank: 4,
          titulo: "Medição já aconteceu — concluir a fase",
          detalhe: `Medição em ${p.medicaoDate.split("-").reverse().join("/")} · avance para Projeto no trilho.`,
        });
      }
    }

    atencao.sort((a, b) => a.rank - b.rank || a.project.name.localeCompare(b.project.name));
    return { atencao, porFase };
  }, [projects]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <PencilRuler className="h-7 w-7 text-primary" />
          Minha Prancheta
        </h1>
        <p className="text-muted-foreground mt-1">O que precisa de você hoje — direto ao ponto.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Precisa de você</h2>
              <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{atencao.length}</span>
            </div>
            {atencao.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nada pendente com você. Prancheta limpa. 🎉
              </p>
            ) : (
              <div className="divide-y divide-border">
                {atencao.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link key={`${a.project.id}-${a.rank}`} href={`/projects/${a.project.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                        <Icon className={cn("h-4 w-4 shrink-0", a.tone)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {a.project.name} — <span className={a.tone}>{a.titulo}</span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{a.detalhe}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Projetos por fase</h2>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUSES.map((st) => {
                const n = porFase.get(st) ?? 0;
                if (n === 0) return null;
                return (
                  <Link key={st} href={`/projects?status=${st}`}>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 cursor-pointer hover:opacity-80", projectStatusChip(st))}>
                      {projectStatusLabel(st)} <strong className="tabular-nums">{n}</strong>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
