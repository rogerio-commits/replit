import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpEntry {
  description: string;
  tips: string[];
}

export const NAV_HELP: Record<string, HelpEntry> = {
  "/meu-dia": {
    description: "Sua área pessoal de trabalho — concentra tudo que é seu para hoje.",
    tips: [
      "Veja tarefas atribuídas a você que vencem hoje ou estão atrasadas",
      "Marque tarefas como concluídas sem sair desta tela",
      "Organize sua prioridade do dia de relance",
    ],
  },
  "/dashboard": {
    description: "Visão executiva do projeto com métricas em tempo real.",
    tips: [
      "Acompanhe totais de projetos, tarefas, vencidas e membros",
      "Consulte a atividade recente de toda a equipe",
      "Analise a distribuição de tarefas por status no gráfico",
    ],
  },
  "/projects": {
    description: "Gerenciamento completo de projetos.",
    tips: [
      "Crie projetos com nome, status, prioridade e responsável",
      "Filtre por status ou prioridade no topo da lista",
      "Clique em um projeto para ver detalhes, tarefas e membros",
      "Exporte a lista em CSV pelo botão de download",
    ],
  },
  "/tasks": {
    description: "Lista global de todas as tarefas do sistema.",
    tips: [
      "Filtre por projeto, status, prioridade ou responsável",
      "Salve filtros frequentes para acessar com um clique",
      "Clique no badge de status para alterar diretamente",
      "Exporte as tarefas filtradas em CSV",
    ],
  },
  "/kanban": {
    description: "Tarefas ou projetos em colunas por status — alterne no topo da página.",
    tips: [
      "Use o seletor Tarefas / Projetos para trocar de quadro",
      "Arraste cartões entre colunas para atualizar o status",
      "No quadro de projetos, clique em um cartão para abrir o projeto",
    ],
  },
  "/members": {
    description: "Cadastro e gestão dos membros da equipe.",
    tips: [
      "Adicione membros com nome, cargo e e-mail",
      "Edite ou remova membros pela lista",
      "Membros cadastrados podem ser atribuídos a tarefas e projetos",
    ],
  },
  "/checklist": {
    description: "Checklists de instalação organizados por projeto.",
    tips: [
      "Selecione um projeto para ver seus itens de checklist",
      "Marque itens conforme a instalação avança",
      "Acompanhe o percentual de conclusão por projeto",
    ],
  },
  "/calendario": {
    description: "Visualização de tarefas distribuídas no calendário.",
    tips: [
      "Navegue entre meses para ver o cronograma de vencimentos",
      "Clique em um dia para ver as tarefas daquela data",
      "Cores indicam o status de cada tarefa",
    ],
  },
  "/assistencia-tecnica": {
    description: "Registro e acompanhamento de visitas e eventos técnicos.",
    tips: [
      "Registre visitas com data, responsável e observações",
      "Crie eventos de instalação vinculados a projetos",
      "Acompanhe o histórico de atendimentos por projeto",
    ],
  },
  "/controle-amostras": {
    description: "Controle de amostras de materiais enviadas e aprovadas.",
    tips: [
      "Registre amostras com fornecedor, material e status",
      "Acompanhe amostras pendentes de aprovação",
      "Vincule amostras a projetos específicos",
    ],
  },
  "/gantt": {
    description: "Cronograma visual de projetos no formato Gantt.",
    tips: [
      "Visualize prazo e duração de cada projeto em linha do tempo",
      "Identifique sobreposições e gargalos de prazo",
      "Use junto com o Calendário para planejamento detalhado",
    ],
  },
  "/auditoria": {
    description: "Histórico completo de alterações feitas no sistema.",
    tips: [
      "Consulte quem criou, editou ou excluiu cada registro",
      "Filtre por usuário, tipo de ação ou período",
      "Use para rastrear mudanças inesperadas nos dados",
    ],
  },
  "/ajuda": {
    description: "Central de ajuda com documentação completa do sistema.",
    tips: [
      "Consulte guias detalhados de cada funcionalidade",
      "Use a busca para encontrar tópicos específicos",
      "Leia as dicas rápidas para aproveitar melhor o sistema",
    ],
  },
};

interface NavHelpPopoverProps {
  href: string;
  label: string;
}

export function NavHelpPopover({ href, label }: NavHelpPopoverProps) {
  const help = NAV_HELP[href];
  if (!help) return null;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="opacity-20 hover:opacity-100 transition-opacity p-0.5 rounded shrink-0 focus:outline-none"
          tabIndex={-1}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        sideOffset={12}
        className="max-w-64 p-3 bg-popover text-popover-foreground border shadow-md rounded-lg"
      >
        <p className="font-semibold text-sm mb-1">{label}</p>
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{help.description}</p>
        <ul className="space-y-1">
          {help.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="mt-0.5 text-primary shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
