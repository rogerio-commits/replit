import { useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useListProjects, useListTasks } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer, AlertCircle, CalendarDays, Hourglass, CheckCircle2, UserX, Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeHealthMap, daysFromToday, FAROL_META } from "@/lib/project-health";

// ── Pauta automática da reunião semanal ──────────────────────────────────────
// Reúne, numa página só (e imprimível), tudo o que a reunião de segunda precisa:
// farol dos projetos, atrasos por pessoa, prazos da semana, tarefas paradas,
// vitórias da semana e pendências sem responsável.

type AnyTask = {
  id: number;
  projectId: number;
  title: string;
  status: string;
  assigneeName?: string | null;
  projectName?: string | null;
  dueDate?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

function Section({
  icon: Icon, tone, title, count, children, emptyText,
}: {
  icon: any; tone: string; title: string; count: number; children: ReactNode; emptyText: string;
}) {
  return (
    <section className="bg-card border border-border rounded-xl p-4 break-inside-avoid print:shadow-none">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4", tone)} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className={cn(
          "text-[11px] font-bold px-2 py-0.5 rounded-full",
          count > 0 ? "bg-muted text-foreground" : "bg-emerald-50 text-emerald-700"
        )}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {emptyText}
        </p>
      ) : children}
    </section>
  );
}

