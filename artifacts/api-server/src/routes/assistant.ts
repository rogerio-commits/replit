import { Router, type IRouter } from "express";
import { db, tasksTable, projectsTable, membersTable } from "@workspace/db";
import { getOpenAi } from "@workspace/integrations-openai-ai-server";
import { AssistantChatBody } from "@workspace/api-zod";
import { requireGestor } from "../middlewares/requireAuth";
import { spToday } from "../lib/daily-reminders";
import { logger } from "../lib/logger";

// ── Assistente inteligente (somente gestor) ──────────────────────────────────
// Recebe a conversa, monta um retrato compacto dos dados atuais (projetos,
// tarefas, equipe) e pede ao modelo uma resposta em português. Nada da
// conversa é gravado no servidor.

const router: IRouter = Router();

const MODEL = "gpt-5.6-terra";
const MAX_OPEN_TASKS = 400;
const MAX_DONE_RECENT = 80;
const MAX_HISTORY = 12;

const PROJECT_STATUS_PT: Record<string, string> = {
  a_iniciar: "A Iniciar",
  em_projeto: "Em Projeto",
  em_aprovacao: "Em Aprovação",
  em_producao: "Em Produção",
  aguardando_instalacao: "Aguardando Instalação",
  em_instalacao: "Em Instalação",
};

const TASK_STATUS_PT: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluída",
};

const PRIORITY_PT: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function br(iso: string | null | undefined): string {
  if (!iso) return "sem data";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Retrato compacto e legível dos dados atuais, para o modelo responder com base neles. */
async function buildSnapshot(): Promise<string> {
  const today = spToday();
  const [projects, tasks, members] = await Promise.all([
    db.select().from(projectsTable),
    db.select().from(tasksTable),
    db.select().from(membersTable),
  ]);

  const projName = new Map(projects.map((p) => [p.id, p.name]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  const abertas = tasks.filter((t) => t.status !== "done");
  const overdueBy = new Map<number, number>();
  const openBy = new Map<number, number>();
  for (const t of abertas) {
    if (t.assignedTo == null) continue;
    openBy.set(t.assignedTo, (openBy.get(t.assignedTo) ?? 0) + 1);
    if (t.dueDate && t.dueDate < today) {
      overdueBy.set(t.assignedTo, (overdueBy.get(t.assignedTo) ?? 0) + 1);
    }
  }

  const lines: string[] = [];
  lines.push(`HOJE: ${br(today)}`);

  lines.push("", `PROJETOS (${projects.length}):`);
  for (const p of projects) {
    const abertasP = abertas.filter((t) => t.projectId === p.id).length;
    const feitasP = tasks.filter((t) => t.projectId === p.id && t.status === "done").length;
    lines.push(
      `- ${p.name} | situação: ${PROJECT_STATUS_PT[p.status] ?? p.status}` +
        ` | prioridade: ${PRIORITY_PT[p.priority] ?? p.priority}` +
        ` | início: ${br(p.startDate)} | prazo final: ${br(p.finalDate ?? p.endDate)}` +
        ` | tarefas: ${feitasP} concluídas, ${abertasP} abertas`,
    );
  }

  lines.push("", `EQUIPE (${members.length}):`);
  for (const m of members) {
    const total = openBy.get(m.id) ?? 0;
    const atras = overdueBy.get(m.id) ?? 0;
    lines.push(
      `- ${m.name} | ${total} tarefa${total === 1 ? "" : "s"} aberta${total === 1 ? "" : "s"}` +
        (atras ? ` (${atras} atrasada${atras === 1 ? "" : "s"})` : ""),
    );
  }

  const abertasOrdenadas = [...abertas].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
  const mostradas = abertasOrdenadas.slice(0, MAX_OPEN_TASKS);
  lines.push(
    "",
    `TAREFAS ABERTAS (${abertas.length}${abertas.length > mostradas.length ? `, mostrando as ${mostradas.length} com prazo mais próximo` : ""}):`,
  );
  for (const t of mostradas) {
    let prazo = "sem prazo";
    if (t.dueDate) {
      if (t.dueDate < today) prazo = `venceu ${br(t.dueDate)} (ATRASADA)`;
      else if (t.dueDate === today) prazo = "vence HOJE";
      else prazo = `vence ${br(t.dueDate)}`;
    }
    lines.push(
      `- "${t.title}" | projeto: ${projName.get(t.projectId) ?? "—"}` +
        ` | responsável: ${t.assignedTo != null ? (memberName.get(t.assignedTo) ?? "—") : "SEM RESPONSÁVEL"}` +
        ` | status: ${TASK_STATUS_PT[t.status] ?? t.status} | ${prazo}`,
    );
  }

  const seteDiasAtras = Date.now() - 7 * 86400000;
  const recentes = tasks
    .filter((t) => t.status === "done" && t.completedAt && t.completedAt.getTime() >= seteDiasAtras)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, MAX_DONE_RECENT);
  if (recentes.length) {
    lines.push("", `CONCLUÍDAS NOS ÚLTIMOS 7 DIAS (${recentes.length}):`);
    for (const t of recentes) {
      lines.push(
        `- "${t.title}" | projeto: ${projName.get(t.projectId) ?? "—"}` +
          ` | responsável: ${t.assignedTo != null ? (memberName.get(t.assignedTo) ?? "—") : "—"}`,
      );
    }
  }

  return lines.join("\n");
}

function systemPrompt(snapshot: string): string {
  return [
    "Você é o assistente do Ulimax, o sistema de gestão de projetos de uma marcenaria/empresa de instalação.",
    "Quem pergunta é gestor(a) da equipe, sem conhecimento técnico. Responda SEMPRE em português do Brasil, de forma direta, amigável e curta.",
    "",
    "Regras:",
    "- Use APENAS os dados fornecidos abaixo. Se a informação não estiver nos dados, diga claramente que não tem essa informação.",
    "- Nunca invente números, nomes ou datas.",
    "- Datas no formato dd/mm. Use listas com travessão (-) quando ajudar na leitura.",
    "- Não use formatação especial como asteriscos, cabeçalhos ou tabelas — apenas texto simples e listas com travessão.",
    "- Quando fizer sentido, destaque o que precisa de atenção primeiro (atrasos, prazos de hoje, sobrecarga).",
    "- Se a pergunta não tiver relação com projetos, tarefas, prazos ou equipe, explique gentilmente que você só ajuda com os dados do Ulimax.",
    "",
    "DADOS ATUAIS DO SISTEMA:",
    snapshot,
  ].join("\n");
}

router.post("/assistant/chat", requireGestor, async (req, res) => {
  const parsed = AssistantChatBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Formato de conversa inválido" });
  }

  const history = parsed.data.messages.slice(-MAX_HISTORY);
  const last = history[history.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return res.status(400).json({ message: "Envie uma pergunta para o assistente" });
  }

  try {
    const snapshot = await buildSnapshot();
    const completion = await getOpenAi().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt(snapshot) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    return res.json({
      reply: reply || "Não consegui gerar uma resposta agora. Tente novamente em instantes.",
    });
  } catch (err) {
    logger.error({ err }, "Erro ao consultar o assistente");
    return res.status(500).json({ message: "Erro ao consultar o assistente" });
  }
});

export default router;
