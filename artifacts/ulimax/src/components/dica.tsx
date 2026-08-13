import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Dica ─────────────────────────────────────────────────────────────────────
// Balão curto explicando o que o botão faz, ao passar o mouse ou focar pelo
// teclado. Existe porque quase ninguém abre a tela de Ajuda: a explicação
// precisa estar onde a dúvida aparece.
// Escreva a dica no infinitivo e diga o RESULTADO ("Registra a visita e avisa
// a equipe"), não o rótulo do botão de novo.

export function Dica({
  texto,
  lado = "bottom",
  children,
}: {
  texto: React.ReactNode;
  lado?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  return (
    // 150ms: o padrão do Radix é 700ms — tempo demais, ninguém para o mouse
    // tanto tempo e a dica parecia não existir.
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={lado} className="max-w-[260px] text-xs leading-snug">
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}
