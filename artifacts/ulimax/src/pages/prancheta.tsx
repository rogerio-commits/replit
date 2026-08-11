import { useMemo } from "react";
import { Link } from "wouter";
import { useListProjects, useListMembers } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { projectStatusLabel, projectStatusChip, PROJECT_STATUSES } from "@/lib/project-status";
import { daysFromToday } from "@/lib/project-health";
import { PencilRuler, ChevronRight, XCircle, CalendarClock, Hourglass, Ruler, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppUser } from "@/hooks/useAppUser";
import { MinhasAtividades } from "@/components/minhas-atividades";

// ── Minha Prancheta ──────────────────────────────────────────────────────────
// Home ÚNICA do projetista: o que precisa dele (cliente reprovou, fim do
// projeto vencendo, aprovação parada, medição pendente) + as tarefas dele
// (Minhas Atividades, absorvida do Meu Dia — que saiu do menu do projetista)
// + os projetos em que ele é participante, com fase e prazo.
// Cada linha leva direto ao projeto (o Trilho de Fases resolve lá).

function fmtBr(iso?: string | null): string | null {
  if (!iso) return null;
  const p = iso.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

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
  const { data: members } = useListMembers();
  const { data: me } = useAppUser();

  // Projetos em que o usuário logado é participante.
  const meusProjetos = useMemo(() => {
    const myId = members?.find((m) => m.email.toLowerCase() === (me?.email ?? "").toLowerCase())?.id;
    if (!myId || !projects) return [];
    return (projects as Project[])
      .filter((p) => !p.archived && p.participants?.some((part) => part.memberId === myId))
      .sort((a, b) => {
        // Quem tem prazo mais próximo primeiro; sem prazo vai para o fim.
        const da = a.endDate ? daysFromToday(a.endDate) : 9999;
        const db = b.endDate ? daysFromToday(b.endDate) : 9999;
        return da - db;
      });
  }, [projects, members, me]);

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

          <MinhasAtividades />

          {/* Projetos em que ele entra — a carteira dele, com fase e prazo */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground leading-tight">Meus projetos</h2>
                <p className="text-[11px] text-muted-foreground leading-tight">Onde você é participante — do prazo mais próximo ao mais distante</p>
              </div>
              <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{meusProjetos.length}</span>
            </div>
            {meusProjetos.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Você ainda não é participante de nenhum projeto — peça ao gestor para incluir você.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {meusProjetos.map((p) => {
                  const d = p.endDate ? daysFromToday(p.endDate) : null;
                  const pct = p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : null;
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.endDate ? `entrega ${fmtBr(p.endDate)}` : "sem prazo de entrega"}
                            {pct !== null ? ` · ${p.taskDone}/${p.taskTotal} tarefas` : ""}
                          </p>
                        </div>
                        <span className={cn("shrink-0 text-[11px] font-medium border rounded-full px-2 py-0.5", projectStatusChip(p.status))}>
                          {projectStatusLabel(p.status)}
                        </span>
                        {d !== null && d <= 7 && (
                          <span className={cn(
                            "shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                            d < 0
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
                          )}>
                            {d < 0 ? `há ${-d}d` : d === 0 ? "hoje" : `em ${d}d`}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Todos os projetos por fase</h2>
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
