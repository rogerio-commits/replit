import { useState, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListProjects,
  useCreateProject,
  useAddProjectMember,
  useListMembers,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateWithDaysCalc } from "@/components/date-with-days-calc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Briefcase,
  Users,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

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

type SortKey = "name" | "status" | "priority" | "startDate" | "endDate" | "finalDate" | "producaoStartDate" | "producaoEndDate" | "producaoFinalDate" | "medicaoDate" | "instalacaoStartDate" | "materialType";
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

const STATUS_ORDER: Record<string, number> = {
  a_iniciar: 0,
  em_projeto: 1,
  em_aprovacao: 2,
  em_producao: 3,
  aguardando_instalacao: 4,
  em_instalacao: 5,
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Normal",
  low: "Normal",
};

function getStatusColor(status: string) {
  switch (status) {
    case "a_iniciar":            return "bg-slate-100 text-slate-700 border-slate-300";
    case "em_projeto":           return "bg-violet-100 text-violet-700 border-violet-300";
    case "em_aprovacao":         return "bg-purple-100 text-purple-700 border-purple-300";
    case "em_producao":          return "bg-blue-100 text-blue-700 border-blue-300";
    case "aguardando_instalacao":return "bg-amber-100 text-amber-700 border-amber-300";
    case "em_instalacao":        return "bg-green-100 text-green-700 border-green-300";
    default:                     return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case "high": return "bg-red-500";
    case "medium": return "bg-amber-400";
    case "low": return "bg-emerald-500";
    default: return "bg-slate-400";
  }
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  try { return format(parseISO(val), "dd/MM/yy", { locale: ptBR }); }
  catch { return "—"; }
}

type AlertLevel = "overdue" | "soon" | null;

function getDateAlert(val?: string | null): AlertLevel {
  if (!val) return null;
  try {
    const d = parseISO(val);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - now.getTime()) / 86_400_000);
    if (diff < 0) return "overdue";
    if (diff <= 7) return "soon";
    return null;
  } catch {
    return null;
  }
}

