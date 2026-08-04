import { useState, useMemo, useEffect, useRef } from "react";
import {Link, useSearch, useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListProjects,
  useCreateProject,
  useAddProjectMember,
  useListMembers,
  useListTasks,
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
  Download,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Archive,
  HelpCircle,
} from "lucide-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";
import { computeHealthMap, FAROL_META, type FarolLevel } from "@/lib/project-health";
import { ActionPlanBadge } from "@/components/action-plan-badge";
import { useActionPlanMap } from "@/hooks/useActionPlanMap";
import { ProjectsBoard } from "./kanban";

// ── CSV Import helpers ───────────────────────────────────────────────────────
const TEMPLATE_CSV = [
  ["nome", "status", "prioridade", "data_inicio", "prazo_entrega", "data_final", "material", "descricao"],
  ["Apartamento Silva", "a_iniciar", "alta", "2026-08-01", "2026-09-30", "2026-10-15", "madeira", "Cozinha e dormitórios"],
  ["Escritório Beta", "em_producao", "normal", "", "2026-10-10", "", "aluminio", ""],
  ["Casa Costa", "", "", "", "", "", "", ""],
].map(r => r.join(",")).join("\n");

const STATUS_MAP: Record<string, string> = {
  "a iniciar": "a_iniciar", "a_iniciar": "a_iniciar",
  "em projeto": "em_projeto", "em_projeto": "em_projeto",
  "em aprovação": "em_aprovacao", "em aprovacao": "em_aprovacao", "em_aprovacao": "em_aprovacao",
  "em produção": "em_producao", "em producao": "em_producao", "em_producao": "em_producao",
  "aguardando instalação": "aguardando_instalacao", "aguardando instalacao": "aguardando_instalacao", "aguardando_instalacao": "aguardando_instalacao",
  "em instalação": "em_instalacao", "em instalacao": "em_instalacao", "em_instalacao": "em_instalacao",
};
const PRIORITY_MAP: Record<string, string> = {
  baixa: "low", low: "low",
  normal: "medium", media: "medium", média: "medium", medium: "medium",
  alta: "high", high: "high",
};
const MATERIAL_MAP: Record<string, string> = {
  madeira: "madeira", aluminio: "aluminio", alumínio: "aluminio",
};

