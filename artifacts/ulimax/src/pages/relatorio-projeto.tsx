import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGetProject, useListTasks, useListProjectMilestones } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeProjectHealth, daysFromToday, parseLocalDate, FAROL_META } from "@/lib/project-health";

// ── Relatório de status em 1 clique ──────────────────────────────────────────
// Página limpa e imprimível com a fotografia do projeto: farol, progresso,
// datas, marcos e tarefas. "Imprimir / Salvar PDF" gera o arquivo na hora.

const STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
  concluido: "Concluído",
};

function fmtDate(val?: string | null) {
  if (!val) return "—";
  try { return format(parseLocalDate(val), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
}

export default function RelatorioProjeto() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();

  const { data: project, isLoading: pLoading } = useGetProject(projectId);
  const { data: tasks, isLoading: tLoading } = useListTasks({ projectId });
  const { data: milestones } = useListProjectMilestones(projectId);

  const loading = pLoading || tLoading;

  const info = useMemo(() => {
    const list = tasks ?? [];
    const done = list.filter((t) => t.status !== "done" ? false : true);
    const open = list.filter((t) => t.status !== "done");
    const overdue = open
      .filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0)
      .sort((a, b) => daysFromToday(a.dueDate!) - daysFromToday(b.dueDate!));
    const inProgress = open
      .filter((t) => !overdue.includes(t))
      .sort((a, b) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1);
    const doneRecent = done
      .filter((t) => t.completedAt && -daysFromToday(t.completedAt) <= 7)
      .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1));
    const pct = list.length > 0 ? Math.round((done.length / list.length) * 100) : 0;
    return { total: list.length, done: done.length, open: open.length, overdue, inProgress, doneRecent, pct };
  }, [tasks]);

  const health = useMemo(
    () => (project ? computeProjectHealth(project, tasks ?? []) : null),
    [project, tasks]
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button className="mt-4" onClick={() => setLocation("/projects")}>Voltar para Projetos</Button>
      </div>
    );
  }

  const meta = health ? FAROL_META[health.level] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-500">
      {/* Barra de ações — some na impressão */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => setLocation(`/projects/${projectId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Projeto
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Relatório */}
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 print:border-0 print:p-0 print:bg-white">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Relatório de Status</p>
            <h1 className="text-2xl font-bold text-foreground mt-1">{project.name}</h1>
            {project.description && <p className="text-sm text-muted-foreground mt-1 max-w-xl">{project.description}</p>}
          </div>
          <img src="/logo-ulimax.png" alt="Ulimax & Co." className="h-6 mt-1 dark:brightness-0 dark:invert print:brightness-100 print:invert-0" />
        </div>

        {/* Farol + situação */}
        <div className="flex items-center gap-3 flex-wrap">
          {meta && health && (
            <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold border rounded-full px-3 py-1", meta.chip)}>
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          )}
          <span className="text-sm font-medium bg-muted text-foreground rounded-full px-3 py-1">
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
          {health && <span className="text-xs text-muted-foreground">{health.reasons.join(" · ")}</span>}
        </div>

        {/* Progresso */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-sm font-semibold text-foreground">Progresso geral</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{info.pct}%</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full", info.pct >= 70 ? "bg-emerald-500" : info.pct >= 30 ? "bg-blue-500" : "bg-amber-500")} style={{ width: `${info.pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div className="rounded-lg bg-muted/40 py-2">
              <p className="text-lg font-bold text-foreground tabular-nums">{info.total}</p>
              <p className="text-[11px] text-muted-foreground">tarefas no total</p>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 py-2">
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{info.done}</p>
              <p className="text-[11px] text-muted-foreground">concluídas</p>
            </div>
            <div className={cn("rounded-lg py-2", info.overdue.length > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/40")}>
              <p className={cn("text-lg font-bold tabular-nums", info.overdue.length > 0 ? "text-red-600" : "text-foreground")}>{info.overdue.length}</p>
              <p className="text-[11px] text-muted-foreground">atrasadas</p>
            </div>
          </div>
        </div>

        {/* Datas principais */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Datas principais</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-[11px] text-muted-foreground">Início do projeto</p><p className="font-medium text-foreground">{fmtDate(project.startDate)}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Fim estimado</p><p className="font-medium text-foreground">{fmtDate(project.endDate)}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Medição</p><p className="font-medium text-foreground">{fmtDate(project.medicaoDate)}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Início instalação</p><p className="font-medium text-foreground">{fmtDate(project.instalacaoStartDate)}</p></div>
          </div>
        </div>

        {/* Marcos */}
        {(milestones?.length ?? 0) > 0 && (
          <div className="break-inside-avoid">
            <p className="text-sm font-semibold text-foreground mb-2">Marcos</p>
            <ul className="space-y-1.5">
              {milestones!.map((m) => {
                const doneM = !!m.completedAt;
                const lateM = !doneM && m.dueDate && daysFromToday(m.dueDate) < 0;
                return (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    {doneM
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <Circle className={cn("h-4 w-4 shrink-0", lateM ? "text-red-500" : "text-muted-foreground/40")} />}
                    <span className={cn("text-foreground", doneM && "line-through text-muted-foreground")}>{m.title}</span>
                    <span className={cn("text-xs ml-auto tabular-nums", lateM ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                      {fmtDate(m.dueDate)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Tarefas atrasadas */}
        {info.overdue.length > 0 && (
          <div className="break-inside-avoid">
            <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Tarefas atrasadas
            </p>
            <ul className="space-y-1">
              {info.overdue.map((t) => (
                <li key={t.id} className="text-sm flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-red-600 tabular-nums shrink-0 w-16">{Math.abs(daysFromToday(t.dueDate!))}d atraso</span>
                  <span className="text-foreground">{t.title}</span>
                  {t.assigneeName && <span className="text-xs text-muted-foreground">· {t.assigneeName}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Em aberto */}
        {info.inProgress.length > 0 && (
          <div className="break-inside-avoid">
            <p className="text-sm font-semibold text-foreground mb-2">Próximas tarefas em aberto</p>
            <ul className="space-y-1">
              {info.inProgress.slice(0, 15).map((t) => (
                <li key={t.id} className="text-sm flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16">{t.dueDate ? fmtDate(t.dueDate).slice(0, 5) : "s/ prazo"}</span>
                  <span className="text-foreground">{t.title}</span>
                  {t.assigneeName && <span className="text-xs text-muted-foreground">· {t.assigneeName}</span>}
                </li>
              ))}
              {info.inProgress.length > 15 && (
                <li className="text-xs text-muted-foreground">+{info.inProgress.length - 15} outras em aberto…</li>
              )}
            </ul>
          </div>
        )}

        {/* Concluídas recentes */}
        {info.doneRecent.length > 0 && (
          <div className="break-inside-avoid">
            <p className="text-sm font-semibold text-emerald-600 mb-2">Concluídas nos últimos 7 dias</p>
            <ul className="space-y-1">
              {info.doneRecent.slice(0, 10).map((t) => (
                <li key={t.id} className="text-sm flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {t.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center border-t border-border pt-3">
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Sistema Ulimax
        </p>
      </div>
    </div>
  );
}
