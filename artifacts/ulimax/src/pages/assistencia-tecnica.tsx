import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListAssistenciaTecnica,
  useCreateAssistenciaTecnica,
  useUpdateAssistenciaTecnica,
  useDeleteAssistenciaTecnica,
  getListAssistenciaTecnicaQueryKey,
  type AssistenciaTecnica,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Wrench,
  Plus,
  Search,
  Phone,
  User,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-700 border-blue-200",
  em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
  concluido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelado: "bg-slate-100 text-slate-500 border-slate-200",
};

const formSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente obrigatório"),
  contact: z.string().min(1, "Contato obrigatório"),
  description: z.string().min(1, "Descrição obrigatória"),
  status: z.enum(["aberto", "em_andamento", "concluido", "cancelado"]).optional(),
  scheduledDate: z.string().optional(),
  responsibleMembers: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AssistenciaTecnica() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isGestor = useIsGestor();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: items, isLoading } = useListAssistenciaTecnica();

  const createAT = useCreateAssistenciaTecnica();
  const updateAT = useUpdateAssistenciaTecnica();
  const deleteAT = useDeleteAssistenciaTecnica();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      contact: "",
      description: "",
      status: "aberto",
      scheduledDate: "",
      responsibleMembers: "",
    },
  });

  const filtered = (items ?? []).filter((item) => {
    const matchSearch =
      !search ||
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      clientName: "",
      contact: "",
      description: "",
      status: "aberto",
      scheduledDate: "",
      responsibleMembers: "",
    });
    setIsDialogOpen(true);
  };

  const openEdit = (item: AssistenciaTecnica) => {
    setEditingId(item.id);
    form.reset({
      clientName: item.clientName,
      contact: item.contact,
      description: item.description,
      status: item.status as FormValues["status"],
      scheduledDate: item.scheduledDate ?? "",
      responsibleMembers: item.responsibleMembers ?? "",
    });
    setIsDialogOpen(true);
  };

  // Abre o diálogo de novo chamado quando a página é chamada com ?create=1 (botão "+ Criar")
  const autoCreateRef = useRef(false);
  useEffect(() => {
    if (autoCreateRef.current) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("create") === "1") {
      openCreate();
      autoCreateRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAssistenciaTecnicaQueryKey() });

  const onSubmit = (data: FormValues) => {
    const payload = {
      clientName: data.clientName,
      contact: data.contact,
      description: data.description,
      status: data.status ?? "aberto",
      scheduledDate: data.scheduledDate || undefined,
      responsibleMembers: data.responsibleMembers || undefined,
    };

    if (editingId) {
      updateAT.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Chamado atualizado com sucesso" });
            invalidate();
            setIsDialogOpen(false);
          },
          onError: () => toast({ title: "Erro ao atualizar chamado", variant: "destructive" }),
        }
      );
    } else {
      createAT.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Chamado registrado com sucesso" });
            invalidate();
            setIsDialogOpen(false);
          },
          onError: () => toast({ title: "Erro ao registrar chamado", variant: "destructive" }),
        }
      );
    }
  };

  const toggleRealizado = (item: (typeof filtered)[number]) => {
    updateAT.mutate(
      { id: item.id, data: { realizado: !item.realizado } },
      {
        onSuccess: () => {
          toast({ title: item.realizado ? "Chamado reaberto" : "Chamado marcado como realizado" });
          invalidate();
        },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      }
    );
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteAT.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          toast({ title: "Chamado excluído" });
          invalidate();
          setDeletingId(null);
        },
        onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
      }
    );
  };

  const safeItems = items ?? [];
  const counts = {
    aberto: safeItems.filter((i) => i.status === "aberto").length,
    em_andamento: safeItems.filter((i) => i.status === "em_andamento").length,
    concluido: safeItems.filter((i) => i.status === "concluido").length,
    cancelado: safeItems.filter((i) => i.status === "cancelado").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assistência Técnica</h1>
            <p className="text-sm text-muted-foreground">Chamados de clientes</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Chamado
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "aberto", label: "Abertos", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/10" },
          { key: "em_andamento", label: "Em Andamento", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10" },
          { key: "concluido", label: "Concluídos", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
          { key: "cancelado", label: "Cancelados", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/10" },
        ].map(({ key, label, color, bg }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            className={cn(
              "rounded-lg border p-4 text-left transition-all",
              bg,
              filterStatus === key ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"
            )}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className={cn("text-2xl font-bold", color)}>{counts[key as keyof typeof counts]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, contato ou descrição..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterStatus !== "all" && (
          <Button variant="outline" size="sm" onClick={() => setFilterStatus("all")} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Limpar filtro
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">
              {search || filterStatus !== "all"
                ? "Nenhum chamado encontrado com os filtros aplicados."
                : "Nenhum chamado registrado ainda."}
            </p>
            {!search && filterStatus === "all" && (
              <Button onClick={openCreate} variant="outline" className="gap-2 mt-1">
                <Plus className="h-4 w-4" />
                Registrar primeiro chamado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "transition-all",
                item.realizado && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-4 items-start">
                  {/* Realizado checkbox */}
                  <div className="mt-0.5 shrink-0">
                    <Checkbox
                      checked={item.realizado}
                      onCheckedChange={() => toggleRealizado(item)}
                      className="h-5 w-5"
                    />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-semibold text-sm", item.realizado && "line-through text-muted-foreground")}>
                          {item.clientName}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[item.status])}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        {item.realizado && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Realizado
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(item)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {isGestor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-foreground/80 leading-relaxed">{item.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {item.contact}
                      </span>
                      {item.responsibleMembers && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.responsibleMembers}
                        </span>
                      )}
                      {item.scheduledDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(item.scheduledDate + "T00:00:00"), "d 'de' MMM yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {item.realizadoAt && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Realizado em {format(new Date(item.realizadoAt), "d 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        Aberto em {format(new Date(item.createdAt), "d 'de' MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Chamado" : "Novo Chamado de Assistência Técnica"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato</FormLabel>
                    <FormControl>
                      <Input placeholder="Telefone, e-mail ou WhatsApp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Problema</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o problema relatado pelo cliente..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aberto">Aberto</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Agendada</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="responsibleMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipe Técnica Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Carlos, Ana, Pedro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={createAT.isPending || updateAT.isPending}>
                  {editingId ? "Salvar" : "Registrar Chamado"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chamado será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
