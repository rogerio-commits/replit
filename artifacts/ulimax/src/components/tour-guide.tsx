import { useState, useEffect } from "react";
import {
  X,
  Sun,
  Briefcase,
  Search,
  Timer,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  CheckSquare,
  Columns3,
  Plus,
  HardHat,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOUR_KEY = "ulimax-tour-v2";

const steps = [
  {
    icon: Sun,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Bem-vindo ao Ulimax!",
    description:
      "Este guia rápido vai apresentar as principais funcionalidades do sistema. Você pode pular a qualquer momento e reabrir pelo botão 'Tour rápido' na sidebar.",
    tip: "O tour tem 10 passos e leva menos de 2 minutos.",
  },
  {
    icon: Sun,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Meu Dia",
    description:
      "Sua tela pessoal de trabalho. Reúne todas as tarefas atribuídas a você — as que vencem hoje, as atrasadas e as próximas. É o ponto de partida ideal para começar o dia.",
    tip: "Acesse pelo primeiro item do menu lateral.",
  },
  {
    icon: LayoutDashboard,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Dashboard",
    description:
      "Visão executiva com métricas em tempo real: total de projetos, tarefas, itens vencidos e membros da equipe. Inclui gráfico de distribuição por status e feed de atividade recente.",
    tip: "Atualize a página para refletir mudanças recentes da equipe.",
  },
  {
    icon: Briefcase,
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    title: "Projetos",
    description:
      "Lista completa de projetos com status, prioridade e responsável. Filtre por status ou prioridade, clique em um projeto para ver seus detalhes, tarefas vinculadas e membros.",
    tip: "Use 'Exportar CSV' para levar a lista para uma planilha.",
  },
  {
    icon: CheckSquare,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Tarefas",
    description:
      "Lista global de tarefas de todos os projetos. Filtre por projeto, status, prioridade ou responsável. Salve filtros frequentes com nome para acessar com um clique.",
    tip: "Clique no badge colorido de status para alterar diretamente na lista.",
  },
  {
    icon: Columns3,
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    title: "Kanban",
    description:
      "Visualize as tarefas em colunas por status: A Fazer, Em Progresso, Em Revisão e Concluído. Arraste os cartões entre colunas para atualizar o status diretamente.",
    tip: "Filtre por projeto ou responsável para focar no que importa.",
  },
  {
    icon: Plus,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Botão + Criar",
    description:
      "O botão '+ Criar' no topo direito da tela abre um menu rápido com atalhos para criar um Novo Projeto ou uma Nova Tarefa sem precisar navegar manualmente.",
    tip: "Funciona de qualquer tela do sistema.",
  },
  {
    icon: Search,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Busca Global",
    description:
      "A barra de busca no topo encontra projetos, tarefas e membros em segundos. Use o atalho ⌘K (Mac) ou Ctrl+K para abrir a busca de qualquer lugar.",
    tip: "Você pode navegar nos resultados com as setas do teclado e confirmar com Enter.",
  },
  {
    icon: HardHat,
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400",
    title: "Seções de Obra",
    description:
      "O grupo Obra no menu lateral concentra ferramentas específicas: Instalações (checklists), Calendário (tarefas por data), Assistência Técnica (visitas), Amostras e Gantt (cronograma).",
    tip: "Passe o mouse sobre o ícone ? de cada seção para ver um resumo rápido.",
  },
  {
    icon: Bell,
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    title: "Alertas e Auditoria",
    description:
      "Alertas notifica tarefas vencidas, próximas do prazo ou sem responsável. Auditoria registra todas as ações do sistema — quem criou, editou ou excluiu cada registro e quando.",
    tip: "Acesse a página de Ajuda para documentação completa de cada seção.",
  },
];

let _setVisible: ((v: boolean) => void) | null = null;
let _setStep: ((s: number) => void) | null = null;

export function openTour() {
  _setStep?.(0);
  _setVisible?.(true);
}

export function TourGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    _setVisible = setVisible;
    _setStep = setStep;
    return () => {
      _setVisible = null;
      _setStep = null;
    };
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  function dismiss() {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[90] backdrop-blur-[1px] animate-in fade-in duration-300"
        onClick={dismiss}
      />
      <div className="fixed bottom-8 right-8 z-[100] w-96 max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-0">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
            <button
              onClick={dismiss}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-5 py-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                  current.iconBg,
                )}
              >
                <Icon className={cn("h-6 w-6", current.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Passo {step + 1} de {steps.length}
                </p>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  {current.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              {current.description}
            </p>

            {current.tip && (
              <div className="mt-3 flex items-start gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-primary text-xs font-semibold shrink-0 mt-0.5">💡</span>
                <p className="text-xs text-muted-foreground">{current.tip}</p>
              </div>
            )}
          </div>

          <div className="px-5 pb-5 flex items-center justify-between gap-3">
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular tour
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Pronto!
                </>
              ) : (
                <>
                  Próximo <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