export default function Reuniao() {
  const { data: projects, isLoading: pLoading } = useListProjects();
  const { data: tasks, isLoading: tLoading } = useListTasks();
  const loading = pLoading || tLoading;

  const data = useMemo(() => {
    const all = (tasks ?? []) as AnyTask[];
    const open = all.filter((t) => t.status !== "done");

    const overdue = open
      .filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0)
      .sort((a, b) => daysFromToday(a.dueDate!) - daysFromToday(b.dueDate!));

    const byPerson = new Map<string, AnyTask[]>();
    for (const t of overdue) {
      const key = t.assigneeName ?? "Sem responsável";
      byPerson.set(key, [...(byPerson.get(key) ?? []), t]);
    }
    const overdueGroups = Array.from(byPerson.entries()).sort((a, b) => b[1].length - a[1].length);

    const dueThisWeek = open
      .filter((t) => t.dueDate && daysFromToday(t.dueDate) >= 0 && daysFromToday(t.dueDate) <= 7)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

    const stale = open
      .filter((t) => t.status === "todo" && -daysFromToday(t.createdAt) >= 7)
      .sort((a, b) => daysFromToday(a.createdAt) - daysFromToday(b.createdAt));

    const doneLastWeek = all.filter(
      (t) => t.status === "done" && t.completedAt && -daysFromToday(t.completedAt) <= 7
    );
    const doneByPerson = new Map<string, number>();
    for (const t of doneLastWeek) {
      const key = t.assigneeName ?? "Sem responsável";
      doneByPerson.set(key, (doneByPerson.get(key) ?? 0) + 1);
    }
    const doneGroups = Array.from(doneByPerson.entries()).sort((a, b) => b[1] - a[1]);

    const noAssignee = open.filter((t) => !t.assigneeName);

    const health = computeHealthMap(projects ?? [], all);
    const redProjects = (projects ?? []).filter((p) => health.get(p.id)?.level === "red");
    const yellowProjects = (projects ?? []).filter((p) => health.get(p.id)?.level === "yellow");

    return { overdueGroups, overdueCount: overdue.length, dueThisWeek, stale, doneLastWeek, doneGroups, noAssignee, health, redProjects, yellowProjects };
  }, [tasks, projects]);

  const today = new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Presentation className="h-7 w-7 text-primary print:hidden" />
            Reunião Semanal
          </h1>
          <p className="text-muted-foreground mt-1 capitalize">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} · pauta gerada automaticamente
          </p>
        </div>
        <Button onClick={() => window.print()} className="print:hidden self-start sm:self-auto">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* 1. Farol dos projetos */}
          <section className="bg-card border border-border rounded-xl p-4 break-inside-avoid">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">🚦 Farol dos Projetos</h2>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">🔴 {data.redProjects.length}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🟡 {data.yellowProjects.length}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  🟢 {(projects?.length ?? 0) - data.redProjects.length - data.yellowProjects.length}
                </span>
              </div>
            </div>
            {data.redProjects.length === 0 && data.yellowProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Todos os projetos em dia. Ótima semana!
              </p>
            ) : (
              <div className="space-y-1.5">
                {[...data.redProjects, ...data.yellowProjects].map((p) => {
                  const h = data.health.get(p.id)!;
                  const meta = FAROL_META[h.level];
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors">
                        <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", meta.dot)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{h.reasons.join(" · ")}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Atrasadas por pessoa */}
          <Section icon={AlertCircle} tone="text-red-500" title="Tarefas Atrasadas — por responsável" count={data.overdueCount} emptyText="Nenhuma tarefa atrasada.">
            <div className="space-y-3">
              {data.overdueGroups.map(([person, list]) => (
                <div key={person}>
                  <p className="text-xs font-semibold text-foreground mb-1">
                    {person} <span className="text-red-600">({list.length})</span>
                  </p>
                  <ul className="space-y-1">
                    {list.map((t) => (
                      <li key={t.id} className="text-sm text-muted-foreground flex items-baseline gap-1.5">
                        <span className="text-red-600 font-semibold text-xs tabular-nums shrink-0 w-14">
                          {Math.abs(daysFromToday(t.dueDate!))}d atraso
                        </span>
                        <span className="text-foreground">{t.title}</span>
                        {t.projectName && <span className="text-xs">· {t.projectName}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* 3. Vencem nos próximos 7 dias */}
          <Section icon={CalendarDays} tone="text-blue-500" title="Vencem nos Próximos 7 Dias" count={data.dueThisWeek.length} emptyText="Semana sem prazos apertados.">
            <ul className="space-y-1">
              {data.dueThisWeek.map((t) => (
                <li key={t.id} className="text-sm flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-blue-600 capitalize tabular-nums shrink-0 w-24">
                    {format(new Date(t.dueDate!.split("T")[0] + "T00:00:00"), "EEE dd/MM", { locale: ptBR })}
                  </span>
                  <span className="text-foreground">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.assigneeName ? `· ${t.assigneeName}` : "· sem responsável"}
                    {t.projectName ? ` · ${t.projectName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 4. Paradas há 7+ dias */}
          <Section icon={Hourglass} tone="text-amber-500" title="Paradas há 7+ Dias (sem começar)" count={data.stale.length} emptyText="Nenhuma tarefa esquecida.">
            <ul className="space-y-1">
              {data.stale.map((t) => (
                <li key={t.id} className="text-sm flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0 w-14">
                    {-daysFromToday(t.createdAt)}d parada
                  </span>
                  <span className="text-foreground">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.assigneeName ? `· ${t.assigneeName}` : "· sem responsável"}
                    {t.projectName ? ` · ${t.projectName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 5. Concluídas na última semana */}
          <Section icon={CheckCircle2} tone="text-emerald-500" title="Concluídas na Última Semana 🎉" count={data.doneLastWeek.length} emptyText="Nada concluído nos últimos 7 dias.">
            <div className="flex items-center gap-2 flex-wrap">
              {data.doneGroups.map(([person, n]) => (
                <span key={person} className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">
                  {person} <strong>×{n}</strong>
                </span>
              ))}
            </div>
          </Section>

          {/* 6. Sem responsável */}
          <Section icon={UserX} tone="text-violet-500" title="Abertas sem Responsável" count={data.noAssignee.length} emptyText="Todas as tarefas têm dono.">
            <ul className="space-y-1">
              {data.noAssignee.slice(0, 15).map((t) => (
                <li key={t.id} className="text-sm text-foreground flex items-baseline gap-1.5">
                  {t.title}
                  {t.projectName && <span className="text-xs text-muted-foreground">· {t.projectName}</span>}
                </li>
              ))}
              {data.noAssignee.length > 15 && (
                <li className="text-xs text-muted-foreground">+{data.noAssignee.length - 15} outras…</li>
              )}
            </ul>
          </Section>

          <p className="text-[11px] text-muted-foreground text-center pb-4 hidden print:block">
            Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Sistema Ulimax
          </p>
        </>
      )}
    </div>
  );
}
