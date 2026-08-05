import { useSearch, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HardHat, CalendarPlus } from "lucide-react";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import ObraVisitas from "./obra-visitas";
import ObraPendencias from "./obra-pendencias";
import CentralObra from "./central-obra";

// ── Obra ─────────────────────────────────────────────────────────────────────
// Hub único da obra para o gestor de obras, em três abas:
//   Visitas    = programação do mês confirmada + sugeridas aguardando confirmação
//   Pendências = tudo em que ele precisa atuar, dividido por assunto
//   Operação   = instalações, assistência técnica e amostras
// A aba ativa vem da URL (?tab=) para os atalhos caírem no lugar.

const VALID = ["visitas", "pendencias", "operacao"];
// Abas antigas (hoje/agenda) redirecionam para a nova casa do conteúdo.
const LEGACY: Record<string, string> = { hoje: "visitas", agenda: "visitas" };

export default function Obra() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const raw = new URLSearchParams(search).get("tab") ?? "visitas";
  const mapped = LEGACY[raw] ?? raw;
  const tab = VALID.includes(mapped) ? mapped : "visitas";

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
            <Button className="shrink-0 gap-1.5">
              <CalendarPlus className="h-4 w-4" /> Nova visita
            </Button>
          }
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate(`/obra?tab=${v}`)}>
        <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="operacao">Operação</TabsTrigger>
        </TabsList>
        <TabsContent value="visitas" className="mt-4"><ObraVisitas /></TabsContent>
        <TabsContent value="pendencias" className="mt-4"><ObraPendencias /></TabsContent>
        <TabsContent value="operacao" className="mt-4"><CentralObra embedded /></TabsContent>
      </Tabs>
    </div>
  );
}
