# Otimização da dinâmica de uso — 25/07/2026

**Contexto:** o sistema está completo em funções, mas a adoção ainda não começou (bancos dev e produção quase vazios). Objetivo: reduzir o atrito do uso diário para o sistema virar hábito. Aprovado pela gestora em 25/07/2026 (as 4 frentes, nesta ordem).

## 1. Cadastro rápido
- `projects.tsx`: o diálogo "Novo Projeto" abre em **modo rápido** — só Nome, Prazo de entrega (finalDate) e Participantes; botão "Mostrar todos os campos" expande para o formulário completo (mesmo form/schema; só visibilidade). Edição continua abrindo o formulário completo.
- Tarefas em lote: nos diálogos de criação de tarefa (`tasks.tsx` e `project-detail.tsx`), um switch "Criar várias de uma vez" troca o campo Título por um textarea (uma tarefa por linha). Criação sequencial via `useCreateTask`; toast final "N tarefas criadas" + aviso das linhas que falharem.
- API: nenhuma mudança (POST /projects já aceita só name/status/priority; participantes já são adicionados via POST /projects/:id/members).

## 2. Rotina de 1 toque
- `meu-dia.tsx`: além do círculo de concluir (já existe), botão **Iniciar** (todo → in_progress) direto na linha, sem abrir janela.
- **Resumo de ontem** (gestor): novo `GET /dashboard/yesterday` lendo `audit_logs` no fuso America/Sao_Paulo — tarefas concluídas ontem (status_changed → done), tarefas criadas, projetos alterados, concluídas por pessoa. Card gestor-only no topo do dashboard. Estado vazio: "Sem movimento ontem".

## 3. Modelo padrão Ulimax
- Novo `POST /templates/install-default` (gestor, **idempotente** — verifica pelo nome): cria template "Modelo padrão Ulimax" com ~10 tarefas típicas (medição → projeto → aprovação → materiais → produção → qualidade → instalação → entrega) com `offsetDays`.
- `templates.tsx`: botão "Instalar modelo padrão Ulimax" (no vazio e no cabeçalho, gestor). O fluxo "Usar Template" existente já cria projeto + tarefas.
- Dica no diálogo rápido de projeto apontando para Modelos.

## 4. Colocar no ar
- Sem mudança de schema de banco (tabelas de templates já existem).
- Ao final: gestora republica uma vez; dados reais passam a ser cadastrados no site publicado. Import de planilha: só se ela tiver uma (fase futura).

## Técnica
- Spec OpenAPI: +2 endpoints (`/dashboard/yesterday`, `/templates/install-default`) + schemas; `pnpm run codegen` (orval) após editar.
- Ajuda (`ajuda.tsx`): 1 seção nova "isNew" resumindo os atalhos.
- Verificação: typecheck dos dois artifacts, restart do API server, revisão de arquiteto ao final.
