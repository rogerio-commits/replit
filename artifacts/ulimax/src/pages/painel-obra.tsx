import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  useListChaseItems,
  useListAllSiteVisits,
  useListProjects,
  useListActionPlanSummaries,
  useListTasks,
} from "@workspace/api-client-react";
import type { ChaseItem, Project, Task } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPinned, CalendarClock, ChevronRight,
  CalendarPlus, PartyPopper, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";

// ── Painel da Obra ───────────────────────────────────────────────────────────
// A aba Hoje segue o dia real do gestor de obras, nesta ordem:
//   1. Visitas — onde ele passa a maior parte do tempo: as de hoje e as obras
//      pedindo visita (fim da produção ≤10d ou em instalação, cadência 15d).
//      Cada obra mostra quantos itens há para checar lá.
//   2. Pessoas — quem está devendo: tarefas vencidas por responsável e planos
//      de ação com itens vencidos por obra.
//   3. Datas — estimadas que passaram sem data final registrada.
// O que não é acionável hoje mora em Pendências e na Agenda — não repete aqui.

const INSTALL_STATUSES = ["aguardando_instalacao", "em_instalacao"];
const VISIT_INTERVAL = 15; // obra em instalação precisa de visita a cada 15 dias
const PRE_INSTALL_WINDOW = 10; // fim da produção a até 10 dias já pede visita

const BADGE_TONE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40",
  muted: "bg-muted text-muted-foreground border-border",
};

