import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, Factory, Ruler, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysFromToday, parseLocalDate } from "@/lib/project-health";

type DateMode = "plain" | "start" | "deadline" | "event";

interface DateItem {
  label: string;
  value?: string | null;
  mode: DateMode;
  /** Prazo estimado: quando a data real correspondente está preenchida, o aviso de "vencido" some */
  supersededBy?: string | null;
}

interface ProjectDatesProject {
  startDate?: string | null;
  endDate?: string | null;
  finalDate?: string | null;
  producaoStartDate?: string | null;
  producaoEndDate?: string | null;
  producaoFinalDate?: string | null;
  medicaoDate?: string | null;
  instalacaoStartDate?: string | null;
}

function fmt(value: string) {
  try {
    return format(parseLocalDate(value), "d MMM yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

function relativeText(days: number) {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days}d` : `há ${-days}d`;
}

function badgeFor(item: DateItem): { text: string; className: string } | null {
  if (!item.value) return null;
  let days: number;
  try {
    days = daysFromToday(item.value);
  } catch {
    return null;
  }
  if (Number.isNaN(days)) return null;

  if (item.mode === "deadline") {
    if (item.supersededBy) return null;
    if (days < 0) return { text: `vencido ${relativeText(days)}`, className: "text-red-500 font-medium" };
    if (days <= 7) return { text: relativeText(days), className: "text-amber-500 font-medium" };
    return { text: relativeText(days), className: "text-muted-foreground" };
  }
  if (item.mode === "event") {
    if (days >= 0 && days <= 7) return { text: relativeText(days), className: "text-amber-500 font-medium" };
    return { text: relativeText(days), className: "text-muted-foreground" };
  }
  if (item.mode === "start" && days > 0) {
    return { text: relativeText(days), className: "text-muted-foreground" };
  }
  return null;
}

function DateRow({ item }: { item: DateItem }) {
  const badge = badgeFor(item);
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{item.label}</span>
      {item.value ? (
        <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-right">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">{fmt(item.value)}</span>
          {badge && <span className={cn("text-[11px] whitespace-nowrap", badge.className)}>{badge.text}</span>}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground/50">—</span>
      )}
    </div>
  );
}

interface DateGroup {
  title: string;
  icon: LucideIcon;
  items: DateItem[];
}

/** Grade com todas as datas do projeto, agrupadas por etapa (Projeto, Medição, Produção, Instalação). */
export function ProjectDates({ project, emptyHint }: { project: ProjectDatesProject; emptyHint?: string }) {
  const groups: DateGroup[] = [
    {
      title: "Projeto",
      icon: CalendarRange,
      items: [
        { label: "Início", value: project.startDate, mode: "start" },
        { label: "Fim estimado", value: project.endDate, mode: "deadline", supersededBy: project.finalDate },
        { label: "Data final", value: project.finalDate, mode: "plain" },
      ],
    },
    {
      title: "Medição",
      icon: Ruler,
      items: [{ label: "Data da medição", value: project.medicaoDate, mode: "event" }],
    },
    {
      title: "Produção",
      icon: Factory,
      items: [
        { label: "Início", value: project.producaoStartDate, mode: "start" },
        { label: "Fim estimado", value: project.producaoEndDate, mode: "deadline", supersededBy: project.producaoFinalDate },
        { label: "Final", value: project.producaoFinalDate, mode: "plain" },
      ],
    },
    {
      title: "Instalação",
      icon: Wrench,
      items: [{ label: "Início estimado", value: project.instalacaoStartDate, mode: "event" }],
    },
  ];

  const hasAny = groups.some((g) => g.items.some((i) => !!i.value));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {groups.map((group) => (
          <div key={group.title} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <group.icon className="h-3.5 w-3.5" />
              {group.title}
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <DateRow key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {!hasAny && emptyHint && <p className="text-xs text-muted-foreground">{emptyHint}</p>}
    </div>
  );
}
