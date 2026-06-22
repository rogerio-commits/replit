import { useState, useMemo, useRef, useEffect } from "react";
import {
  useListInstallationEvents,
  useCreateInstallationEvent,
  useUpdateInstallationEvent,
  useDeleteInstallationEvent,
  getListInstallationEventsQueryKey,
} from "@workspace/api-client-react";
import type { InstallationEvent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isToday,
  isWeekend,
  parseISO,
  startOfMonth,
  addMonths,
  subMonths,
  differenceInDays,
  max,
  min,
  isSameDay,
  getISOWeek,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  CalendarRange,
  Wrench,
  HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Brazilian Holidays ────────────────────────────────────────────────────────

/** Gaussian algorithm to compute Easter Sunday for a given year. */
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns a Map<"yyyy-MM-dd", holidayName> for all Brazilian national holidays in the given year. */
function getBrazilianHolidays(year: number): Map<string, string> {
  const easter = easterDate(year);
  const holidays: [Date, string][] = [
    [new Date(year, 0,  1),  "Ano Novo"],
    [new Date(year, 3, 21),  "Tiradentes"],
    [new Date(year, 4,  1),  "Dia do Trabalho"],
    [new Date(year, 8,  7),  "Independência"],
    [new Date(year, 9, 12),  "Ap.da"],
    [new Date(year, 10, 2),  "Finados"],
    [new Date(year, 10,15),  "Proclamação"],
    [new Date(year, 10,20),  "Consciência Negra"],
    [new Date(year, 11,25),  "Natal"],
    // Moveable
    [addDays(easter, -2), "Sexta Santa"],
    [addDays(easter, 60), "Corpus Christi"],
  ];
  const map = new Map<string, string>();
  for (const [d, name] of holidays) map.set(ymd(d), name);
  return map;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_W      = 44;   // px per day column
const BAR_H      = 28;   // px event bar height
const BAR_GAP    = 4;    // px between stacked bars
const ROW_PAD    = 8;    // px top/bottom padding per row
const LEFT_W     = 200;  // px left column width
const HEADER_H   = 56;   // px day header height
const NO_TEAM    = "Sem equipe";

const COLORS = [
  { id: "orange", label: "Laranja", bg: "bg-orange-500", hex: "#f97316", text: "text-orange-50", light: "#fff7ed" },
  { id: "blue",   label: "Azul",    bg: "bg-blue-500",   hex: "#3b82f6", text: "text-blue-50",   light: "#eff6ff" },
  { id: "green",  label: "Verde",   bg: "bg-green-600",  hex: "#16a34a", text: "text-green-50",  light: "#f0fdf4" },
  { id: "purple", label: "Roxo",    bg: "bg-purple-500", hex: "#a855f7", text: "text-purple-50", light: "#faf5ff" },
  { id: "red",    label: "Vermelho",bg: "bg-red-500",    hex: "#ef4444", text: "text-red-50",    light: "#fef2f2" },
];

function colorHex(id: string) {
  return COLORS.find((c) => c.id === id)?.hex ?? COLORS[0].hex;
}
function colorText(id: string) {
  return COLORS.find((c) => c.id === id)?.text ?? COLORS[0].text;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date) { return format(d, "yyyy-MM-dd"); }

function packSubRows(events: InstallationEvent[]): Map<number, number> {
  const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const result  = new Map<number, number>();
  const rowEnd: string[] = [];
  for (const ev of sorted) {
    const end = ev.endDate ?? ev.startDate;
    let placed = false;
    for (let i = 0; i < rowEnd.length; i++) {
      if (ev.startDate > rowEnd[i]) {
        result.set(ev.id, i);
        rowEnd[i] = end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      result.set(ev.id, rowEnd.length);
      rowEnd.push(end);
    }
  }
  return result;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  title:           z.string().min(1, "Título obrigatório"),
  teamDescription: z.string().optional(),
  eventType:       z.enum(["instalacao", "assistencia"]).default("instalacao"),
  startDate:       z.string().min(1, "Data de início obrigatória"),
  endDate:         z.string().optional(),
  notes:           z.string().optional(),
  color:           z.string().default("orange"),
});
type EventFormValues = z.infer<typeof eventSchema>;

// ── EventDialog ───────────────────────────────────────────────────────────────

function EventDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTeam,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
  defaultTeam: string;
  editing: InstallationEvent | null;
}) {
  const { toast }  = useToast();
  const qc         = useQueryClient();
  const createMut  = useCreateInstallationEvent();
  const updateMut  = useUpdateInstallationEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    values: editing
      ? {
          title:           editing.title,
          teamDescription: editing.teamDescription ?? "",
          eventType:       (editing.eventType ?? "instalacao") as "instalacao" | "assistencia",
          startDate:       editing.startDate,
          endDate:         editing.endDate ?? "",
          notes:           editing.notes ?? "",
          color:           editing.color ?? "orange",
        }
      : {
          title:           "",
          teamDescription: defaultTeam === NO_TEAM ? "" : defaultTeam,
          eventType:       "instalacao" as const,
          startDate:       defaultDate,
          endDate:         "",
          notes:           "",
          color:           "orange",
        },
  });

  function onSubmit(values: EventFormValues) {
    const payload = {
      title:           values.title,
      teamDescription: values.teamDescription || undefined,
      eventType:       values.eventType,
      startDate:       values.startDate,
      endDate:         values.endDate || undefined,
      notes:           values.notes || undefined,
      color:           values.color || "orange",
    };
    const done = () => {
      qc.invalidateQueries({ queryKey: getListInstallationEventsQueryKey() });
      onOpenChange(false);
    };
    if (editing) {
      updateMut.mutate(
        { id: editing.id, data: payload },
        { onSuccess: () => { done(); toast({ title: "Evento atualizado." }); }, onError: () => toast({ title: "Erro ao atualizar.", variant: "destructive" }) }
      );
    } else {
      createMut.mutate(
        { data: payload },
        { onSuccess: () => { done(); toast({ title: "Evento criado." }); }, onError: () => toast({ title: "Erro ao criar.", variant: "destructive" }) }
      );
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título / Obra</FormLabel>
                <FormControl><Input placeholder="Ex: Instalação — Cliente ABC" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="teamDescription" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Equipe
                  {editing && (
                    <span className="text-[11px] font-normal text-muted-foreground">(fixo na linha)</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Equipe A — João, Maria"
                    disabled={!!editing}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="eventType" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Atividade</FormLabel>
                <div className="flex gap-2 pt-1">
                  {([
                    { value: "instalacao",  label: "Instalação",  Icon: HardHat },
                    { value: "assistencia", label: "Assistência", Icon: Wrench },
                  ] as const).map((opt) => {
                    const isSelected = field.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:bg-muted"
                        )}
                      >
                        <opt.Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Início</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea placeholder="Detalhes adicionais..." rows={2} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel>Cor da equipe</FormLabel>
                <div className="flex gap-2 pt-1">
                  {COLORS.map((c) => (
                    <button key={c.id} type="button" onClick={() => field.onChange(c.id)}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all", c.bg,
                        field.value === c.id ? "border-foreground scale-110" : "border-transparent"
                      )} title={c.label}
                    />
                  ))}
                </div>
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── GanttRow ──────────────────────────────────────────────────────────────────

function GanttRow({
  team,
  events,
  days,
  monthStart,
  monthEnd,
  isLast,
  onDayClick,
  onEditEvent,
  onDeleteEvent,
  onRenameTeam,
  dayEventCount,
  holidays,
}: {
  team: string;
  events: InstallationEvent[];
  days: Date[];
  monthStart: Date;
  monthEnd: Date;
  isLast: boolean;
  onDayClick: (team: string, date: string) => void;
  onEditEvent: (e: InstallationEvent) => void;
  onDeleteEvent: (e: InstallationEvent) => void;
  onRenameTeam: (oldName: string, newName: string) => void;
  dayEventCount: Map<string, number>;
  holidays: Map<string, string>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue]     = useState(team);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setNameValue(team);
    setEditingName(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== team) onRenameTeam(team, trimmed);
    else setNameValue(team);
  }

  const subRows = useMemo(() => packSubRows(events), [events]);
  const numSubRows = Math.max(1, new Set(subRows.values()).size);
  const rowH = numSubRows * (BAR_H + BAR_GAP) + ROW_PAD * 2;

  // Derive team accent color from the most common color in its events
  const teamAccentHex = useMemo(() => {
    if (events.length === 0) return "#d5d8d8";
    const freq = new Map<string, number>();
    for (const ev of events) {
      const c = ev.color ?? "orange";
      freq.set(c, (freq.get(c) ?? 0) + 1);
    }
    let best = "orange";
    let max = 0;
    freq.forEach((count, color) => { if (count > max) { max = count; best = color; } });
    return colorHex(best);
  }, [events]);

  const today = new Date();

  function barStyle(event: InstallationEvent): React.CSSProperties | null {
    const evStart = parseISO(event.startDate);
    const evEnd   = event.endDate ? parseISO(event.endDate) : evStart;
    if (evEnd < monthStart || evStart > monthEnd) return null;

    const clampedStart = max([evStart, monthStart]);
    const clampedEnd   = min([evEnd, monthEnd]);
    const startIdx     = differenceInDays(clampedStart, monthStart);
    const duration     = differenceInDays(clampedEnd, clampedStart) + 1;
    const subRow       = subRows.get(event.id) ?? 0;

    const isAssistencia = event.eventType === "assistencia";
    return {
      position: "absolute",
      left:  startIdx * DAY_W + 3,
      width: duration * DAY_W - 6,
      top:   ROW_PAD + subRow * (BAR_H + BAR_GAP),
      height: BAR_H,
      backgroundColor: colorHex(event.color),
      backgroundImage: isAssistencia
        ? "repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(255,255,255,0.18) 5px, rgba(255,255,255,0.18) 10px)"
        : undefined,
      outline: isAssistencia ? "2px dashed rgba(255,255,255,0.45)" : undefined,
      outlineOffset: isAssistencia ? "-2px" : undefined,
      borderRadius: 7,
      borderTopLeftRadius:    evStart < monthStart ? 0 : 7,
      borderBottomLeftRadius: evStart < monthStart ? 0 : 7,
      borderTopRightRadius:   evEnd > monthEnd ? 0 : 7,
      borderBottomRightRadius:evEnd > monthEnd ? 0 : 7,
      boxShadow: "0 1px 3px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)",
    };
  }

  // Progress overlay: how much of the bar period is "done" based on today
  function progressWidth(event: InstallationEvent, style: React.CSSProperties): number | null {
    const evStart = parseISO(event.startDate);
    const evEnd   = event.endDate ? parseISO(event.endDate) : evStart;
    if (today < evStart || today > evEnd) return null;
    const total    = differenceInDays(evEnd, evStart) + 1;
    const elapsed  = differenceInDays(today, evStart) + 1;
    const pct      = Math.min(1, elapsed / total);
    const w        = (style.width as number) ?? 0;
    return w * pct;
  }

  const maxDayCount = Math.max(1, ...Array.from(dayEventCount.values()));

  return (
    <div className={cn("flex", !isLast && "border-b border-border/60")}>
      {/* Left: team name + color accent */}
      <div
        className="sticky left-0 z-10 bg-card border-r flex items-stretch shrink-0"
        style={{ width: LEFT_W, minHeight: rowH }}
      >
        {/* Color accent stripe */}
        <div
          className="w-1 shrink-0 rounded-r-sm self-stretch my-1"
          style={{ backgroundColor: teamAccentHex, opacity: 0.85 }}
        />
        <div className="flex items-center px-3 gap-1.5 min-w-0 w-full group/team">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {editingName ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                if (e.key === "Escape") { setEditingName(false); setNameValue(team); }
              }}
              className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-primary outline-none py-0.5"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              title="Clique para renomear a equipe"
              className={cn(
                "flex-1 min-w-0 text-left text-sm font-medium truncate",
                "rounded px-1 -mx-1 hover:bg-muted transition-colors",
                team === NO_TEAM && "text-muted-foreground italic"
              )}
            >
              {team}
            </button>
          )}
          {!editingName && (
            <button
              type="button"
              onClick={startEdit}
              title="Renomear equipe"
              className="shrink-0 opacity-0 group-hover/team:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Right: timeline cells + event bars */}
      <div className="relative flex-1" style={{ width: days.length * DAY_W, height: rowH }}>
        {/* Day background cells */}
        {days.map((day) => {
          const dateStr   = isoDate(day);
          const count     = dayEventCount.get(dateStr) ?? 0;
          const density   = count / maxDayCount;
          const holiday   = holidays.get(dateStr);
          const isSat     = day.getDay() === 6;
          const isSun     = day.getDay() === 0;

          const isWeekendDay = isSat || isSun;
          let bgColor: string | undefined;
          if (isToday(day))       bgColor = "rgba(59,130,246,0.07)";
          else if (holiday)       bgColor = "rgba(168,85,247,0.09)";
          else if (isWeekendDay)  bgColor = "rgba(113,113,122,0.10)";
          else if (count > 0)     bgColor = `rgba(59,130,246,${density * 0.07})`;

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(team, dateStr)}
              className="absolute top-0 bottom-0 border-r border-border/30 cursor-pointer transition-colors"
              style={{
                left: differenceInDays(day, monthStart) * DAY_W,
                width: DAY_W,
                backgroundColor: bgColor,
              }}
            >
              <div className="absolute inset-0 hover:bg-primary/5 transition-colors" />
            </div>
          );
        })}

        {/* Today marker line */}
        {(() => {
          const todayDate = new Date();
          if (todayDate >= monthStart && todayDate <= monthEnd) {
            const offset = differenceInDays(todayDate, monthStart) * DAY_W + DAY_W / 2;
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
                style={{ left: offset, backgroundColor: "rgba(59,130,246,0.5)" }}
              />
            );
          }
          return null;
        })()}

        {/* Event bars */}
        {events.map((event) => {
          const style = barStyle(event);
          if (!style) return null;
          const evStart = parseISO(event.startDate);
          const evEnd   = event.endDate ? parseISO(event.endDate) : evStart;
          const overflowLeft  = evStart < monthStart;
          const overflowRight = evEnd > monthEnd;
          const progW    = progressWidth(event, style);

          return (
            <TooltipProvider key={event.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    style={style}
                    onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                    className={cn(
                      "group flex items-center px-2 cursor-pointer select-none overflow-hidden",
                      "z-20 hover:brightness-110 transition-all",
                      colorText(event.color)
                    )}
                  >
                    {/* Progress overlay (semi-transparent darker strip) */}
                    {progW !== null && (
                      <div
                        className="absolute top-0 left-0 bottom-0 pointer-events-none rounded-l-[7px]"
                        style={{
                          width: progW,
                          backgroundColor: "rgba(0,0,0,0.18)",
                        }}
                      />
                    )}

                    {overflowLeft && <span className="mr-1 text-[10px] opacity-70 relative z-10">◂</span>}
                    {event.eventType === "assistencia"
                      ? <Wrench className="h-3 w-3 mr-1 shrink-0 opacity-90 relative z-10" />
                      : <HardHat className="h-3 w-3 mr-1 shrink-0 opacity-90 relative z-10" />}
                    <span className="text-[11px] font-semibold truncate flex-1 relative z-10">{event.title}</span>
                    {overflowRight && <span className="ml-1 text-[10px] opacity-70 relative z-10">▸</span>}
                    {/* Hover actions */}
                    <span className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1 relative z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                        className="p-0.5 rounded hover:bg-white/20"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteEvent(event); }}
                        className="p-0.5 rounded hover:bg-white/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(evStart, "d MMM", { locale: ptBR })}
                    {!isSameDay(evStart, evEnd) && <> — {format(evEnd, "d MMM", { locale: ptBR })}</>}
                    {" · "}
                    {differenceInDays(evEnd, evStart) + 1} dia(s)
                  </p>
                  <p className="text-xs mt-0.5">
                    {event.eventType === "assistencia" ? "🛠️ Assistência" : "🔧 Instalação"}
                  </p>
                  {event.teamDescription && <p className="text-xs mt-0.5">{event.teamDescription}</p>}
                  {event.notes && <p className="text-xs mt-1 opacity-80">{event.notes}</p>}
                  {progW !== null && (
                    <p className="text-xs mt-1 font-medium text-blue-400">
                      Em andamento
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Calendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [defaultDate, setDefaultDate]   = useState(isoDate(new Date()));
  const [defaultTeam, setDefaultTeam]   = useState("");
  const [editingEvent, setEditingEvent] = useState<InstallationEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstallationEvent | null>(null);
  const [newTeamOpen, setNewTeamOpen]   = useState(false);
  const [newTeamName, setNewTeamName]   = useState("");
  const scrollRef             = useRef<HTMLDivElement>(null);
  const programmaticScroll    = useRef(false);   // true while we set scrollLeft ourselves
  const pendingScrollTarget   = useRef<"today" | "start" | "end">("today");

  const { toast }      = useToast();
  const qc             = useQueryClient();
  const deleteMut      = useDeleteInstallationEvent();
  const updateMut      = useUpdateInstallationEvent();

  const { data: events = [], isLoading } = useListInstallationEvents();

  async function handleRenameTeam(oldName: string, newName: string) {
    const toUpdate = events.filter(
      (e) => (e.teamDescription?.trim() || NO_TEAM) === oldName
    );
    await Promise.all(
      toUpdate.map((ev) =>
        updateMut.mutateAsync({
          id: ev.id,
          data: { teamDescription: newName === NO_TEAM ? undefined : newName },
        })
      )
    );
    qc.invalidateQueries({ queryKey: getListInstallationEventsQueryKey() });
    toast({ title: `Equipe renomeada para "${newName}".` });
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalW     = days.length * DAY_W;

  // All teams ever registered (persists across month navigation)
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    for (const ev of events) {
      teams.add(ev.teamDescription?.trim() || NO_TEAM);
    }
    if (teams.size === 0) teams.add(NO_TEAM);
    return teams;
  }, [events]);

  // Group current-month events by team — all teams always present, even if empty
  const teamMap = useMemo(() => {
    const map = new Map<string, InstallationEvent[]>();
    for (const team of allTeams) map.set(team, []);
    for (const ev of events) {
      const evEnd = ev.endDate ?? ev.startDate;
      if (ev.startDate > isoDate(monthEnd) || evEnd < isoDate(monthStart)) continue;
      const key = ev.teamDescription?.trim() || NO_TEAM;
      map.get(key)!.push(ev);
    }
    return map;
  }, [events, allTeams, monthStart, monthEnd]);

  const teamEntries = useMemo(() => {
    const entries = [...teamMap.entries()];
    return entries.sort(([a], [b]) => {
      if (a === NO_TEAM) return 1;
      if (b === NO_TEAM) return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [teamMap]);

  // Per-day event count (all events overlapping that day, across all teams)
  const dayEventCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      const evStart = parseISO(ev.startDate);
      const evEnd   = ev.endDate ? parseISO(ev.endDate) : evStart;
      const start   = max([evStart, monthStart]);
      const end     = min([evEnd, monthEnd]);
      if (start > end) continue;
      eachDayOfInterval({ start, end }).forEach((d) => {
        const k = isoDate(d);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
    }
    return map;
  }, [events, monthStart, monthEnd]);

  // Brazilian national holidays — covers current year + adjacent for boundary months
  const holidays = useMemo(() => {
    const y = currentMonth.getFullYear();
    const map = new Map<string, string>();
    for (const [k, v] of getBrazilianHolidays(y - 1)) map.set(k, v);
    for (const [k, v] of getBrazilianHolidays(y))     map.set(k, v);
    for (const [k, v] of getBrazilianHolidays(y + 1)) map.set(k, v);
    return map;
  }, [currentMonth]);

  // Summary stats for this month
  const monthStats = useMemo(() => {
    const monthStr = format(currentMonth, "yyyy-MM");
    const thisMonth = events.filter((ev) => ev.startDate.startsWith(monthStr) || (ev.endDate ?? ev.startDate).startsWith(monthStr));
    return {
      installs:    thisMonth.filter((e) => e.eventType !== "assistencia").length,
      assistencias: thisMonth.filter((e) => e.eventType === "assistencia").length,
      teams:        new Set(thisMonth.map((e) => e.teamDescription?.trim() || NO_TEAM)).size,
    };
  }, [events, currentMonth]);

  // Week boundaries: first day of each ISO week visible in this month
  const weekBoundaries = useMemo(() => {
    const seenWeeks = new Set<number>();
    const result: { day: Date; weekNum: number }[] = [];
    for (const day of days) {
      const wn = getISOWeek(day);
      if (!seenWeeks.has(wn)) {
        seenWeeks.add(wn);
        result.push({ day, weekNum: wn });
      }
    }
    return result;
  }, [days]);

  function openCreate(team: string, date: string) {
    setEditingEvent(null);
    setDefaultDate(date);
    setDefaultTeam(team);
    setDialogOpen(true);
  }

  function openEdit(event: InstallationEvent) {
    setEditingEvent(event);
    setDefaultDate(event.startDate);
    setDefaultTeam(event.teamDescription ?? "");
    setDialogOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListInstallationEventsQueryKey() });
          toast({ title: "Evento removido." });
          setDeleteTarget(null);
        },
        onError: () => toast({ title: "Erro ao remover.", variant: "destructive" }),
      }
    );
  }

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

  // Scroll position after month changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const target = pendingScrollTarget.current;
    pendingScrollTarget.current = "today"; // reset for next navigation

    programmaticScroll.current = true;

    if (target === "end") {
      container.scrollLeft = container.scrollWidth;
    } else if (target === "start") {
      container.scrollLeft = 0;
    } else {
      // "today" — center the today column if visible in this month
      const today = new Date();
      if (today >= monthStart && today <= monthEnd) {
        const todayOffset = differenceInDays(today, monthStart) * DAY_W;
        const containerW  = container.clientWidth;
        const scrollTo    = todayOffset - (containerW - LEFT_W) / 2 + DAY_W / 2;
        container.scrollLeft = Math.max(0, scrollTo);
      } else {
        container.scrollLeft = 0;
      }
    }

    // Allow the scroll event listener to fire again after a short pause
    const timer = setTimeout(() => { programmaticScroll.current = false; }, 150);
    return () => clearTimeout(timer);
  }, [currentMonth, monthStart, monthEnd]);

  // Change month when the user scrolls past either edge
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (programmaticScroll.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = container;

      if (scrollLeft + clientWidth >= scrollWidth - 2) {
        // Reached the right edge → advance month, start from the left
        programmaticScroll.current = true;
        pendingScrollTarget.current = "start";
        setCurrentMonth((m) => addMonths(m, 1));
      } else if (scrollLeft <= 0) {
        // Reached the left edge → go back a month, start from the right
        programmaticScroll.current = true;
        pendingScrollTarget.current = "end";
        setCurrentMonth((m) => subMonths(m, 1));
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full gap-0 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarRange className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-tight">Calendário de Instalações</h1>
              <p className="text-xs text-muted-foreground">Visão de equipes e obras no tempo</p>
            </div>
          </div>

          {/* Summary chips */}
          {!isLoading && events.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              {monthStats.installs > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 text-primary text-xs font-medium">
                  <HardHat className="h-3 w-3" />
                  {monthStats.installs} instalação{monthStats.installs !== 1 ? "ões" : ""}
                </span>
              )}
              {monthStats.assistencias > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                  <Wrench className="h-3 w-3" />
                  {monthStats.assistencias} assistência{monthStats.assistencias !== 1 ? "s" : ""}
                </span>
              )}
              {monthStats.teams > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  <Users className="h-3 w-3" />
                  {monthStats.teams} equipe{monthStats.teams !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-1 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-semibold capitalize">{monthLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => { setNewTeamName(""); setNewTeamOpen(true); }}>
            <Users className="mr-1.5 h-4 w-4" /> Nova Equipe
          </Button>
          <Button size="sm" className="h-8" onClick={() => openCreate("", isoDate(new Date()))}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo Evento
          </Button>
        </div>
      </div>

      {/* ── Gantt grid ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div style={{ minWidth: LEFT_W + totalW }}>

            {/* Day header — two rows: week labels + day numbers */}
            <div className="sticky top-0 z-30 bg-card border-b shadow-sm">
              {/* Week row */}
              <div className="flex" style={{ height: 20 }}>
                <div className="sticky left-0 z-30 bg-card border-r shrink-0" style={{ width: LEFT_W }} />
                <div className="relative flex-1" style={{ width: totalW }}>
                  {weekBoundaries.map(({ day, weekNum }) => {
                    const offset = differenceInDays(day, monthStart) * DAY_W;
                    return (
                      <div
                        key={weekNum}
                        className="absolute top-0 bottom-0 flex items-center"
                        style={{ left: offset, paddingLeft: 4 }}
                      >
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                          Sem {weekNum}
                        </span>
                        {/* week separator line */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-px bg-border/80"
                          style={{ pointerEvents: "none" }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day row */}
              <div className="flex" style={{ height: HEADER_H - 20 }}>
                {/* Left spacer */}
                <div
                  className="sticky left-0 z-30 bg-card border-r shrink-0 flex items-center px-3"
                  style={{ width: LEFT_W }}
                >
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Equipe</span>
                </div>
                {/* Day columns */}
                {days.map((day) => {
                  const dateStr = isoDate(day);
                  const count   = dayEventCount.get(dateStr) ?? 0;
                  const holiday = holidays.get(dateStr);
                  const isSat   = day.getDay() === 6;
                  const isSun   = day.getDay() === 0;
                  const isFirst = differenceInDays(day, startOfWeek(day, { weekStartsOn: 1 })) === 0;

                  let headerBg = "bg-card";
                  let numColor = "text-foreground";
                  let labelColor = "text-muted-foreground/80";
                  const isWeekendDay = isSat || isSun;
                  if (isToday(day))      { headerBg = "bg-blue-50"; }
                  else if (holiday)      { headerBg = "bg-purple-50"; }
                  else if (isWeekendDay) { headerBg = "bg-zinc-200/70"; }

                  if (holiday)           { numColor = "text-purple-700"; labelColor = "text-purple-500/80"; }
                  else if (isWeekendDay) { numColor = "text-zinc-500"; labelColor = "text-zinc-400/80"; }

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "flex flex-col items-center justify-center border-r shrink-0 relative overflow-hidden",
                        headerBg,
                        isToday(day) ? "border-border/40" : "border-border/30",
                        isFirst && !isToday(day) && "border-l border-l-border/70"
                      )}
                      style={{ width: DAY_W }}
                    >
                      <span className={cn("text-[9px] font-semibold uppercase leading-none mb-1", isToday(day) ? "text-blue-600" : labelColor)}>
                        {format(day, "EEE", { locale: ptBR }).slice(0, 3)}
                      </span>
                      <span className={cn(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                        isToday(day) ? "bg-blue-500 text-white" : numColor
                      )}>
                        {format(day, "d")}
                      </span>
                      {/* Holiday name — tiny label at bottom */}
                      {holiday && (
                        <span className="absolute bottom-0.5 left-0 right-0 text-center text-[7px] font-semibold text-purple-600/80 truncate px-0.5 leading-none">
                          {holiday}
                        </span>
                      )}
                      {/* Workload dot */}
                      {count > 0 && !holiday && (
                        <div
                          className="absolute bottom-1 w-1 h-1 rounded-full"
                          style={{
                            backgroundColor: count >= 3 ? "#ef4444" : count === 2 ? "#f97316" : "#3b82f6",
                            opacity: 0.7,
                          }}
                        />
                      )}
                      {isToday(day) && (
                        <span className="absolute -top-[14px] left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-500 uppercase tracking-wider whitespace-nowrap">
                          Hoje
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team rows */}
            {teamEntries.map(([team, teamEvents], idx) => (
              <GanttRow
                key={team}
                team={team}
                events={teamEvents}
                days={days}
                monthStart={monthStart}
                monthEnd={monthEnd}
                isLast={idx === teamEntries.length - 1}
                onDayClick={(t, d) => openCreate(t, d)}
                onEditEvent={openEdit}
                onDeleteEvent={(e) => setDeleteTarget(e)}
                onRenameTeam={handleRenameTeam}
                dayEventCount={dayEventCount}
                holidays={holidays}
              />
            ))}

            {/* Empty state */}
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <CalendarRange className="h-8 w-8 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Nenhum evento cadastrado</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em "+ Novo Evento" para começar</p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="sticky bottom-0 left-0 flex items-center gap-4 px-4 py-2 bg-card/95 backdrop-blur border-t text-[10px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider mr-1">Legenda:</span>
              <span className="flex items-center gap-1.5">
                <HardHat className="h-3 w-3" /> Instalação
              </span>
              <span className="flex items-center gap-1.5">
                <Wrench className="h-3 w-3" />
                <span
                  className="inline-block w-8 h-2.5 rounded"
                  style={{
                    backgroundImage: "repeating-linear-gradient(-45deg, #6b7280, #6b7280 2px, transparent 2px, transparent 5px)",
                    border: "1px dashed #9ca3af",
                  }}
                />
                Assistência
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-zinc-300/80 border border-zinc-300" /> Fim de semana
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-purple-100 border border-purple-200" /> Feriado
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 bg-blue-500/50" /> Hoje
              </span>
              <span className="flex items-center gap-2 ml-1">
                Carga: 
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70" /> 1
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500/70" /> 2
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" /> 3+
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <EventDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingEvent(null); }}
        defaultDate={defaultDate}
        defaultTeam={defaultTeam}
        editing={editingEvent}
      />

      {/* ── Nova Equipe dialog ───────────────────────────────────────────── */}
      <Dialog open={newTeamOpen} onOpenChange={(v) => { setNewTeamOpen(v); if (!v) setNewTeamName(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Nova Equipe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da equipe</label>
              <Input
                placeholder="Ex: Equipe A — João, Maria"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = newTeamName.trim();
                    if (!trimmed) return;
                    setNewTeamOpen(false);
                    openCreate(trimmed, isoDate(new Date()));
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Você poderá adicionar eventos a esta equipe no próximo passo.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewTeamOpen(false)}>Cancelar</Button>
              <Button
                disabled={!newTeamName.trim()}
                onClick={() => {
                  const trimmed = newTeamName.trim();
                  if (!trimmed) return;
                  setNewTeamOpen(false);
                  openCreate(trimmed, isoDate(new Date()));
                }}
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover evento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