export default function PainelObra() {
  const [, navigate] = useLocation();
  const { data: chase, isLoading: l1 } = useListChaseItems();
  const { data: visits, isLoading: l2 } = useListAllSiteVisits();
  const { data: projects, isLoading: l3 } = useListProjects();
  const { data: planSummaries } = useListActionPlanSummaries();
  const { data: tasks, isLoading: l4 } = useListTasks();
  const loading = l1 || l2 || l3 || l4;

  const data = useMemo(() => {
    const items = (chase ?? []) as ChaseItem[];
    const allVisits = visits ?? [];
    const projs = (projects ?? []) as Project[];
    const allTasks = (tasks ?? []) as Task[];

    // Itens para checar em cada obra (follow-ups de visita em aberto):
    // aparecem como contexto nas linhas de visita — é o que se confere lá.
    const checarPorObra = new Map<number, number>();
    for (const it of items) {
      if (it.source !== "visit") continue;
      checarPorObra.set(it.projectId, (checarPorObra.get(it.projectId) ?? 0) + 1);
    }

    // ── 1. Visitas ──
    const visitasHoje = allVisits
      .filter((v) => daysFromToday(v.date) === 0)
      .map((v) => ({ v, checar: checarPorObra.get(v.projectId) ?? 0 }));

    const proximas7 = allVisits.filter((v) => {
      const d = daysFromToday(v.date);
      return d > 0 && d <= 7;
    }).length;

    const lastByProject = new Map<number, number>();
    const nextByProject = new Map<number, string>();
    for (const v of allVisits) {
      const d = daysFromToday(v.date);
      if (d <= 0) {
        const since = -d;
        const cur = lastByProject.get(v.projectId);
        if (cur === undefined || since < cur) lastByProject.set(v.projectId, since);
      } else {
        const cur = nextByProject.get(v.projectId);
        if (!cur || v.date < cur) nextByProject.set(v.projectId, v.date);
      }
    }
    const agendarVisita = projs
      .filter((p) => !p.archived)
      .map((p) => {
        const emInstalacao = INSTALL_STATUSES.includes(p.status);
        const dFimProd = p.producaoEndDate ? daysFromToday(p.producaoEndDate) : null;
        const preInstalacao = !emInstalacao && dFimProd !== null && dFimProd <= PRE_INSTALL_WINDOW;
        return { p, emInstalacao, dFimProd, elegivel: emInstalacao || preInstalacao, since: lastByProject.get(p.id), next: nextByProject.get(p.id) };
      })
      .filter(({ elegivel, since, next }) => elegivel && !next && (since === undefined || since >= VISIT_INTERVAL))
      .sort((a, b) => (b.since ?? 9999) - (a.since ?? 9999))
      .map(({ p, emInstalacao, dFimProd, since }) => ({
        p,
        since,
        checar: checarPorObra.get(p.id) ?? 0,
        contexto: emInstalacao
          ? "em instalação"
          : dFimProd !== null && dFimProd >= 0
            ? `produção termina em ${dFimProd === 0 ? "hoje" : `${dFimProd}d`}`
            : "produção deveria ter terminado",
      }));

    // ── 2. Pessoas ──
    // Tarefas vencidas agrupadas por responsável — cobra a pessoa, não a tarefa.
    const porPessoa = new Map<string, { id: number | null; name: string; count: number; oldest: number }>();
    for (const t of allTasks) {
      if (t.status === "done" || !t.dueDate) continue;
      const overdueDays = -daysFromToday(t.dueDate);
      if (overdueDays <= 0) continue;
      const key = t.assignedTo != null ? String(t.assignedTo) : "none";
      const cur = porPessoa.get(key);
      if (cur) {
        cur.count += 1;
        cur.oldest = Math.max(cur.oldest, overdueDays);
      } else {
        porPessoa.set(key, {
          id: t.assignedTo ?? null,
          name: t.assigneeName ?? "Sem responsável",
          count: 1,
          oldest: overdueDays,
        });
      }
    }
    const pessoas = Array.from(porPessoa.values()).sort((a, b) => b.count - a.count);

    const planosVencidos = (planSummaries ?? [])
      .filter((s) => s.overdueItems > 0)
      .sort((a, b) => b.overdueItems - a.overdueItems);

    // ── 3. Datas ──
    const datasVencidas: { projectId: number; projectName: string; label: string; days: number }[] = [];
    for (const p of projs) {
      for (const od of overdueObraDates(p)) {
        datasVencidas.push({ projectId: p.id, projectName: p.name, label: od.label, days: od.days });
      }
    }
    datasVencidas.sort((a, b) => a.days - b.days);

    return { visitasHoje, proximas7, agendarVisita, pessoas, planosVencidos, datasVencidas };
  }, [chase, visits, projects, planSummaries, tasks]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const tudoEmDia =
    data.visitasHoje.length === 0 && data.agendarVisita.length === 0 &&
    data.pessoas.length === 0 && data.planosVencidos.length === 0 &&
    data.datasVencidas.length === 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-3xl">
      {tudoEmDia && (
        <div className="bg-card rounded-xl border border-border px-4 py-10 text-center">
          <PartyPopper className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
          <p className="text-xs text-muted-foreground mt-1">Visitas em dia, ninguém com tarefa vencida e nenhuma data pendente.</p>
        </div>
      )}

      {/* ── 1. Visitas ── */}
      <Section
        num={1}
        icon={<MapPinned className="h-4 w-4 text-primary" />}
        title="Visitas em obras"
        hint="Seu principal trabalho: as de hoje e as obras pedindo visita"
        count={data.visitasHoje.length + data.agendarVisita.length}
        empty="Nenhuma visita hoje e nenhuma obra pedindo visita."
        footer={
          <Link href="/obra?tab=agenda" className="text-primary hover:underline">
            {data.proximas7 > 0
              ? `${data.proximas7} visita${data.proximas7 !== 1 ? "s" : ""} nos próximos 7 dias — ver Agenda`
              : "Ver a Agenda completa"}
          </Link>
        }
      >
        {data.visitasHoje.map(({ v, checar }) => (
          <Row
            key={`vh-${v.id}`}
            onClick={() => navigate(`/projects/${v.projectId}`)}
            title={`Visitar hoje: ${v.projectName ?? "obra"}`}
            sub={`${v.objective || "visita agendada"}${checar > 0 ? ` · ${checar} ite${checar !== 1 ? "ns" : "m"} para checar lá` : ""}`}
            badge="hoje"
            badgeTone="blue"
          />
        ))}
        {data.agendarVisita.map(({ p, since, checar, contexto }) => (
          <div key={`ag-${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={() => navigate(`/projects/${p.id}`)}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {contexto} · {since === undefined ? "nunca visitada" : `última visita há ${since} dias`}
                {checar > 0 ? ` · ${checar} ite${checar !== 1 ? "ns" : "m"} para checar lá` : ""}
              </p>
            </div>
            <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", BADGE_TONE.amber)}>
              {since === undefined ? "nunca visitada" : `${since}d sem visita`}
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <NewVisitDialog
                projectId={p.id}
                projectName={p.name}
                trigger={
                  <Button size="sm" variant="outline" className="shrink-0 h-7 gap-1 text-xs">
                    <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                  </Button>
                }
              />
            </span>
          </div>
        ))}
      </Section>

      {/* ── 2. Pessoas ── */}
      <Section
        num={2}
        icon={<Users className="h-4 w-4 text-red-500" />}
        title="Cobre as pessoas"
        hint="Tarefas vencidas por responsável e planos de ação atrasados por obra"
        count={data.pessoas.length + data.planosVencidos.length}
        empty="Ninguém com tarefa vencida e nenhum plano atrasado."
      >
        {data.pessoas.map((pe) => (
          <Row
            key={`pe-${pe.id ?? "none"}`}
            onClick={() => navigate(pe.id != null ? `/tasks?responsavel=${pe.id}&vencidas=1` : "/tasks?vencidas=1")}
            title={pe.name}
            sub={`${pe.count} tarefa${pe.count !== 1 ? "s" : ""} vencida${pe.count !== 1 ? "s" : ""} · a mais antiga há ${pe.oldest}d`}
            badge={`${pe.count} vencida${pe.count !== 1 ? "s" : ""}`}
            badgeTone="red"
          />
        ))}
        {data.planosVencidos.map((s) => (
          <Row
            key={`pl-${s.projectId}`}
            onClick={() => navigate(`/projects/${s.projectId}`)}
            title={`Plano de ação: ${s.projectName ?? "obra"}`}
            sub={`${s.overdueItems} vencido${s.overdueItems !== 1 ? "s" : ""} de ${s.openItems} em aberto`}
            badge={`${s.overdueItems} vencido${s.overdueItems !== 1 ? "s" : ""}`}
            badgeTone="red"
          />
        ))}
      </Section>

      {/* ── 3. Datas ── */}
      <Section
        num={3}
        icon={<CalendarClock className="h-4 w-4 text-red-500" />}
        title="Datas para resolver"
        hint="Estimadas que passaram sem a data final registrada"
        count={data.datasVencidas.length}
        empty="Nenhuma data de obra vencida."
      >
        {data.datasVencidas.map((d, i) => (
          <Row
            key={`dt-${d.projectId}-${i}`}
            onClick={() => navigate(`/projects/${d.projectId}`)}
            title={`${d.label}: ${d.projectName}`}
            sub="registre a data final ou cobre a conclusão"
            badge={`há ${-d.days}d`}
            badgeTone="red"
          />
        ))}
      </Section>

      <p className="text-xs text-muted-foreground px-1">
        A lista completa de cobranças (com WhatsApp para externos) fica em{" "}
        <Link href="/obra?tab=pendencias" className="text-primary hover:underline">Pendências</Link>; visitas futuras e
        datas-chave, na <Link href="/obra?tab=agenda" className="text-primary hover:underline">Agenda</Link>.
      </p>
    </div>
  );
}

function Section({
  num, icon, title, hint, count, empty, footer, children,
}: {
  num: number; icon: React.ReactNode; title: string; hint: string; count: number;
  empty: string; footer?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <span className="shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {num}
        </span>
        {icon}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">{title}</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>
        </div>
        <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{count}</span>
      </div>
      {count === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border">{children}</div>
      )}
      {footer && <div className="px-4 py-2.5 text-xs border-t border-border">{footer}</div>}
    </div>
  );
}

function Row({
  onClick, title, sub, badge, badgeTone,
}: {
  onClick: () => void; title: string; sub: string; badge: string; badgeTone: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer" onClick={onClick}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{sub}</p>
      </div>
      <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", BADGE_TONE[badgeTone])}>
        {badge}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </div>
  );
}
