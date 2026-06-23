# Ulimax & Co. — Manual de Uso do Sistema

**Sistema de Controle de Projetos para Engenharia**  
Versão atual · Junho 2026

---

## Sumário

1. [Acesso ao Sistema](#1-acesso-ao-sistema)
2. [Dashboard](#2-dashboard)
3. [Projetos](#3-projetos)
4. [Tarefas](#4-tarefas)
5. [Kanban](#5-kanban)
6. [Calendário de Instalações](#6-calendário-de-instalações)
7. [Alertas](#7-alertas)
8. [Assistência Técnica](#8-assistência-técnica)
9. [Checklist de Obra](#9-checklist-de-obra)
10. [Equipe](#10-equipe)
11. [Funções e Permissões](#11-funções-e-permissões)

---

## 1. Acesso ao Sistema

### Criar conta
1. Acesse a página inicial do sistema.
2. Clique em **Criar Conta**.
3. Preencha nome, e-mail e senha.
4. Confirme o e-mail pelo link enviado na sua caixa de entrada.

### Entrar
1. Clique em **Entrar**.
2. Use o e-mail e senha cadastrados ou entre com Google.

### Recuperar senha
Na tela de login, clique em **Esqueci minha senha** e siga as instruções enviadas por e-mail.

---

## 2. Dashboard

O Dashboard é a tela inicial após o login. Ele apresenta um resumo executivo do estado atual de todos os projetos e equipes.

### O que você vê

| Componente | Descrição |
|---|---|
| **KPIs** | Total de projetos, projetos ativos, alertas de prazo e percentual de tarefas concluídas |
| **Fases dos Projetos** | Quantidade de projetos em cada etapa (A Iniciar → Em Instalação) |
| **Visitas em Obras** | Agenda recente e próxima de visitas: data, responsável e objetivo |
| **Alertas de Prazo** | Projetos com datas vencidas ou próximas do vencimento |
| **Material** | Proporção entre projetos em madeira e alumínio |

### Dicas
- Clique em qualquer fase (ex: *Em Produção*) para acessar a lista de projetos filtrada por aquela fase.
- Os alertas de prazo são clicáveis e abrem diretamente o projeto correspondente.

---

## 3. Projetos

Gerenciamento completo do ciclo de vida dos projetos, da abertura à instalação.

### Criar um projeto
1. Acesse **Projetos** no menu lateral.
2. Clique no botão **+ Novo Projeto**.
3. Preencha os campos:
   - **Nome do projeto** *(obrigatório)*
   - **Descrição**
   - **Material**: Madeira ou Alumínio
   - **Prioridade**: Normal ou Alta
   - **Status / Fase atual**
   - **Datas**: Início, Previsão de Fim, Fim de Projeto, Medição, Fim de Produção, Instalação
   - **Membros participantes**: selecione os integrantes da equipe
4. Clique em **Salvar**.

### Editar ou excluir um projeto
- Na lista de projetos, clique nos três pontos **⋮** ao lado do projeto para editar ou excluir.
- Também é possível abrir o projeto e editar pelo botão de lápis.

### Filtros disponíveis
- **Busca por texto**: filtra por nome ou descrição
- **Status**: filtra por fase (A Iniciar, Em Projeto, Em Aprovação, Em Produção, Ag. Instalação, Em Instalação)
- **Prioridade**: Normal ou Alta

### Detalhe do projeto
Clique no nome de um projeto para abrir sua página de detalhes, que exibe:
- Todas as informações e datas cadastradas
- Estatísticas de tarefas vinculadas
- Lista de tarefas do projeto com status individual

---

## 4. Tarefas

Lista global de todas as tarefas de todos os projetos, com visão consolidada.

### Criar uma tarefa
1. Acesse **Tarefas** no menu lateral.
2. Clique em **+ Nova Tarefa**.
3. Preencha:
   - **Título** *(obrigatório)*
   - **Descrição**
   - **Projeto vinculado**
   - **Status**: A Fazer, Em Andamento, Revisão ou Concluída
   - **Prioridade**: Baixa, Média ou Alta
   - **Responsável**
   - **Data de entrega**
4. Clique em **Salvar**.

### Editar ou excluir uma tarefa
- Clique nos três pontos **⋮** ao lado da tarefa para editar ou excluir.

### Filtros disponíveis
- **Busca por texto**: filtra por título ou descrição
- **Status**: A Fazer / Em Andamento / Revisão / Concluída
- **Projeto**: exibe somente tarefas de um projeto específico
- **Responsável**: filtra pelo membro atribuído

---

## 5. Kanban

Visão de quadro para acompanhar projetos ou tarefas por fase de forma visual.

### Alternar entre modos
No topo da tela, use o seletor para alternar entre:
- **Tarefas** — colunas: A Fazer · Em Andamento · Revisão · Concluída
- **Projetos** — colunas: A Iniciar · Em Projeto · Em Aprovação · Em Produção · Ag. Instalação · Em Instalação

### Mover um card
- Arraste e solte o card de uma coluna para outra para atualizar o status automaticamente.

### Adicionar item pela coluna
- Clique no botão **+** no cabeçalho de qualquer coluna para criar um novo item já naquela fase.

### Indicadores visuais
- Cards com data de instalação ou entrega vencida exibem destaque em vermelho.

---

## 6. Calendário de Instalações

Cronograma visual no estilo Gantt para controlar datas de instalação e assistência técnica por equipe.

### Navegação
- Use as setas **‹** e **›** para navegar entre os meses.
- O botão **Hoje** centraliza a visualização na data atual.
- Scroll horizontal percorre os dias do mês; ao chegar na borda, o mês muda automaticamente.

### Entender as barras
- Cada linha representa uma **equipe de instalação**.
- As barras coloridas indicam **períodos de obra** de cada projeto.
- Barras com **listras diagonais** indicam **Assistência Técnica** (em vez de instalação).
- Barras em **cinza desbotado** representam eventos passados (já encerrados).
- A **linha vertical laranja** marca o dia de hoje.
- Dias marcados em **fundo colorido** são feriados nacionais brasileiros.

### Criar um evento de instalação
1. Clique em qualquer célula vazia na linha da equipe desejada, no dia de início.
2. Preencha o formulário: nome da obra, data de início, data de fim, tipo (Instalação ou Assistência Técnica) e cor.
3. Clique em **Salvar**.

### Editar ou excluir um evento
- Clique sobre a barra do evento para abrir o formulário de edição.
- Clique no ícone de lápis ✏️ ou lixeira 🗑️ que aparece ao passar o mouse sobre a barra.

### Renomear uma equipe
- Clique diretamente sobre o nome da equipe na coluna esquerda para editá-lo in place.
- Pressione **Enter** para confirmar ou **Esc** para cancelar.

### Legenda
No rodapé do calendário há uma legenda com todos os tipos de evento e indicadores de carga de trabalho por dia.

---

## 7. Alertas

Central de notificações automáticas do sistema sobre situações críticas.

### Tipos de alerta

| Ícone | Nível | Quando aparece |
|---|---|---|
| 🔴 Perigo | Crítico | Instalação atrasada, tarefa vencida |
| 🟡 Atenção | Aviso | Prazo próximo, projeto sem data de instalação |
| 🔵 Informação | Informativo | Projetos parados, tarefas sem responsável |

### Categorias
Use as abas no topo para filtrar por:
- **Minhas Tarefas** — alertas relacionados ao seu usuário
- **Críticos** — nível Perigo
- **Atenção** — nível Aviso
- **Informativos** — nível Informação

### Ação a partir do alerta
Clique em qualquer card de alerta para ser direcionado diretamente ao projeto ou tarefa relacionado.

---

## 8. Assistência Técnica

Módulo de abertura e acompanhamento de chamados de suporte pós-entrega.

### Abrir um chamado
1. Acesse **Assistência Técnica** no menu lateral.
2. Clique em **+ Novo Chamado**.
3. Preencha:
   - **Cliente** *(obrigatório)*
   - **Contato** (telefone / e-mail)
   - **Descrição do problema**
   - **Data agendada**
   - **Responsável técnico**
4. Clique em **Salvar**.

### Ciclo de vida do chamado

```
Aberto → Em Andamento → Concluído
                      ↘ Cancelado
```

- Marque o checkbox **Realizado** para concluir rapidamente um chamado.
- Para editar ou excluir, clique nos ícones ao lado do chamado.

### Filtros disponíveis
- **Busca por texto**: filtra por cliente ou descrição
- **Cards de status**: Aberto · Em Andamento · Concluído · Cancelado

---

## 9. Checklist de Obra

Controle item a item das peças (esquadrias) instaladas em cada projeto.

### Adicionar um item ao checklist
1. Acesse **Checklist** no menu lateral.
2. Selecione o projeto desejado.
3. Clique em **+ Adicionar Item**.
4. Informe a peça (ex: *Porta Principal*) e o local (ex: *Hall de Entrada*).
5. Clique em **Salvar**.

### Atualizar o status de um item

| Status | Significado |
|---|---|
| Não Instalado | Aguardando instalação |
| Instalado | Peça instalada, aguardando vistoria final |
| Finalizado | Peça aprovada e encerrada |

Clique no status atual do item para alterá-lo.

### Plano de ação
Quando uma peça apresenta problema, crie um plano de ação:
1. Clique em **Plano de Ação** ao lado do item.
2. Descreva o problema, defina o responsável e a data limite.
3. Salve. O plano ficará vinculado ao item e visível para a equipe.

### Filtros disponíveis
- **Projeto**: exibe o checklist do projeto selecionado
- **Status**: filtra por Não Instalado / Instalado / Finalizado

---

## 10. Equipe

Gestão dos membros que têm acesso ao sistema.

### Adicionar um membro
1. Acesse **Equipe** no menu lateral.
2. Clique em **+ Novo Membro**.
3. Preencha nome, cargo, e-mail e função no sistema.
4. Clique em **Convidar** — o membro recebe um e-mail de convite.

### Editar ou remover um membro
- Clique nos ícones de lápis ou lixeira ao lado do membro.

### Seções da equipe
- **Equipe de Projetos** — responsáveis pela gestão e projetos
- **Equipe Técnica** — executores de instalação e assistência

### Status de acesso
- ✅ **Conta ativa** — membro já aceitou o convite e tem acesso
- 📧 **Convite pendente** — convite enviado, aguardando aceite

### Filtros disponíveis
- Busca por nome, cargo ou e-mail

---

## 11. Funções e Permissões

| Função | O que pode fazer |
|---|---|
| **Gestor** | Acesso total: criar, editar e excluir qualquer projeto, tarefa ou membro |
| **Executor** | Editar apenas projetos e tarefas em que é participante; visualizar os demais |
| **Observador** | Somente visualização — não pode criar ou editar nenhum item |

> **Atenção:** A função é definida no momento do cadastro do membro e pode ser alterada posteriormente por um Gestor.

---

## Dúvidas frequentes

**Não estou vendo todos os projetos. O que acontece?**  
Verifique se há filtros ativos (status, prioridade ou busca). Usuários com função *Executor* veem apenas os projetos em que são participantes.

**Como faço para mover um projeto de fase?**  
Edite o projeto e altere o campo **Status**, ou use o Kanban de Projetos e arraste o card para a coluna desejada.

**O calendário não exibe a minha equipe. O que fazer?**  
As equipes são criadas automaticamente ao adicionar o primeiro evento de instalação. Se a equipe não aparece, crie um evento e defina o nome da equipe nele.

**Como exportar dados?**  
No momento, o sistema não possui exportação nativa. Para relatórios, entre em contato com o administrador do sistema.

---

*Ulimax & Co. · Sistema de Controle de Projetos · Uso interno*
