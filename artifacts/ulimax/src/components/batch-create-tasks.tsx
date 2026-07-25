import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useCreateTask, useListMembers, getListTasksQueryKey, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardPaste, Loader2, User, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Criar tarefas colando uma lista ──────────────────────────────────────────
// Cada linha vira uma tarefa. Partes separadas por " - ", ";" ou "|" são
// reconhecidas como responsável (nome de alguém da equipe) ou prazo
// (25/07, sexta, amanhã...). O que não for reconhecido continua no título.

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

function parseDateToken(tok: string): string | null {
  const t = normalize(tok).replace(/-feira$/, "");
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  if (t === "hoje") return format(base, "yyyy-MM-dd");
  if (t === "amanha") {
    base.setDate(base.getDate() + 1);
    return format(base, "yyyy-MM-dd");
  }
  if (t in WEEKDAYS) {
    let diff = (WEEKDAYS[t] - base.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // "sexta" numa sexta = próxima sexta
    base.setDate(base.getDate() + diff);
    return format(base, "yyyy-MM-dd");
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    let yy = m[3] ? parseInt(m[3], 10) : base.getFullYear();
    if (yy < 100) yy += 2000;
    const d = new Date(yy, mm - 1, dd);
    if (d.getDate() !== dd || d.getMonth() !== mm - 1) return null; // 31/02 etc.
    if (!m[3] && d.getTime() < base.getTime()) d.setFullYear(yy + 1); // 05/01 em julho = ano que vem
    return format(d, "yyyy-MM-dd");
  }
  return null;
}

interface MemberLite { id: number; name: string; }

interface ParsedLine {
  title: string;
  assignedTo?: number;
  assigneeName?: string;
  dueDate?: string;
}

function parseLine(raw: string, members: MemberLite[]): ParsedLine | null {
  const parts = raw.split(/\s*\|\s*|\s*;\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  let title = parts[0];
  const out: ParsedLine = { title };

  for (const part of parts.slice(1)) {
    const d = parseDateToken(part);
    if (d && !out.dueDate) {
      out.dueDate = d;
      continue;
    }
    if (!out.assignedTo) {
      const p = normalize(part);
      // Só atribui quando a correspondência é inequívoca (exatamente 1 pessoa).
      const exact = members.filter((m) => normalize(m.name) === p);
      const byFirst = exact.length > 0 ? exact : members.filter((m) => normalize(m.name).split(" ")[0] === p);
      const candidates = byFirst.length > 0 ? byFirst : p.length >= 3 ? members.filter((m) => normalize(m.name).includes(p)) : [];
      if (candidates.length === 1) {
        out.assignedTo = candidates[0].id;
        out.assigneeName = candidates[0].name;
        continue;
      }
    }
    title += " – " + part;
  }
  out.title = title;
  return out;
}

export function BatchCreateTasks({ projects, defaultProjectId }: { projects: { id: number; name: string }[]; defaultProjectId?: number }) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>(defaultProjectId ? defaultProjectId.toString() : "");
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: members } = useListMembers();
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const memberList: MemberLite[] = useMemo(
    () => (members ?? []).map((m: any) => ({ id: m.id, name: m.name })),
    [members]
  );

  const parsed = useMemo(
    () =>
      text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => parseLine(l, memberList))
        .filter((p): p is ParsedLine => p !== null),
    [text, memberList]
  );

  async function handleCreate() {
    if (!projectId || parsed.length === 0) return;
    setCreating(true);
    const results = await Promise.allSettled(
      parsed.map((p) =>
        createTask.mutateAsync({
          data: {
            projectId: parseInt(projectId, 10),
            title: p.title,
            status: "todo",
            priority: "medium",
            ...(p.assignedTo ? { assignedTo: p.assignedTo } : {}),
            ...(p.dueDate ? { dueDate: p.dueDate } : {}),
          } as any,
        })
      )
    );
    setCreating(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    if (ok > 0) {
      toast({ title: `${ok} tarefa${ok > 1 ? "s" : ""} criada${ok > 1 ? "s" : ""}!`, description: fail > 0 ? `${fail} linha(s) falharam — tente novamente.` : undefined });
      setText("");
      setOpen(false);
    } else {
      toast({ title: "Não foi possível criar as tarefas", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setText(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Criar em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar tarefas em lote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-1.5">Projeto</p>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-1.5">Cole ou digite — uma tarefa por linha</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={"Medir vão da janela - João - sexta\nComprar dobradiças ; 28/07\nEnviar projeto para aprovação | Maria | amanhã\nRevisar orçamento"}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Separe com <strong>&nbsp;-&nbsp;</strong>, <strong>;</strong> ou <strong>|</strong>. Reconheço nomes da equipe e prazos como <em>25/07</em>, <em>sexta</em>, <em>amanhã</em>, <em>hoje</em>.
            </p>
          </div>

          {parsed.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border max-h-52 overflow-y-auto">
              {parsed.map((p, i) => (
                <div key={i} className="px-3 py-2 flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground truncate">{p.title}</span>
                  {p.assigneeName && (
                    <span className="flex items-center gap-1 text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 shrink-0">
                      <User className="h-3 w-3" />{p.assigneeName}
                    </span>
                  )}
                  {p.dueDate && (
                    <span className="flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 shrink-0">
                      <CalendarDays className="h-3 w-3" />{format(new Date(p.dueDate + "T00:00:00"), "dd/MM")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!projectId || parsed.length === 0 || creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar {parsed.length > 0 ? `${parsed.length} tarefa${parsed.length > 1 ? "s" : ""}` : "tarefas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
