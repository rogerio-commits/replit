import { useSearch, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HardHat, CalendarPlus } from "lucide-react";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import { useObraTabCounts, type TabCount } from "@/hooks/useObraTabCounts";
import { cn } from "@/lib/utils";
import { Dica } from "@/components/dica";
import ObraVisitas from "./obra-visitas";
import ObraPendencias from "./obra-pendencias";
import CentralObra from "./central-obra";

// ── Obra ─────────────────────────────────────────────────────────────────────
// Hub único da obra para o gestor de obras, em três abas:
//   Visitas    = programação do mês confirmada + sugeridas aguardando confirmação
//   Pendências = tudo em que ele precisa atuar, dividido por assunto
//   Operação   = instalações, assistência técnica e amostras
// Cada aba mostra quantos itens pedem ação (vermelho = tem atraso) — sem isso
// o gestor ficava só em Visitas e não descobria o que esperava nas outras.
// A aba ativa vem da URL (?tab=) para os atalhos caírem no lugar.

const VALID = ["visitas", "pendencias", "operacao"];
// Abas antigas (hoje/agenda) redirecionam para a nova casa do conteúdo.
const LEGACY: Record<string, string> = { hoje: "visitas", agenda: "visitas" };

function TabBadge({ c }: { c: TabCount }) {
  if (c.count === 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 min-w-[18px] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
        c.urgent ? "bg-red-500 text-white" : "bg-amber-400 text-amber-950",
      )}
    >
      {c.count > 99 ? "99+" : c.count}
    </span>
  );
}

export default function Obra() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const raw = new URLSearchParams(search).get("tab") ?? "visitas";
  const mapped = LEGACY[raw] ?? raw;
  const tab = VALID.includes(mapped) ? mapped : "visitas";
  const counts = useObraTabCounts();

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardHat className="h-7 w-7 text-primary" />
            Obras
          </h1>
          <p className="text-muted-foreground mt-1">Suas obras num lugar — visitas, pendências e operação.</p>
        </div>
        <NewVisitDialog
          trigger={
            <Dica texto="Agenda ou registra uma visita: escolha a obra, a data e o objetivo. Depois de realizada, anexe o RDO na linha da visita.">
              <Button className="shrink-0 gap-1.5">
                <CalendarPlus className="h-4 w-4" /> Nova visita
              </Button>
            </Dica>
          }
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate(`/obra?tab=${v}`)}>
        <TabsList className="grid w-full grid-cols-3 sm:max-w-lg">
          <TabsTrigger value="visitas">Visitas <TabBadge c={counts.visitas} /></TabsTrigger>
          <TabsTrigger value="pendencias">Pendências <TabBadge c={counts.pendencias} /></TabsTrigger>
          <TabsTrigger value="operacao">Operação <TabBadge c={counts.operacao} /></TabsTrigger>
        </TabsList>

        {/* O que espera nas outras abas — some quando não há nada lá. */}
        <p className="mt-2 text-xs text-muted-foreground">
          {tab === "visitas" && (counts.pendencias.count > 0 || counts.operacao.count > 0) && (
            <>
              Depois das visitas, veja{" "}
              {counts.pendencias.count > 0 && (
                <button className="text-primary hover:underline font-medium" onClick={() => navigate("/obra?tab=pendencias")}>
                  {counts.pendencias.count} pendência{counts.pendencias.count !== 1 ? "s" : ""} para cobrar
                </button>
              )}
              {counts.pendencias.count > 0 && counts.operacao.count > 0 && " e "}
              {counts.operacao.count > 0 && (
                <button className="text-primary hover:underline font-medium" onClick={() => navigate("/obra?tab=operacao")}>
                  {counts.operacao.count} item{counts.operacao.count !== 1 ? "ns" : ""} de operação
                </button>
              )}
              .
            </>
          )}
          {tab === "pendencias" && "Cobranças, RDOs e datas de todas as obras — resolva e volte às visitas."}
          {tab === "operacao" && "Instalações, assistência técnica e amostras — o pós-visita da obra."}
        </p>

        <TabsContent value="visitas" className="mt-4"><ObraVisitas /></TabsContent>
        <TabsContent value="pendencias" className="mt-4"><ObraPendencias /></TabsContent>
        <TabsContent value="operacao" className="mt-4"><CentralObra embedded /></TabsContent>
      </Tabs>
    </div>
  );
}
