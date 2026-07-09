import { useState, useEffect } from "react";
import { X, Sun, Briefcase, Search, Timer, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TOUR_KEY = "ulimax-tour-v1";

const steps = [
  {
    icon: Sun,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Bem-vindo ao Ulimax!",
    description:
      "Começe pelo seu Meu Dia — sua tela pessoal que reúne suas tarefas atribuídas, projetos e prazos em um único lugar.",
    tip: "É o primeiro item do menu lateral.",
  },
  {
    icon: Briefcase,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Projetos e Tarefas",
    description:
      "Em Projetos você vê o pipeline completo da equipe com datas e status. Em Tarefas, controla as atividades individuais com prioridades e responsáveis.",
    tip: "Use o filtro de responsável para ver só as suas.",
  },
  {
    icon: Search,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    title: "Busca Rápida",
    description:
      "A barra de busca no topo da tela encontra qualquer projeto, tarefa ou membro em segundos. Também funciona com ⌘K (Mac) ou Ctrl+K.",
    tip: "Você pode navegar pelos resultados sem usar o mouse.",
  },
  {
    icon: Timer,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Avisos de Prazo",
    description:
      "Marcações vermelhas e âmbar aparecem diretamente nas listas de tarefas e projetos para indicar itens vencidos ou próximos do prazo.",
    tip: "No Meu Dia você vê todos os seus prazos reunidos.",
  },
];

export function TourGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1200);
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
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
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
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", current.iconBg)}>
                <Icon className={cn("h-6 w-6", current.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Passo {step + 1} de {steps.length}
                </p>
                <h3 className="text-base font-bold text-foreground leading-snug">{current.title}</h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{current.description}</p>

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
