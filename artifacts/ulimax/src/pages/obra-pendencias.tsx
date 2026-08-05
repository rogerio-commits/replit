import { useMemo } from "react";
import { useLocation } from "wouter";
import { useListTasks, useListProjects, useListAllSiteVisits } from "@workspace/api-client-react";
import type { Project, Task } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarClock, CalendarDays, ChevronRight, ClipboardList, FileText } from "lucide-react";
import { VisitRdoActions } from "@/components/visit-rdo-actions";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";
import { useEffectiveRole } from "@/hooks/useViewAs";
import Cobrancas from "./cobrancas";

// ── Obras · aba Pendências ───────────────────────────────────────────────────
// Tudo em que o gestor precisa atuar, dividido por assunto:
//   1. RDOs pendentes — toda visita realizada deve ter RDO; sem arquivo = pendência
//   2. Tarefas da equipe vencidas, agrupadas por responsável (cobra a pessoa)
//   3. Datas vencidas (estimada passou sem a data final registrada)
//   4. Datas a vencer (próximos 30 dias — para se antecipar)
//   5. Planos de ação (lista completa, com WhatsApp p/ externos)

const DATAS_A_VENCER = 30; // dias

const DATE_FIELDS: { key: keyof Project; label: string }[] = [
  { key: "medicaoDate", label: "Medição" },
  { key: "producaoStartDate", label: "Início da produção" },
  { key: "producaoEndDate", label: "Fim da produção" },
  { key: "producaoFinalDate", label: "Produção final" },
  { key: "instalacaoStartDate", label: "Instalação" },
  { key: "endDate", label: "Prazo de entrega" },
  { key: "finalDate", label: "Prazo final" },
];

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function emDias(d: number): string {
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d} dias`;
}

export default function ObraPendencias() {
  const [, navigate] = useLocation();
  const { data: tasks, isLoading: l1 } = useListTasks();
  const { data: projects, isLoading: l2 } = useListProjects();
  const { data: visits } = useListAllSiteVisits();
  const canEdit = useCanEdit();
  // Campo nao acompanha fabrica: datas de producao ficam fora do "a vencer".
  const isCampo = useEffectiveRole() === "gestor_obras";
  const dateFields = isCampo
    ? DATE_FIELDS.filter((f) => !String(f.key).startsWith("producao"))
    : DATE_FIELDS;

  const data = useMemo(() => {
    const allTasks = (tasks ?? []) as Task[];
    const projs = (projects ?? []) as Project[];

    // Visitas realizadas sem RDO — a pendência da visita é o arquivo faltando.
    const hoje = new Date().toISOString().slice(0, 10);
    const rdosPendentes = (visits ?? [])
      .filter((v) => v.date <= hoje && !v.reportFileKey)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    // Tarefas vencidas por responsável — cobra a pessoa, não a tarefa.
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

    // Datas vencidas.
    const vencidas: { projectId: number; projectName: string; label: string; days: number }[] = [];
    for (const p of projs) {
      for (const od of overdueObraDates(p)) {
        vencidas.push({ projectId: p.id, projectName: p.name, label: od.label, days: od.days });
      }
    }
    vencidas.sort((a, b) => a.days - b.days);

    // Datas a vencer nos próximos dias.
    const aVencer: { projectId: number; projectName: string; label: string; date: string; d: number }[] = [];
    for (const p of projs) {
      if (p.archived) continue;
      for (const f of dateFields) {
        const val = p[f.key] as string | null | undefined;
        if (!val) continue;
        const d = daysFromToday(val);
        if (d < 0 || d > DATAS_A_VENCER) continue;
        aVencer.push({ projectId: p.id, projectName: p.name, label: f.label, date: val, d });
      }
    }
    aVencer.sort((a, b) => a.d - b.d);

    return { rdosPendentes, pessoas, vencidas, aVencer };
  }, [tasks, projects, visits, dateFields]);

  if (l1 || l2) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="max-w-3xl space-y-5">
        {/* ── RDOs pendentes ── */}
        <Panel
          icon={<FileText className="h-4 w-4 text-red-500" />}
          title="RDOs de visita pendentes"
          hint="Toda visita realizada deve ter o RDO anexado — anexe direto aqui"
          count={data.rdosPendentes.length}
          empty="Todas as visitas realizadas têm RDO. 👏"
        >
          {data.rdosPendentes.map((v) => (
            <div key={`rdo-${v.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => navigate(`/projects/${v.projectId}`)}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{v.projectName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  visita de {fmtBr(v.date)}{v.objective ? ` · ${v.objective}` : ""}
                </p>
              </div>
              <span onClick={(e) => e.stopPropagation()}>
                <VisitRdoActions visit={v} projectId={v.projectId} canEdit={canEdit} />
              </span>
            </div>
          ))}
        </Panel>

        {/* ── Tarefas da equipe ── */}
        <Panel
          icon={<Users className="h-4 w-4 text-red-500" />}
          title="Tarefas da equipe vencidas"
          hint="Agrupadas por responsável — clique para abrir a lista da pessoa"
          count={data.pessoas.length}
          empty="Ninguém com tarefa vencida. 👏"
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
        </Panel>

        {/* ── Datas vencidas ── */}
        <Panel
          icon={<CalendarClock className="h-4 w-4 text-red-500" />}
          title="Datas vencidas"
          hint="Estimada passou e a data final não foi registrada"
          count={data.vencidas.length}
          empty="Nenhuma data de obra vencida."
        >
          {data.vencidas.map((d, i) => (
            <Row
              key={`dv-${d.projectId}-${i}`}
              onClick={() => navigate(`/projects/${d.projectId}`)}
              title={`${d.label}: ${d.projectName}`}
              sub="registre a data final ou cobre a conclusão"
              badge={`há ${-d.days}d`}
              badgeTone="red"
            />
          ))}
        </Panel>

        {/* ── Datas a vencer ── */}
        <Panel
          icon={<CalendarDays className="h-4 w-4 text-amber-600" />}
          title="Datas a vencer"
          hint={`Próximos ${DATAS_A_VENCER} dias — para se antecipar`}
          count={data.aVencer.length}
          empty={`Nenhuma data-chave nos próximos ${DATAS_A_VENCER} dias.`}
        >
          {data.aVencer.map((d, i) => (
            <Row
              key={`av-${d.projectId}-${i}`}
              onClick={() => navigate(`/projects/${d.projectId}`)}
              title={`${d.label}: ${d.projectName}`}
              sub={`${fmtBr(d.date)} · ${emDias(d.d)}`}
              badge={d.d <= 3 ? emDias(d.d) : fmtBr(d.date)}
              badgeTone={d.d <= 3 ? "amber" : "muted"}
            />
          ))}
        </Panel>
      </div>

      {/* ── Planos de ação ── */}
      <div className="flex items-center gap-2 pt-1">
        <ClipboardList className="h-4 w-4 text-blue-500" />
        <div>
          <h2 className="text-sm font-semibold text-foreground leading-tight">Planos de ação</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">Lista completa, com filtros e cobrança por WhatsApp para externos</p>
        </div>
      </div>
      <Cobrancas embedded />
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
  muted: "bg-muted text-muted-foreground border-border",
};

function Panel({
  icon, title, hint, count, empty, children,
}: {
  icon: React.ReactNode; title: string; hint: string; count: number;
  empty: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
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
    </div>
  );
}

function Row({
  onClick, title, sub, badge, badgeTone,
}: {
  onClick: () => void; title: string; sub: string; badge: string; badgeTone: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer" onClick={onClick}>
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
