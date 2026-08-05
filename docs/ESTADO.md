# Ulimax Projetos — Estado do Produto

> Documento de continuidade: o que o app é hoje, decisões tomadas e pendências.
> Atualizar junto com entregas grandes. Última atualização: 2026-08-04 (fila única em Obras/Hoje).

## Visão por papel

| Papel | Home | Menu | Ferramentas-chave |
|---|---|---|---|
| **gestor** | Meu Dia | Meu Dia, Dashboard, Projetos, Trabalho · Obra: Obras, Instalações, Calendário · Análises: Assistente, Desempenho · Configurações | Dashboard enxuto (7 cartões + FarolLegend), Desempenho (ciclo real + por unidade + Modo reunião), Ver como |
| **gestor_obras** | Obras (aba Visitas) | Obras, Projetos, Calendário, Ajuda | Hub Obras em 3 abas (Hoje e Agenda EXTINTAS, conteúdo redistribuído): **Visitas** = programação do mês confirmada dia a dia (passadas esmaecidas + "depois deste mês") + painel de sugeridas aguardando confirmação (critério 10d/15d, botão Agendar, nº de itens p/ checar lá) · **Pendências** = dividido: RDOs de visita pendentes (visita realizada sem arquivo, anexa na linha) / tarefas da equipe vencidas POR RESPONSÁVEL (→ /tasks?responsavel=&vencidas=1) / datas vencidas / datas a vencer (30d) / planos de ação (Cobrancas embedded, WhatsApp) · **Operação** = instalações/AT/amostras. painel-obra.tsx e agenda.tsx órfãos de propósito |
| **executor (projetista)** | Minha Prancheta | Prancheta, Projetos, Instalações, Calendário (Trabalho e Meu Dia FORA do menu desde 2026-08-05 — rotas seguem acessíveis p/ deep-links) | Prancheta = home única: Precisa de você + **Minhas Atividades** (absorvida do Meu Dia, componente `minhas-atividades.tsx`) + Projetos por fase; Trilho de Fases com edição inline |
| **projetista_gestor** | Minha Prancheta | Prancheta, Dashboard, Projetos, Trabalho, Instalações, Calendário, Ajuda (Meu Dia fora do menu — Minhas Atividades vive na Prancheta) | Projetista com visão geral: tudo do executor + Dashboard e Trabalho (todas as obras); SEM as áreas administrativas do gestor (Equipe/Templates/Campos/Automações/Auditoria). Servidor: entra em requireExecutorOrGestor (edita qualquer projeto/tarefa, sem restrição de participante); requireGestor continua só p/ gestor. **Migração manual: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'projetista_gestor';`** |
| **observador** | Dashboard | Dashboard, Projetos, Calendário | leitura |

## Telas principais
- **Projetos** (`/projects`): tabela enxuta (Farol, Projeto+selo de plano, Tarefas, Fase, Prior., Material, Entrega, Instalação) | visão **Kanban** (fases, drag). Filtros: busca, fase, prioridade, **material**, farol (+legenda "?"). Exporta **CSV** (todas as datas) e **PDF** (lista filtrada p/ impressão). Datas detalhadas vivem no Trilho/Agenda/CSV/PDF.
- **Projeto** (`/projects/:id`): **Trilho de Fases** (progressive disclosure; fase ativa expandida; datas com edição inline + autosave; mini-timeline arrastável; botão **Histórico** = auditoria quem/quando/de→para das 8 datas; "Concluir fase→" avança status — SEM gate de anexo, desenho vai por e-mail) → Plano de Ação (accordions fechados, badge de vencidos) → **Visitas na Obra** (RDO anexado por visita: botão anexar/baixar arquivo na linha) → **Tarefas da Equipe** (form com Responsável interno Ulimax) → Observações → Controle de Materiais → Participantes → Históricos. Removidos da tela: Marcos/Burndown, Fotos/Arquivos, checklist, acervo RDO/Documentos e drop-zone (RDO agora vive na visita).
- **Trabalho** (`/tasks`): abas Lista | Tarefas (colunas drag, cartão clicável abre detalhe) | Fases dos Projetos | Linha do Tempo. Filtro Madeira/Alumínio. Deep-links `?vencidas=1&responsavel=` caem na Lista.
- **Obras** (`/obra?tab=`): ver tabela acima. `/cobrancas`, `/agenda`, `/painel-obra`, `/portfolio`, `/kanban`, `/gantt` redirecionam.

## Backend/domínio
- Fases do projeto: a_iniciar → em_projeto → em_aprovacao → em_producao → aguardando_instalacao → em_instalacao.
- Farol (`lib/project-health.ts`): 🔴 tarefa vencida OU endDate passado · 🟡 vence ≤3d / parada 7d+ / entrega ≤7d com <70% · 🟢 resto. FarolLegend espelha esses números.
- Datas de obra "vencidas" = estimada passou E a final correspondente vazia (`lib/obra-dates.ts`).
- Critério de visita (fila de Obras/Hoje): obra pede visita quando fim da produção ≤10d OU em instalação; cadência de 15 dias; silencia se há visita futura agendada.
- Cobranças (`/chase-items` + `fetchOpenChaseItems`): SÓ itens de plano de ação (decisão 2026-08-05: visita não gera pendência item a item — a pendência da visita é o RDO não anexado; follow-ups de visita continuam existindo dentro do diálogo da visita, mas fora das cobranças/e-mail/alertas). Entram no e-mail diário e no `useAlerts`. `VisitRdoActions` compartilhado em components/.
- Planos por projeto: `/action-plans/by-project`; selo `ActionPlanBadge` + criar via `NewActionPlanDialog`.
- Snapshots de métricas: `metrics_snapshots` gravada pelo cron; `/dashboard/trends` existe (TrendsStrip fora do Dashboard por decisão).
- Auditoria: PATCH de projeto grava diff de status/prioridade/nome + 8 datas; `/audit-logs` escopado por entidade liberado a autenticados.
- `tasks.started_at` = tempo de ciclo real (marcado na 1ª saída de "todo").
- Atribuição de tarefa notifica o responsável: notificação in-app (sino, p/ quem tem conta) + e-mail via Resend (aguardado — serverless congela após a resposta; sai mesmo sem conta no app). Vale p/ criar, editar e bulk-update; auto-atribuição não notifica. `assignedTo` aceita `null` no contrato (limpar responsável). Depende de `RESEND_API_KEY`/`EMAIL_FROM`/`APP_URL` na Vercel.
- Anexos: `attachments.category` (planta/aprovacao/rdo/diario/visita/outro).
- UpdateNotifier: aba avisa "Nova versão disponível" (5min/focus).

## Migrações já aplicadas no Supabase
`metrics_snapshots` (tabela) · `tasks.started_at` · `attachments.category` · `user_role` + valor `projetista_gestor` (ALTER TYPE). Seed de demo: `scripts/seed-demo.sql` (dados [DEMO], datas relativas, bloco de limpeza no fim).

## Convenções de desenvolvimento
- Contrato-first: `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen`; nunca editar `generated/`.
- pnpm **10** (packageManager fixado). Deploy: Vercel na `main` (todo push na main = produção).
- iCloud no Desktop gera duplicatas `" 2.ts"`: nunca `git add -A`; limpar com `find -E lib artifacts -type f -regex '.* [0-9]+\.(ts|tsx)' -delete` e conferir `git status` antes do push.
- Componente novo: verificar que está MONTADO (grep da string no chunk do build).
- Erros de tipo em cascata: limpar `lib/**/dist` + `*.tsbuildinfo` e rebuildar.

## Pendências conhecidas (backlog)
- Campo item 2: fluxo câmera-first (foto na pendência) + áudio no relato.
- Campo item 5: offline/PWA (maior gap vs Fieldwire). QR code na peça (fase 2 do wizard).
- Wizard "modo campo" T0→T5 do instalador (desenhado, não implementado).
- Ver como com somente-leitura real; frequência de visita configurável por fase.
- Ajuda: seções antigas podem divergir após os últimos refinos (revisar).
