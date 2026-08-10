import { useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useListInstallationEvents,
  useListAssistenciaTecnica,
  useUpdateAssistenciaTecnica,
  getListAssistenciaTecnicaQueryKey,
  useListSampleControls,
  useUpdateSampleControl,
  getListSampleControlsQueryKey,
  useListAllChecklistItems,
  getListAllChecklistItemsQueryKey,
  useListProjects,
} from "@workspace/api-client-react";
import type { SampleControl } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HardHat,
  CalendarDays,
  Wrench,
  FlaskConical,
  ClipboardList,
  MessageCircle,
  Plus,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/useAppUser";
import { daysFromToday, parseLocalDate } from "@/lib/project-health";
import { buildAgendaText, openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssistenciaTecnicaPage from "./assistencia-tecnica";
import SampleControlsPage from "./sample-controls";

function prazoChip(dateStr?: string | null): { text: string; cls: string } | null {
  if (!dateStr) return null;
  const d = daysFromToday(dateStr);
  if (Number.isNaN(d)) return null;
  if (d < 0) return { text: d === -1 ? "venceu ontem" : `vencido há ${-d}d`, cls: "bg-red-500/10 text-red-500 border-red-500/30" };
  if (d === 0) return { text: "hoje", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
  if (d === 1) return { text: "amanhã", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
  if (d <= 7) return { text: `em ${d}d`, cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
  return { text: `em ${d}d`, cls: "bg-muted text-muted-foreground border-border/50" };
}

function Chip({ chip }: { chip: { text: string; cls: string } | null }) {
  if (!chip) return null;
  return (
    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", chip.cls)}>
      {chip.text}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  count,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
            <span className="text-xs font-normal text-muted-foreground">({count})</span>
          </CardTitle>
          <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            {hrefLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/** Uma linha só para tudo que está em dia — no lugar de um cartão vazio por assunto. */
function EmDiaLinha({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      Em dia: {labels.join(" · ")}.
    </p>
  );
}

const MAX_ROWS = 8;

export default function CentralObra({ embedded = false }: { embedded?: boolean } = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  const { data: events, isLoading: loadingEvents } = useListInstallationEvents();
  const { data: assistencias, isLoading: loadingAT } = useListAssistenciaTecnica();
  const { data: amostras, isLoading: loadingAmostras } = useListSampleControls();
  const { data: checklistItems, isLoading: loadingChecklist } = useListAllChecklistItems({
    query: { queryKey: getListAllChecklistItemsQueryKey() },
  });
  const { data: projects } = useListProjects();

  const updateAT = useUpdateAssistenciaTecnica();
  const updateSample = useUpdateSampleControl();

  const projectName = (id?: number | null) =>
    id == null ? null : (projects?.find((p) => p.id === id)?.name ?? null);

  // Instalações/eventos dos próximos 7 dias (inclui os que já começaram e ainda não acabaram)
  const upcomingEvents = useMemo(() => {
    const list = (events ?? []).filter((ev) => {
      const start = (ev.startDate ?? "").slice(0, 10);
      const end = (ev.endDate ?? ev.startDate ?? "").slice(0, 10);
      if (!start) return false;
      const dStart = daysFromToday(start);
      const dEnd = daysFromToday(end);
      return dStart <= 7 && dEnd >= 0;
    });
    return list.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  }, [events]);

  // Assistências em aberto (não concluídas/canceladas e não realizadas)
  const openAT = useMemo(() => {
    const list = (assistencias ?? []).filter(
      (a) => !a.realizado && a.status !== "concluido" && a.status !== "cancelado",
    );
    return list.sort((a, b) => {
      const da = a.scheduledDate ? daysFromToday(a.scheduledDate) : Number.POSITIVE_INFINITY;
      const db = b.scheduledDate ? daysFromToday(b.scheduledDate) : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [assistencias]);

  // Amostras ainda não entregues
  const pendingSamples = useMemo(() => {
    const list = (amostras ?? []).filter((s) => !s.delivered);
    return list.sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
  }, [amostras]);

  // Peças com plano de ação em aberto (não finalizadas)
  const actionItems = useMemo(() => {
    const list = (checklistItems ?? []).filter(
      (i) => (i.actionDescription ?? "").trim().length > 0 && i.status !== "finalizado",
    );
    return list.sort((a, b) => {
      const da = a.actionDueDate ? daysFromToday(a.actionDueDate) : Number.POSITIVE_INFINITY;
      const db = b.actionDueDate ? daysFromToday(b.actionDueDate) : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [checklistItems]);

  const naoInstaladas = useMemo(
    () => (checklistItems ?? []).filter((i) => i.status === "nao_instalado").length,
    [checklistItems],
  );

  const toggleRealizado = (id: number) => {
    updateAT.mutate(
      { id, data: { realizado: true, status: "concluido" } },
      {
        onSuccess: () => {
          toast({ title: "Chamado marcado como realizado" });
          queryClient.invalidateQueries({ queryKey: getListAssistenciaTecnicaQueryKey() });
        },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      },
    );
  };

  const toggleSample = (item: SampleControl, field: "ready" | "delivered") => {
    updateSample.mutate(
      {
        id: item.id,
        data: {
          ...(item.projectId != null && { projectId: item.projectId }),
          samples: item.samples,
          deadline: item.deadline,
          requester: item.requester,
          responsibleId: item.responsibleId ?? undefined,
          notes: item.notes ?? undefined,
          ready: field === "ready" ? !item.ready : item.ready,
          delivered: field === "delivered" ? !item.delivered : item.delivered,
        },
      },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSampleControlsQueryKey() }),
        onError: () => toast({ title: "Erro ao atualizar amostra", variant: "destructive" }),
      },
    );
  };

  const shareAgenda = (daysAhead: number) => {
    const text =
      buildAgendaText(events ?? [], daysAhead) ?? "Nenhum evento de instalação programado no período. ✅";
    openWhatsApp(text);
  };

  const pendentesOperacao = openAT.length + pendingSamples.length + actionItems.length;
  const isLoading = loadingEvents || loadingAT || loadingAmostras || loadingChecklist;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {embedded ? <div /> : (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-amber-500" />
            Central da Obra
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize-first">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })} — a operação inteira numa tela só
          </p>
        </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => shareAgenda(7)}>
            <MessageCircle className="h-4 w-4" /> Agenda no WhatsApp
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href="/calendario?create=1">
                <Plus className="h-4 w-4" /> Novo Evento
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visao-geral" className="gap-1.5 text-xs sm:text-sm">
            <HardHat className="h-3.5 w-3.5 shrink-0" />
            Resumo
            {pendentesOperacao > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 leading-5 shrink-0">
                {pendentesOperacao}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="assistencia" className="gap-1.5 text-xs sm:text-sm">
            <Wrench className="h-3.5 w-3.5 shrink-0" />
            Assistência
            {openAT.length > 0 && (
              <span className="ml-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 leading-5 shrink-0">
                {openAT.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="amostras" className="gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" />
            Amostras
            {pendingSamples.length > 0 && (
              <span className="ml-1 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 leading-5 shrink-0">
                {pendingSamples.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : (() => {
            // Só entra na tela o que pede ação; o que está em dia vira uma linha.
            const emDia: string[] = [];
            if (openAT.length === 0) emDia.push("assistências");
            if (pendingSamples.length === 0) emDia.push("amostras");
            if (actionItems.length === 0) emDia.push("planos de ação das peças");
            if (upcomingEvents.length === 0) emDia.push("instalações da semana");
            const nadaPendente = emDia.length === 4;

            if (nadaPendente) {
              return (
                <div className="bg-card rounded-xl border border-border px-4 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Operação em dia</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhuma assistência aberta, amostra a entregar, plano de ação de peça ou instalação nos próximos 7 dias.
                  </p>
                </div>
              );
            }

            const blocos: React.ReactNode[] = [];

            if (openAT.length > 0) {
              blocos.push(
                <SectionCard key="at" title="Assistências em aberto" icon={Wrench} count={openAT.length} href="/obra?tab=operacao" hrefLabel="Ver todas">
                  <ul className="divide-y divide-border/50">
                    {openAT.slice(0, MAX_ROWS).map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{a.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                        </div>
                        <Chip chip={prazoChip(a.scheduledDate)} />
                        {canEdit && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0"
                            disabled={updateAT.isPending} onClick={() => toggleRealizado(a.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Realizado
                          </Button>
                        )}
                      </li>
                    ))}
                    {openAT.length > MAX_ROWS && (
                      <li className="py-2 text-xs text-muted-foreground">+{openAT.length - MAX_ROWS} outras</li>
                    )}
                  </ul>
                </SectionCard>
              );
            }

            if (pendingSamples.length > 0) {
              blocos.push(
                <SectionCard key="am" title="Amostras a entregar" icon={FlaskConical} count={pendingSamples.length} href="/obra?tab=operacao" hrefLabel="Ver todas">
                  <ul className="divide-y divide-border/50">
                    {pendingSamples.slice(0, MAX_ROWS).map((s2) => (
                      <li key={s2.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s2.samples}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[s2.requester, projectName(s2.projectId)].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Chip chip={prazoChip(s2.deadline)} />
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant={s2.ready ? "default" : "outline"} size="sm" className="h-7 text-xs px-2"
                              disabled={updateSample.isPending} onClick={() => toggleSample(s2, "ready")}>
                              Pronta
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                              disabled={updateSample.isPending || !s2.ready} onClick={() => toggleSample(s2, "delivered")}>
                              Entregue
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                    {pendingSamples.length > MAX_ROWS && (
                      <li className="py-2 text-xs text-muted-foreground">+{pendingSamples.length - MAX_ROWS} outras</li>
                    )}
                  </ul>
                </SectionCard>
              );
            }

            if (actionItems.length > 0) {
              blocos.push(
                <SectionCard key="pa" title="Peças com plano de ação" icon={ClipboardList} count={actionItems.length} href="/checklist" hrefLabel="Instalações">
                  <ul className="divide-y divide-border/50">
                    {actionItems.slice(0, MAX_ROWS).map((i) => (
                      <li key={i.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {i.peca}
                            {i.local ? <span className="text-muted-foreground font-normal"> — {i.local}</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[projectName(i.projectId), i.actionDescription].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Chip chip={prazoChip(i.actionDueDate)} />
                      </li>
                    ))}
                    {actionItems.length > MAX_ROWS && (
                      <li className="py-2 text-xs text-muted-foreground">+{actionItems.length - MAX_ROWS} outras</li>
                    )}
                  </ul>
                </SectionCard>
              );
            }

            if (upcomingEvents.length > 0) {
              blocos.push(
                <SectionCard key="inst" title="Instalações — próximos 7 dias" icon={CalendarDays} count={upcomingEvents.length} href="/calendario" hrefLabel="Calendário">
                  <ul className="divide-y divide-border/50">
                    {upcomingEvents.slice(0, MAX_ROWS).map((ev) => (
                      <li key={ev.id} className="flex items-center gap-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 capitalize">
                          {format(parseLocalDate(ev.startDate), "EEE dd/MM", { locale: ptBR })}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{ev.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[ev.teamDescription?.trim() || "Sem equipe", projectName(ev.projectId)].filter(Boolean).join(" · ")}
                            {ev.eventType === "assistencia" ? " · assistência" : ""}
                          </p>
                        </div>
                        <Chip chip={prazoChip(ev.startDate)} />
                      </li>
                    ))}
                    {upcomingEvents.length > MAX_ROWS && (
                      <li className="py-2 text-xs text-muted-foreground">+{upcomingEvents.length - MAX_ROWS} outros no calendário</li>
                    )}
                  </ul>
                </SectionCard>
              );
            }

            return (
              <div className="space-y-3">
                <div className={cn("grid grid-cols-1 gap-3", blocos.length > 1 && "lg:grid-cols-2")}>
                  {blocos}
                </div>
                <EmDiaLinha labels={emDia} />
                {naoInstaladas > 0 && (
                  <p className="text-xs text-muted-foreground px-1">
                    {naoInstaladas} {naoInstaladas === 1 ? "peça ainda não instalada" : "peças ainda não instaladas"} no total —
                    veja em <Link href="/checklist" className="underline hover:text-foreground">Instalações</Link>.
                  </p>
                )}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="assistencia" className="mt-4">
          <AssistenciaTecnicaPage asTab />
        </TabsContent>

        <TabsContent value="amostras" className="mt-4">
          <SampleControlsPage asTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
