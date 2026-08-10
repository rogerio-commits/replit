import { useMemo } from "react";
import {
  useListAllSiteVisits,
  useListProjects,
  useListTasks,
  useListActionPlanSummaries,
  useListAssistenciaTecnica,
  useListSampleControls,
} from "@workspace/api-client-react";
import type { Project, Task } from "@workspace/api-client-react";
import { daysFromToday } from "@/lib/project-health";
import { overdueObraDates } from "@/lib/obra-dates";

// ── Contadores das abas de Obras ─────────────────────────────────────────────
// As abas eram mudas: sem sinal, o gestor ficava só em Visitas e não descobria
// o que estava esperando nas outras. Cada aba passa a mostrar quantos itens
// pedem ação e se algum está atrasado (vermelho) ou só aguardando (âmbar).
// Reusa as mesmas queries das abas — TanStack dedupe, sem custo extra de rede.

const INSTALL_STATUSES = ["aguardando_instalacao", "em_instalacao"];
const VISIT_INTERVAL = 15;
const PRE_INSTALL_WINDOW = 10;

export interface TabCount {
  count: number;
  urgent: boolean;
}

export interface ObraTabCounts {
  visitas: TabCount;
  pendencias: TabCount;
  operacao: TabCount;
}

export function useObraTabCounts(): ObraTabCounts {
  const { data: visits } = useListAllSiteVisits();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();
  const { data: planSummaries } = useListActionPlanSummaries();
  const { data: assistencias } = useListAssistenciaTecnica();
  const { data: amostras } = useListSampleControls();

  return useMemo(() => {
    const allVisits = visits ?? [];
    const projs = (projects ?? []) as Project[];
    const hoje = new Date().toISOString().slice(0, 10);

    // ── Visitas: as de hoje + obras que pedem visita e ainda não têm agenda ──
    const visitasHoje = allVisits.filter((v) => v.date === hoje).length;

    const lastByProject = new Map<number, number>();
    const nextByProject = new Map<number, string>();
    for (const v of allVisits) {
      const d = daysFromToday(v.date);
      if (d <= 0) {
        const since = -d;
        const cur = lastByProject.get(v.projectId);
        if (cur === undefined || since < cur) lastByProject.set(v.projectId, since);
      } else {
        const cur = nextByProject.get(v.projectId);
        if (!cur || v.date < cur) nextByProject.set(v.projectId, v.date);
      }
    }
    const sugeridas = projs.filter((p) => {
      if (p.archived) return false;
      const emInstalacao = INSTALL_STATUSES.includes(p.status);
      const dFimProd = p.producaoEndDate ? daysFromToday(p.producaoEndDate) : null;
      const elegivel = emInstalacao || (dFimProd !== null && dFimProd <= PRE_INSTALL_WINDOW);
      if (!elegivel) return false;
      const since = lastByProject.get(p.id);
      return !nextByProject.get(p.id) && (since === undefined || since >= VISIT_INTERVAL);
    }).length;

    // ── Pendências: RDO faltando, tarefa vencida, data vencida, plano vencido ──
    const rdosPendentes = allVisits.filter((v) => v.date <= hoje && !v.reportFileKey).length;
    const tarefasVencidas = ((tasks ?? []) as Task[]).filter(
      (t) => t.status !== "done" && t.dueDate && daysFromToday(t.dueDate) < 0,
    ).length;
    let datasVencidas = 0;
    for (const p of projs) datasVencidas += overdueObraDates(p).length;
    const planosVencidos = (planSummaries ?? []).filter((s) => s.overdueItems > 0).length;
    const pendencias = rdosPendentes + tarefasVencidas + datasVencidas + planosVencidos;

    // ── Operação: assistências em aberto + amostras a entregar ──
    const atAbertas = (assistencias ?? []).filter((a) => !a.realizado).length;
    const amostrasAbertas = (amostras ?? []).filter((s) => !s.delivered).length;
    const amostrasAtrasadas = (amostras ?? []).filter(
      (s) => !s.delivered && daysFromToday(s.deadline) < 0,
    ).length;

    return {
      visitas: { count: visitasHoje + sugeridas, urgent: sugeridas > 0 },
      pendencias: { count: pendencias, urgent: tarefasVencidas + datasVencidas + planosVencidos > 0 },
      operacao: { count: atAbertas + amostrasAbertas, urgent: amostrasAtrasadas > 0 },
    };
  }, [visits, projects, tasks, planSummaries, assistencias, amostras]);
}