function normKey(s: string) { return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

function parseImportDate(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return undefined;
}

interface ImportRow {
  name: string; status?: string; priority?: string;
  startDate?: string; endDate?: string; finalDate?: string;
  materialType?: string; description?: string;
}
interface ImportError { row: number; name: string; message: string; }

function parseCsvToRows(text: string): { rows: ImportRow[]; parseErrors: string[] } {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const parseErrors: string[] = result.errors.map(e => e.message);
  const rows: ImportRow[] = [];
  for (const r of result.data) {
    const get = (candidates: string[]) => {
      for (const c of candidates) {
        const k = Object.keys(r).find(k => normKey(k) === c);
        if (k && r[k]?.trim()) return r[k].trim();
      }
      return "";
    };
    const name = get(["nome", "name", "projeto"]);
    const rawStatus = normKey(get(["status"]));
    const rawPriority = normKey(get(["prioridade", "priority"]));
    const rawMaterial = normKey(get(["material", "materialtype", "material_type"]));
    rows.push({
      name,
      status: STATUS_MAP[rawStatus] || undefined,
      priority: PRIORITY_MAP[rawPriority] || undefined,
      startDate: parseImportDate(get(["data_inicio", "data inicio", "startdate", "inicio"])),
      endDate: parseImportDate(get(["prazo_entrega", "prazo entrega", "enddate", "prazo"])),
      finalDate: parseImportDate(get(["data_final", "data final", "finaldate", "final"])),
      materialType: MATERIAL_MAP[rawMaterial] || undefined,
      description: get(["descricao", "descrição", "description"]) || undefined,
    });
  }
  return { rows, parseErrors };
}

function downloadTemplate() {
  const blob = new Blob(["\uFEFF" + TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_importacao_projetos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

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

  useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [farolFilter, setFarolFilter] = useState<"all" | FarolLevel>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importParseErrors, setImportParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; errors: ImportError[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const autoOpenedRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  useEffect(() => {
    if (autoOpenedRef.current) return;
    const p = new URLSearchParams(searchStr);
    if (p.get("create") === "1" && canEdit) {
      setIsCreateOpen(true);
      autoOpenedRef.current = true;
    }
  }, [searchStr, canEdit]);

  const [showArchived, setShowArchived] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const { data: projects, isLoading } = useListProjects(showArchived ? { archived: true } : undefined);
  const { data: allMembers } = useListMembers();
  const { data: allTasks, isLoading: isTasksLoading } = useListTasks();

  const planMap = useActionPlanMap();
  const [, navigate] = useLocation();
  // Visão da lista: tabela (densa), cards (leitura rápida) ou kanban por fase.
  const [view, setViewState] = useState<"tabela" | "cards" | "kanban">(
    () => (localStorage.getItem("ulimax:projects-view") as "tabela" | "cards" | "kanban") || "tabela",
  );
  const setView = (v: "tabela" | "cards" | "kanban") => {
    setViewState(v);
    try { localStorage.setItem("ulimax:projects-view", v); } catch { /* ok */ }
  };
  const healthMap = useMemo(
    () => computeHealthMap(projects ?? [], allTasks ?? []),
    [projects, allTasks]
  );
  const farolCounts = useMemo(() => {
    const c = { red: 0, yellow: 0, green: 0 };
    for (const p of projects ?? []) {
      const lvl = healthMap.get(p.id)?.level;
      if (lvl) c[lvl]++;
    }
    return c;
  }, [projects, healthMap]);
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
        setShowAllFields(false);
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
    if (materialFilter !== "all") list = list.filter(p => p.materialType === materialFilter);
    if (farolFilter !== "all") list = list.filter(p => healthMap.get(p.id)?.level === farolFilter);

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
  }, [projects, search, statusFilter, materialFilter, priorityFilter, farolFilter, healthMap, sortKey, sortDir]);

  const thCls = "px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none cursor-pointer hover:text-foreground transition-colors whitespace-nowrap";
  const thInner = "flex items-center gap-1";

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, parseErrors } = parseCsvToRows(text);
      setImportRows(rows);
      setImportParseErrors(parseErrors);
      setImportResult(null);
    };
    reader.readAsText(file, "utf-8");
    // reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleConfirmImport() {
    if (importRows.length === 0 || isImporting) return;
    const validRows = importRows.filter(r => r.name.trim());
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${base}/api/projects/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: validRows }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const result = await resp.json() as { imported: number; errors: ImportError[] };
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } catch {
      toast({ title: "Erro ao importar projetos", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  }

  function resetImport() {
    setImportRows([]);
    setImportParseErrors([]);
    setImportResult(null);
    setIsImporting(false);
  }

  function handleExportPDF() {
    const hoje = new Date().toLocaleDateString("pt-BR");
    const filtros: string[] = [];
    if (statusFilter !== "all") filtros.push(`Fase: ${STATUS_LABELS[statusFilter] ?? statusFilter}`);
    if (materialFilter !== "all") filtros.push(`Material: ${materialFilter === "madeira" ? "Madeira" : "Alumínio"}`);
    if (priorityFilter !== "all") filtros.push(`Prioridade: ${PRIORITY_LABELS[priorityFilter] ?? priorityFilter}`);
    if (farolFilter !== "all") filtros.push(`Farol: ${FAROL_META[farolFilter].label}`);
    if (search) filtros.push(`Busca: "${search}"`);

    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const fmt = (d?: string | null) => (d ? d.split("T")[0].split("-").reverse().join("/") : "—");
    const linhas = filtered.map((p) => {
      const h = healthMap.get(p.id);
      return `<tr>
        <td>${h ? FAROL_META[h.level].emoji : ""} ${esc(p.name)}</td>
        <td>${esc(STATUS_LABELS[p.status] ?? p.status)}</td>
        <td>${p.materialType === "madeira" ? "Madeira" : p.materialType === "aluminio" ? "Alumínio" : "—"}</td>
        <td>${esc(PRIORITY_LABELS[p.priority] ?? p.priority)}</td>
        <td style="text-align:center">${p.taskTotal > 0 ? `${p.taskDone}/${p.taskTotal}` : "—"}</td>
        <td>${fmt(p.startDate)}</td>
        <td>${fmt(p.endDate)}</td>
        <td>${fmt(p.instalacaoStartDate)}</td>
      </tr>`;
    }).join("");

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Projetos — Ulimax</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px}
  h1{font-size:18px;margin:0 0 2px}
  .sub{font-size:11px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;border-bottom:2px solid #ccc;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#555}
  td{border-bottom:1px solid #eee;padding:6px 8px}
  tr:nth-child(even) td{background:#fafafa}
  @media print{ body{margin:8mm} }
</style></head><body>
<h1>Projetos — Ulimax</h1>
<div class="sub">${hoje} · ${filtered.length} projeto(s)${filtros.length ? " · " + esc(filtros.join(" · ")) : ""}</div>
<table><thead><tr>
  <th>Projeto</th><th>Fase</th><th>Material</th><th>Prior.</th><th>Tarefas</th><th>Início</th><th>Entrega</th><th>Instalação</th>
</tr></thead><tbody>${linhas}</tbody></table>
<script>window.onload = () => window.print();</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Libere pop-ups para exportar o PDF", variant: "destructive" }); return; }
    w.document.write(html);
    w.document.close();
  }

  function handleExportCSV() {
    if (!filtered || filtered.length === 0) return;
    const headers = ["#", "Projeto", "Status", "Prioridade", "Material", "Tarefas Concluídas", "Total Tarefas", "Início Proj.", "Fim Est. Proj.", "Final Proj.", "Início Prod.", "Fim Est. Prod.", "Final Prod.", "Medição", "Início Inst."];
    const rows = filtered.map((p, i) => [
      i + 1,
      `"${p.name.replace(/"/g, '""')}"`,
      STATUS_LABELS[p.status] ?? p.status,
      p.priority === "high" ? "Alta" : p.priority === "medium" ? "Normal" : "Baixa",
      p.materialType ?? "",
      p.taskDone ?? 0,
      p.taskTotal ?? 0,
      fmtDate(p.startDate),
      fmtDate(p.endDate),
      fmtDate(p.finalDate),
      fmtDate(p.producaoStartDate),
      fmtDate(p.producaoEndDate),
      fmtDate(p.producaoFinalDate),
      fmtDate(p.medicaoDate),
      fmtDate(p.instalacaoStartDate),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projetos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? "Ver ativos" : "Ver arquivados"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filtered.length === 0}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          {canEdit && (
          <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) resetImport(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Projetos via CSV</DialogTitle>
              </DialogHeader>

              {/* Step 1 – no file loaded yet */}
              {importRows.length === 0 && !importResult && (
                <div className="space-y-4 py-2">
                  <p className="text-sm text-muted-foreground">
                    Baixe o modelo, preencha no Excel, salve como <strong>CSV UTF-8</strong> e faça o upload.
                  </p>
                  <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Colunas disponíveis</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span><span className="font-medium text-foreground">nome</span> — obrigatório</span>
                      <span><span className="font-medium text-foreground">status</span> — ex.: a_iniciar</span>
                      <span><span className="font-medium text-foreground">prioridade</span> — baixa / normal / alta</span>
                      <span><span className="font-medium text-foreground">data_inicio</span> — AAAA-MM-DD</span>
                      <span><span className="font-medium text-foreground">prazo_entrega</span> — AAAA-MM-DD</span>
                      <span><span className="font-medium text-foreground">data_final</span> — AAAA-MM-DD</span>
                      <span><span className="font-medium text-foreground">material</span> — madeira / aluminio</span>
                      <span><span className="font-medium text-foreground">descricao</span> — texto livre</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Datas também aceitam DD/MM/AAAA. Campos não preenchidos usam os valores padrão do sistema.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <FileText className="mr-2 h-4 w-4" />
                      Baixar modelo
                    </Button>
                    <Button size="sm" onClick={() => importFileRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Selecionar arquivo CSV
                    </Button>
                  </div>
                  <input ref={importFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFileChange} />
                  {importParseErrors.length > 0 && (
                    <p className="text-xs text-destructive">{importParseErrors[0]}</p>
                  )}
                </div>
              )}

              {/* Step 2 – preview */}
              {importRows.length > 0 && !importResult && (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    {importRows.filter(r => r.name.trim()).length} projeto(s) válido(s) encontrado(s).
                    {importRows.filter(r => !r.name.trim()).length > 0 && (
                      <span className="text-destructive ml-1">{importRows.filter(r => !r.name.trim()).length} linha(s) sem nome serão ignoradas.</span>
                    )}
                  </p>
                  <div className="rounded-md border overflow-auto max-h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Nome</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Prioridade</th>
                          <th className="px-3 py-2 text-left font-medium">Prazo</th>
                          <th className="px-3 py-2 text-left font-medium">Material</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((r, i) => (
                          <tr key={i} className={cn("border-t", !r.name.trim() && "opacity-40")}>
                            <td className="px-3 py-1.5 font-medium max-w-[180px] truncate">
                              {r.name || <span className="text-destructive italic">sem nome</span>}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.status ?? "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.priority ?? "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.endDate ?? r.finalDate ?? "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.materialType ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <DialogFooter className="flex-row gap-2 sm:justify-between">
                    <Button variant="outline" size="sm" onClick={() => { resetImport(); importFileRef.current?.click(); }}>
                      Trocar arquivo
                    </Button>
                    <input ref={importFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFileChange} />
                    <Button
                      size="sm"
                      onClick={handleConfirmImport}
                      disabled={isImporting || importRows.filter(r => r.name.trim()).length === 0}
                    >
                      {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      {isImporting ? "Importando…" : `Importar ${importRows.filter(r => r.name.trim()).length} projeto(s)`}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Step 3 – result */}
              {importResult && (
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <p className="text-sm font-medium">{importResult.imported} projeto(s) importado(s) com sucesso.</p>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {importResult.errors.length} linha(s) com erro</p>
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground">Linha {e.row} "{e.name}": {e.message}</p>
                      ))}
                    </div>
                  )}
                  <DialogFooter>
                    <Button size="sm" onClick={() => { setIsImportOpen(false); resetImport(); }}>Fechar</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
          )}
          {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setShowAllFields(false); }}>
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
                  {!showAllFields && (
                    <>
                      <FormField control={form.control} name="finalDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo de Entrega (Data Final)</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <p className="text-[11px] text-muted-foreground">
                        Dica: na tela <span className="font-medium text-foreground">Modelos de Projeto</span> você cria um projeto já com as tarefas típicas da Ulimax.
                      </p>
                    </>
                  )}
                  {showAllFields && (<>
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
                  </>)}
                  <button
                    type="button"
                    onClick={() => setShowAllFields((v) => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {showAllFields ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Mostrar menos campos</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Mostrar todos os campos (datas, material, descrição...)</>
                    )}
                  </button>
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
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Madeira e Alumínio</SelectItem>
                <SelectItem value="madeira">Madeira</SelectItem>
                <SelectItem value="aluminio">Alumínio</SelectItem>
              </SelectContent>
            </Select>
            {!isTasksLoading && (
              <div className="flex items-center gap-1.5" title="Farol: clique para filtrar">
                {(["red", "yellow", "green"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFarolFilter(farolFilter === lvl ? "all" : lvl)}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all",
                      FAROL_META[lvl].chip,
                      farolFilter === lvl ? "ring-2 ring-primary/40" : "opacity-75 hover:opacity-100"
                    )}
                    title={`Mostrar só projetos "${FAROL_META[lvl].label}"`}
                  >
                    {FAROL_META[lvl].emoji} {farolCounts[lvl]}
                  </button>
                ))}
              </div>
            )}
            {(search || statusFilter !== "all" || priorityFilter !== "all" || farolFilter !== "all" || materialFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setFarolFilter("all"); setMaterialFilter("all"); }}>
                Limpar filtros
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-medium shrink-0">
                {([["tabela", "Tabela"], ["cards", "Cards"], ["kanban", "Kanban"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-3 py-1.5 transition-colors border-l border-border first:border-l-0",
                      view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-9 gap-1.5", showLegend ? "text-primary" : "text-muted-foreground")}
                onClick={() => setShowLegend((v) => !v)}
              >
                <HelpCircle className="h-4 w-4" />
                Legenda
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Legend panel */}
        {showLegend && (
          <div className="border-b px-4 py-4 bg-muted/30 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que significa cada coluna</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              {/* Farol */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="flex gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
                  </span>
                  Farol
                </p>
                <p className="text-xs text-muted-foreground">Indicador de saúde automático. <span className="text-green-700 font-medium">Verde</span> = no prazo. <span className="text-yellow-700 font-medium">Amarelo</span> = atenção (prazo próximo ou tarefas paradas). <span className="text-red-700 font-medium">Vermelho</span> = crítico. Clique nas bolinhas acima para filtrar por cor.</p>
              </div>

              {/* Tarefas */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Tarefas</p>
                <p className="text-xs text-muted-foreground">Progresso das tarefas do projeto. A barra mostra o percentual concluído; o número indica <em>feitas / total</em>. Tarefas sem data ou responsável não são contadas no farol.</p>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Status</p>
                <p className="text-xs text-muted-foreground">Fase atual do projeto. Sequência esperada: <span className="font-medium">A Iniciar → Em Projeto → Em Aprovação → Em Produção → Aguard. Instalação → Em Instalação</span>.</p>
              </div>

              {/* Prioridade */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Prioridade</p>
                <p className="text-xs text-muted-foreground"><span className="text-red-600 font-medium">Alta</span> (ponto vermelho) = projetos urgentes que devem receber atenção primeiro. <span className="text-amber-600 font-medium">Normal</span> = fluxo padrão.</p>
              </div>

              {/* Material */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Material</p>
                <p className="text-xs text-muted-foreground">Tipo de material principal: <span className="font-medium">Madeira</span> ou <span className="font-medium">Alumínio</span>. Usado para organizar a produção e filtrar relatórios.</p>
              </div>

              {/* Datas – separador */}
              <div className="sm:col-span-2 lg:col-span-3 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datas</p>
              </div>

              {/* Bloco Projeto */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-violet-300 inline-block" /> Bloco Projeto (roxo)
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Início Proj.</span> — quando o projeto começou a ser elaborado.<br />
                  <span className="font-medium">Fim Est. Proj.</span> — prazo planejado para concluir a elaboração. Fica <span className="text-amber-600 font-medium">amarelo</span> se faltam ≤ 7 dias e <span className="text-red-600 font-medium">vermelho</span> se já passou.<br />
                  <span className="font-medium">Final Proj.</span> — data real em que a elaboração foi encerrada.
                </p>
              </div>

              {/* Bloco Produção */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-blue-300 inline-block" /> Bloco Produção (azul)
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Início Prod.</span> — quando a fabricação começou.<br />
                  <span className="font-medium">Fim Est. Prod.</span> — prazo planejado para concluir a produção. Sinaliza atraso com cor.<br />
                  <span className="font-medium">Final Prod.</span> — data real de término da fabricação.
                </p>
              </div>

              {/* Medição e Instalação */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <span className="text-amber-700 flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-300 inline-block" /> Medição</span>
                  <span className="text-emerald-700 flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-300 inline-block" /> Início Inst.</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Medição</span> — data da vistoria na obra para liberar a instalação. Sinaliza atraso com cor.<br />
                  <span className="font-medium">Início Inst.</span> — data prevista para começar a instalação no local.
                </p>
              </div>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          {view === "kanban" ? (
            <div className="p-4 flex flex-col min-h-[560px]">
              <ProjectsBoard />
            </div>
          ) : view === "cards" ? (
            filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum projeto com esses filtros.</p>
            ) : (
              <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((project) => {
                  const h = healthMap.get(project.id);
                  const pct = project.taskTotal > 0 ? Math.round((project.taskDone / project.taskTotal) * 100) : null;
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="h-full rounded-xl border border-border bg-card p-4 space-y-2.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-2">
                        {h && (
                          <span
                            title={`${FAROL_META[h.level].label}: ${h.reasons.join(" · ")}`}
                            className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", FAROL_META[h.level].dot)}
                          />
                        )}
                        <p className="font-semibold text-foreground leading-snug flex-1 min-w-0 truncate">{project.name}</p>
                        <span
                          className={cn("h-2 w-2 rounded-full shrink-0 mt-2", getPriorityDot(project.priority))}
                          title={PRIORITY_LABELS[project.priority]}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px]", getStatusColor(project.status))}>
                          {STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                        {project.materialType && (
                          <Badge variant="secondary" className="text-[10px]">
                            {project.materialType === "madeira" ? "Madeira" : "Alumínio"}
                          </Badge>
                        )}
                        <ActionPlanBadge projectId={project.id} projectName={project.name} summary={planMap.get(project.id)} />
                      </div>
                      {pct !== null && (
                        <div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{project.taskDone}/{project.taskTotal} tarefas</p>
                        </div>
                      )}
                      {project.endDate && (
                        <p className="text-xs text-muted-foreground">
                          Entrega: {project.endDate.split("T")[0].split("-").reverse().join("/")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
          <>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-1">
                <Briefcase className="h-8 w-8 text-muted-foreground opacity-30" />
              </div>
              {search || statusFilter !== "all" || priorityFilter !== "all" || farolFilter !== "all" || materialFilter !== "all" ? (
                <>
                  <p className="font-medium text-foreground">Nenhum projeto corresponde aos filtros</p>
                  <p className="text-sm text-muted-foreground">Tente remover ou alterar os filtros aplicados.</p>
                  <button
                    className="mt-1 text-sm text-primary hover:underline"
                    onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setFarolFilter("all"); setMaterialFilter("all"); }}
                  >
                    Limpar filtros
                  </button>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">Nenhum projeto ainda</p>
                  <p className="text-sm text-muted-foreground">Crie o primeiro projeto para começar a acompanhar o trabalho da equipe.</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="border-b bg-muted/30 sticky top-0">
                  <tr>
                    <th className={cn(thCls, "pl-4 w-8")} title="Número de ordem na lista filtrada atual">#</th>
                    <th className={cn(thCls, "w-12 text-center")} title="Farol de saúde do projeto: Verde = no prazo, Amarelo = atenção (tarefas atrasadas ou prazo próximo), Vermelho = crítico. Clique nos botões de farol acima para filtrar por cor.">Farol</th>
                    <th className={thCls} title="Nome e descrição do projeto. Clique para ordenar." onClick={() => handleSort("name")}>
                      <div className={thInner}>Projeto <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "min-w-[90px]")} title="Progresso das tarefas: barra mostra % concluídas. O número indica tarefas feitas / total.">Tarefas</th>
                    <th className={thCls} title="Fase atual do projeto: A Iniciar → Em Projeto → Em Aprovação → Em Produção → Aguardando Instalação → Em Instalação. Clique para ordenar." onClick={() => handleSort("status")}>
                      <div className={thInner}>Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={thCls} title="Prioridade do projeto: Alta (ponto vermelho) ou Normal (ponto âmbar). Clique para ordenar." onClick={() => handleSort("priority")}>
                      <div className={thInner}>Prior. <SortIcon col="priority" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={thCls} title="Tipo de material principal: Madeira ou Alumínio. Clique para ordenar." onClick={() => handleSort("materialType")}>
                      <div className={thInner}>Material <SortIcon col="materialType" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-violet-200 text-violet-800 border-l-2 border-violet-300")} title="Data de início da fase de projeto (elaboração do projeto). Clique para ordenar." onClick={() => handleSort("startDate")}>
                      <div className={thInner}>Início Proj. <SortIcon col="startDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-violet-200 text-violet-800")} title="Prazo estimado para conclusão da fase de projeto. Fica amarelo se faltam ≤7 dias e vermelho se já passou. Clique para ordenar." onClick={() => handleSort("endDate")}>
                      <div className={thInner}>Fim Est. Proj. <SortIcon col="endDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-violet-200 text-violet-800 border-r-2 border-violet-300")} title="Data real de encerramento da fase de projeto (quando efetivamente concluída). Clique para ordenar." onClick={() => handleSort("finalDate")}>
                      <div className={thInner}>Final Proj. <SortIcon col="finalDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-blue-200 text-blue-800 border-l-2 border-blue-300")} title="Data de início da fase de produção (fabricação). Clique para ordenar." onClick={() => handleSort("producaoStartDate")}>
                      <div className={thInner}>Início Prod. <SortIcon col="producaoStartDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-blue-200 text-blue-800")} title="Prazo estimado para conclusão da produção. Fica amarelo se faltam ≤7 dias e vermelho se já passou. Clique para ordenar." onClick={() => handleSort("producaoEndDate")}>
                      <div className={thInner}>Fim Est. Prod. <SortIcon col="producaoEndDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-blue-200 text-blue-800 border-r-2 border-blue-300")} title="Data real de encerramento da produção. Clique para ordenar." onClick={() => handleSort("producaoFinalDate")}>
                      <div className={thInner}>Final Prod. <SortIcon col="producaoFinalDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-amber-200 text-amber-800 border-l-2 border-r-2 border-amber-300")} title="Data de medição na obra (vistoria para liberação da instalação). Fica amarelo/vermelho conforme proximidade. Clique para ordenar." onClick={() => handleSort("medicaoDate")}>
                      <div className={thInner}>Medição <SortIcon col="medicaoDate" sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                    <th className={cn(thCls, "bg-emerald-200 text-emerald-800 border-l-2 border-r-2 border-emerald-300")} title="Data prevista de início da instalação na obra. Clique para ordenar." onClick={() => handleSort("instalacaoStartDate")}>
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
                      <td className="px-2 py-2.5 w-12">
                        {(() => {
                          if (isTasksLoading) return null;
                          const h = healthMap.get(project.id);
                          if (!h) return null;
                          return (
                            <Link
                              href={`/projects/${project.id}`}
                              className="flex items-center justify-center"
                              title={`${FAROL_META[h.level].label}: ${h.reasons.join(" · ")}`}
                            >
                              <span className={cn("h-3 w-3 rounded-full", FAROL_META[h.level].dot)} />
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <Link href={`/projects/${project.id}`} className="block">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate leading-snug">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                          )}
                        </Link>
                        <div className="mt-1">
                          <ActionPlanBadge projectId={project.id} projectName={project.name} summary={planMap.get(project.id)} />
                        </div>
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
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
