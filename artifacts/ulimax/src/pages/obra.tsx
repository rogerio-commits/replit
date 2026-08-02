import { useSearch, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HardHat, CalendarPlus } from "lucide-react";
import { NewVisitDialog } from "@/components/new-visit-dialog";
import PainelObra from "./painel-obra";
import Agenda from "./agenda";
import CentralObra from "./central-obra";

// ── Obra ─────────────────────────────────────────────────────────────────────
// Hub único da obra para o gestor de obras, em três abas — antes eram três
// páginas parecidas (Painel / Agenda / Central da Obra):
//   Hoje     = o que precisa de ação agora (cockpit)
//   Agenda   = calendário de visitas e datas-chave
//   Operação = instalações, assistência técnica e amostras
// A aba ativa vem da URL (?tab=) para os atalhos "Ver todos" caírem no lugar.

const VALID = ["hoje", "agenda", "operacao"];

export default function Obra() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const raw = new URLSearchParams(search).get("tab") ?? "hoje";
  const tab = VALID.includes(raw) ? raw : "hoje";

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardHat className="h-7 w-7 text-primary" />
            Obra
          </h1>
          <p className="text-muted-foreground mt-1">Tudo da obra num lugar — hoje, agenda e operação.</p>
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
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="operacao">Operação</TabsTrigger>
        </TabsList>
        <TabsContent value="hoje" className="mt-4"><PainelObra /></TabsContent>
        <TabsContent value="agenda" className="mt-4"><Agenda /></TabsContent>
        <TabsContent value="operacao" className="mt-4"><CentralObra embedded /></TabsContent>
      </Tabs>
    </div>
  );
}
