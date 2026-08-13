import { useMemo, useRef, useState } from "react";
import {
  useUpdateProject,
  useListChecklistItems,
  useListAuditLogs,
  getListChecklistItemsQueryKey,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  getListAuditLogsQueryKey,
} from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dica } from "@/components/dica";
import {
  Check, ChevronDown, ChevronRight, Ruler, PencilRuler, BadgeCheck,
  Factory, Truck, Wrench, ArrowRight, GripVertical, History,
} from "lucide-react";

// ── Trilho de Fases ──────────────────────────────────────────────────────────
// Divulgação progressiva: a fase ativa é a única expandida; cada fase pede só
// os seus 3–4 dados. Datas editam inline (clique → input → salva sozinho) e a
// mini-timeline no topo permite arrastar as datas-chave. Substitui o antigo
// "mar de campos" do dialog Editar Projeto para o dia a dia.

type DateKey =
  | "medicaoDate" | "startDate" | "endDate" | "finalDate"
  | "producaoStartDate" | "producaoEndDate" | "producaoFinalDate"
  | "instalacaoStartDate";

const DATE_LABELS: Record<string, string> = {
  medicaoDate: "Medição",
  startDate: "Início do projeto",
  endDate: "Entrega (fim estimado)",
  finalDate: "Projeto concluído em",
  producaoStartDate: "Início da produção",
  producaoEndDate: "Fim estimado da produção",
  producaoFinalDate: "Produção concluída em",
  instalacaoStartDate: "Instalação prevista",
};

const STATUS_ORDER = [
  "a_iniciar", "em_projeto", "em_aprovacao", "em_producao",
  "aguardando_instalacao", "em_instalacao",
] as const;

const PHASES: {
  status: (typeof STATUS_ORDER)[number];
  label: string;
  icon: React.ElementType;
  fields: { key: DateKey; label: string; deadline?: boolean }[];
}[] = [
  { status: "a_iniciar", label: "Medição", icon: Ruler, fields: [
    { key: "medicaoDate", label: "Data da medição" },
  ]},
  { status: "em_projeto", label: "Projeto", icon: PencilRuler, fields: [
    { key: "startDate", label: "Início" },
    { key: "endDate", label: "Fim estimado", deadline: true },
    { key: "finalDate", label: "Concluído em" },
  ]},
  { status: "em_aprovacao", label: "Arquitetura", icon: BadgeCheck, fields: [] },
  { status: "em_producao", label: "Produção", icon: Factory, fields: [
    { key: "producaoStartDate", label: "Início" },
    { key: "producaoEndDate", label: "Fim estimado", deadline: true },
    { key: "producaoFinalDate", label: "Concluída em" },
  ]},
  { status: "aguardando_instalacao", label: "Ag. Instalação", icon: Truck, fields: [
    { key: "instalacaoStartDate", label: "Instalação prevista" },
  ]},
  { status: "em_instalacao", label: "Instalação", icon: Wrench, fields: [] },
];

function fmtBr(iso?: string | null): string {
  if (!iso) return "—";
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : iso;
}

function daysFromToday(iso: string): number {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso.split("T")[0] + "T00:00:00").getTime() - t.getTime()) / 86_400_000);
}

