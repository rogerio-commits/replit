import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

// Legenda do farol: os critérios exatos do lib/project-health, em linguagem
// corrente, num popover acionável por clique (funciona também no touch).
// Se mudar a regra lá, atualize os números aqui.

const RULES: { emoji: string; label: string; tone: string; criterios: string[] }[] = [
  {
    emoji: "🔴", label: "Crítico — precisa de ação agora", tone: "text-red-600",
    criterios: [
      "Tem pelo menos 1 tarefa com prazo vencido; ou",
      "O prazo de entrega do projeto já passou.",
    ],
  },
  {
    emoji: "🟡", label: "Atenção — risco à vista", tone: "text-amber-600",
    criterios: [
      "Tarefa vencendo em até 3 dias; ou",
      "Tarefa parada em “A Fazer” há 7 dias ou mais; ou",
      "Entrega em até 7 dias com menos de 70% das tarefas concluídas.",
    ],
  },
  {
    emoji: "🟢", label: "Em dia", tone: "text-emerald-600",
    criterios: ["Nenhuma das situações acima."],
  },
];

export function FarolLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground/60 hover:text-foreground transition-colors"
          title="Como o farol é calculado?"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm">
        <p className="font-semibold text-foreground mb-2">Como o farol é calculado</p>
        <div className="space-y-3">
          {RULES.map((r) => (
            <div key={r.emoji}>
              <p className={`font-medium ${r.tone}`}>{r.emoji} {r.label}</p>
              <ul className="mt-0.5 list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {r.criterios.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
          O vermelho sempre vence o amarelo. Passe o mouse na bolinha de um projeto para ver o motivo exato dele.
        </p>
      </PopoverContent>
    </Popover>
  );
}
