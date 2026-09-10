# Ulimax Projetos — Estado do Produto

> Documento de continuidade: o que o app é hoje, decisões tomadas e pendências.
> Atualizar junto com entregas grandes. Última atualização: 2026-08-04 (fila única em Obras/Hoje).

## Visão por papel

| Papel | Home | Menu | Ferramentas-chave |
|---|---|---|---|
| **gestor** | Meu Dia | Meu Dia, Dashboard, Projetos, Trabalho · Obra: Obras, Calendário · Análises: Assistente, Desempenho · Configurações | Dashboard em 4 blocos (números do dia: ativos/atenção/tarefas atrasadas/entregas 30d → radar 'Onde focar agora' com lentes Por obra × Por assunto → comparativo por unidade → atividade recente; saíram Atrasadas por Responsável, rosca de status, Próximas Visitas e o mini-calendário), Desempenho (ciclo real + por unidade + Modo reunião), Ver como |
| **gestor_obras** | Obras (aba Visitas) | Obras, Projetos, Calendário, Ajuda | Hub Obras em 3 abas com **contadores na aba** (vermelho = tem atraso, âmbar = aguardando; `hooks/useObraTabCounts.ts`) + linha de convite às outras abas — sem isso o gestor ficava só em Visitas. Hoje e Agenda EXTINTAS, conteúdo redistribuído: **Visitas** = programação do mês confirmada dia a dia (passadas esmaecidas + "depois deste mês") + painel de sugeridas aguardando confirmação (critério 10d/15d, botão Agendar, nº de itens p/ checar lá) · **Pendências** = UMA fila de decisão (não painéis): chips Atrasadas (padrão) / Vencem em 7 dias / Todas + lista ordenada por atraso, cada linha com a ação que resolve — Anexar RDO, Cobrar no WhatsApp (externos), abrir tarefas da pessoa, abrir a obra. Fontes: visita sem RDO, itens de plano (`/chase-items`), tarefas vencidas agrupadas por responsável, datas vencidas e a vencer (30d). `cobrancas.tsx` deixou de ser embutida (órfã) · **Operação** = instalações/AT/amostras. painel-obra.tsx e agenda.tsx órfãos de propósito |
| **executor (projetista)** | Minha Prancheta | Prancheta, Projetos, Calendário (Trabalho e Meu Dia FORA do menu desde 2026-08-05 — rotas seguem acessíveis p/ deep-links) | Prancheta = home única: Precisa de você + **Minhas Atividades** (absorvida do Meu Dia, componente `minhas-atividades.tsx`) + Projetos por fase; Trilho de Fases com edição inline |
| **projetista_gestor** | Minha Prancheta | Prancheta, Dashboard, Projetos, Trabalho, Calendário, Ajuda (Meu Dia fora do menu — Minhas Atividades vive na Prancheta) | Projetista com visão geral: tudo do executor + Dashboard e Trabalho (todas as obras); SEM as áreas administrativas do gestor (Equipe/Templates/Campos/Automações/Auditoria). Servidor: entra em requireExecutorOrGestor (edita qualquer projeto/tarefa, sem restrição de participante); requireGestor continua só p/ gestor. **Migração manual: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'projetista_gestor';`** |
| **observador** | Dashboard | Dashboard, Projetos, Calendário | leitura |

## Telas principais
- **Projetos** (`/projects`): tabela enxuta (Farol, Projeto+selo de plano, Tarefas, Fase, Prior., Material, Entrega, Instalação) | visão **Kanban** (fases, drag). Filtros: busca, fase, prioridade, **material**, farol (+legenda "?"). Exporta **CSV** (todas as datas) e **PDF** (lista filtrada p/ impressão). Datas detalhadas vivem no Trilho/Agenda/CSV/PDF.
- **Projeto** (`/projects/:id`): **Trilho de Fases** (progressive disclosure; fase ativa expandida; datas com edição inline + autosave; mini-timeline arrastável; botão **Histórico** = auditoria quem/quando/de→para das 8 datas; "Concluir fase→" avança status — SEM gate de anexo, desenho vai por e-mail) → Plano de Ação (accordions fechados, badge de vencidos) → **Visitas na Obra** (RDO anexado por visita: botão anexar/baixar arquivo na linha) → **Tarefas da Equipe** (form com Responsável interno Ulimax) → Observações → Controle de Materiais → Participantes → Históricos. Removidos da tela: Marcos/Burndown, Fotos/Arquivos, checklist, acervo RDO/Documentos e drop-zone (RDO agora vive na visita).
- **Trabalho** (`/tasks`): abas Lista | Tarefas (colunas drag, cartão clicável abre detalhe) | Fases dos Projetos | Linha do Tempo. Filtro Madeira/Alumínio. Deep-links `?vencidas=1&responsavel=` caem na Lista.
- **Obras** (`/obra?tab=`): ver tabela acima. `/cobrancas`, `/agenda`, `/painel-obra`, `/portfolio`, `/kanban`, `/gantt` redirecionam.

## Simplificação de 2026-09 (adesão)
Motivo: "muito complexo para a aderência das pessoas". Três fases:
1. **Menu do gestor 14→10** e **uma home só**: Meu Dia saiu do menu (Dashboard virou home e ganhou o bloco `MinhasAtividades`); Templates, Campos Personalizados e Automações saíram do menu (rotas preservadas).
2. **"Plano de ação" deixou de existir — tudo é Tarefa.** `tasks.responsible_external` (SQL rodado) guarda fornecedor/terceiro; os itens de `project_action_items` foram migrados para `tasks` por INSERT. Saíram: seção Plano de Ação do projeto, ActionPlanBadge, itens de plano em Pendências, alertas de cobrança. `fetchOpenChaseItems` agora lê tarefas (mantém o e-mail diário). Tabelas antigas preservadas, sem uso.
3. **Página do projeto e Ajuda enxutas**: saíram os 4 cartões de status (contador foi para o título de Tarefas) e o Histórico de Atividades (o Trilho tem Histórico de datas; gestor tem Auditoria). Ajuda de **51 → 24 tópicos**; 10 seções de recursos avançados de tarefa viraram uma só.
Conceitos eliminados: plano de ação, item de plano, cobrança, Meu Dia.

## Backend/domínio
- Fases do projeto: a_iniciar → em_projeto → em_aprovacao ("Na Arquitetura") → em_producao → aguardando_instalacao → em_instalacao.
- Farol (`lib/project-health.ts`): 🔴 tarefa vencida OU endDate passado · 🟡 vence ≤3d / parada 7d+ / entrega ≤7d com <70% · 🟢 resto. FarolLegend espelha esses números.
- Datas de obra "vencidas" = estimada passou E a final correspondente vazia (`lib/obra-dates.ts`).
- Critério de visita (fila de Obras/Hoje): obra pede visita quando fim da produção ≤10d OU em instalação; cadência de 15 dias; silencia se há visita futura agendada.
- Cobranças (`/chase-items` + `fetchOpenChaseItems`): SÓ itens de plano de ação (decisão 2026-08-05: visita não gera pendência item a item — a pendência da visita é o RDO não anexado; follow-ups de visita continuam existindo dentro do diálogo da visita, mas fora das cobranças/e-mail/alertas). Entram no e-mail diário e no `useAlerts`. `VisitRdoActions` compartilhado em components/.
- Planos por projeto: `/action-plans/by-project`; selo `ActionPlanBadge` + criar via `NewActionPlanDialog`.
- Snapshots de métricas: `metrics_snapshots` gravada pelo cron; `/dashboard/trends` existe (TrendsStrip fora do Dashboard por decisão).
- Aprovação da arquitetura: fase `em_aprovacao` = **"Na Arquitetura"** (rótulo em toda a UI; a etapa 'enviado para a arquitetura' já era essa — não criar 7ª fase). Campos `projects.approval_*` (sem migração). No project-detail: nada antes da fase; **cartão com ação** durante a fase; **faixa compacta somente-leitura** depois (com 'Corrigir'/'Registrar' p/ backfill). Data real via `approvedOn` no POST /projects/:id/approve; registram gestor e projetista_gestor.
- Entrada na equipe: **o gestor cadastra a pessoa E define a senha** (`POST /members/with-access`, requireGestor). Cria o usuário no Clerk (`clerkClient.users.createUser`), grava `members` + `users` já com o papel — sem depender do casamento por e-mail do convite — e apaga convite pendente do mesmo e-mail. A senha vai direto ao Clerk: nunca é gravada no nosso banco nem em log; aparece uma única vez no diálogo de credenciais (com botão Copiar). Se o banco falhar depois do Clerk, o usuário criado é removido. O convite por e-mail continua existindo como 2ª opção no mesmo diálogo. **Exige Email+Password habilitado no painel do Clerk.**
- Auditoria: PATCH de projeto grava diff de status/prioridade/nome + 8 datas; `/audit-logs` escopado por entidade liberado a autenticados.
- `tasks.started_at` = tempo de ciclo real (marcado na 1ª saída de "todo").
- Atribuição de tarefa notifica o responsável: notificação in-app (sino, p/ quem tem conta) + e-mail via Resend (aguardado — serverless congela após a resposta; sai mesmo sem conta no app). Vale p/ criar, editar e bulk-update; auto-atribuição não notifica. `assignedTo` aceita `null` no contrato (limpar responsável). Depende de `RESEND_API_KEY`/`EMAIL_FROM`/`APP_URL` na Vercel.
- Calendário de equipes: evento (`installation_events`) agora liga a **obra** (`project_id`, o form nunca preenchia) ou a **assistência** (`assistencia_id`, coluna NOVA — obra antiga fora do sistema). Painéis 'Aguardando agendamento' (obras) e 'Assistências aguardando equipe' com botão que abre o diálogo preenchido; equipe é select das existentes + nova; duração em botões 1/2/3/5 dias; aviso (não bloqueia) de conflito de equipe no form e ao arrastar. Agendar assistência grava `scheduledDate` e status `em_andamento` no chamado.
- Anexos: `attachments.category` (planta/aprovacao/rdo/diario/visita/outro).
- Checklist de esquadrias (`/checklist`): FORA dos menus desde 2026-08-05 — zero peças cadastradas em produção, ninguém controla peça a peça; o acompanhamento da instalação vive no Calendário (equipe/data), na fase do projeto e nas visitas com RDO. Página e rota preservadas; para reativar, devolver o item aos menus em `layout.tsx`.
- UpdateNotifier: aba avisa "Nova versão disponível" (5min/focus).

## Migrações já aplicadas no Supabase
`metrics_snapshots` (tabela) · `tasks.started_at` · `attachments.category` · `user_role` + valor `projetista_gestor` (ALTER TYPE) · `installation_events.assistencia_id`. Seed de demo: `scripts/seed-demo.sql` (dados [DEMO], datas relativas, bloco de limpeza no fim).

## Convenções de desenvolvimento
- Contrato-first: `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen`; nunca editar `generated/`.
- pnpm **10** (packageManager fixado). Deploy: Vercel na `main` (todo push na main = produção).
- iCloud no Desktop gera duplicatas `" 2.ts"`: nunca `git add -A`; limpar com `find -E lib artifacts -type f -regex '.* [0-9]+\.(ts|tsx)' -delete` e conferir `git status` antes do push.
- Componente novo: verificar que está MONTADO (grep da string no chunk do build).
- **Dicas nos botões**: `components/dica.tsx` (Tooltip; TooltipProvider já está no App). Todo botão de ação novo ganha `<Dica texto="...">` dizendo o RESULTADO, não o rótulo — a maioria dos usuários não abre a tela de Ajuda.
- Erros de tipo em cascata: limpar `lib/**/dist` + `*.tsbuildinfo` e rebuildar.

## Pendências conhecidas (backlog)
- Campo item 2: fluxo câmera-first (foto na pendência) + áudio no relato.
- Campo item 5: offline/PWA (maior gap vs Fieldwire). QR code na peça (fase 2 do wizard).
- Wizard "modo campo" T0→T5 do instalador (desenhado, não implementado).
- Ver como com somente-leitura real; frequência de visita configurável por fase.
- Ajuda: seções antigas podem divergir após os últimos refinos (revisar).
