import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
  concluido: "Concluído",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Normal",
  high: "Alta",
};

interface ProjectPDFExportProps {
  project: {
    id: number;
    name: string;
    status: string;
    priority: string;
    client?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
    createdAt: string;
  };
  tasks?: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    assigneeName?: string | null;
    dueDate?: string | null;
  }>;
  members?: Array<{
    id: number;
    name: string;
    role: string;
  }>;
}

export function ProjectPDFExport({ project, tasks = [], members = [] }: ProjectPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 20;
      const contentWidth = pageWidth - marginX * 2;
      let y = 20;

      const addLine = (text: string, x: number, fontSize: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [30, 30, 30]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
        doc.text(text, x, y);
      };

      const nl = (amount = 6) => { y += amount; };
      const checkPage = () => { if (y > 270) { doc.addPage(); y = 20; } };

      // Header bar
      doc.setFillColor(255, 100, 0);
      doc.rect(0, 0, pageWidth, 14, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("ULIMAX — RELATÓRIO DE PROJETO", marginX, 9);
      y = 24;

      // Project title
      addLine(project.name, marginX, 18, "bold", [20, 20, 20]);
      nl(8);

      // Status badges row
      addLine(`Status: ${STATUS_LABELS[project.status] ?? project.status}    Prioridade: ${PRIORITY_LABELS[project.priority] ?? project.priority}`, marginX, 10, "normal", [100, 100, 100]);
      nl(6);

      addLine(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, marginX, 9, "normal", [150, 150, 150]);
      nl(8);

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(marginX, y, pageWidth - marginX, y);
      nl(8);

      // Details
      const details = [
        project.client ? ["Cliente", project.client] : null,
        project.location ? ["Local", project.location] : null,
        project.startDate ? ["Início", format(new Date(project.startDate), "dd/MM/yyyy")] : null,
        project.endDate ? ["Término", format(new Date(project.endDate), "dd/MM/yyyy")] : null,
      ].filter(Boolean) as [string, string][];

      if (details.length > 0) {
        addLine("INFORMAÇÕES DO PROJETO", marginX, 11, "bold", [50, 50, 50]);
        nl(6);
        for (const [label, value] of details) {
          checkPage();
          addLine(`${label}:`, marginX, 9, "bold", [80, 80, 80]);
          addLine(value, marginX + 35, 9, "normal", [30, 30, 30]);
          nl(5);
        }
        nl(4);
      }

      if (project.description) {
        checkPage();
        addLine("DESCRIÇÃO", marginX, 11, "bold", [50, 50, 50]);
        nl(6);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(project.description, contentWidth);
        doc.text(lines, marginX, y);
        y += lines.length * 5;
        nl(6);
      }

      // Members section
      if (members.length > 0) {
        checkPage();
        doc.setDrawColor(220, 220, 220);
        doc.line(marginX, y, pageWidth - marginX, y);
        nl(8);
        addLine("EQUIPE DO PROJETO", marginX, 11, "bold", [50, 50, 50]);
        nl(6);
        for (const m of members) {
          checkPage();
          addLine(`• ${m.name}`, marginX + 3, 9, "normal", [40, 40, 40]);
          addLine(`(${m.role})`, marginX + 50, 9, "normal", [120, 120, 120]);
          nl(5);
        }
        nl(4);
      }

      // Tasks section
      if (tasks.length > 0) {
        checkPage();
        doc.setDrawColor(220, 220, 220);
        doc.line(marginX, y, pageWidth - marginX, y);
        nl(8);
        addLine(`TAREFAS (${tasks.length})`, marginX, 11, "bold", [50, 50, 50]);
        nl(6);

        const done = tasks.filter((t) => t.status === "done").length;
        addLine(`Concluídas: ${done}/${tasks.length}`, marginX, 9, "normal", [100, 100, 100]);
        nl(7);

        for (const task of tasks) {
          checkPage();
          const statusLabel = { todo: "A Fazer", in_progress: "Em Andamento", review: "Em Revisão", done: "Concluído" }[task.status] ?? task.status;
          const icon = task.status === "done" ? "✓" : "○";
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(task.status === "done" ? 22 : 30, task.status === "done" ? 163 : 30, task.status === "done" ? 74 : 30);
          doc.text(`${icon} ${task.title}`, marginX + 3, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(130, 130, 130);
          doc.text(`[${statusLabel}]`, marginX + 100, y);
          nl(5);
          if (task.assigneeName || task.dueDate) {
            const meta = [task.assigneeName, task.dueDate ? `Prazo: ${format(new Date(task.dueDate), "dd/MM/yy")}` : null].filter(Boolean).join(" · ");
            addLine(meta, marginX + 8, 8, "normal", [160, 160, 160]);
            nl(4);
          }
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 180, 180);
        doc.text(`Ulimax — Relatório de Projeto — Pág. ${i}/${pageCount}`, marginX, 290);
      }

      const filename = `projeto-${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isGenerating} className="gap-2">
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {isGenerating ? "Gerando..." : "Exportar PDF"}
    </Button>
  );
}