// ── Data inline: clique vira input, Enter/blur salva, Esc cancela ────────────
function InlineDate({
  label, value, deadline, canEdit, onSave,
}: {
  label: string; value?: string | null; deadline?: boolean; canEdit: boolean;
  onSave: (iso: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const d = value ? daysFromToday(value) : null;
  const warn = deadline && value && d !== null && d < 0 ? "vencido" : deadline && d !== null && d <= 3 ? "perto" : null;

  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      {editing ? (
        <input
          type="date"
          autoFocus
          defaultValue={value?.split("T")[0] ?? ""}
          className="text-sm border border-primary/50 rounded-md px-1.5 py-0.5 bg-background outline-none"
          onBlur={(e) => { setEditing(false); if (e.target.value !== (value ?? "")) onSave(e.target.value || null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setEditing(true)}
          title={canEdit ? "Clique para editar" : undefined}
          className={cn(
            "text-sm font-medium rounded-md px-1.5 py-0.5 -mx-1.5 text-right",
            canEdit && "hover:bg-muted cursor-text",
            !value && "text-muted-foreground/50",
            warn === "vencido" && "text-red-600",
            warn === "perto" && "text-amber-600",
          )}
        >
          {fmtBr(value)}
          {warn === "vencido" && d !== null && <span className="ml-1 text-[10px] font-semibold">há {-d}d</span>}
          {warn === "perto" && d !== null && <span className="ml-1 text-[10px] font-semibold">{d === 0 ? "hoje" : `em ${d}d`}</span>}
        </button>
      )}
    </div>
  );
}

// ── Mini-timeline arrastável ─────────────────────────────────────────────────
const TIMELINE_CHIPS: { key: DateKey; label: string; campoHide?: boolean }[] = [
  { key: "medicaoDate", label: "Medição" },
  { key: "startDate", label: "Início" },
  { key: "endDate", label: "Entrega proj." },
  { key: "producaoEndDate", label: "Fim prod.", campoHide: true },
  { key: "instalacaoStartDate", label: "Instalação" },
  { key: "finalDate", label: "Prazo final" },
];

function isoAddDays(iso: string, days: number): string {
  const d = new Date(iso.split("T")[0] + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function PhaseTimeline({
  project, canEdit, isCampo, onSave,
}: {
  project: Project; canEdit: boolean; isCampo: boolean;
  onSave: (key: DateKey, iso: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ key: DateKey; iso: string } | null>(null);

  const chips = TIMELINE_CHIPS
    .filter((c) => !(isCampo && c.campoHide))
    .map((c) => ({ ...c, iso: (drag?.key === c.key ? drag.iso : (project[c.key] as string | null))?.split("T")[0] ?? null }))
    .filter((c): c is typeof c & { iso: string } => !!c.iso);

  const { min, span } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const all = [...chips.map((c) => c.iso), today];
    const lo = isoAddDays(all.reduce((a, b) => (a < b ? a : b)), -14);
    const hi = isoAddDays(all.reduce((a, b) => (a > b ? a : b)), 14);
    const span = Math.max(1, Math.round((new Date(hi).getTime() - new Date(lo).getTime()) / 86_400_000));
    return { min: lo, span };
  }, [chips]);

  if (chips.length < 2) return null;

  const pct = (iso: string) =>
    (Math.round((new Date(iso).getTime() - new Date(min).getTime()) / 86_400_000) / span) * 100;

  function startDrag(e: React.PointerEvent, key: DateKey, iso: string) {
    if (!canEdit || !ref.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const width = ref.current.getBoundingClientRect().width;
    const startX = e.clientX;
    let current = iso;
    const move = (ev: PointerEvent) => {
      const deltaDays = Math.round(((ev.clientX - startX) / width) * span);
      current = isoAddDays(iso, deltaDays);
      setDrag({ key, iso: current });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (current !== iso) onSave(key, current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const todayPct = pct(new Date().toISOString().slice(0, 10));

  return (
    <div className="px-4 pt-4 pb-8 border-b border-border hidden md:block select-none">
      <div ref={ref} className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${todayPct}%` }} title="Hoje" />
        {chips.map((c) => (
          <div
            key={c.key}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${pct(c.iso)}%` }}
          >
            <div
              onPointerDown={(e) => startDrag(e, c.key, c.iso)}
              title={canEdit ? `${c.label} · arraste para mudar a data` : c.label}
              className={cn(
                "flex items-center gap-0.5 rounded-full border bg-card px-1.5 py-0.5 shadow-sm",
                canEdit && "cursor-grab active:cursor-grabbing hover:border-primary/60",
                drag?.key === c.key && "border-primary ring-2 ring-primary/30",
              )}
            >
              <GripVertical className="h-2.5 w-2.5 text-muted-foreground/60" />
              <span className="text-[10px] font-semibold whitespace-nowrap">{c.label}</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 text-[9px] tabular-nums text-muted-foreground whitespace-nowrap">
              {fmtBr(drag?.key === c.key ? drag.iso : c.iso)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── O trilho ─────────────────────────────────────────────────────────────────
export function PhaseRail({
  project, canEdit, isCampo = false,
}: {
  project: Project; canEdit: boolean; isCampo?: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const updateProject = useUpdateProject();
  const { data: checklist } = useListChecklistItems(project.id, {
    query: { queryKey: getListChecklistItemsQueryKey(project.id) },
  });
  const activeIdx = Math.max(0, STATUS_ORDER.indexOf(project.status as (typeof STATUS_ORDER)[number]));
  const [openIdx, setOpenIdx] = useState<number | null>(null); // null = segue a fase ativa

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  function saveField(key: DateKey, iso: string | null) {
    updateProject.mutate(
      { id: project.id, data: { [key]: iso } },
      {
        onSuccess: () => { toast({ title: "Salvo ✓" }); invalidate(); },
        onError: () => toast({ title: "Não foi possível salvar", variant: "destructive" }),
      },
    );
  }

  function advance() {
    const next = STATUS_ORDER[activeIdx + 1];
    if (!next) return;
    updateProject.mutate(
      { id: project.id, data: { status: next } },
      {
        onSuccess: () => {
          toast({ title: `Fase concluída → ${PHASES[activeIdx + 1].label}` });
          setOpenIdx(null);
          invalidate();
        },
        onError: () => toast({ title: "Não foi possível avançar a fase", variant: "destructive" }),
      },
    );
  }

  const instaladas = (checklist ?? []).filter((i) => i.status !== "nao_instalado").length;
  const totalPecas = (checklist ?? []).length;

  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center px-4 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fases e datas</span>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          title="Mostra quem inseriu ou alterou cada data do projeto, e quando"
        >
          <History className="h-3.5 w-3.5" /> Histórico
        </button>
      </div>
      {historyOpen && <DateHistoryDialog projectId={project.id} onClose={() => setHistoryOpen(false)} />}
      <PhaseTimeline project={project} canEdit={canEdit} isCampo={isCampo} onSave={(k, iso) => saveField(k, iso)} />

      <div className="divide-y divide-border">
        {PHASES.map((phase, idx) => {
          const isPast = idx < activeIdx;
          const isActive = idx === activeIdx;
          const isOpen = openIdx === null ? isActive : openIdx === idx;
          const Icon = phase.icon;
          const hideFields = isCampo && phase.status === "em_producao";

          return (
            <div key={phase.status} className={cn(!isPast && !isActive && "opacity-55")}>
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? (isActive ? -1 : null) : idx)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
              >
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold shrink-0",
                  isPast && "bg-emerald-500 border-emerald-500 text-white",
                  isActive && "border-primary text-primary",
                  !isPast && !isActive && "border-border text-muted-foreground",
                )}>
                  {isPast ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-semibold", isActive && "text-primary")}>{phase.label}</span>
                {isActive && <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 rounded px-1.5 py-0.5">fase atual</span>}
                <span className="ml-auto" />
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-3 pl-[52px] space-y-0.5">
                  {phase.status === "em_aprovacao" ? (
                    <div className="py-1 text-sm">
                      {project.approvalStatus === "approved" ? (
                        <span className="text-emerald-600 font-medium">
                          Aprovado pela arquitetura ✓{project.approvalAt ? ` em ${fmtBr(project.approvalAt.slice(0, 10))}` : ""}
                        </span>
                      ) : project.approvalStatus === "rejected" ? (
                        <span className="text-red-600 font-medium">Reprovado pela arquitetura — revisar projeto{project.approvalNote ? ` · "${project.approvalNote}"` : ""}</span>
                      ) : (
                        <span className="text-muted-foreground">Enviado à arquitetura (desenho por e-mail) — registre a decisão no cartão acima.</span>
                      )}
                    </div>
                  ) : phase.status === "em_instalacao" ? (
                    <div className="py-1 text-sm text-muted-foreground">
                      {totalPecas > 0
                        ? <>Instalação: <strong className="text-foreground">{instaladas}/{totalPecas}</strong> esquadrias instaladas — acompanhe na tela Instalações.</>
                        : "Cadastre as esquadrias na tela Instalações para acompanhar peça a peça."}
                    </div>
                  ) : hideFields ? (
                    <p className="py-1 text-sm text-muted-foreground">Acompanhada pela fábrica.</p>
                  ) : (
                    phase.fields.map((f) => (
                      <InlineDate
                        key={f.key}
                        label={f.label}
                        value={project[f.key] as string | null | undefined}
                        deadline={f.deadline}
                        canEdit={canEdit}
                        onSave={(iso) => saveField(f.key, iso)}
                      />
                    ))
                  )}

                  {isActive && canEdit && idx < PHASES.length - 1 && (
                    <div className="pt-2">
                      <Dica texto={`Encerra esta etapa e move o projeto para ${PHASES[idx + 1].label}. Não exige anexar desenho — o envio continua por e-mail.`}>
                        <Button size="sm" className="gap-1.5" onClick={advance} disabled={updateProject.isPending}>
                          Concluir fase <ArrowRight className="h-3.5 w-3.5" /> {PHASES[idx + 1].label}
                        </Button>
                      </Dica>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Histórico de datas ───────────────────────────────────────────────────────
// Datas são compromisso: aqui fica o rastro — quem inseriu/alterou, quando e
// de qual valor para qual. Fonte: audit_logs (o PATCH de projeto grava o diff).

function fmtHistDate(v: unknown): string {
  if (!v || typeof v !== "string") return "—";
  const p = v.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : String(v);
}

function DateHistoryDialog({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const params = { entityType: "project" as const, entityId: projectId, limit: 200 };
  const { data: logs, isLoading } = useListAuditLogs(params, {
    query: { queryKey: getListAuditLogsQueryKey(params) },
  });

  const rows = (logs ?? []).flatMap((log) =>
    (log.changes ?? [])
      .filter((c) => DATE_LABELS[c.field])
      .map((c) => ({
        id: `${log.id}-${c.field}`,
        when: new Date(log.createdAt),
        actor: log.actorName,
        label: DATE_LABELS[c.field],
        from: fmtHistDate(c.from),
        to: fmtHistDate(c.to),
      })),
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Histórico de datas</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma alteração de data registrada ainda — o rastro começa a partir de agora, a cada data inserida ou editada.
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border -mx-1 px-1">
            {rows.map((r) => (
              <div key={r.id} className="py-2.5">
                <p className="text-sm text-foreground">
                  <strong>{r.label}</strong>: <span className="text-muted-foreground">{r.from}</span>
                  {" → "}
                  <strong>{r.to}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.actor} · {r.when.toLocaleDateString("pt-BR")} às {r.when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
