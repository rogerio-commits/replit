# Ulimax Projetos — Estado do Produto

> Documento de continuidade: o que o app é hoje, decisões tomadas e pendências.
> Atualizar junto com entregas grandes. Última atualização: 2026-08-04.

## Visão por papel

| Papel | Home | Menu | Ferramentas-chave |
|---|---|---|---|
| **gestor** | Meu Dia | Meu Dia, Dashboard, Projetos, Trabalho · Obra: Obras, Instalações, Calendário · Análises: Assistente, Desempenho · Configurações | Dashboard enxuto (7 cartões + FarolLegend), Desempenho (ciclo real + por unidade + Modo reunião), Ver como |
| **gestor_obras** | Obras (aba Hoje) | Obras, Projetos, Calendário, Ajuda | Hub Obras: **Hoje** (ação: precisam de visita, checar in loco, planos, datas vencidas, Fechar o dia/RDO automático) · **Agenda** (visitas + datas-chave) · **Pendências** (lista completa, WhatsApp p/ externos) · **Operação** (instalações/AT/amostras) |
| **executor (projetista)** | Minha Prancheta | Prancheta, Meu Dia, Trabalho, Projetos, Instalações, Calendário | Prancheta (reprovado/vencendo/aguardando aprovação), Trilho de Fases com edição inline |
| **observador** | Dashboard | Dashboard, Projetos, Calendário | leitura |

## Telas principais
- **Projetos** (`/projects`): tabela enxuta (Farol, Projeto+selo de plano, Tarefas, Fase, Prior., Material, Entrega, Instalação) | visão **Kanban** (fases, drag). Filtros: busca, fase, prioridade, **material**, farol (+legenda "?"). Exporta **CSV** (todas as datas) e **PDF** (lista filtrada p/ impressão). Datas detalhadas vivem no Trilho/Agenda/CSV/PDF.
- **Projeto** (`/projects/:id`): **Trilho de Fases** (progressive disclosure; fase ativa expandida; datas com edição inline + autosave; mini-timeline arrastável; botão **Histórico** = auditoria quem/quando/de→para das 8 datas; "Concluir fase→" avança status — SEM gate de anexo, desenho vai por e-mail) → tarefas → participantes → visitas → **checklist por ambiente com status em 1 toque** → RDO e Documentos (upload categorizado + drop-zone global "o que é isto?") → plano de ação → diário. Marcos/Burndown e Fotos/Arquivos foram removidos da tela.
- **Trabalho** (`/tasks`): abas Lista | Tarefas (colunas drag, cartão clicável abre detalhe) | Fases dos Projetos | Linha do Tempo. Filtro Madeira/Alumínio. Deep-links `?vencidas=1&responsavel=` caem na Lista.
- **Obras** (`/obra?tab=`): ver tabela acima. `/cobrancas`, `/agenda`, `/painel-obra`, `/portfolio`, `/kanban`, `/gantt` redirecionam.

## Backend/domínio
- Fases do projeto: a_iniciar → em_projeto → em_aprovacao → em_producao → aguardando_instalacao → em_instalacao.
- Farol (`lib/project-health.ts`): 🔴 tarefa vencida OU endDate passado · 🟡 vence ≤3d / parada 7d+ / entrega ≤7d com <70% · 🟢 resto. FarolLegend espelha esses números.
- Datas de obra "vencidas" = estimada passou E a final correspondente vazia (`lib/obra-dates.ts`).
- Cobranças (`/chase-items` + `fetchOpenChaseItems`): itens de plano de ação + follow-ups de visita; entram no e-mail diário e no `useAlerts`.
- Planos por projeto: `/action-plans/by-project`; selo `ActionPlanBadge` + criar via `NewActionPlanDialog`.
- Snapshots de métricas: `metrics_snapshots` gravada pelo cron; `/dashboard/trends` existe (TrendsStrip fora do Dashboard por decisão).
- Auditoria: PATCH de projeto grava diff de status/prioridade/nome + 8 datas; `/audit-logs` escopado por entidade liberado a autenticados.
- `tasks.started_at` = tempo de ciclo real (marcado na 1ª saída de "todo").
- Anexos: `attachments.category` (planta/aprovacao/rdo/diario/visita/outro).
- UpdateNotifier: aba avisa "Nova versão disponível" (5min/focus).

## Migrações já aplicadas no Supabase
`metrics_snapshots` (tabela) · `tasks.started_at` · `attachments.category`. Seed de demo: `scripts/seed-demo.sql` (dados [DEMO], datas relativas, bloco de limpeza no fim).

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
