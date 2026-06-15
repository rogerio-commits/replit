import { useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useListProjects, 
  useCreateProject, 
  getListProjectsQueryKey,
  ProjectStatus,
  ProjectPriority
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateWithDaysCalc } from "@/components/date-with-days-calc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Briefcase, Plus, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";

const projectSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  status: z.enum(["a_iniciar", "em_projeto", "em_aprovacao", "em_producao", "aguardando_instalacao", "em_instalacao"]),
  priority: z.enum(["low", "medium", "high"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  finalDate: z.string().optional(),
  producaoStartDate: z.string().optional(),
  producaoEndDate: z.string().optional(),
  producaoFinalDate: z.string().optional(),
  medicaoDate: z.string().optional(),
  instalacaoStartDate: z.string().optional(),
  materialType: z.enum(["madeira", "aluminio"]).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

function getStatusColor(status: string) {
  switch (status) {
    case "a_iniciar": return "bg-slate-500/10 text-slate-600 border-slate-200";
    case "em_projeto": return "bg-violet-500/10 text-violet-600 border-violet-200";
    case "em_aprovacao": return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "em_producao": return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "aguardando_instalacao": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "em_instalacao": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    default: return "bg-slate-500/10 text-slate-600 border-slate-200";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high": return "text-destructive";
    case "medium": return "text-amber-500";
    case "low": return "text-emerald-500";
    default: return "text-slate-500";
  }
}

function DateItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
      {value ? (
        <p className="text-xs font-medium leading-none">
          {format(parseISO(value), "d MMM", { locale: ptBR })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/40 leading-none">—</p>
      )}
    </div>
  );
}

export default function Projects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isGestor = useIsGestor();

  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "a_iniciar",
      priority: "medium",
      startDate: "",
      endDate: "",
      producaoStartDate: "",
      producaoEndDate: "",
      medicaoDate: "",
      instalacaoStartDate: "",
      materialType: undefined,
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProject.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Projeto criado com sucesso" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Erro ao criar projeto", variant: "destructive" });
      }
    });
  };

  const filteredProjects = projects?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projetos</h1>
          <p className="text-muted-foreground mt-1">Gerencie e acompanhe todos os projetos de engenharia.</p>
        </div>

        {isGestor && <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Projeto</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Projeto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Edifício Alpha" {...field} />
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
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Breve descrição do projeto..." {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="a_iniciar">A Iniciar</SelectItem>
                            <SelectItem value="em_projeto">Em Projeto</SelectItem>
                            <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                            <SelectItem value="em_producao">Em Produção</SelectItem>
                            <SelectItem value="aguardando_instalacao">Aguardando Instalação</SelectItem>
                            <SelectItem value="em_instalacao">Em Instalação</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início do Projeto</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim Estimado</FormLabel>
                        <FormControl>
                          <DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("startDate")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="finalDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Final</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="producaoStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início da Produção</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="producaoEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim Est. Produção</FormLabel>
                        <FormControl>
                          <DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("producaoStartDate")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="producaoFinalDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Final da Produção</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="medicaoDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Medição</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instalacaoStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início Est. da Instalação</FormLabel>
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
                  name="materialType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Material</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o material" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="madeira">Madeira</SelectItem>
                          <SelectItem value="aluminio">Alumínio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending ? "Criando..." : "Criar Projeto"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:max-w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="a_iniciar">A Iniciar</SelectItem>
                <SelectItem value="em_projeto">Em Projeto</SelectItem>
                <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="aguardando_instalacao">Aguardando Instalação</SelectItem>
                <SelectItem value="em_instalacao">Em Instalação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredProjects && filteredProjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                        <Badge variant="outline" className={`${getStatusColor(project.status)} shrink-0 text-[10px]`}>
                          {STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-1 mt-0.5 text-xs">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <AlertCircle className={`h-3.5 w-3.5 ${getPriorityColor(project.priority)}`} />
                          <span>{PRIORITY_LABELS[project.priority] ?? project.priority}</span>
                        </div>
                        {project.materialType && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {project.materialType === "madeira" ? "Madeira" : "Alumínio"}
                          </Badge>
                        )}
                      </div>

                      {(project.startDate || project.endDate || project.finalDate) && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Projeto</p>
                          <div className="grid grid-cols-3 gap-2">
                            <DateItem label="Início"   value={project.startDate} />
                            <DateItem label="Fim Est." value={project.endDate} />
                            <DateItem label="Final"    value={project.finalDate} />
                          </div>
                        </div>
                      )}

                      {(project.producaoStartDate || project.producaoEndDate || project.producaoFinalDate) && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Produção</p>
                          <div className="grid grid-cols-3 gap-2">
                            <DateItem label="Início"   value={project.producaoStartDate} />
                            <DateItem label="Fim Est." value={project.producaoEndDate} />
                            <DateItem label="Final"    value={project.producaoFinalDate} />
                          </div>
                        </div>
                      )}

                      {(project.medicaoDate || project.instalacaoStartDate) && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Medição & Instalação</p>
                          <div className="grid grid-cols-2 gap-2">
                            <DateItem label="Medição"        value={project.medicaoDate} />
                            <DateItem label="Início Instal." value={project.instalacaoStartDate} />
                          </div>
                        </div>
                      )}

                      {!project.startDate && !project.endDate && !project.finalDate &&
                       !project.producaoStartDate && !project.producaoEndDate && !project.producaoFinalDate &&
                       !project.medicaoDate && !project.instalacaoStartDate && (
                        <p className="text-xs text-muted-foreground/50 italic">Nenhuma data cadastrada</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mt-1">
                {search || statusFilter !== "all" 
                  ? "Tente ajustar os filtros" 
                  : "Comece criando um novo projeto"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
