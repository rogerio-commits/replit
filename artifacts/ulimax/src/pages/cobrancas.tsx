import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useListChaseItems } from "@workspace/api-client-react";
import type { ChaseItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, MapPin, ClipboardList, User, ChevronRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysFromToday } from "@/lib/project-health";
import { ActionPlanBadge } from "@/components/action-plan-badge";
import { useActionPlanMap } from "@/hooks/useActionPlanMap";

// Monta a mensagem de cobrança para o WhatsApp. Sem número salvo, usamos
// wa.me sem destinatário: o gestor escolhe o contato e envia o texto pronto.
function whatsappUrl(item: ChaseItem): string {
  const nome = item.responsibleExternal ?? "";
  const prazo = item.dueDate
    ? ` Prazo: ${item.dueDate.split("-").reverse().join("/")}.`
    : "";
  const obra = item.projectName ? ` (obra: ${item.projectName})` : "";
  const msg = `Olá${nome ? `, ${nome}` : ""}! Passando para acompanhar: "${item.description}"${obra}.${prazo}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

// ── Minhas Cobranças ─────────────────────────────────────────────────────────
// Tudo que o gestor de obras precisa cobrar, agregado de todas as obras: itens
// de plano de ação e follow-ups de visita em aberto. Ordenado por urgência.

type Urgency = "vencida" | "hoje" | "proxima" | "futura" | "sem_prazo";
const PROXIMA_DIAS = 7;

function urgencyOf(dueDate: string | null | undefined): Urgency {
  if (!dueDate) return "sem_prazo";
  const d = daysFromToday(dueDate);
  if (d < 0) return "vencida";
  if (d === 0) return "hoje";
  if (d <= PROXIMA_DIAS) return "proxima";
  return "futura";
}

const URGENCY_META: Record<Urgency, { label: string; chip: string; rank: number }> = {
  vencida:   { label: "Vencida",       chip: "bg-red-50 text-red-700 border-red-200",       rank: 0 },
  hoje:      { label: "Vence hoje",    chip: "bg-amber-50 text-amber-700 border-amber-200", rank: 1 },
  proxima:   { label: "Próxima",       chip: "bg-blue-50 text-blue-700 border-blue-200",    rank: 2 },
  futura:    { label: "No prazo",      chip: "bg-muted text-muted-foreground border-border", rank: 3 },
  sem_prazo: { label: "Sem prazo",     chip: "bg-muted text-muted-foreground border-border", rank: 4 },
};

function responsibleLabel(item: ChaseItem): string {
  if (item.responsibleName) return item.responsibleName;
  if (item.responsibleExternal) return `${item.responsibleExternal} (externo)`;
  return "Sem responsável";
}

function fmtDue(dueDate: string | null | undefined): string {
  if (!dueDate) return "—";
  const d = daysFromToday(dueDate);
  const br = dueDate.split("-").length === 3 ? `${dueDate.split("-")[2]}/${dueDate.split("-")[1]}` : dueDate;
  if (d < 0) return `${br} · atrasada ${Math.abs(d)}d`;
  if (d === 0) return `${br} · hoje`;
  return `${br} · em ${d}d`;
}

export default function Cobrancas() {
  const [, navigate] = useLocation();
  const planMap = useActionPlanMap();
  const { data: items, isLoading } = useListChaseItems();
  const [prazo, setPrazo] = useState<string>("abertas");
  const [responsavel, setResponsavel] = useState<string>("all");
  const [obra, setObra] = useState<string>("all");
  const [agrupar, setAgrupar] = useState<"projeto" | "item">("projeto");

  const { rows, counts, responsaveis, obras } = useMemo(() => {
    const all = (items ?? []) as ChaseItem[];

    const withUrgency = all.map((it) => ({ item: it, urg: urgencyOf(it.dueDate) }));

    const counts = {
      vencida: withUrgency.filter((r) => r.urg === "vencida").length,
      hoje: withUrgency.filter((r) => r.urg === "hoje").length,
      proxima: withUrgency.filter((r) => r.urg === "proxima").length,
      total: all.length,
    };

    const responsaveis = Array.from(
      new Set(all.map((it) => responsibleLabel(it))),
    ).sort();
    const obras = Array.from(
      new Map(all.filter((it) => it.projectName).map((it) => [it.projectId, it.projectName!])).entries(),
    ).sort((a, b) => a[1].localeCompare(b[1]));

    const rows = withUrgency
      .filter((r) => {
        if (prazo === "abertas") return true;
        if (prazo === "vencidas") return r.urg === "vencida";
        if (prazo === "hoje") return r.urg === "hoje";
        if (prazo === "proximas") return r.urg === "proxima";
        if (prazo === "sem_prazo") return r.urg === "sem_prazo";
        return true;
      })
      .filter((r) => responsavel === "all" || responsibleLabel(r.item) === responsavel)
      .filter((r) => obra === "all" || String(r.item.projectId) === obra)
      .sort((a, b) => {
        const byRank = URGENCY_META[a.urg].rank - URGENCY_META[b.urg].rank;
        if (byRank !== 0) return byRank;
        // dentro do mesmo grupo, o prazo mais próximo primeiro
        const da = a.item.dueDate ? daysFromToday(a.item.dueDate) : Infinity;
        const db = b.item.dueDate ? daysFromToday(b.item.dueDate) : Infinity;
        return da - db;
      });

    return { rows, counts, responsaveis, obras };
  }, [items, prazo, responsavel, obra]);

  // Agrupamento por obra: o gestor cobra o plano por projeto, não item a item.
  const grupos = useMemo(() => {
    const map = new Map<
      number,
      { projectId: number; projectName: string; items: typeof rows; vencidas: number; nextDue: string | null }
    >();
    for (const r of rows) {
      const pid = r.item.projectId;
      let g = map.get(pid);
      if (!g) {
        g = { projectId: pid, projectName: r.item.projectName ?? "Obra", items: [], vencidas: 0, nextDue: null };
        map.set(pid, g);
      }
      g.items.push(r);
      if (r.urg === "vencida") g.vencidas++;
      if (r.item.dueDate && (!g.nextDue || r.item.dueDate < g.nextDue)) g.nextDue = r.item.dueDate;
    }
    return [...map.values()].sort(
      (a, b) => b.vencidas - a.vencidas || (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999"),
    );
  }, [rows]);

  const itemRow = (r: (typeof rows)[number]) => {
    const { item, urg } = r;
    return (
      <div key={`${item.source}-${item.id}`} onClick={() => navigate(`/projects/${item.projectId}`)}>
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
          <span title={item.source === "visit" ? "Follow-up de visita" : "Plano de ação"} className="shrink-0">
            {item.source === "visit"
              ? <MapPin className="h-4 w-4 text-violet-500" />
              : <ClipboardList className="h-4 w-4 text-blue-500" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
              {agrupar === "item" && item.projectName && <span className="truncate max-w-[180px]">{item.projectName}</span>}
              {item.context && <span className="text-muted-foreground/70">{agrupar === "item" ? "· " : ""}{item.context}</span>}
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{responsibleLabel(item)}</span>
            </div>
          </div>
          {item.responsibleExternal && (
            <a
              href={whatsappUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Cobrar no WhatsApp"
              className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cobrar</span>
            </a>
          )}
          <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", URGENCY_META[urg].chip)}>
            {fmtDue(item.dueDate)}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          Minhas Cobranças
        </h1>
        <p className="text-muted-foreground mt-1">
          Itens de plano de ação e follow-ups de visita em aberto, de todas as obras.
        </p>
      </div>

      {/* Resumo */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setPrazo("vencidas")} className={cn("bg-card rounded-xl border p-4 text-left transition-all hover:shadow-sm", prazo === "vencidas" ? "border-red-300" : "border-border")}>
            <div className="text-2xl font-bold text-red-600">{counts.vencida}</div>
            <div className="text-xs font-medium text-muted-foreground">Vencidas</div>
          </button>
          <button onClick={() => setPrazo("hoje")} className={cn("bg-card rounded-xl border p-4 text-left transition-all hover:shadow-sm", prazo === "hoje" ? "border-amber-300" : "border-border")}>
            <div className="text-2xl font-bold text-amber-600">{counts.hoje}</div>
            <div className="text-xs font-medium text-muted-foreground">Vencem hoje</div>
          </button>
          <button onClick={() => setPrazo("proximas")} className={cn("bg-card rounded-xl border p-4 text-left transition-all hover:shadow-sm", prazo === "proximas" ? "border-blue-300" : "border-border")}>
            <div className="text-2xl font-bold text-blue-600">{counts.proxima}</div>
            <div className="text-xs font-medium text-muted-foreground">Próximos {PROXIMA_DIAS} dias</div>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={prazo} onValueChange={setPrazo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="abertas">Todas em aberto</SelectItem>
            <SelectItem value="vencidas">Vencidas</SelectItem>
            <SelectItem value="hoje">Vencem hoje</SelectItem>
            <SelectItem value="proximas">Próximas</SelectItem>
            <SelectItem value="sem_prazo">Sem prazo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={responsavel} onValueChange={setResponsavel}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={obra} onValueChange={setObra}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Obra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto inline-flex rounded-md border border-border overflow-hidden text-xs font-medium">
          <button
            onClick={() => setAgrupar("projeto")}
            className={cn("px-3 py-1.5 transition-colors", agrupar === "projeto" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50")}
          >
            Por projeto
          </button>
          <button
            onClick={() => setAgrupar("item")}
            className={cn("px-3 py-1.5 transition-colors border-l border-border", agrupar === "item" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50")}
          >
            Por item
          </button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          🎉 Nenhuma cobrança em aberto com esses filtros.
        </div>
      ) : agrupar === "item" ? (
        <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
          {rows.map(itemRow)}
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => (
            <div key={g.projectId} className="bg-card rounded-xl border border-border overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/projects/${g.projectId}`)}
              >
                <p className="text-sm font-semibold text-foreground truncate">{g.projectName}</p>
                <ActionPlanBadge projectId={g.projectId} projectName={g.projectName} summary={planMap.get(g.projectId)} />
                <div className="flex-1" />
                {g.vencidas > 0 && (
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40">
                    {g.vencidas} vencida{g.vencidas > 1 ? "s" : ""}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {g.items.length} cobrança{g.items.length > 1 ? "s" : ""}
                  {g.nextDue ? ` · próx. ${g.nextDue.split("-").slice(1).reverse().join("/")}` : ""}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </div>
              <div className="divide-y divide-border">{g.items.map(itemRow)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
