import { useState, useMemo, useRef } from "react";
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

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_W      = 38;   // px per day column
const BAR_H      = 26;   // px event bar height
const BAR_GAP    = 3;    // px between stacked bars
const ROW_PAD    = 6;    // px top/bottom padding per row
const LEFT_W     = 192;  // px left column width (w-48)
const NO_TEAM    = "Sem equipe";

const COLORS = [
  { id: "orange", label: "Laranja", bg: "bg-orange-500", hex: "#f97316", text: "text-orange-50" },
  { id: "blue",   label: "Azul",    bg: "bg-blue-500",   hex: "#3b82f6", text: "text-blue-50" },
  { id: "green",  label: "Verde",   bg: "bg-green-600",  hex: "#16a34a", text: "text-green-50" },
  { id: "purple", label: "Roxo",    bg: "bg-purple-500", hex: "#a855f7", text: "text-purple-50" },
  { id: "red",    label: "Vermelho",bg: "bg-red-500",    hex: "#ef4444", text: "text-red-50" },
];

function colorHex(id: string) {
  return COLORS.find((c) => c.id === id)?.hex ?? COLORS[0].hex;
}
function colorText(id: string) {
  return COLORS.find((c) => c.id === id)?.text ?? COLORS[0].text;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date) { return format(d, "yyyy-MM-dd"); }

