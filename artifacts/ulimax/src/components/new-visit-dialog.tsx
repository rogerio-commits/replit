import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateSiteVisit,
  useListMembers,
  useListProjects,
  getListAllSiteVisitsQueryKey,
  getListSiteVisitsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const visitSchema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  responsibleId: z.string().optional(),
  visitors: z.string().min(1, "Informe quem foi à obra"),
  objective: z.string().min(1, "Objetivo obrigatório"),
  notes: z.string().optional(),
});
type VisitFormValues = z.infer<typeof visitSchema>;

/**
 * Diálogo reutilizável para agendar/registrar uma visita a uma obra. Antes, a
 * criação de visita só existia dentro da página do projeto; agora pode ser
 * disparada de qualquer lugar (ex.: do painel "Precisam de visita").
 */
export function NewVisitDialog({
  projectId,
  projectName,
  trigger,
}: {
  /** Quando ausente, o diálogo mostra um seletor de obra ("Nova visita" geral). */
  projectId?: number;
  projectName?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pickedProject, setPickedProject] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: members } = useListMembers();
  const { data: projects } = useListProjects();
  const createSiteVisit = useCreateSiteVisit();

  const effectiveProjectId = projectId ?? (pickedProject ? Number(pickedProject) : undefined);

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: { date: "", responsibleId: "none", visitors: "", objective: "", notes: "" },
  });

  const onSubmit = (data: VisitFormValues) => {
    if (!effectiveProjectId) {
      toast({ title: "Escolha a obra", variant: "destructive" });
      return;
    }
    createSiteVisit.mutate(
      {
        id: effectiveProjectId,
        data: {
          date: data.date,
          visitors: data.visitors,
          objective: data.objective,
          notes: data.notes || undefined,
          responsibleId:
            data.responsibleId && data.responsibleId !== "none"
              ? Number(data.responsibleId)
              : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Visita agendada" });
          queryClient.invalidateQueries({ queryKey: getListAllSiteVisitsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSiteVisitsQueryKey(effectiveProjectId) });
          setOpen(false);
          form.reset({ date: "", responsibleId: "none", visitors: "", objective: "", notes: "" });
          setPickedProject("");
        },
        onError: () => toast({ title: "Erro ao agendar visita", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{projectName ? `Agendar visita — ${projectName}` : "Nova visita"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!projectId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Obra</label>
                <Select value={pickedProject} onValueChange={setPickedProject}>
                  <SelectTrigger><SelectValue placeholder="Escolha a obra" /></SelectTrigger>
                  <SelectContent>
                    {(projects ?? [])
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="responsibleId" render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável (opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="visitors" render={({ field }) => (
              <FormItem>
                <FormLabel>Quem foi à obra</FormLabel>
                <FormControl><Input placeholder="Ex.: João, equipe de instalação" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="objective" render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivo</FormLabel>
                <FormControl><Input placeholder="Ex.: acompanhar instalação" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações (opcional)</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={createSiteVisit.isPending}>
                {createSiteVisit.isPending ? "Agendando..." : "Agendar visita"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
