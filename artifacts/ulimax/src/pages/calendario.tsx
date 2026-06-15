import { useState, useMemo } from "react";
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
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CalendarDays, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
  { id: "orange", label: "Laranja", bg: "bg-orange-500", light: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "blue",   label: "Azul",    bg: "bg-blue-500",   light: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "green",  label: "Verde",   bg: "bg-green-600",  light: "bg-green-100 text-green-800 border-green-200" },
  { id: "purple", label: "Roxo",    bg: "bg-purple-500", light: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "red",    label: "Vermelho",bg: "bg-red-500",    light: "bg-red-100 text-red-800 border-red-200" },
];

function getColorLight(colorId: string) {
  return COLORS.find((c) => c.id === colorId)?.light ?? COLORS[0].light;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function eventCoversDay(event: InstallationEvent, day: string): boolean {
  const start = event.startDate;
  const end   = event.endDate ?? event.startDate;
  return day >= start && day <= end;
}

// ── EventDialog ───────────────────────────────────────────────────────────────

function EventDialog({
  open,
  onOpenChange,
  defaultDate,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
  editing: InstallationEvent | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createEvent = useCreateInstallationEvent();
  const updateEvent = useUpdateInstallationEvent();

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
          teamDescription: "",
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

    const invalidate = () => qc.invalidateQueries({ queryKey: getListInstallationEventsQueryKey() });

    if (editing) {
      updateEvent.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => { invalidate(); toast({ title: "Evento atualizado." }); onOpenChange(false); },
          onError:   () => toast({ title: "Erro ao atualizar.", variant: "destructive" }),
        }
      );
    } else {
      createEvent.mutate(
        { data: payload },
        {
          onSuccess: () => { invalidate(); toast({ title: "Evento criado." }); onOpenChange(false); },
          onError:   () => toast({ title: "Erro ao criar.", variant: "destructive" }),
        }
      );
    }
  }

  const isPending = createEvent.isPending || updateEvent.isPending;

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
                <FormLabel>Título</FormLabel>
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
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Fim</FormLabel>
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
                <FormLabel>Cor</FormLabel>
                <div className="flex gap-2 pt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => field.onChange(c.id)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all border-2",
                        c.bg,
                        field.value === c.id ? "border-foreground scale-110" : "border-transparent"
                      )}
                      title={c.label}
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

// ── EventPopover ──────────────────────────────────────────────────────────────

function EventChip({
  event,
  onEdit,
  onDelete,
}: {
  event: InstallationEvent;
  onEdit: (e: InstallationEvent) => void;
  onDelete: (e: InstallationEvent) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium border cursor-pointer hover:opacity-90 transition-opacity",
        getColorLight(event.color)
      )}
    >
      <span className="truncate flex-1" title={event.title}>{event.title}</span>
      <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(event); }}
          className="p-0.5 rounded hover:bg-black/10"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          className="p-0.5 rounded hover:bg-black/10"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Calendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [defaultDate, setDefaultDate]   = useState(isoDate(new Date()));
  const [editingEvent, setEditingEvent] = useState<InstallationEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstallationEvent | null>(null);

  const { toast } = useToast();
  const qc = useQueryClient();
  const deleteEvent = useDeleteInstallationEvent();

  const { data: events = [], isLoading } = useListInstallationEvents();

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  function openCreate(date: Date) {
    setEditingEvent(null);
    setDefaultDate(isoDate(date));
    setDialogOpen(true);
  }

  function openEdit(event: InstallationEvent) {
    setEditingEvent(event);
    setDefaultDate(event.startDate);
    setDialogOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEvent.mutate(
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
  const weekDays   = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Upcoming events (from today onward, sorted by startDate)
  const today = isoDate(new Date());
  const upcoming = events
    .filter((e) => (e.endDate ?? e.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8);

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário de Instalações</h1>
          <p className="text-sm text-muted-foreground">Controle e acompanhe as equipes de instalação</p>
        </div>
        <Button onClick={() => openCreate(new Date())}>
          <Plus className="mr-2 h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-base font-semibold capitalize">{monthLabel}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
            </div>
          ) : (
            <div className="grid grid-cols-7 flex-1 border-t border-l">
              {calendarDays.map((day) => {
                const dayStr    = isoDate(day);
                const inMonth   = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);
                const dayEvents = events.filter((e) => eventCoversDay(e, dayStr));

                return (
                  <div
                    key={dayStr}
                    onClick={() => openCreate(day)}
                    className={cn(
                      "border-b border-r min-h-[90px] p-1 cursor-pointer hover:bg-muted/40 transition-colors",
                      !inMonth && "bg-muted/20"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      isCurrentDay && "bg-primary text-white",
                      !inMonth && "text-muted-foreground",
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayEvents.map((event) => (
                        <EventChip
                          key={event.id}
                          event={event}
                          onEdit={(e) => { openEdit(e); }}
                          onDelete={(e) => setDeleteTarget(e)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar — upcoming events */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Próximos eventos</h2>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <CalendarDays className="h-8 w-8 opacity-30" />
              Nenhum evento futuro
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto">
              {upcoming.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border bg-card p-3 space-y-1 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => openEdit(event)}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", COLORS.find(c => c.id === event.color)?.bg ?? "bg-orange-500")} />
                    <span className="text-sm font-medium truncate">{event.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-4">
                    {format(parseISO(event.startDate), "d MMM", { locale: ptBR })}
                    {event.endDate && event.endDate !== event.startDate && (
                      <> — {format(parseISO(event.endDate), "d MMM", { locale: ptBR })}</>
                    )}
                  </div>
                  {event.teamDescription && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pl-4">
                      <Users className="h-3 w-3" />
                      <span className="truncate">{event.teamDescription}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <EventDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingEvent(null); }}
        defaultDate={defaultDate}
        editing={editingEvent}
      />

      {/* Delete Confirmation */}
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
              {deleteEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