function DateCell({
  val,
  href,
  baseCls,
  deadline = false,
}: {
  val?: string | null;
  href: string;
  baseCls: string;
  deadline?: boolean;
}) {
  const alert = deadline ? getDateAlert(val) : null;
  const alertCls =
    alert === "overdue"
      ? "!bg-red-100 !text-red-700 font-semibold"
      : alert === "soon"
      ? "!bg-amber-100 !text-amber-700 font-semibold"
      : "";
  const Icon =
    alert === "overdue" ? AlertCircle : alert === "soon" ? Clock : null;

  return (
    <td className={cn(baseCls, alertCls)}>
      <a href={href} className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {fmtDate(val)}
      </a>
    </td>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
}

export default function Projects() {
  const searchStr = useSearch();
  const initialStatus = useMemo(() => {
    const p = new URLSearchParams(searchStr);
    const s = p.get("status");
    const valid = ["a_iniciar","em_projeto","em_aprovacao","em_producao","aguardando_instalacao","em_instalacao"];
    return s && valid.includes(s) ? s : "all";
  }, [searchStr]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  const { data: projects, isLoading } = useListProjects();
  const { data: allMembers } = useListMembers();
  const createProject = useCreateProject();
  const addMember = useAddProjectMember();

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
      onSuccess: async (project) => {
        for (const memberId of Array.from(selectedMemberIds)) {
          await addMember.mutateAsync({ id: project.id, data: { memberId } });
        }
        toast({ title: "Projeto criado com sucesso" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsCreateOpen(false);
        setSelectedMemberIds(new Set());
        form.reset();
      },
      onError: () => toast({ title: "Erro ao criar projeto", variant: "destructive" }),
    });
  };

  const toggleMember = (id: number) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = projects ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter(p => p.priority === priorityFilter);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "pt-BR");
      else if (sortKey === "status") cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      else if (sortKey === "priority") cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      else if (sortKey === "materialType") cmp = (a.materialType ?? "").localeCompare(b.materialType ?? "");
      else {
        const dateFields: Record<string, string | null | undefined> = {
          startDate: a.startDate, endDate: a.endDate, finalDate: a.finalDate,
          producaoStartDate: a.producaoStartDate, producaoEndDate: a.producaoEndDate,
          producaoFinalDate: a.producaoFinalDate, medicaoDate: a.medicaoDate,
          instalacaoStartDate: a.instalacaoStartDate,
        };
        const dateFieldsB: Record<string, string | null | undefined> = {
          startDate: b.startDate, endDate: b.endDate, finalDate: b.finalDate,
          producaoStartDate: b.producaoStartDate, producaoEndDate: b.producaoEndDate,
          producaoFinalDate: b.producaoFinalDate, medicaoDate: b.medicaoDate,
          instalacaoStartDate: b.instalacaoStartDate,
        };
        const av = dateFields[sortKey] ?? "";
        const bv = dateFieldsB[sortKey] ?? "";
        cmp = av.localeCompare(bv);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [projects, search, statusFilter, priorityFilter, sortKey, sortDir]);

  const thCls = "px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none cursor-pointer hover:text-foreground transition-colors whitespace-nowrap";
  const thInner = "flex items-center gap-1";

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            {projects ? `${filtered.length} de ${projects.length} projeto${projects.length !== 1 ? "s" : ""}` : "Carregando..."}
          </p>
        </div>

        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Projeto</FormLabel>
                      <FormControl><Input placeholder="Ex.: Edifício Alpha" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Input placeholder="Breve descrição do projeto..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
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
                    )} />
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="medium">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início do Projeto</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim Estimado</FormLabel>
                        <FormControl>
                          <DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("startDate")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="finalDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Final</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField control={form.control} name="producaoStartDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início Produção</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="producaoEndDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim Est. Produção</FormLabel>
                        <FormControl>
                          <DateWithDaysCalc value={field.value ?? ""} onChange={field.onChange} referenceDate={form.watch("producaoStartDate")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="producaoFinalDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Final Produção</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="medicaoDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Medição</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="instalacaoStartDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início Est. Instalação</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="materialType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Material</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="madeira">Madeira</SelectItem>
                          <SelectItem value="aluminio">Alumínio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {allMembers && allMembers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Participantes</span>
                        {selectedMemberIds.size > 0 && (
                          <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{selectedMemberIds.size}</Badge>
                        )}
                      </div>
                      <ScrollArea className="h-32 rounded-md border p-2">
                        <div className="space-y-1">
                          {allMembers.map((member) => {
                            const initials = member.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                            return (
                              <label key={member.id} className="flex items-center gap-2.5 px-1 py-1 rounded hover:bg-muted cursor-pointer select-none">
                                <Checkbox checked={selectedMemberIds.has(member.id)} onCheckedChange={() => toggleMember(member.id)} />
                                <Avatar className="h-6 w-6">
                                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                                  <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm leading-none truncate">{member.name}</p>
                                  {member.role && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{member.role}</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={createProject.isPending || addMember.isPending}>
                      {createProject.isPending || addMember.isPending ? "Criando..." : "Criar Projeto"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="a_iniciar">A Iniciar</SelectItem>
                <SelectItem value="em_projeto">Em Projeto</SelectItem>
                <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="aguardando_instalacao">Aguard. Instalação</SelectItem>
                <SelectItem value="em_instalacao">Em Instalação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prior.</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Normal</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== "all" || priorityFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center gap-3">
              <Briefcase className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="border-b bg-muted/30 sticky top-0">
                  <tr>
                    <th className={cn(thCls, "pl-4 w-8")}>#</th>
                    <th className={thCls} onClick={() => handleSort("name")}>
                      <div className={thInner}>Projeto <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "min-w-[90px]")}>Tarefas</th>
                    <th className={thCls} onClick={() => handleSort("status")}>
                      <div className={thInner}>Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={thCls} onClick={() => handleSort("priority")}>
                      <div className={thInner}>Prior. <SortIcon col="priority" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={thCls} onClick={() => handleSort("materialType")}>
                      <div className={thInner}>Material <SortIcon col="materialType" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-violet-200 text-violet-800 border-l-2 border-violet-300")} onClick={() => handleSort("startDate")}>
                      <div className={thInner}>Início Proj. <SortIcon col="startDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-violet-200 text-violet-800")} onClick={() => handleSort("endDate")}>
                      <div className={thInner}>Fim Est. Proj. <SortIcon col="endDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-violet-200 text-violet-800 border-r-2 border-violet-300")} onClick={() => handleSort("finalDate")}>
                      <div className={thInner}>Final Proj. <SortIcon col="finalDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-blue-200 text-blue-800 border-l-2 border-blue-300")} onClick={() => handleSort("producaoStartDate")}>
                      <div className={thInner}>Início Prod. <SortIcon col="producaoStartDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-blue-200 text-blue-800")} onClick={() => handleSort("producaoEndDate")}>
                      <div className={thInner}>Fim Est. Prod. <SortIcon col="producaoEndDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-blue-200 text-blue-800 border-r-2 border-blue-300")} onClick={() => handleSort("producaoFinalDate")}>
                      <div className={thInner}>Final Prod. <SortIcon col="producaoFinalDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-amber-200 text-amber-800 border-l-2 border-r-2 border-amber-300")} onClick={() => handleSort("medicaoDate")}>
                      <div className={thInner}>Medição <SortIcon col="medicaoDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-emerald-200 text-emerald-800 border-l-2 border-r-2 border-emerald-300")} onClick={() => handleSort("instalacaoStartDate")}>
                      <div className={thInner}>Início Inst. <SortIcon col="instalacaoStartDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project, idx) => (
                    <tr
                      key={project.id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                    >
                      <td className="pl-4 py-2.5 text-xs text-muted-foreground font-mono tabular-nums w-8">{idx + 1}</td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <Link href={`/projects/${project.id}`} className="block">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate leading-snug">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 min-w-[90px]">
                        <Link href={`/projects/${project.id}`} className="block">
                          {project.taskTotal > 0 ? (
                            <div className="space-y-1">
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${Math.round((project.taskDone / project.taskTotal) * 100)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                {project.taskDone}/{project.taskTotal}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/projects/${project.id}`} className="block">
                          <Badge variant="outline" className={cn("text-[10px] font-medium whitespace-nowrap", getStatusColor(project.status))}>
                            {STATUS_LABELS[project.status] ?? project.status}
                          </Badge>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", getPriorityDot(project.priority))} />
                          <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[project.priority]}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/projects/${project.id}`} className="block">
                          {project.materialType ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {project.materialType === "madeira" ? "Madeira" : "Alumínio"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </Link>
                      </td>
                      <DateCell val={project.startDate}         href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-violet-50/30 border-l border-violet-100/60" />
                      <DateCell val={project.endDate}           href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-violet-50/30" deadline />
                      <DateCell val={project.finalDate}         href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-violet-50/30 border-r border-violet-100/60" deadline />
                      <DateCell val={project.producaoStartDate} href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-blue-50/30 border-l border-blue-100/60" />
                      <DateCell val={project.producaoEndDate}   href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-blue-50/30" deadline />
                      <DateCell val={project.producaoFinalDate} href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-blue-50/30 border-r border-blue-100/60" deadline />
                      <DateCell val={project.medicaoDate}       href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-amber-50/30 border-l border-amber-100/60 border-r border-amber-100/60" deadline />
                      <DateCell val={project.instalacaoStartDate} href={`/projects/${project.id}`} baseCls="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap bg-emerald-50/30 border-l border-emerald-100/60 border-r border-emerald-100/60" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
