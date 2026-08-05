import { useMemo } from "react";
import { Link } from "wouter";
import { useListAllSiteVisits, useListProjects } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ChevronRight, HardHat, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { useEffectiveRole } from "@/hooks/useViewAs";

// ── Agenda de Obra ───────────────────────────────────────────────────────────
// Agenda cronológica para o gestor se programar: visitas e datas-chave das
// obras misturadas e agrupadas por dia — Hoje, Amanhã, o resto da semana dia a
// dia, e "Mais adiante". Só futuro — o que já venceu mora na aba Hoje.

const VISITAS_JANELA = 30; // dias
const DATAS_JANELA = 60; // dias
const SEMANA = 7; // até aqui, agrupa dia a dia

// Datas-chave de obra, na ordem do fluxo. `key` aponta para o campo do projeto.
const DATE_FIELDS: { key: keyof Project; label: string }[] = [
  { key: "medicaoDate", label: "Medição" },
  { key: "producaoStartDate", label: "Início da produção" },
  { key: "producaoEndDate", label: "Fim da produção" },
  { key: "producaoFinalDate", label: "Produção final" },
  { key: "instalacaoStartDate", label: "Instalação" },
  { key: "endDate", label: "Prazo de entrega" },
  { key: "finalDate", label: "Prazo final" },
];

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function nomeDoDia(iso: string, d: number): string {
  if (d === 0) return `Hoje · ${fmtBr(iso)}`;
  if (d === 1) return `Amanhã · ${fmtBr(iso)}`;
  const wd = DIAS[new Date(iso + "T00:00:00").getDay()];
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} · ${fmtBr(iso)}`;
}

type Evento = {
  key: string;
  tipo: "visita" | "data";
  date: string;
  d: number;
  projectId: number;
  title: string;
  sub: string;
  badge?: string;
};

export default function Agenda() {
  const { data: visits, isLoading: loadingVisits } = useListAllSiteVisits();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  // Campo nao acompanha fabrica: as datas de producao ficam fora da agenda dele.
  const isCampo = useEffectiveRole() === "gestor_obras";
  const dateFields = isCampo
    ? DATE_FIELDS.filter((f) => !String(f.key).startsWith("producao"))
    : DATE_FIELDS;

  const { dias, adiante, total } = useMemo(() => {
    const eventos: Evento[] = [];

    for (const v of visits ?? []) {
      const d = daysFromToday(v.date);
      if (d < 0 || d > VISITAS_JANELA) continue;
      eventos.push({
        key: `v-${v.id}`,
        tipo: "visita",
        date: v.date,
        d,
        projectId: v.projectId,
        title: `Visita: ${v.projectName}`,
        sub: [v.objective, v.responsibleName].filter(Boolean).join(" · ") || "visita agendada",
        badge: v.pendingActionItemsCount > 0
          ? `${v.pendingActionItemsCount} pendente${v.pendingActionItemsCount > 1 ? "s" : ""}`
          : undefined,
      });
    }

    for (const p of projects ?? []) {
      for (const f of dateFields) {
        const val = p[f.key] as string | null | undefined;
        if (!val) continue;
        const d = daysFromToday(val);
        if (d < 0 || d > DATAS_JANELA) continue;
        eventos.push({
          key: `d-${p.id}-${String(f.key)}`,
          tipo: "data",
          date: val,
          d,
          projectId: p.id,
          title: `${f.label}: ${p.name}`,
          sub: "data-chave da obra",
        });
      }
    }

    eventos.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.tipo === "visita" ? -1 : 1));

    // Semana dia a dia; o resto vai para "Mais adiante".
    const porDia = new Map<string, { d: number; eventos: Evento[] }>();
    const adiante: Evento[] = [];
    for (const e of eventos) {
      if (e.d <= SEMANA) {
        const g = porDia.get(e.date) ?? { d: e.d, eventos: [] };
        g.eventos.push(e);
        porDia.set(e.date, g);
      } else {
        adiante.push(e);
      }
    }
    const dias = [...porDia.entries()]
      .map(([date, g]) => ({ date, ...g }))
      .sort((a, b) => a.d - b.d);

    return { dias, adiante, total: eventos.length };
  }, [visits, projects, dateFields]);

  const loading = loadingVisits || loadingProjects;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-3xl">
      {total === 0 ? (
        <div className="bg-card rounded-xl border border-border px-4 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Nada agendado</p>
          <p className="text-xs text-muted-foreground mt-1">Sem visitas nos próximos {VISITAS_JANELA} dias nem datas-chave nos próximos {DATAS_JANELA}.</p>
        </div>
      ) : (
        <>
          {/* Semana, dia a dia */}
          {dias.length === 0 ? (
            <div className="bg-card rounded-xl border border-border px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Nada para hoje nem para esta semana.</p>
            </div>
          ) : (
            dias.map(({ date, d, eventos }) => (
              <div key={date} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border-b border-border",
                  d === 0 && "bg-primary/[.06]"
                )}>
                  <CalendarDays className={cn("h-4 w-4", d === 0 ? "text-primary" : "text-muted-foreground")} />
                  <h2 className={cn("text-sm font-semibold", d === 0 ? "text-primary" : "text-foreground")}>
                    {nomeDoDia(date, d)}
                  </h2>
                  <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{eventos.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {eventos.map((e) => <EventoRow key={e.key} e={e} />)}
                </div>
              </div>
            ))
          )}

          {/* Depois da semana */}
          {adiante.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Mais adiante</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  visitas em {VISITAS_JANELA}d · datas em {DATAS_JANELA}d
                </span>
              </div>
              <div className="divide-y divide-border">
                {adiante.map((e) => <EventoRow key={e.key} e={e} mostraData />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventoRow({ e, mostraData }: { e: Evento; mostraData?: boolean }) {
  return (
    <Link href={`/projects/${e.projectId}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer">
        {e.tipo === "visita"
          ? <MapPin className="h-4 w-4 text-violet-500 shrink-0" />
          : <HardHat className="h-4 w-4 text-primary shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
          <p className="text-xs text-muted-foreground truncate">{e.sub}</p>
        </div>
        {e.badge && (
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
            {e.badge}
          </span>
        )}
        {mostraData && (
          <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{fmtBr(e.date)}</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </div>
    </Link>
  );
}
