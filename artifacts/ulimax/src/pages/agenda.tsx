import { useMemo } from "react";
import { Link } from "wouter";
import { useListAllSiteVisits, useListProjects } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, MapPin, ChevronRight, HardHat, AlertTriangle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";

// ── Agenda de Obra ───────────────────────────────────────────────────────────
// O que vem pela frente em todas as obras: próximas visitas e as datas-chave
// (medição, produção, instalação, prazos). Foco no futuro — vencidos já
// aparecem em Alertas e em Minhas Cobranças.

const VISITAS_JANELA = 30; // dias
const DATAS_JANELA = 60; // dias

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

function fmtBr(iso: string): string {
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function emDias(d: number): string {
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d} dias`;
}

export default function Agenda() {
  const { data: visits, isLoading: loadingVisits } = useListAllSiteVisits();
  const { data: projects, isLoading: loadingProjects } = useListProjects();

  const proximasVisitas = useMemo(() => {
    return (visits ?? [])
      .map((v) => ({ v, d: daysFromToday(v.date) }))
      .filter(({ d }) => d >= 0 && d <= VISITAS_JANELA)
      .sort((a, b) => a.d - b.d);
  }, [visits]);

  const datasAtrasadas = useMemo(() => {
    const out: { projectId: number; projectName: string; label: string; date: string; days: number }[] = [];
    for (const p of projects ?? []) {
      for (const od of overdueObraDates(p)) {
        out.push({ projectId: p.id, projectName: p.name, label: od.label, date: od.date, days: od.days });
      }
    }
    return out.sort((a, b) => a.days - b.days);
  }, [projects]);

  const proximasDatas = useMemo(() => {
    const out: { projectId: number; projectName: string; label: string; date: string; d: number }[] = [];
    for (const p of projects ?? []) {
      for (const f of DATE_FIELDS) {
        const val = p[f.key] as string | null | undefined;
        if (!val) continue;
        const d = daysFromToday(val);
        if (d < 0 || d > DATAS_JANELA) continue;
        out.push({ projectId: p.id, projectName: p.name, label: f.label, date: val, d });
      }
    }
    return out.sort((a, b) => a.d - b.d);
  }, [projects]);

  const loading = loadingVisits || loadingProjects;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-primary" />
            Agenda de Obra
          </h1>
          <p className="text-muted-foreground mt-1">
            Próximas visitas e datas-chave de todas as obras, em ordem.
          </p>
        </div>
        <NewVisitDialog
          trigger={
            <Button className="shrink-0 gap-1.5">
              <CalendarPlus className="h-4 w-4" /> Nova visita
            </Button>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <>
        {datasAtrasadas.length > 0 && (
          <div className="bg-card rounded-xl border border-red-200 dark:border-red-800/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Datas atrasadas</h2>
              <span className="ml-auto text-xs text-red-600/80">{datasAtrasadas.length}</span>
            </div>
            <div className="divide-y divide-border">
              {datasAtrasadas.map((e, i) => (
                <Link key={`${e.projectId}-${e.label}-${i}`} href={`/projects/${e.projectId}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        <span className="text-muted-foreground">{e.label}:</span> {e.projectName}
                      </p>
                      <p className="text-xs text-muted-foreground">Previsto {fmtBr(e.date)} · sem data final registrada</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40">
                      há {-e.days}d
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Próximas visitas */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <MapPin className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-foreground">Próximas visitas</h2>
              <span className="ml-auto text-xs text-muted-foreground">{proximasVisitas.length} nos próximos {VISITAS_JANELA}d</span>
            </div>
            {proximasVisitas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma visita agendada.</p>
            ) : (
              <div className="divide-y divide-border">
                {proximasVisitas.map(({ v, d }) => (
                  <Link key={v.id} href={`/projects/${v.projectId}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        <span className="text-lg font-bold text-foreground leading-none">{fmtBr(v.date).split("/")[0]}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][Number(v.date.split("-")[1]) - 1]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{v.projectName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emDias(d)}{v.responsibleName ? ` · ${v.responsibleName}` : ""}{v.objective ? ` · ${v.objective}` : ""}
                        </p>
                      </div>
                      {v.pendingActionItemsCount > 0 && (
                        <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {v.pendingActionItemsCount} pendente{v.pendingActionItemsCount > 1 ? "s" : ""}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Datas-chave das obras */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <HardHat className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Datas das obras</h2>
              <span className="ml-auto text-xs text-muted-foreground">{proximasDatas.length} nos próximos {DATAS_JANELA}d</span>
            </div>
            {proximasDatas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma data-chave à vista.</p>
            ) : (
              <div className="divide-y divide-border">
                {proximasDatas.map((e, i) => (
                  <Link key={`${e.projectId}-${e.label}-${i}`} href={`/projects/${e.projectId}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          <span className="text-muted-foreground">{e.label}:</span> {e.projectName}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtBr(e.date)} · {emDias(e.d)}</p>
                      </div>
                      <span className={cn(
                        "shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                        e.d <= 3 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-border",
                      )}>
                        {e.d <= 3 ? emDias(e.d) : fmtBr(e.date)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
