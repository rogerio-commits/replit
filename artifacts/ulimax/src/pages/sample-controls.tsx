import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListSampleControls,
  useCreateSampleControl,
  useUpdateSampleControl,
  useDeleteSampleControl,
  useListProjects,
  useListMembers,
  getListSampleControlsQueryKey,
  type SampleControl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  FlaskConical,
  Plus,
  Search,
  CalendarDays,
  Edit,
  Trash2,
  User,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  projectId: z.number({ required_error: "Projeto obrigatório" }),
  samples: z.string().min(1, "Amostras obrigatórias"),
  responsibleId: z.number().optional(),
  deadline: z.string().min(1, "Prazo obrigatório"),
  requester: z.string().min(1, "Requisitante obrigatório"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SampleControls() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: items, isLoading } = useListSampleControls();
  const { data: projects } = useListProjects({});
  const { data: members } = useListMembers();

  const create = useCreateSampleControl();
  const update = useUpdateSampleControl();
  const del = useDeleteSampleControl();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      samples: "",
      deadline: "",
      requester: "",
      notes: "",
    },
  });

  const filtered = (items ?? []).filter((item) => {
    const matchSearch =
      !search ||
      item.samples.toLowerCase().includes(search.toLowerCase()) ||
      item.requester.toLowerCase().includes(search.toLowerCase()) ||
      item.projectName.toLowerCase().includes(search.toLowerCase());
    const matchProject = filterProject === "all" || String(item.projectId) === filterProject;
    return matchSearch && matchProject;
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ samples: "", deadline: "", requester: "", notes: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (item: SampleControl) => {
    setEditingId(item.id);
    form.reset({
      projectId: item.projectId,
      samples: item.samples,
      responsibleId: item.responsibleId ?? undefined,
      deadline: item.deadline,
      requester: item.requester,
      notes: item.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListSampleControlsQueryKey() });

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        projectId: values.projectId,
        samples: values.samples,
        responsibleId: values.responsibleId,
        deadline: values.deadline,
        requester: values.requester,
        notes: values.notes || undefined,
      };

      if (editingId) {
        await update.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Amostra atualizada com sucesso." });
      } else {
        await create.mutateAsync({ data: payload });
        toast({ title: "Amostra criada com sucesso." });
      }
      invalidate();
      setIsDialogOpen(false);
    } catch {
      toast({ title: "Erro ao salvar.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await del.mutateAsync({ id: deletingId });
      toast({ title: "Amostra excluída." });
      invalidate();
    } catch {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-violet-600" />
            Controle de Amostras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie amostras, prazos e requisições por projeto.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nova Amostra
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar amostra, requisitante, projeto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[200px]">
            <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {(projects ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered.length} amostra{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center gap-2">
              <FlaskConical className="h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Nenhuma amostra encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Amostras</th>
                    <th className="text-left px-4 py-3 font-medium">Projeto</th>
                    <th className="text-left px-4 py-3 font-medium">Requisitante</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Responsável</th>
                    <th className="text-left px-4 py-3 font-medium">Prazo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium max-w-[180px]">
                        <span className="truncate block" title={item.samples}>{item.samples}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{item.projectName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          {item.requester}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {item.responsibleName ?? <span className="italic opacity-50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {formatDate(item.deadline)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(item)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Amostra" : "Nova Amostra"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o projeto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(projects ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="samples"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amostras *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva as amostras a serem analisadas..."
                        className="min-h-[80px]"
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
                  name="requester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requisitante *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do requisitante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo *</FormLabel>
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
                name="responsibleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(members ?? []).map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir amostra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