/**
 * Pack events into sub-rows so overlapping bars don't sit on top of each other.
 * Returns map of eventId → subRowIndex.
 */
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
          startDate:       editing.startDate,
          endDate:         editing.endDate ?? "",
          notes:           editing.notes ?? "",
          color:           editing.color ?? "orange",
        }
      : {
          title:           "",
          teamDescription: defaultTeam === NO_TEAM ? "" : defaultTeam,
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
                <FormLabel>Equipe</FormLabel>
                <FormControl><Input placeholder="Ex: Equipe A — João, Maria" {...field} /></FormControl>
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
}) {
  const subRows = useMemo(() => packSubRows(events), [events]);
  const numSubRows = Math.max(1, new Set(subRows.values()).size);
  const rowH = numSubRows * (BAR_H + BAR_GAP) + ROW_PAD * 2;

  // Compute bar position for an event within the visible month range
  function barStyle(event: InstallationEvent): React.CSSProperties | null {
    const evStart = parseISO(event.startDate);
    const evEnd   = event.endDate ? parseISO(event.endDate) : evStart;
    if (evEnd < monthStart || evStart > monthEnd) return null;

    const clampedStart = max([evStart, monthStart]);
    const clampedEnd   = min([evEnd, monthEnd]);
    const startIdx     = differenceInDays(clampedStart, monthStart);
    const duration     = differenceInDays(clampedEnd, clampedStart) + 1;
    const subRow       = subRows.get(event.id) ?? 0;

    return {
      position: "absolute",
      left:  startIdx * DAY_W + 2,
      width: duration * DAY_W - 4,
      top:   ROW_PAD + subRow * (BAR_H + BAR_GAP),
      height: BAR_H,
      backgroundColor: colorHex(event.color),
      borderRadius: 6,
      // Visual hint for overflow
      borderTopLeftRadius:    evStart < monthStart ? 0 : 6,
      borderBottomLeftRadius: evStart < monthStart ? 0 : 6,
      borderTopRightRadius:   evEnd > monthEnd ? 0 : 6,
      borderBottomRightRadius:evEnd > monthEnd ? 0 : 6,
    };
  }

  return (
    <div className={cn("flex", !isLast && "border-b")}>
      {/* Left: team name */}
      <div
        className="sticky left-0 z-10 bg-card border-r flex items-center px-3 shrink-0"
        style={{ width: LEFT_W, minHeight: rowH }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className={cn("text-sm font-medium truncate", team === NO_TEAM && "text-muted-foreground italic")}>
            {team}
          </span>
        </div>
      </div>

      {/* Right: timeline cells + event bars */}
      <div className="relative flex-1" style={{ width: days.length * DAY_W, height: rowH }}>
        {/* Day background cells (click to create) */}
        {days.map((day) => (
          <div
            key={isoDate(day)}
            onClick={() => onDayClick(team, isoDate(day))}
            className={cn(
              "absolute top-0 bottom-0 border-r border-border/50 cursor-pointer transition-colors",
              "hover:bg-primary/5",
              isWeekend(day) && "bg-muted/30",
              isToday(day) && "bg-blue-50 dark:bg-blue-950/20"
            )}
            style={{ left: differenceInDays(day, monthStart) * DAY_W, width: DAY_W }}
          />
        ))}

        {/* Today marker line */}
        {(() => {
          const todayDate = new Date();
          if (todayDate >= monthStart && todayDate <= monthEnd) {
            const offset = differenceInDays(todayDate, monthStart) * DAY_W + DAY_W / 2;
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500/60 z-10 pointer-events-none"
                style={{ left: offset }}
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

          return (
            <TooltipProvider key={event.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    style={style}
                    onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                    className={cn(
                      "group flex items-center px-2 cursor-pointer select-none overflow-hidden",
                      "z-20 shadow-sm hover:brightness-110 transition-all",
                      colorText(event.color)
                    )}
                  >
                    {overflowLeft && <span className="mr-1 text-[10px] opacity-70">◂</span>}
                    <span className="text-[11px] font-semibold truncate flex-1">{event.title}</span>
                    {overflowRight && <span className="ml-1 text-[10px] opacity-70">▸</span>}
                    {/* Hover actions */}
                    <span className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
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
                  </p>
                  {event.teamDescription && <p className="text-xs mt-0.5">{event.teamDescription}</p>}
                  {event.notes && <p className="text-xs mt-1 opacity-80">{event.notes}</p>}
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { toast }      = useToast();
  const qc             = useQueryClient();
  const deleteMut      = useDeleteInstallationEvent();

  const { data: events = [], isLoading } = useListInstallationEvents();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalW     = days.length * DAY_W;

  // Group events by team — events that span into this month are included
  const teamMap = useMemo(() => {
    const map = new Map<string, InstallationEvent[]>();
    for (const ev of events) {
      const evEnd = ev.endDate ?? ev.startDate;
      // Include if event overlaps this month
      if (ev.startDate > isoDate(monthEnd) || evEnd < isoDate(monthStart)) continue;
      const key = ev.teamDescription?.trim() || NO_TEAM;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    // If no teams at all, add placeholder row
    if (map.size === 0) map.set(NO_TEAM, []);
    return map;
  }, [events, monthStart, monthEnd]);

  // Sort teams: named teams first, NO_TEAM last
  const teamEntries = useMemo(() => {
    const entries = [...teamMap.entries()];
    return entries.sort(([a], [b]) => {
      if (a === NO_TEAM) return 1;
      if (b === NO_TEAM) return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [teamMap]);

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

  return (
    <div className="flex flex-col h-full gap-0 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">Calendário de Instalações</h1>
            <p className="text-xs text-muted-foreground">Visão de equipes e obras no tempo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-semibold capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
          <Button size="sm" onClick={() => openCreate("", isoDate(new Date()))}>
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

            {/* Day header */}
            <div className="flex sticky top-0 z-30 bg-background border-b">
              {/* Left spacer */}
              <div
                className="sticky left-0 z-30 bg-background border-r shrink-0 flex items-center px-3"
                style={{ width: LEFT_W, height: 40 }}
              >
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Equipe</span>
              </div>
              {/* Day columns */}
              {days.map((day) => (
                <div
                  key={isoDate(day)}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-border/50 shrink-0",
                    isWeekend(day) && "bg-muted/30",
                    isToday(day) && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                  style={{ width: DAY_W, height: 40 }}
                >
                  <span className={cn(
                    "text-[10px] font-medium leading-none",
                    isToday(day) ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE", { locale: ptBR }).slice(0, 3)}
                  </span>
                  <span className={cn(
                    "text-xs font-semibold mt-0.5",
                    isToday(day) ? "bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]" : ""
                  )}>
                    {format(day, "d")}
                  </span>
                </div>
              ))}
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
              />
            ))}

            {/* Empty state */}
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <CalendarRange className="h-10 w-10 opacity-20" />
                <p className="text-sm">Nenhum evento cadastrado</p>
                <p className="text-xs">Clique em "+ Novo Evento" para começar</p>
              </div>
            )}
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
