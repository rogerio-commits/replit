import { useState } from "react";
import { openTour } from "@/components/tour-guide";
import {
  BookOpen,
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Columns3,
  CalendarDays,
  Bell,
  Wrench,
  ClipboardList,
  Users,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Paperclip,
  FileDown,
  BarChart2,
  ListTree,
  Search,
  Tag,
  Link2,
  CheckCheck,
  FileText,
  GanttChart,
  Camera,
  FolderOpen,
  BadgeCheck,
  Sun,
  Bookmark,
  Download,
  Layers,
  Repeat2,
  Copy,
  PencilLine,
  Clock,
  Zap,
  BarChart3,
  Settings2,
  Package,
  Type,
  Hash,
  Calendar,
  Flag,
  TrendingUp,
  Scale,
  SlidersHorizontal,
  AlertCircle,
  CircleDot,
  Presentation,
  Activity,
  ClipboardPaste,
  Sparkles,
  BellRing,
  Smartphone,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
  isNew?: boolean;
}

const sections: Section[] = [
  {
    id: "acesso",
    title: "Acesso ao Sistema",
    icon: ShieldCheck,
    content: (
      <div className="space-y-4">
        <Subsection title="Criar conta">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse a página inicial do sistema.</li>
            <li>Clique em <Strong>Criar Conta</Strong>.</li>
            <li>Preencha nome, e-mail e senha.</li>
            <li>Confirme o e-mail pelo link enviado na sua caixa de entrada.</li>
          </ol>
        </Subsection>
        <Subsection title="Entrar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>Entrar</Strong>.</li>
            <li>Use o e-mail e senha cadastrados ou entre com Google.</li>
          </ol>
        </Subsection>
        <Subsection title="Recuperar senha">
          <p className="text-sm text-muted-foreground">Na tela de login, clique em <Strong>Esqueci minha senha</Strong> e siga as instruções enviadas por e-mail.</p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">O Dashboard é a tela inicial após o login. Ele apresenta um resumo executivo do estado atual de todos os projetos e equipes.</p>
        <Table
          headers={["Componente", "Descrição"]}
          rows={[
            ["Números do dia", "Quatro cartões clicáveis: Projetos ativos · Precisam de atenção (🔴🟡) · Tarefas atrasadas · Entregas em 30 dias"],
            ["🚦 Onde focar agora", "O radar, em duas lentes lado a lado: Por obra (farol 🟢🟡🔴 com o motivo, abre o projeto) e Por assunto (contagens do tipo 'Tarefas atrasadas 12', que abrem a tela onde se resolve)"],
            ["Por unidade", "Comparativo Madeira × Alumínio: ativos, em aberto, vencidas, concluídas"],
            ["O que andou", "Os últimos acontecimentos, cada um com a data em que de fato ocorreu: tarefa concluída/iniciada/criada, projeto criado, arquitetura aprovou ou reprovou e visita registrada"],
          ]}
        />
        <Tip>Quase tudo é clicável: os números levam às listas já filtradas e o radar abre o projeto ou a tela onde o assunto se resolve. Quem está devendo tarefa aparece em <Strong>Obras → Pendências</Strong>, agrupado por responsável; as visitas ficam em <Strong>Obras → Visitas</Strong>.</Tip>
      </div>
    ),
  },
  {
    id: "farol",
    title: "Farol de Projetos",
    icon: CircleDot,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cada projeto recebe automaticamente uma cor de farol — 🟢, 🟡 ou 🔴 — sempre acompanhada do motivo em linguagem simples (ex: <em>"3 tarefas atrasadas"</em>). Dá para ver em segundos o que precisa de atenção, sem abrir projeto por projeto.</p>
        <Subsection title="O que cada cor significa">
          <Table
            headers={["Cor", "Significado"]}
            rows={[
              ["🟢 Em dia", "Nenhuma das situações de atenção ou crítico"],
              ["🟡 Atenção", "Tarefa vencendo em até 3 dias · tarefa parada em A Fazer há 7+ dias · entrega em até 7 dias com menos de 70% concluído"],
              ["🔴 Crítico", "Ao menos 1 tarefa com prazo vencido, ou o prazo de entrega do projeto já passou (o vermelho sempre vence o amarelo)"],
            ]}
          />
        </Subsection>
        <Subsection title="Onde aparece">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Dashboard</Strong>: seção <em>🚦 Farol de Projetos</em> com contadores e os projetos que precisam de atenção — clique em um deles para abri-lo.</li>
            <li><Strong>Projetos</Strong>: coluna <em>Farol</em> na tabela — passe o mouse na bolinha para ver o motivo.</li>
            <li><Strong>Relatório do projeto e Reunião Semanal</Strong>: o farol também abre essas páginas.</li>
          </ul>
        </Subsection>
        <Subsection title="Filtrar pela cor">
          <p className="text-sm text-muted-foreground">Na página <Strong>Projetos</Strong>, os contadores 🔴 🟡 🟢 na barra de filtros são clicáveis — clique para ver somente os projetos daquela cor e clique de novo para desfazer.</p>
        </Subsection>
        <Tip>Projetos concluídos aparecem sempre 🟢. O farol é calculado na hora com base nas tarefas e datas — mantenha os prazos preenchidos para ele refletir a realidade.</Tip>
      </div>
    ),
  },
  {
    id: "meu-dia",
    title: "Meu Dia",
    icon: Sun,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Página pessoal que exibe somente as tarefas e projetos relacionados ao usuário logado — o ponto de partida ideal para começar o dia de trabalho.</p>
        <Subsection title="O que aparece">
          <Table
            headers={["Seção", "Conteúdo"]}
            rows={[
              ["KPIs pessoais", "Total de tarefas atribuídas a você, concluídas, em andamento e atrasadas"],
              ["Minhas Tarefas", "Lista das tarefas onde você é o responsável, com conclusão inline e painel de detalhes"],
              ["Meus Projetos", "Projetos em que você é participante, com progresso de tarefas"],
              ["Prazos próximos", "Tarefas vencendo hoje ou nos próximos 7 dias"],
              ["Marcos", "Marcos dos seus projetos com vencimento nos próximos 14 dias, no painel lateral"],
            ]}
          />
        </Subsection>
        <Subsection title="Quem usa o Meu Dia">
          <p className="text-sm text-muted-foreground">É a tela inicial do <Strong>Gestor</Strong>. Projetistas têm o mesmo conteúdo pessoal dentro da <Strong>Minha Prancheta</Strong> (bloco <em>Minhas Atividades</em>), que é a home deles.</p>
        </Subsection>
        <Subsection title="Concluir uma tarefa sem sair da página">
          <p className="text-sm text-muted-foreground">Passe o mouse sobre o <Strong>círculo</Strong> à esquerda de qualquer tarefa em <em>Minhas Tarefas</em> — ele exibe um ícone de ✓ verde. Clique para marcar a tarefa como concluída instantaneamente, sem abrir nenhum modal. Também é possível <Strong>adiar o prazo</Strong> (amanhã, em 3 dias ou próxima semana) pelo botão de adiar na própria linha da tarefa.</p>
        </Subsection>
        <Subsection title="Abrir detalhes de uma tarefa">
          <p className="text-sm text-muted-foreground">Clique em qualquer lugar no <Strong>card da tarefa</Strong> para abrir o painel lateral completo com descrição, subtarefas, comentários, anexos e registro de horas — o mesmo painel disponível na página Tarefas.</p>
        </Subsection>
        <Subsection title="Seção Marcos (sidebar)">
          <p className="text-sm text-muted-foreground mb-2">O painel lateral direito exibe a seção <Strong>Marcos</Strong> com os marcos dos seus projetos que vencem nos próximos 14 dias. Cada item mostra o nome do marco, o projeto de origem e um badge de urgência:</p>
          <Table
            headers={["Cor do badge", "Significado"]}
            rows={[
              ["Vermelho", "Marco vencido ou vence hoje"],
              ["Laranja", "Vence em até 3 dias"],
              ["Âmbar", "Vence entre 4 e 14 dias"],
            ]}
          />
        </Subsection>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">Para o Gestor, o <Strong>Meu Dia</Strong> é a tela inicial após o login, no topo do menu lateral.</p>
        </Subsection>
        <Tip>Use o Meu Dia como ponto de partida diário: conclua tarefas com um clique, abra detalhes sem navegar para outra página, e acompanhe seus marcos no painel lateral.</Tip>
      </div>
    ),
  },
  {
    id: "prancheta",
    title: "Minha Prancheta (projetista)",
    icon: Sun,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          É a tela inicial do <Strong>Projetista</Strong> e do <Strong>Projetista Gestor</Strong> — o dia
          inteiro dele numa página só.
        </p>
        <Table
          headers={["Bloco", "O que mostra"]}
          rows={[
            ["Precisa de você", "Cliente reprovou o desenho, fim do projeto vencendo, aguardando aprovação da arquitetura e medição já feita esperando avanço de fase"],
            ["Minhas Atividades", "Suas tarefas abertas, com concluir, iniciar e adiar prazo na própria linha (o mesmo bloco que o Gestor vê no Meu Dia)"],
            ["Meus projetos", "Os projetos em que você é participante, do prazo mais próximo ao mais distante: fase, data de entrega, progresso das tarefas e selo vermelho/âmbar quando a entrega está a 7 dias ou já venceu"],
            ["Todos os projetos por fase", "Quantos projetos há em cada fase na empresa — clique para abrir a lista filtrada"],
          ]}
        />
        <Tip>Cada linha de "Precisa de você" abre o projeto direto no Trilho de Fases, onde a data se edita no lugar.</Tip>
      </div>
    ),
  },
  {
    id: "projetos",
    title: "Projetos",
    icon: Briefcase,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Gerenciamento completo do ciclo de vida dos projetos, da abertura à instalação.</p>
        <Subsection title="Criar um projeto">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse <Strong>Projetos</Strong> no menu lateral.</li>
            <li>Clique em <Strong>+ Novo Projeto</Strong>.</li>
            <li>Preencha: nome, descrição, material (Madeira/Alumínio), prioridade, status, datas e membros participantes.</li>
            <li>Clique em <Strong>Salvar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="A tabela mostra todas as datas">
          <p className="text-sm text-muted-foreground">Na visão <Strong>Tabela</Strong>, além de Farol, Projeto, Tarefas, Fase, Prioridade e Material, vêm as 8 datas do fluxo, separadas por etapa: <Strong>Medição</Strong> | Início, Fim e Final do <Strong>Projeto</Strong> | Início, Fim e Final da <Strong>Produção</Strong> | <Strong>Instalação</Strong>. Clique no cabeçalho para ordenar por qualquer uma. Fim Proj. e Fim Prod. ficam vermelhos quando vencem e âmbar a 7 dias ou menos.</p>
        </Subsection>
        <Subsection title="Filtros disponíveis">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Busca por texto</Strong>: filtra por nome ou descrição</li>
            <li><Strong>Status</Strong>: A Iniciar · Em Projeto · <Strong>Na Arquitetura</Strong> · Em Produção · Ag. Instalação · Em Instalação</li>
            <li><Strong>Prioridade</Strong>: Normal ou Alta</li>
            <li><Strong>Farol</Strong>: clique nos contadores 🔴 🟡 🟢 para ver só os projetos daquela cor</li>
          </ul>
        </Subsection>
        <Subsection title="Duplicar um projeto">
          <p className="text-sm text-muted-foreground">Dentro de qualquer projeto, clique no botão <Strong>Duplicar Projeto</Strong> no cabeçalho da página de detalhe. Uma cópia é criada com o mesmo nome (prefixada com "Cópia de"), mesmas configurações e todas as tarefas — o status do novo projeto volta para <em>A Iniciar</em>.</p>
        </Subsection>
        <Subsection title="Arquivar e reativar um projeto">
          <p className="text-sm text-muted-foreground">Projetos concluídos ou pausados podem ser arquivados para não poluir a lista ativa.</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mt-2">
            <li>Abra o projeto e clique em <Strong>Arquivar</Strong> no cabeçalho (disponível para Gestor e Gestor de Obras).</li>
            <li>O projeto desaparece da lista principal e recebe um banner laranja na página de detalhe.</li>
            <li>Para ver projetos arquivados, vá à lista de projetos e clique em <Strong>Ver arquivados</Strong>.</li>
            <li>Para reativar, abra o projeto arquivado e clique em <Strong>Reativar</Strong>.</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-2">Arquivar não exclui nada — tarefas, datas e histórico ficam preservados.</p>
        </Subsection>
        <Subsection title="Excluir um projeto">
          <p className="text-sm text-muted-foreground">A exclusão é permanente e irreversível. Por segurança, o sistema exige que você <Strong>digite o nome exato do projeto</Strong> antes de confirmar. Somente gestores podem excluir projetos.</p>
        </Subsection>
        <Subsection title="Criar projeto a partir de um template">
          <p className="text-sm text-muted-foreground">Acesse <Strong>Templates</Strong> no menu lateral, selecione o template desejado e clique em <Strong>Usar Template</Strong>. Informe o nome do projeto e a data de início — as tarefas do template são criadas automaticamente com os prazos calculados.</p>
        </Subsection>
        <Subsection title="Relatório do projeto">
          <p className="text-sm text-muted-foreground">Dentro de qualquer projeto, clique no botão <Strong>Relatório</Strong> no cabeçalho da página. Abre uma página de status completa — farol, progresso, datas, marcos e tarefas — pronta para <Strong>imprimir ou salvar em PDF</Strong>. Veja a seção <em>Relatório do Projeto</em> desta ajuda.</p>
        </Subsection>
        <Subsection title="Exportar tabela em CSV">
          <p className="text-sm text-muted-foreground">Na página <Strong>Projetos</Strong>, clique em <Strong>Exportar CSV</Strong> ao lado do botão "Novo Projeto". O arquivo exportado inclui todos os projetos visíveis com todas as colunas: status, prioridade, material, contagem de tarefas e todas as datas de fases.</p>
        </Subsection>
        <Subsection title="Importar projetos de uma planilha">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>Importar CSV</Strong> na página Projetos.</li>
            <li>Clique em <Strong>Baixar modelo</Strong> para obter a planilha com as colunas certas.</li>
            <li>Preencha o modelo no Excel: uma linha por projeto. Só o <Strong>nome</Strong> é obrigatório.</li>
            <li>No Excel: <em>Arquivo → Salvar como → CSV UTF-8</em>.</li>
            <li>De volta no sistema, clique em <Strong>Selecionar arquivo CSV</Strong>, confira o preview e clique em <Strong>Importar</Strong>.</li>
          </ol>
          <Table
            headers={["Coluna", "O que preencher"]}
            rows={[
              ["nome", "Nome do projeto (obrigatório)"],
              ["status", "a_iniciar · em_projeto · em_aprovacao · em_producao · aguardando_instalacao · em_instalacao"],
              ["prioridade", "baixa · normal · alta"],
              ["data_inicio / prazo_entrega / data_final", "Formato AAAA-MM-DD ou DD/MM/AAAA"],
              ["material", "madeira · aluminio"],
              ["descricao", "Texto livre"],
            ]}
          />
        </Subsection>
        <Tip>Clique no nome de um projeto para ver seu detalhe completo com estatísticas, tarefas vinculadas e o botão <Strong>Relatório</Strong>.</Tip>
      </div>
    ),
  },
  {
    id: "tarefas",
    title: "Tarefas",
    icon: CheckSquare,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Lista global de todas as tarefas de todos os projetos — é a aba <Strong>Lista</Strong> da tela <Strong>Trabalho</Strong>.</p>
        <Subsection title="Criar uma tarefa">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>+ Nova Tarefa</Strong>.</li>
            <li>Preencha: título, descrição (suporta Markdown), projeto vinculado, status, prioridade, responsável, data de entrega e recorrência (opcional).</li>
            <li>Clique em <Strong>Criar Tarefa</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Responsável e aviso automático">
          <p className="text-sm text-muted-foreground">
            Toda tarefa pode ter um <Strong>responsável interno Ulimax</Strong> — inclusive as criadas na
            seção <Strong>Tarefas da Equipe</Strong> dentro do projeto. Ao atribuir a alguém, essa pessoa
            recebe <Strong>notificação no sino</Strong> (se já tem conta) e um <Strong>e-mail</Strong>
            "Nova tarefa: ...". Vale também para a atribuição em lote. Atribuir a si mesmo não gera aviso.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            A tarefa passa a aparecer em <em>Minhas Atividades</em> da pessoa e, se atrasar, ela entra em
            <Strong> Obras → Pendências</Strong> agrupada por responsável, para o gestor cobrar.
          </p>
        </Subsection>
        <Subsection title="Edição inline do título">
          <p className="text-sm text-muted-foreground">Para renomear uma tarefa rapidamente, sem abrir o modal completo, dê um <Strong>duplo clique</Strong> no título dela na lista. O título vira um campo de texto editável — pressione <Strong>Enter</Strong> para salvar ou <Strong>Esc</Strong> para cancelar. Também é possível clicar no ícone de lápis que aparece ao passar o mouse.</p>
        </Subsection>
        <Subsection title="Duplicar uma tarefa">
          <p className="text-sm text-muted-foreground">Clique no ícone de <Strong>Copiar</Strong> (duas páginas sobrepostas) à direita de qualquer tarefa. Uma cópia idêntica é criada imediatamente com o mesmo título, projeto, prioridade e responsável — o status volta para <em>A Fazer</em>.</p>
        </Subsection>
        <Subsection title="A tabela mostra todas as datas">
          <p className="text-sm text-muted-foreground">Na visão <Strong>Tabela</Strong>, além de Farol, Projeto, Tarefas, Fase, Prioridade e Material, vêm as 8 datas do fluxo, separadas por etapa: <Strong>Medição</Strong> | Início, Fim e Final do <Strong>Projeto</Strong> | Início, Fim e Final da <Strong>Produção</Strong> | <Strong>Instalação</Strong>. Clique no cabeçalho para ordenar por qualquer uma. Fim Proj. e Fim Prod. ficam vermelhos quando vencem e âmbar a 7 dias ou menos.</p>
        </Subsection>
        <Subsection title="Filtros disponíveis">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Status</Strong>: A Fazer · Em Andamento · Revisão · Concluída</li>
            <li><Strong>Prioridade</Strong>: Alta · Normal · Baixa</li>
            <li><Strong>Projeto</Strong>: exibe somente tarefas de um projeto específico</li>
          </ul>
        </Subsection>
        <Subsection title="Toggle rápido de status">
          <p className="text-sm text-muted-foreground">Na lista de tarefas, o <Strong>badge de status</Strong> (ex: <em>A Fazer</em>) é clicável. Cada clique avança o status em sequência: <Strong>A Fazer → Em Andamento → Em Revisão → Concluída → A Fazer</Strong>. Passe o mouse sobre o badge para ver a dica de interação.</p>
        </Subsection>
        <Subsection title="Ações rápidas: Concluir e Adiar">
          <p className="text-sm text-muted-foreground">Em cada tarefa em aberto aparecem os botões <Strong>Concluir</Strong> (marca como concluída na hora) e <Strong>Adiar</Strong> (move o prazo para <em>amanhã</em>, <em>em 3 dias</em> ou <em>próxima semana</em>) — sem abrir nenhuma janela. Tarefas sem andamento há mais de 7 dias exibem o aviso âmbar <Strong>"Parada há X d"</Strong>.</p>
        </Subsection>
        <Subsection title="Filtros salvos">
          <p className="text-sm text-muted-foreground mb-2">Salve combinações de filtros frequentes para acesso rápido:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Aplique os filtros desejados (status, projeto, prioridade).</li>
            <li>Clique em <Strong>Salvar filtro</Strong> que aparece ao lado dos filtros ativos.</li>
            <li>Digite um nome (ex: "Minhas atrasadas") e pressione <Strong>OK</Strong>.</li>
            <li>O filtro salvo aparece como chip acima da lista — clique para aplicar, <Strong>×</Strong> para remover.</li>
          </ol>
        </Subsection>
        <Subsection title="Exportar tarefas em CSV">
          <p className="text-sm text-muted-foreground">Clique em <Strong>Exportar CSV</Strong> no cabeçalho da página para baixar todas as tarefas visíveis (respeitando os filtros ativos). O arquivo inclui título, status, prioridade, projeto, responsável e prazo.</p>
        </Subsection>
        <Subsection title="Painel de detalhes">
          <p className="text-sm text-muted-foreground mb-2">Clique no botão <Strong>Detalhes</Strong> em qualquer tarefa para abrir um painel com:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Etiquetas</Strong>: tags coloridas para categorizar a tarefa</li>
            <li><Strong>Dependências</Strong>: tarefas que precisam ser concluídas antes</li>
            <li><Strong>Descrição</Strong>: renderizada em Markdown formatado</li>
            <li><Strong>Subtarefas</Strong>: etapas menores com barra de progresso</li>
            <li><Strong>Comentários</Strong>: histórico de mensagens contextualizadas</li>
            <li><Strong>Registro de Horas</Strong>: lançamento e histórico de horas trabalhadas</li>
            <li><Strong>Anexos</Strong>: upload de arquivos por arrastar e soltar</li>
          </ul>
        </Subsection>
        <Tip>Marque múltiplas tarefas com os checkboxes e use a barra de ações em massa para atualizar status, prioridade ou responsável de todas de uma vez.</Tip>
      </div>
    ),
  },
  {
    id: "criar-lote",
    title: "Criar Tarefas em Lote",
    icon: ClipboardPaste,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Transforme uma lista anotada (do papel, do WhatsApp, de uma reunião) em tarefas de verdade em segundos — cada linha vira uma tarefa.</p>
        <Subsection title="Como usar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na página <Strong>Tarefas</Strong>, clique em <Strong>Criar em Lote</Strong>.</li>
            <li>Escolha o <Strong>projeto</Strong> que receberá as tarefas.</li>
            <li>Cole ou digite a lista — <Strong>uma tarefa por linha</Strong>.</li>
            <li>Confira a prévia (título, responsável e prazo reconhecidos) e clique em <Strong>Criar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="O sistema reconhece automaticamente">
          <Table
            headers={["Você escreve", "O sistema entende"]}
            rows={[
              ["Medir vão da janela - João - sexta", "Tarefa para João com prazo na próxima sexta-feira"],
              ["Comprar dobradiças ; 28/07", "Tarefa com prazo em 28/07"],
              ["Enviar projeto | Maria | amanhã", "Tarefa para Maria com prazo amanhã"],
              ["Revisar orçamento", "Tarefa simples, sem responsável nem prazo"],
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">Separe as partes com <Strong>-</Strong>, <Strong>;</Strong> ou <Strong>|</Strong>. Prazos aceitos: <em>hoje</em>, <em>amanhã</em>, dias da semana (<em>segunda</em> a <em>sábado</em>) e datas como <em>25/07</em>.</p>
        </Subsection>
        <Tip>Se houver duas pessoas com nomes parecidos, o sistema deixa a tarefa sem responsável em vez de arriscar atribuir errado — o nome fica no título para você definir depois.</Tip>
      </div>
    ),
  },
  {
    id: "subtarefas",
    title: "Subtarefas",
    icon: ListTree,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Divida qualquer tarefa em etapas menores para acompanhar o progresso passo a passo.</p>
        <Subsection title="Criar uma subtarefa">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Abra o painel de detalhes de uma tarefa clicando em <Strong>Detalhes</Strong>.</li>
            <li>Na seção <Strong>Subtarefas</Strong>, clique em <Strong>+ Adicionar</Strong>.</li>
            <li>Digite o título da subtarefa e pressione <Strong>Enter</Strong> ou clique em <Strong>Salvar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Marcar como concluída">
          <p className="text-sm text-muted-foreground">Clique no <Strong>círculo</Strong> à esquerda de qualquer subtarefa para alternar entre pendente e concluída. O texto é riscado e o progresso atualizado automaticamente.</p>
        </Subsection>
        <Subsection title="Progresso">
          <p className="text-sm text-muted-foreground">Uma barra de progresso mostra o percentual de subtarefas concluídas (ex: <em>3/5 · 60%</em>). Na lista de tarefas, as contagens também aparecem visíveis no card.</p>
        </Subsection>
        <Tip>Use subtarefas para detalhar etapas de instalação, checklists de materiais ou sequências de aprovação dentro de uma mesma tarefa principal.</Tip>
      </div>
    ),
  },
  {
    id: "operacoes-massa",
    title: "Operações em Massa",
    icon: CheckCheck,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Atualize o status ou a prioridade de várias tarefas ao mesmo tempo, sem precisar editar uma a uma.</p>
        <Subsection title="Como selecionar tarefas">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na página <Strong>Tarefas</Strong>, marque o <Strong>checkbox</Strong> à esquerda de cada tarefa que deseja incluir.</li>
            <li>Use <Strong>Selecionar todos</Strong> no topo da lista para marcar todas as tarefas visíveis de uma vez.</li>
          </ul>
        </Subsection>
        <Subsection title="Barra de ações em massa">
          <p className="text-sm text-muted-foreground mb-2">Ao selecionar pelo menos uma tarefa, uma barra aparece no topo da página com as ações disponíveis:</p>
          <Table
            headers={["Ação", "Resultado"]}
            rows={[
              ["Alterar Status", "Define o mesmo status para todas as tarefas selecionadas"],
              ["Alterar Prioridade", "Define a mesma prioridade para todas as tarefas selecionadas"],
              ["Alterar Responsável", "Atribui o mesmo responsável a todas as tarefas selecionadas"],
              ["Excluir", "Remove permanentemente todas as tarefas selecionadas"],
              ["Limpar", "Desmarca todas as tarefas sem fazer alterações"],
            ]}
          />
        </Subsection>
        <Tip>Os filtros funcionam em conjunto com a seleção em massa — aplique um filtro de status ou projeto primeiro e use "Selecionar todos" para operar somente sobre o subconjunto filtrado.</Tip>
      </div>
    ),
  },
  {
    id: "etiquetas",
    title: "Etiquetas (Tags)",
    icon: Tag,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Classifique tarefas com etiquetas coloridas para facilitar a identificação visual e a organização por categoria.</p>
        <Subsection title="Criar uma etiqueta nova">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Abra o painel de detalhes de uma tarefa clicando em <Strong>Detalhes</Strong>.</li>
            <li>Na seção <Strong>Etiquetas</Strong>, clique em <Strong>Adicionar</Strong>.</li>
            <li>Clique em <Strong>Criar nova etiqueta</Strong>, digite o nome e escolha uma cor.</li>
            <li>Pressione <Strong>Criar</Strong> — a etiqueta é criada e já vinculada à tarefa.</li>
          </ol>
        </Subsection>
        <Subsection title="Reutilizar etiquetas existentes">
          <p className="text-sm text-muted-foreground">No popover de etiquetas, as já criadas aparecem na lista. Clique em qualquer uma para vinculá-la imediatamente à tarefa atual.</p>
        </Subsection>
        <Subsection title="Remover uma etiqueta de uma tarefa">
          <p className="text-sm text-muted-foreground">No badge da etiqueta, dentro do painel de detalhes, clique no <Strong>×</Strong> para desvinculá-la daquela tarefa. A etiqueta continua existindo para ser usada em outras tarefas.</p>
        </Subsection>
        <Tip>As etiquetas aparecem tanto no painel de detalhes quanto nos cards da lista de tarefas, facilitando a identificação sem precisar abrir cada item.</Tip>
      </div>
    ),
  },
  {
    id: "dependencias",
    title: "Dependências entre Tarefas",
    icon: Link2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Indique quais tarefas precisam ser concluídas antes que outra possa ser iniciada, tornando as sequências de trabalho explícitas e visíveis.</p>
        <Subsection title="Adicionar uma dependência">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Abra o painel de detalhes da tarefa que será <Strong>bloqueada</Strong>.</li>
            <li>Na seção <Strong>Bloqueada por</Strong>, clique em <Strong>Adicionar</Strong>.</li>
            <li>Busque pelo nome da tarefa que precisa ser concluída primeiro.</li>
            <li>Clique nela para confirmar a dependência.</li>
          </ol>
        </Subsection>
        <Subsection title="Leitura visual">
          <Table
            headers={["Indicador", "Significado"]}
            rows={[
              ["Fundo âmbar", "Dependência ainda pendente (bloqueio ativo)"],
              ["Texto riscado", "Tarefa dependente já concluída (bloqueio liberado)"],
              ["Contador 'N pendentes'", "Quantas dependências ainda estão em aberto"],
            ]}
          />
        </Subsection>
        <Subsection title="Remover uma dependência">
          <p className="text-sm text-muted-foreground">Passe o mouse sobre a dependência na lista e clique no <Strong>×</Strong> que aparece à direita.</p>
        </Subsection>
        <Tip>Uma tarefa não pode depender de si mesma, e o sistema impede dependências duplicadas automaticamente.</Tip>
      </div>
    ),
  },
  {
    id: "markdown",
    title: "Descrições em Markdown",
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">A descrição das tarefas suporta formatação Markdown — escreva com marcações simples e o sistema renderiza o resultado com visual limpo e legível.</p>
        <Subsection title="Editor com pré-visualização">
          <p className="text-sm text-muted-foreground mb-2">Ao criar ou editar uma tarefa, o campo de descrição tem duas abas:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Editar</Strong>: campo de texto puro onde você digita com marcações Markdown.</li>
            <li><Strong>Pré-visualizar</Strong>: mostra o resultado renderizado antes de salvar.</li>
          </ul>
        </Subsection>
        <Subsection title="Formatações suportadas">
          <Table
            headers={["Você digita", "Resultado"]}
            rows={[
              ["**texto**", "negrito"],
              ["*texto*", "itálico"],
              ["`código`", "trecho de código inline"],
              ["- item", "lista com marcadores"],
              ["1. item", "lista numerada"],
              ["[link](url)", "link clicável"],
              ["> texto", "citação (blockquote)"],
              ["## Título", "cabeçalho"],
            ]}
          />
        </Subsection>
        <Subsection title="Como a descrição aparece">
          <p className="text-sm text-muted-foreground">No painel de detalhes da tarefa, a descrição é sempre exibida já renderizada — negrito, listas e links funcionam sem precisar de nenhuma ação extra.</p>
        </Subsection>
        <Tip>Use listas para detalhar etapas de execução, negrito para destacar pontos críticos e links para referenciar documentos externos ou projetos relacionados.</Tip>
      </div>
    ),
  },
  {
    id: "busca",
    title: "Busca Global",
    icon: Search,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Encontre qualquer projeto, tarefa ou membro instantaneamente sem precisar navegar pelos menus.</p>
        <Subsection title="Como abrir">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Pressione <Strong>Ctrl + K</Strong> (Windows / Linux) ou <Strong>⌘ K</Strong> (Mac) em qualquer tela.</li>
            <li>Ou clique no ícone de busca na barra superior.</li>
          </ul>
        </Subsection>
        <Subsection title="Como usar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Digite qualquer parte do nome, descrição ou e-mail que deseja encontrar.</li>
            <li>Os resultados aparecem em tempo real, agrupados por <Strong>Projetos</Strong>, <Strong>Tarefas</Strong> e <Strong>Membros</Strong>.</li>
            <li>Use <Strong>↑ ↓</Strong> para navegar entre os resultados e <Strong>Enter</Strong> para abrir.</li>
          </ol>
        </Subsection>
        <Table
          headers={["Busca em", "Campos considerados"]}
          rows={[
            ["Projetos", "Nome e descrição"],
            ["Tarefas", "Título e descrição"],
            ["Membros", "Nome, e-mail e cargo"],
          ]}
        />
        <Tip>Sem texto digitado, o painel exibe o menu de navegação rápida entre as páginas principais do sistema.</Tip>
      </div>
    ),
  },
  {
    id: "comentarios",
    title: "Comentários em Tarefas",
    icon: MessageSquare,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cada tarefa possui um histórico de comentários para comunicação contextualizada diretamente no item de trabalho.</p>
        <Subsection title="Como comentar em uma tarefa">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na página <Strong>Tarefas</Strong>, localize a tarefa desejada.</li>
            <li>Clique no botão <Strong>Detalhes</Strong> à direita da tarefa.</li>
            <li>No painel lateral que se abre, role até a seção <Strong>Comentários</Strong>.</li>
            <li>Digite sua mensagem no campo de texto e pressione <Strong>Comentar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Histórico">
          <p className="text-sm text-muted-foreground">Os comentários são exibidos em ordem cronológica, com o nome do autor e o horário de cada mensagem. O histórico completo é visível para todos os membros com acesso ao projeto.</p>
        </Subsection>
        <Tip>Use comentários para registrar decisões, solicitar aprovações ou comunicar bloqueios — tudo vinculado diretamente à tarefa, sem precisar de e-mails externos.</Tip>
      </div>
    ),
  },
  {
    id: "anexos",
    title: "Anexos em Tarefas",
    icon: Paperclip,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Arquivos (imagens, PDFs, planilhas, etc.) podem ser anexados diretamente a qualquer tarefa para centralizar as evidências e documentos do trabalho.</p>
        <Subsection title="Enviar um arquivo">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Abra o painel de detalhes de uma tarefa clicando em <Strong>Detalhes</Strong>.</li>
            <li>Na seção <Strong>Anexos</Strong>, arraste e solte o arquivo ou clique na área de upload.</li>
            <li>Aguarde o envio — o arquivo aparece na lista assim que concluído.</li>
          </ol>
        </Subsection>
        <Subsection title="Baixar ou excluir">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique no nome do arquivo para fazer o <Strong>download</Strong>.</li>
            <li>Clique no ícone de lixeira ao lado do arquivo para <Strong>excluí-lo</Strong> (somente Gestor ou quem fez o upload).</li>
          </ul>
        </Subsection>
        <Tip>Formatos suportados: imagens (JPG, PNG, GIF), documentos (PDF, DOCX, XLSX) e qualquer outro tipo de arquivo. O limite por arquivo é definido pela configuração do servidor.</Tip>
      </div>
    ),
  },
  {
    id: "pdf",
    title: "Relatório do Projeto (1 clique)",
    icon: FileDown,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Gere um relatório de status completo de qualquer projeto, pronto para imprimir ou salvar em PDF e enviar ao cliente.</p>
        <Subsection title="Como gerar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse <Strong>Projetos</Strong> e clique no projeto desejado para abrir o detalhe.</li>
            <li>No cabeçalho da página, clique em <Strong>Relatório</Strong>.</li>
            <li>Na página que se abre, clique em <Strong>Imprimir / Salvar PDF</Strong> — na janela do navegador, escolha a impressora ou a opção <em>"Salvar como PDF"</em>.</li>
          </ol>
        </Subsection>
        <Subsection title="O que está no relatório">
          <Table
            headers={["Seção", "Conteúdo"]}
            rows={[
              ["Cabeçalho", "Nome do projeto, farol 🟢🟡🔴 com os motivos e o status atual"],
              ["Progresso", "Barra de andamento e contagem de tarefas concluídas"],
              ["Datas principais", "Todas as datas do projeto: início, fim estimado, data final, medição, produção e instalação"],
              ["Marcos", "Datas-chave do projeto com a situação de cada uma"],
              ["Tarefas", "Atrasadas, próximas em aberto e concluídas na última semana"],
            ]}
          />
        </Subsection>
        <Tip>Este relatório substitui o antigo botão "Exportar PDF" — agora com farol, marcos e visual pronto para apresentar ao cliente.</Tip>
      </div>
    ),
  },
  {
    id: "notificacoes",
    title: "Notificações",
    icon: Bell,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">O sistema gera notificações automáticas para manter toda a equipe informada sobre mudanças importantes em projetos e tarefas.</p>
        <Subsection title="Acessar as notificações">
          <p className="text-sm text-muted-foreground">Clique no <Strong>ícone de sino</Strong> no canto superior direito da tela. Um painel exibe todas as notificações recentes, da mais nova para a mais antiga.</p>
        </Subsection>
        <Subsection title="Quando uma notificação é gerada">
          <Table
            headers={["Evento", "Quem recebe"]}
            rows={[
              ["Tarefa atribuída a você", "O responsável pela tarefa"],
              ["Comentário adicionado na sua tarefa", "O responsável pela tarefa"],
              ["Você foi mencionado com @nome", "A pessoa mencionada no comentário"],
              ["Status do projeto mudou de fase", "Todos os membros do projeto"],
              ["Projeto entrou em Na Arquitetura", "Todos os membros + gestores"],
              ["Projeto aprovado ou rejeitado", "Todos os membros do projeto"],
            ]}
          />
        </Subsection>
        <Subsection title="Marcar como lida">
          <p className="text-sm text-muted-foreground">No painel, clique em <Strong>Marcar como lida</Strong> em uma notificação individual ou use <Strong>Marcar todas como lidas</Strong> para limpar o contador de uma vez.</p>
        </Subsection>
        <Tip>O número em vermelho sobre o sino indica notificações não lidas. Ele some assim que todas forem marcadas como lidas.</Tip>
      </div>
    ),
  },
  {
    id: "gantt",
    title: "Linha do Tempo (Gantt)",
    icon: GanttChart,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A visualização em Gantt é a aba <Strong>Linha do Tempo</Strong> da tela <Strong>Trabalho</Strong>.
          Exibe todos os projetos e suas tarefas numa grade de tempo — navegue por semana, mês ou trimestre.
        </p>
        <Subsection title="Como acessar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>Trabalho</Strong> no menu lateral.</li>
            <li>Selecione a aba <Strong>Linha do Tempo</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Controles de navegação">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Semana / Mês / Trimestre</Strong> — altera a escala horizontal do gráfico.</li>
            <li><Strong>‹ ›</Strong> — avança ou recua o período exibido.</li>
            <li><Strong>Hoje</Strong> — recentra a visualização no dia atual (linha vermelha).</li>
            <li>Clique no chevron ao lado do projeto para expandir as tarefas individuais.</li>
          </ul>
        </Subsection>
        <Subsection title="Legenda de cores">
          <Table
            headers={["Cor", "Significado"]}
            rows={[
              ["Verde", "Tarefa concluída"],
              ["Azul", "Em Andamento"],
              ["Amarelo", "Em Revisão"],
              ["Cinza", "A Fazer"],
              ["Diamante âmbar", "Prazo da tarefa"],
              ["Linha vermelha", "Hoje"],
            ]}
          />
        </Subsection>
        <Tip>Tarefas sem datas cadastradas não aparecem no gráfico — preencha início e prazo na tarefa para que a barra seja exibida.</Tip>
      </div>
    ),
  },
  {
    id: "fotos-arquivos",
    title: "Fotos e Arquivos do Projeto",
    icon: Camera,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cada projeto possui duas seções dedicadas a mídia: <Strong>Fotos</Strong> (galeria de imagens da obra) e <Strong>Arquivos</Strong> (documentos, planilhas, PDFs e demais tipos).</p>
        <Subsection title="Enviar fotos">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Abra o detalhe do projeto e role até a seção <Strong>Fotos</Strong>.</li>
            <li>Clique na área de upload ou arraste as imagens (JPG, PNG, WebP, GIF).</li>
            <li>As fotos aparecem na galeria assim que o upload conclui.</li>
          </ol>
        </Subsection>
        <Subsection title="Galeria e lightbox">
          <p className="text-sm text-muted-foreground">Clique em qualquer miniatura da galeria para abrir o <Strong>lightbox</Strong> em tela cheia. No lightbox, use as setas para navegar entre as fotos sem fechar o painel.</p>
        </Subsection>
        <Subsection title="Enviar arquivos">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Role até a seção <Strong>Arquivos</Strong> do projeto.</li>
            <li>Clique na área de upload ou arraste o arquivo desejado (PDF, DOCX, XLSX, etc.).</li>
            <li>O arquivo aparece na lista com nome, tamanho e data de envio.</li>
          </ol>
        </Subsection>
        <Subsection title="Baixar ou excluir">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique no ícone de <Strong>download</Strong> para salvar o arquivo localmente.</li>
            <li>Clique no ícone de <Strong>lixeira</Strong> para excluir — esta ação é permanente.</li>
          </ul>
        </Subsection>
        <Tip>Fotos e arquivos ficam separados para facilitar a navegação: imagens ficam na galeria visual e documentos ficam na lista de arquivos, cada um com seu próprio espaço de upload.</Tip>
      </div>
    ),
  },
  {
    id: "aprovacao",
    title: "Aprovação da Arquitetura",
    icon: BadgeCheck,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Mover o projeto para a fase <Strong>Na Arquitetura</Strong> significa "desenho enviado para a arquitetura". Nessa fase, um cartão no topo do detalhe do projeto pede o registro da decisão — e o registro fica visível para sempre depois.</p>
        <Subsection title="Como funciona o fluxo">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Ao enviar o desenho, mova o projeto para <Strong>Na Arquitetura</Strong> (pelo Trilho de Fases, pela edição ou arrastando no Kanban).</li>
            <li>Todos os membros do projeto e os gestores recebem uma notificação automática.</li>
            <li>O cartão âmbar <em>Na arquitetura — aguardando aprovação</em> aparece no detalhe do projeto.</li>
            <li>Quando a arquitetura responder, clique em <Strong>Registrar decisão da arquitetura</Strong>, informe a <Strong>Data da decisão</Strong> (o dia em que ela de fato respondeu, não o dia do lançamento), escreva a nota se houver e escolha <Strong>Aprovado</Strong> ou <Strong>Reprovado</Strong>.</li>
            <li>Todos os membros são notificados da decisão.</li>
          </ol>
        </Subsection>
        <Subsection title="Onde o registro aparece, fase a fase">
          <Table
            headers={["Fase do projeto", "O que você vê"]}
            rows={[
              ["Medição · Em Projeto", "Nada — o desenho ainda não foi enviado, não há o que aprovar"],
              ["Na Arquitetura", "Cartão completo com Data da decisão e os botões Aprovado / Reprovado"],
              ["Produção em diante", "Faixa compacta: 'Aprovado pela arquitetura · 12 de março de 2026' (ou reprovado). Se ninguém registrou, a faixa fica âmbar com o botão Registrar — dá para lançar retroativamente"],
            ]}
          />
        </Subsection>
        <Subsection title="Corrigir um registro">
          <p className="text-sm text-muted-foreground">O botão <Strong>Corrigir</Strong> (ou <Strong>Corrigir registro</Strong>) permite ajustar a data, a nota ou o resultado a qualquer momento.</p>
        </Subsection>
        <Subsection title="Quem pode aprovar">
          <p className="text-sm text-muted-foreground">Registram a decisão o <Strong>Gestor</Strong> e o <Strong>Projetista Gestor</Strong>. Os demais papéis veem o painel em modo leitura, com o status e a nota.</p>
        </Subsection>
        <Tip>A nota de aprovação fica visível para toda a equipe no painel do projeto — use-a para registrar condições, ressalvas ou instruções para a próxima etapa.</Tip>
      </div>
    ),
  },
  {
    id: "produtividade",
    title: "Produtividade",
    icon: BarChart2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">A análise de produtividade mostra o desempenho individual de cada membro da equipe, com base nas tarefas atribuídas e concluídas.</p>
        <Subsection title="Acessar">
          <p className="text-sm text-muted-foreground">Abra <Strong>Desempenho</Strong> no menu Análises: a tabela por pessoa mostra abertas e atrasadas de cada membro.</p>
        </Subsection>
        <Subsection title="O que você vê">
          <Table
            headers={["Gráfico / Seção", "O que mostra"]}
            rows={[
              ["Carga da equipe", "Tarefas abertas, vencidas e concluídas por membro"],
              ["Barra de conclusão", "Percentual de tarefas concluídas em relação ao total atribuído"],
              ["Ordenação", "Quem tem mais tarefas vencidas ou abertas aparece no topo"],
            ]}
          />
        </Subsection>
        <Tip>Use esta página para identificar membros sobrecarregados ou subutilizados e redistribuir tarefas de forma mais equilibrada.</Tip>
      </div>
    ),
  },
  {
    id: "templates",
    title: "Templates de Projeto",
    icon: Layers,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Templates são modelos reutilizáveis de projeto — defina uma estrutura padrão de tarefas uma vez e aplique quantas vezes precisar para criar projetos novos de forma ágil.</p>
        <Subsection title="Criar um template">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse <Strong>Templates</Strong> no menu lateral.</li>
            <li>Clique em <Strong>Novo Template</Strong>.</li>
            <li>Preencha nome, descrição e prioridade padrão.</li>
            <li>Com o template selecionado, clique em <Strong>Adicionar Tarefa</Strong> para incluir as etapas padrão.</li>
            <li>Para cada tarefa, informe título, prioridade e <Strong>Dias após início</Strong> — o offset que define em quantos dias após o início do projeto aquela tarefa deverá ser entregue.</li>
          </ol>
        </Subsection>
        <Subsection title="Usar um template (criar projeto)">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Selecione o template na lista da esquerda.</li>
            <li>Clique no botão <Strong>Usar Template</Strong> (ícone de play verde).</li>
            <li>Informe o nome do projeto e a data de início.</li>
            <li>Clique em <Strong>Criar Projeto</Strong> — o projeto é criado com todas as tarefas e os prazos calculados automaticamente.</li>
          </ol>
        </Subsection>
        <Subsection title="Gerenciar tarefas do template">
          <p className="text-sm text-muted-foreground">No painel de detalhe do template, cada tarefa exibe o título, prioridade e offset de dias. Clique no <Strong>×</Strong> ao lado de uma tarefa para removê-la do template sem afetar projetos já criados a partir dele.</p>
        </Subsection>
        <Tip>Crie templates para os tipos de projeto mais comuns na sua operação (ex.: "Residencial Alumínio", "Comercial Madeira") e padronize as etapas da equipe. Apenas gestores podem criar e excluir templates.</Tip>
      </div>
    ),
  },
  {
    id: "recorrencia",
    title: "Tarefas Recorrentes",
    icon: Repeat2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Tarefas recorrentes se repetem automaticamente em um intervalo definido — ao marcar uma como concluída, a próxima ocorrência é criada automaticamente com o prazo deslocado.</p>
        <Subsection title="Configurar recorrência">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Ao criar ou editar uma tarefa, localize o campo <Strong>Recorrência</Strong> no formulário.</li>
            <li>Escolha o intervalo: <em>Diária, Semanal, Mensal</em> ou <em>Anual</em>.</li>
            <li>Opcionalmente, defina uma <Strong>Fim da recorrência</Strong> — data a partir da qual nenhuma nova ocorrência será criada.</li>
            <li>Salve a tarefa normalmente.</li>
          </ol>
        </Subsection>
        <Subsection title="Como funciona ao concluir">
          <Table
            headers={["Intervalo", "Próxima ocorrência criada em"]}
            rows={[
              ["Diária", "1 dia após o prazo original"],
              ["Semanal", "7 dias após o prazo original"],
              ["Mensal", "1 mês após o prazo original"],
              ["Anual", "1 ano após o prazo original"],
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">A nova tarefa é criada com status <em>A Fazer</em> e herda o mesmo título, projeto, responsável e prioridade da original.</p>
        </Subsection>
        <Subsection title="Desativar recorrência">
          <p className="text-sm text-muted-foreground">Edite a tarefa e mude o campo <Strong>Recorrência</Strong> para <em>Sem recorrência</em>. A partir de então, concluir a tarefa não gera novas ocorrências.</p>
        </Subsection>
        <Tip>Use tarefas recorrentes para atividades periódicas como vistorias semanais, relatórios mensais ou revisões anuais de contrato — o sistema cuida de criar as próximas ocorrências automaticamente.</Tip>
      </div>
    ),
  },
  {
    id: "registro-horas",
    title: "Registro de Horas",
    icon: Clock,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Registre o tempo trabalhado em cada tarefa para acompanhar o esforço real da equipe e comparar com o planejado.</p>
        <Subsection title="Como registrar horas">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na página <Strong>Tarefas</Strong>, clique em <Strong>Detalhes</Strong> na tarefa desejada.</li>
            <li>No painel lateral, role até a seção <Strong>Registro de Horas</Strong>.</li>
            <li>Preencha a quantidade de horas, a data e uma descrição do que foi feito.</li>
            <li>Clique em <Strong>Registrar</Strong> — o lançamento aparece no histórico imediatamente.</li>
          </ol>
        </Subsection>
        <Subsection title="Histórico e total">
          <Table
            headers={["Campo", "Descrição"]}
            rows={[
              ["Data", "Data em que o trabalho foi realizado"],
              ["Horas", "Tempo investido naquela sessão (ex: 2.5 = 2h30m)"],
              ["Descrição", "Breve relato do que foi executado"],
              ["Total", "Soma de todas as horas registradas na tarefa, exibida no rodapé"],
            ]}
          />
        </Subsection>
        <Subsection title="Excluir um lançamento">
          <p className="text-sm text-muted-foreground">Passe o mouse sobre um registro no histórico e clique no ícone de <Strong>lixeira</Strong> que aparece à direita. A exclusão é imediata e o total é recalculado automaticamente.</p>
        </Subsection>
        <Tip>Use decimais para frações de hora — por exemplo, <em>1.5</em> equivale a 1h30m. O total acumulado na tarefa é sempre exibido em destaque para facilitar o acompanhamento de esforço.</Tip>
      </div>
    ),
  },
  {
    id: "automacao",
    title: "Regras de Automação",
    icon: Zap,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Crie regras que disparam ações automaticamente no servidor quando determinados eventos acontecem — sem precisar agir manualmente em cada caso. As regras são executadas em tempo real pelo backend.</p>
        <Subsection title="Como criar uma regra">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse <Strong>Automações</Strong> no menu lateral (seção Sistema).</li>
            <li>Clique em <Strong>+ Nova Regra</Strong>.</li>
            <li>Preencha o nome da regra, escolha o <Strong>Gatilho</Strong> e a <Strong>Ação</Strong>.</li>
            <li>Clique em <Strong>Criar Regra</Strong> — a regra entra em vigor imediatamente.</li>
          </ol>
        </Subsection>
        <Subsection title="Gatilhos disponíveis">
          <Table
            headers={["Gatilho", "Quando é acionado"]}
            rows={[
              ["Tarefa concluída", "Quando uma tarefa muda para o status Concluída"],
              ["Status de tarefa alterado", "Quando qualquer tarefa muda de um status para outro"],
              ["Projeto concluído", "Quando todas as tarefas de um projeto são concluídas"],
              ["Tarefa atribuída a membro", "Quando o campo responsável de uma tarefa é preenchido ou alterado"],
              ["Status do projeto alterado", "Quando o status de um projeto muda (ex: Em Projeto → Na Arquitetura)"],
            ]}
          />
        </Subsection>
        <Subsection title="Ações disponíveis">
          <Table
            headers={["Ação", "O que acontece"]}
            rows={[
              ["Notificar responsável", "Envia notificação ao responsável pela tarefa"],
              ["Notificar toda a equipe", "Envia notificação para todos os membros do projeto"],
              ["Notificar gestores", "Envia notificação a todos os usuários com papel de Gestor"],
              ["Avançar status da tarefa", "Avança o status da tarefa automaticamente para o próximo: A Fazer → Em Andamento → Em Revisão → Concluída"],
            ]}
          />
        </Subsection>
        <Subsection title="Estatísticas de execução">
          <p className="text-sm text-muted-foreground">Cada regra exibe duas informações de uso diretamente na lista:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-1">
            <li><Strong>Execuções</Strong> — contador de quantas vezes a regra disparou desde sua criação.</li>
            <li><Strong>Última execução</Strong> — data e hora da última vez que a regra foi acionada. Regras nunca executadas exibem "Nunca executada".</li>
          </ul>
        </Subsection>
        <Subsection title="Ativar e desativar regras">
          <p className="text-sm text-muted-foreground">Cada regra possui um <Strong>toggle</Strong> na lista. Desative uma regra temporariamente sem precisar excluí-la — o toggle fica cinza quando inativa e verde quando ativa. O painel de estatísticas no topo mostra quantas regras estão ativas.</p>
        </Subsection>
        <Subsection title="Excluir uma regra">
          <p className="text-sm text-muted-foreground">Clique no ícone de <Strong>lixeira</Strong> ao lado da regra. A exclusão é permanente e a regra deixa de funcionar imediatamente.</p>
        </Subsection>
        <Tip>Combine "Tarefa atribuída" + "Notificar responsável" para avisar automaticamente o colaborador toda vez que uma nova tarefa chegar para ele. Somente Gestores podem criar e excluir regras.</Tip>
      </div>
    ),
  },
  {
    id: "kanban",
    title: "Trabalho",
    icon: Columns3,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">A tela <Strong>Trabalho</Strong> reúne tarefas e projetos em quatro visões — antes eram duas páginas (Tarefas e Kanban).</p>
        <Subsection title="As quatro abas">
          <Table
            headers={["Aba", "O que exibe"]}
            rows={[
              ["Lista", "Todas as tarefas com filtros, busca, ações em lote e exportação CSV"],
              ["Tarefas", "Colunas por status: A Fazer · Em Andamento · Revisão · Concluída. Arraste para mudar o status; clique num cartão para abrir o detalhe."],
              ["Fases dos Projetos", "Colunas por fase: A Iniciar → Em Instalação. Arraste os projetos entre fases."],
              ["Linha do Tempo", "Gantt com todos os projetos e tarefas. Navegue por Semana / Mês / Trimestre."],
            ]}
          />
        </Subsection>
        <Subsection title="Como usar as colunas">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Arraste e solte cards entre colunas para atualizar o status automaticamente.</li>
            <li>Clique num cartão de tarefa para abrir o detalhe (comentários, anexos, subtarefas).</li>
            <li>Clique no <Strong>+</Strong> no cabeçalho de uma coluna para criar um item já naquela fase.</li>
            <li>Use o filtro <Strong>Madeira / Alumínio</Strong> para ver o esforço de cada unidade.</li>
          </ul>
        </Subsection>
        <Subsection title="Como usar a Linha do Tempo">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique no chevron ao lado do nome do projeto para expandir as tarefas.</li>
            <li>Use <Strong>Semana / Mês / Trimestre</Strong> para ajustar a escala e <Strong>‹ ›</Strong> para navegar no tempo.</li>
            <li>A linha vermelha vertical marca o dia de hoje.</li>
          </ul>
        </Subsection>
        <Tip>Cards com data vencida são destacados em vermelho. Tarefas sem datas não aparecem na Linha do Tempo — cadastre início e prazo para que a barra seja exibida.</Tip>
      </div>
    ),
  },
  {
    id: "calendario",
    title: "Calendário de Instalações",
    icon: CalendarDays,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cronograma visual no estilo Gantt para controlar datas de instalação e assistência técnica por equipe.</p>
        <Subsection title="Navegar pelo calendário">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Use as setas <Strong>‹</Strong> e <Strong>›</Strong> para navegar entre meses.</li>
            <li>O botão <Strong>Hoje</Strong> centraliza na data atual.</li>
            <li>Scroll horizontal percorre os dias; ao chegar na borda, o mês muda automaticamente.</li>
          </ul>
        </Subsection>
        <Subsection title="Legenda das barras">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Barras coloridas sólidas → <Strong>Instalação</Strong></li>
            <li>Barras com listras diagonais → <Strong>Assistência Técnica</Strong></li>
            <li>Barras em cinza desbotado → evento <Strong>passado</Strong> (já encerrado)</li>
            <li>Linha vertical laranja → dia de <Strong>hoje</Strong></li>
            <li>Fundo colorido na célula → <Strong>feriado nacional</Strong> brasileiro</li>
          </ul>
        </Subsection>
        <Subsection title="Criar um evento">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em qualquer célula vazia na linha da equipe desejada.</li>
            <li>Preencha: nome da obra, datas, tipo e cor.</li>
            <li>Clique em <Strong>Salvar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Renomear uma equipe">
          <p className="text-sm text-muted-foreground">Clique diretamente sobre o nome da equipe na coluna esquerda. Pressione <Strong>Enter</Strong> para confirmar ou <Strong>Esc</Strong> para cancelar.</p>
        </Subsection>
        <Subsection title="Enviar agenda pelo WhatsApp">
          <p className="text-sm text-muted-foreground">
            Na barra do Calendário há um botão <Strong>WhatsApp</Strong> (ícone de mensagem). Escolha o período — <Strong>Hoje</Strong>, <Strong>Hoje e amanhã</Strong> ou <Strong>Próximos 7 dias</Strong> — e o WhatsApp abre com a agenda já montada e agrupada por equipe, pronta para enviar. O mesmo botão aparece em <Strong>Obras → Operação</Strong>.
          </p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "alertas",
    title: "Alertas",
    icon: Bell,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Os alertas automáticos aparecem no bloco <Strong>🚦 Onde focar agora</Strong> do Dashboard — na lente <em>Por assunto</em>, agrupados por tipo com a contagem — e no sino de notificações.</p>
        <Table
          headers={["Nível", "Quando aparece"]}
          rows={[
            ["🔴 Crítico", "Instalação atrasada, tarefa vencida"],
            ["🟡 Atenção", "Prazo próximo, projeto sem data de instalação, tarefa parada há 7+ dias"],
            ["🔵 Informativo", "Projetos parados, tarefas sem responsável"],
          ]}
        />
        <Tip>Cada linha leva à tela onde o assunto se resolve: "Tarefas atrasadas" abre Trabalho já filtrado, "Datas de obra vencidas" abre Obras → Pendências, e assim por diante.</Tip>
      </div>
    ),
  },
  {
    id: "assistencia",
    title: "Assistência Técnica",
    icon: Wrench,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Abertura e acompanhamento de chamados de suporte pós-entrega.
          O módulo fica em <Strong>Obras → Operação → Assistência</Strong>.
        </p>
        <Subsection title="Abrir um chamado">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse <Strong>Obras → Operação → Assistência</Strong>.</li>
            <li>Clique em <Strong>+ Novo Chamado</Strong>.</li>
            <li>Preencha: cliente, contato, descrição do problema, data agendada e responsável técnico.</li>
            <li>Clique em <Strong>Salvar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Ciclo de vida">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge label="Aberto" color="blue" />
            <ChevronRight className="h-3 w-3" />
            <Badge label="Em Andamento" color="amber" />
            <ChevronRight className="h-3 w-3" />
            <Badge label="Concluído" color="green" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Marque o botão <Strong>Realizado</Strong> para concluir rapidamente um chamado sem abrir o formulário completo.</p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "checklist",
    title: "Checklist de Obra",
    icon: ClipboardList,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Controle item a item das peças (esquadrias) instaladas em cada projeto.</p>
        <Subsection title="Adicionar um item">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Selecione o projeto.</li>
            <li>Clique em <Strong>+ Adicionar Item</Strong>.</li>
            <li>Informe a peça (ex: Porta Principal) e o local (ex: Hall de Entrada).</li>
          </ol>
        </Subsection>
        <Table
          headers={["Status", "Significado"]}
          rows={[
            ["Não Instalado", "Aguardando instalação"],
            ["Instalado", "Peça instalada, aguardando vistoria final"],
            ["Finalizado", "Peça aprovada e encerrada"],
          ]}
        />
        <Subsection title="Plano de ação">
          <p className="text-sm text-muted-foreground">Quando uma peça apresenta problema, clique em <Strong>Plano de Ação</Strong> ao lado do item. Descreva o problema, defina o responsável e a data limite.</p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "obra-hub",
    title: "Obra — o dia a dia do gestor",
    icon: HardHat,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">A tela <Strong>Obras</Strong> reúne tudo num lugar só, em três abas. É a página inicial do gestor de obras.</p>
        <p className="text-sm text-muted-foreground">Cada aba mostra <Strong>quantos itens pedem ação</Strong>: número vermelho quando há atraso (tarefa, data ou plano vencido, amostra atrasada) e âmbar quando é só coisa aguardando. Abaixo das abas, uma linha aponta o que espera nas outras.</p>
        <Subsection title="Aba Visitas — a programação">
          <p className="text-sm text-muted-foreground"><Strong>Programação do mês</Strong>: todas as visitas confirmadas, dia a dia (as já realizadas ficam esmaecidas), mais as marcadas para depois do mês. Abaixo, <Strong>Visitas sugeridas</Strong>: obras que pedem visita — produção terminando em até <Strong>10 dias</Strong> ou obra em instalação há <Strong>15+ dias</Strong> sem visita — aguardando você confirmar com o botão <Strong>Agendar</Strong>. <Strong>Toda visita realizada deve ter seu RDO anexado</Strong> — o botão Anexar RDO fica na própria linha da visita, e visitas sem RDO aparecem como pendência na aba Pendências.</p>
        </Subsection>
        <Subsection title="Aba Pendências — onde você precisa atuar">
          <p className="text-sm text-muted-foreground mb-2">Uma fila única, do mais atrasado ao menos. Ela abre no filtro <Strong>Atrasadas</Strong>; os outros chips são <Strong>Vencem em 7 dias</Strong> e <Strong>Todas</Strong>. Dentro dela, três blocos coloridos:</p>
          <Table
            headers={["Bloco", "O que reúne", "Ação na linha"]}
            rows={[
              ["🟣 Pendências da equipe", "Tarefas vencidas por responsável e itens de plano de ação", "Abrir as tarefas da pessoa · Cobrar no WhatsApp (externo)"],
              ["🔵 RDOs de visita", "Visita realizada sem o relatório anexado", "Anexar RDO"],
              ["🟢 Datas", "Vencidas sem data final e as que vencem em 30 dias", "Abrir a obra"],
            ]}
          />
        </Subsection>
        <Subsection title="Aba Operação">
          <p className="text-sm text-muted-foreground">O pós-visita: assistência técnica, amostras e instalações da semana. O <Strong>Resumo</Strong> mostra só o que pede ação, com Realizado / Pronta / Entregue na própria linha; as sub-abas <Strong>Assistência</Strong> e <Strong>Amostras</Strong> guardam o cadastro e o histórico completos.</p>
        </Subsection>
        <Tip>Como gestor, use <Strong>Ver como → Gestor de Obras</Strong> (menu do usuário) para enxergar exatamente o que essa pessoa vê.</Tip>
      </div>
    ),
  },
  {
    id: "cobrancas",
    title: "Pendências da obra (o que cobrar)",
    icon: ClipboardList,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Fica em <Strong>Obras → Pendências</Strong>: uma fila única com tudo que você precisa cobrar em todas as obras, do mais atrasado ao menos.</p>
        <Subsection title="Comece pelo filtro">
          <p className="text-sm text-muted-foreground">A aba abre em <Strong>Atrasadas</Strong> — o que exige ação hoje. Os outros chips são <Strong>Vencem em 7 dias</Strong> (para se antecipar) e <Strong>Todas</Strong>. O número ao lado de cada chip mostra quantos itens há.</p>
        </Subsection>
        <Subsection title="Três blocos dentro da fila">
          <Table
            headers={["Bloco", "O que reúne", "Ação na linha"]}
            rows={[
              ["🟣 Pendências da equipe", "Tarefas vencidas (uma linha por responsável) e itens de plano de ação", "Abrir as tarefas da pessoa · Cobrar no WhatsApp (responsável externo)"],
              ["🔵 RDOs de visita", "Visita já realizada sem o relatório anexado", "Anexar RDO ali mesmo"],
              ["🟢 Datas", "Datas estimadas vencidas sem a final registrada e as que vão vencer em 30 dias", "Abrir a obra e registrar"],
            ]}
          />
        </Subsection>
        <Tip>A cor da barra identifica o bloco; o selo à direita de cada linha (vermelho/âmbar) é a urgência. Itens de plano de ação também entram no e-mail diário e no radar do Dashboard.</Tip>
      </div>
    ),
  },
  {
    id: "planos-acao",
    title: "Planos de ação",
    icon: ClipboardPaste,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Um plano de ação é um <Strong>conjunto de tarefas</Strong> que a obra precisa realizar. Você cobra o plano por projeto, não item a item.</p>
        <Subsection title="Ver se a obra tem plano ativo">
          <p className="text-sm text-muted-foreground">O <Strong>selo de plano</Strong> aparece na Lista de Projetos, no cabeçalho do projeto e nas Pendências da obra: <em>"Plano: N"</em> (vermelho se houver itens vencidos) quando há itens em aberto, ou <em>"Plano ✓"</em> quando tudo foi concluído.</p>
        </Subsection>
        <Subsection title="Criar um plano">
          <p className="text-sm text-muted-foreground">Onde a obra ainda não tem plano, o selo vira o botão <Strong>+ Plano de ação</Strong>: informe o título e a primeira tarefa (o plano já nasce ativo). Para gerenciar o plano completo — adicionar itens, marcar como feito, exportar em PDF — abra a página do projeto.</p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "agendar-visita",
    title: "Agendar visitas",
    icon: CalendarDays,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Durante a instalação, a frequência de visitas precisa subir. Há três formas de registrar uma visita:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>No Painel (aba <Strong>Hoje</Strong>), no bloco <Strong>Precisam de visita</Strong>, clique em <Strong>Agendar</Strong> — a obra já vem preenchida.</li>
          <li>Botão <Strong>Nova visita</Strong> no topo da tela Obra (abas Hoje e Agenda) — escolha a obra no diálogo.</li>
          <li>Dentro da página do projeto, na seção de visitas.</li>
        </ul>
        <p className="text-sm text-muted-foreground">Cada visita registra data, responsável, quem foi, objetivo e observações — e precisa do <Strong>RDO anexado</Strong> depois de realizada.</p>
      </div>
    ),
  },
  {
    id: "ver-como",
    title: "Ver como (pré-visualização de papéis)",
    icon: SlidersHorizontal,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Recurso só para <Strong>gestores</Strong>. Permite ver o app com o menu e o acesso de outro papel (Gestor de Obras, Projetista Gestor, Projetista, Observador) sem trocar de conta.</p>
        <Subsection title="Como usar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique no seu nome/e-mail no canto inferior esquerdo.</li>
            <li>Em <Strong>Ver como (pré-visualização)</Strong>, escolha o papel.</li>
            <li>Um aviso aparece no topo; clique em <Strong>Voltar para Gestor</Strong> (ou escolha "Gestor (você)") para sair.</li>
          </ol>
        </Subsection>
        <Tip>É apenas apresentação: suas permissões reais no servidor não mudam — você continua com acesso total.</Tip>
      </div>
    ),
  },
  {
    id: "central-obra",
    title: "Operação (assistência e amostras)",
    icon: HardHat,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          É a aba <Strong>Operação</Strong> em Obras — o pós-visita: instalações da semana, assistência
          técnica e amostras.
        </p>
        <Subsection title="As três abas">
          <Table
            headers={["Aba", "O que contém"]}
            rows={[
              ["Resumo", "Só o que pede ação — assistências em aberto, amostras a entregar, peças com plano de ação e instalações dos próximos 7 dias — com as ações na própria linha (Realizado / Pronta / Entregue). O que está em dia vira uma linha de texto; se não há nada pendente, aparece apenas 'Operação em dia'."],
              ["Assistência", "Lista completa de chamados de suporte pós-entrega. Botão '+ Novo Chamado' no canto direito. Filtros por status, projeto e busca livre."],
              ["Amostras", "Controle de amostras por projeto. Botão '+ Nova Amostra' no canto direito. Filtros por status, projeto e busca livre."],
            ]}
          />
        </Subsection>
        <Subsection title="Badges de contagem">
          <p className="text-sm text-muted-foreground">
            As abas <Strong>Assistência</Strong> e <Strong>Amostras</Strong> exibem um número em destaque
            quando há itens pendentes — assim você vê de relance o que precisa de atenção sem nem clicar.
          </p>
        </Subsection>
        <Subsection title="Ações disponíveis no topo">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Agenda no WhatsApp</Strong> — monta a mensagem com os eventos dos próximos 7 dias agrupados por equipe e abre o WhatsApp com o texto pronto.</li>
            <li><Strong>Novo Evento</Strong> — atalho para criar um evento no Calendário.</li>
          </ul>
        </Subsection>
        <Subsection title="Papel Gestor de Obras">
          <p className="text-sm text-muted-foreground">
            O papel <Strong>Gestor de Obras</Strong> enxerga e opera tudo da obra em todos os projetos
            (sem precisar ser participante de cada um), mas não acessa as áreas administrativas
            (Equipe, Templates, Automação, Auditoria) e não pode excluir projetos.
            Para usar, convide a pessoa em <Strong>Equipe → Convidar</Strong> escolhendo a função Gestor de Obras.
          </p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "visitas",
    title: "Visitas na Obra",
    icon: Calendar,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cada visita registrada no projeto pode ter um <Strong>relatório em PDF</Strong> anexado e um <Strong>plano de ação</Strong> com os pontos levantados durante a vistoria. Abra o detalhe de qualquer visita clicando nela na lista do projeto.
        </p>
        <Subsection title="Agendar uma visita">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na página do projeto, localize o cartão <Strong>Visitas na Obra</Strong> e clique em <Strong>+ Registrar Visita</Strong> (botão visível apenas para quem tem permissão de edição).</li>
            <li>Preencha os campos obrigatórios: <Strong>Data da Visita</Strong>, <Strong>Quem foi à obra</Strong> e <Strong>Objetivo da visita</Strong>.</li>
            <li>Opcionalmente, selecione um <Strong>Responsável</Strong> (membro do projeto) e adicione <Strong>Observações</Strong> com detalhes adicionais.</li>
            <li>Clique em <Strong>Registrar Visita</Strong> para salvar — a visita aparece imediatamente na lista do projeto.</li>
          </ol>
          <Table
            headers={["Campo", "Obrigatório", "Descrição"]}
            rows={[
              ["Data da Visita", "Sim", "Data em que a visita aconteceu ou está agendada"],
              ["Quem foi à obra", "Sim", "Nome(s) dos visitantes, separados por vírgula"],
              ["Objetivo da visita", "Sim", "Finalidade da vistoria (ex.: medição, acompanhamento de obra)"],
              ["Responsável", "Não", "Membro do projeto designado como responsável pela visita"],
              ["Observações", "Não", "Informações complementares ou contexto adicional"],
            ]}
          />
        </Subsection>
        <Subsection title="Editar ou excluir uma visita">
          <p className="text-sm text-muted-foreground mb-2">Os dados principais de uma visita (data, visitantes e objetivo) não podem ser alterados após o registro. Caso precise corrigir uma informação, exclua a visita e registre uma nova com os dados corretos.</p>
          <p className="text-sm text-muted-foreground mb-2">Para <Strong>excluir uma visita</Strong>:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na lista de visitas do projeto, localize a visita desejada.</li>
            <li>Clique no ícone de <Strong>lixeira</Strong> que aparece na última coluna da linha.</li>
            <li>A exclusão é imediata e permanente — todos os itens do plano de ação vinculados também são removidos.</li>
          </ol>
          <Tip>O ícone de lixeira é visível apenas para <Strong>Gestor</Strong>, <Strong>Gestor de Obras</Strong> e <Strong>Executor</Strong> que seja participante do projeto. Observadores não podem excluir visitas.</Tip>
        </Subsection>
        <Subsection title="RDO — toda visita realizada precisa do seu">
          <p className="text-sm text-muted-foreground mb-2">O <Strong>RDO</Strong> é o arquivo que você faz no aplicativo de vistoria (com fotos e comentários). No sistema, ele fica anexado à visita — e uma visita realizada sem RDO aparece como pendência.</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Na linha da visita, clique em <Strong>Anexar RDO</Strong> — na página da obra, em <Strong>Obras → Visitas</Strong> (programação do mês) ou em <Strong>Obras → Pendências</Strong>.</li>
            <li>Selecione o arquivo — aceita <Strong>PDF, DOC, DOCX e imagens</Strong>.</li>
            <li>Ao concluir, o botão vira <Strong>RDO</Strong> e qualquer pessoa da equipe baixa o arquivo por ali.</li>
          </ol>
          <Tip>Uma visita não gera pendências item a item: a pendência da visita é justamente o RDO que ainda não foi anexado.</Tip>
        </Subsection>
        <Subsection title="Plano de ação">
          <p className="text-sm text-muted-foreground mb-2">Registre pontos levantados na visita que precisam de acompanhamento, atribuindo responsável e prazo para cada um.</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>No painel da visita, vá até a seção <Strong>Plano de Ação</Strong>.</li>
            <li>No campo <em>Descreva o ponto de ação...</em>, escreva o que precisa ser resolvido.</li>
            <li>Selecione o <Strong>responsável</Strong> (opcional) e informe o <Strong>prazo</Strong> (opcional).</li>
            <li>Clique em <Strong>Adicionar item</Strong> — ou pressione Enter — para salvar.</li>
          </ol>
          <Table
            headers={["Ação", "Como fazer"]}
            rows={[
              ["Marcar como concluído", "Clique no círculo à esquerda do item — ele fica riscado e move para a lista de concluídos"],
              ["Reabrir um item", "Clique novamente no círculo preenchido para desfazer a conclusão"],
              ["Excluir um item", "Passe o mouse sobre o item e clique no ícone de lixeira que aparece à direita"],
            ]}
          />
        </Subsection>
        <Tip>Os itens concluídos ficam recolhidos por padrão — clique em <em>N item(s) concluído(s)</em> para exibi-los. O contador ao lado do título mostra quantos já foram resolvidos em relação ao total.</Tip>
      </div>
    ),
  },
  {
    id: "equipe",
    title: "Equipe",
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Gestão dos membros que têm acesso ao sistema.</p>
        <Subsection title="Adicionar um membro">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>+ Novo Membro</Strong>.</li>
            <li>Preencha nome, cargo, e-mail e função no sistema.</li>
            <li>Clique em <Strong>Convidar</Strong> — o membro recebe um e-mail de convite.</li>
          </ol>
        </Subsection>
        <Table
          headers={["Função", "O que pode fazer"]}
          rows={[
            ["Gestor", "Acesso total: criar, editar e excluir qualquer item, mais Equipe, Templates, Campos, Automações e Auditoria"],
            ["Gestor de Obras", "Opera tudo da obra em todos os projetos (Obras, calendário, assistência, amostras, tarefas) — sem áreas administrativas e sem excluir projetos. Home: Obras"],
            ["Projetista Gestor", "O projetista com visão do todo: tudo do Projetista + Dashboard e Trabalho de todas as obras, e edita qualquer projeto (sem precisar ser participante). Sem as áreas administrativas. Home: Minha Prancheta"],
            ["Projetista (Executor)", "Edita apenas projetos e tarefas em que é participante. Home: Minha Prancheta"],
            ["Observador", "Somente visualização — não pode criar ou editar"],
          ]}
        />
        <Tip>O status de acesso indica se o membro já aceitou o convite (✅ Ativo) ou ainda não (📧 Pendente).</Tip>
      </div>
    ),
  },
  {
    id: "reuniao",
    title: "Reunião Semanal",
    icon: Presentation,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Pauta de reunião montada automaticamente com o que importa na semana — abra na segunda-feira e conduza a reunião sem preparar nada.</p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">Abra <Strong>Desempenho</Strong> (menu Análises) e clique no botão <Strong>Modo reunião</Strong> (visível somente para Gestores).</p>
        </Subsection>
        <Subsection title="O que aparece na pauta">
          <Table
            headers={["Bloco", "Conteúdo"]}
            rows={[
              ["Projetos que pedem atenção", "Projetos 🔴 e 🟡 com os motivos do farol"],
              ["Tarefas atrasadas", "Agrupadas por responsável, para cobrança direta"],
              ["Vencem nos próximos 7 dias", "O que precisa ser priorizado nesta semana"],
              ["Paradas há 7+ dias", "Tarefas sem andamento que merecem uma decisão"],
              ["Concluídas na última semana", "Reconhecimento do que foi entregue, por pessoa"],
              ["Sem responsável", "Tarefas abertas que ninguém assumiu ainda"],
            ]}
          />
        </Subsection>
        <Subsection title="Imprimir a pauta">
          <p className="text-sm text-muted-foreground">Clique em <Strong>Imprimir / Salvar PDF</Strong> no topo da página para levar a pauta em papel ou salvar o arquivo.</p>
        </Subsection>
        <Tip>Use a pauta como roteiro fixo: comece pelos projetos em vermelho, passe pelas atrasadas e termine celebrando as entregas da semana.</Tip>
      </div>
    ),
  },
  {
    id: "desempenho",
    title: "Desempenho da Equipe",
    icon: Activity,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Números simples por pessoa para acompanhar a produtividade da equipe — sem precisar de planilha.</p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">Menu lateral → seção <Strong>Análises</Strong> → <Strong>Desempenho</Strong> (visível somente para Gestores).</p>
        </Subsection>
        <Subsection title="O que você vê">
          <Table
            headers={["Indicador", "Significado"]}
            rows={[
              ["Concluídas", "Quantas tarefas cada pessoa terminou no período"],
              ["Pontualidade", "Percentual das concluídas que foram entregues dentro do prazo"],
              ["Tempo médio", "Dias médios entre a criação e a conclusão das tarefas"],
              ["Abertas agora", "Carga atual de cada pessoa, com destaque para atrasadas"],
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">Além dos cartões e do gráfico por pessoa (entregas no prazo × com atraso), uma tabela detalhada mostra todos os números lado a lado.</p>
        </Subsection>
        <Subsection title="Período de análise">
          <p className="text-sm text-muted-foreground">Use o seletor no topo para analisar os últimos <Strong>7, 30 ou 90 dias</Strong>, ou <Strong>todo o histórico</Strong>.</p>
        </Subsection>
        <Tip>Tarefas sem responsável não entram na conta — atribua responsáveis para os números refletirem o trabalho real da equipe.</Tip>
      </div>
    ),
  },
  {
    id: "uso-rapido",
    title: "Uso Rápido no Dia a Dia",
    icon: Zap,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Atalhos para gastar menos tempo cadastrando e atualizando o sistema — pensados para o corre do dia a dia.</p>
        <Subsection title="Projeto novo em segundos">
          <p className="text-sm text-muted-foreground">Em <Strong>Projetos → Novo Projeto</Strong>, preencha só o <Strong>nome</Strong>, o <Strong>prazo de entrega</Strong> e os <Strong>participantes</Strong>. Clique em <Strong>Mostrar todos os campos</Strong> apenas quando precisar das datas detalhadas, material ou descrição — tudo isso também pode ser preenchido depois, na tela do projeto.</p>
        </Subsection>
        <Subsection title="Botão + Criar (em qualquer tela)">
          <p className="text-sm text-muted-foreground">O botão <Strong>+ Criar</Strong> no topo cria rapidamente o item certo dependendo da sua função:</p>
          <Table
            headers={["Opção", "Disponível para"]}
            rows={[
              ["Nova Tarefa", "Gestor, Gestor de Obras, Executor"],
              ["Novo Projeto", "Gestor, Gestor de Obras, Executor"],
              ["Novo Evento (instalação)", "Gestor, Gestor de Obras, Executor"],
              ["Nova Assistência", "Gestor, Gestor de Obras"],
            ]}
          />
        </Subsection>
        <Subsection title="Várias tarefas de uma vez">
          <p className="text-sm text-muted-foreground">Em <Strong>Tarefas → Criar em Lote</Strong> (também disponível na tela do projeto), cole uma lista com uma tarefa por linha. O sistema reconhece responsável e prazo automaticamente, ex.: <em>"Medir vão da janela - João - sexta"</em>.</p>
        </Subsection>
        <Subsection title="Andamento com 1 toque">
          <p className="text-sm text-muted-foreground">No <Strong>Meu Dia</Strong>, cada tarefa tem o botão <Strong>▶ Iniciar</Strong> (avisa a equipe que você começou) e o <Strong>círculo</Strong> para concluir. Para adiar o prazo, use o ícone de calendário — sem abrir formulário nenhum.</p>
        </Subsection>
        <Subsection title="Resumo de ontem (Gestores)">
          <p className="text-sm text-muted-foreground">No <Strong>Dashboard</Strong>, o cartão <Strong>Resumo de ontem</Strong> mostra o que a equipe concluiu, criou e movimentou no dia anterior — ótimo para a conversa rápida da manhã.</p>
        </Subsection>
        <Tip>Para começar um projeto já com as tarefas típicas da Ulimax (medição → projeto → produção → instalação → entrega), use o <Strong>Modelo padrão Ulimax</Strong> na tela de Modelos de Projeto.</Tip>
      </div>
    ),
  },
  {
    id: "assistente",
    title: "Assistente Inteligente",
    icon: Sparkles,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Converse com o sistema em português e receba respostas na hora, com base nos dados de agora — projetos, tarefas, prazos e equipe. Sem precisar abrir tela por tela.</p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">Menu lateral → seção <Strong>Análises</Strong> → <Strong>Assistente</Strong> (visível somente para Gestores).</p>
        </Subsection>
        <Subsection title="Exemplos de perguntas">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><em>"O que está atrasado hoje?"</em></li>
            <li><em>"Como está a carga de trabalho da equipe?"</em></li>
            <li><em>"Quais projetos precisam de mais atenção?"</em></li>
            <li><em>"O que vence nos próximos 3 dias?"</em></li>
          </ul>
        </Subsection>
        <Subsection title="Bom saber">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>O assistente responde <Strong>apenas com os dados do sistema</Strong> — ele não inventa informações e avisa quando não sabe.</li>
            <li>A conversa fica só no seu navegador e não é salva no servidor. Use <Strong>Limpar</Strong> para recomeçar.</li>
          </ul>
        </Subsection>
        <Tip>Use o assistente como um primeiro resumo rápido — para decisões importantes, confirme os números nas telas de Projetos e Tarefas.</Tip>
      </div>
    ),
  },
  {
    id: "cobranca-automatica",
    title: "Cobrança Automática",
    icon: BellRing,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Todo dia, a partir das <Strong>7h</Strong>, o sistema cobra as pendências sozinho: cada pessoa recebe um aviso no sininho 🔔 com o que precisa de atenção, e os gestores recebem um resumo geral da equipe.</p>
        <Subsection title="O que cada um recebe">
          <Table
            headers={["Quem", "O que recebe"]}
            rows={[
              ["Cada membro", "Aviso com suas tarefas atrasadas, que vencem hoje, que vencem em até 3 dias e paradas há 7+ dias"],
              ["Gestores e Gestores de Obras", "Resumo do dia: totais de atrasadas, vencendo hoje/em breve, paradas e tarefas sem responsável"],
            ]}
          />
        </Subsection>
        <Subsection title="Disparar a cobrança agora">
          <p className="text-sm text-muted-foreground">Menu lateral → <Strong>Automações</Strong> → cartão <Strong>Cobrança automática de pendências</Strong> → botão <Strong>Executar agora</Strong> (somente Gestores). Útil antes de uma reunião ou no fim do dia.</p>
        </Subsection>
        <Tip>Hoje os avisos chegam pelo sininho dentro do sistema. O envio também por e-mail já está preparado e pode ser ativado no futuro.</Tip>
      </div>
    ),
  },
  {
    id: "celular-obra",
    title: "Uso no Celular (Obra)",
    icon: Smartphone,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">O sistema funciona no navegador do celular e se adapta à tela pequena — ideal para consultar tarefas e registrar fotos direto da obra.</p>
        <Subsection title="Navegação no telefone">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>O menu lateral vira o botão <Strong>☰</Strong> no topo da tela.</li>
            <li>Comece pelo <Strong>Meu Dia</Strong>: suas tarefas de hoje em uma lista só.</li>
            <li>Listas e formulários se reorganizam automaticamente para a tela estreita.</li>
          </ul>
        </Subsection>
        <Subsection title="Tirar foto na obra">
          <p className="text-sm text-muted-foreground">Abra a tarefa (ou projeto) → seção <Strong>Anexos</Strong> → toque em <Strong>Foto</Strong> 📷. A câmera abre na hora e a foto já fica anexada — ótimo para registrar medições, problemas e instalações concluídas.</p>
        </Subsection>
        <Subsection title="Atalho na tela inicial (como um app)">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>iPhone (Safari)</Strong>: botão Compartilhar → <em>Adicionar à Tela de Início</em>.</li>
            <li><Strong>Android (Chrome)</Strong>: menu ⋮ → <em>Adicionar à tela inicial</em>.</li>
          </ul>
        </Subsection>
        <Tip>Peça para a equipe de instalação anexar uma foto ao concluir cada esquadria — o histórico da obra fica registrado sem esforço.</Tip>
      </div>
    ),
  },
  {
    id: "campos-personalizados",
    title: "Campos Personalizados",
    icon: Settings2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Adicione campos extras a projetos e tarefas para registrar informações específicas do seu negócio — como número de contrato, metragem, cidade ou qualquer dado relevante.
        </p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">
            Clique em <Strong>Campos Personalizados</Strong> no menu lateral, na seção <Strong>Análises</Strong>.
          </p>
        </Subsection>
        <Subsection title="Tipos de campo disponíveis">
          <Table
            headers={["Tipo", "Uso"]}
            rows={[
              ["Texto", "Qualquer informação livre: endereço, observação, código..."],
              ["Número", "Valores numéricos: metragem, quantidade, valor estimado..."],
              ["Data", "Datas específicas: entrega prevista, início de garantia..."],
              ["Seleção", "Lista de opções predefinidas: aprovado/reprovado, região..."],
            ]}
          />
        </Subsection>
        <Subsection title="Criar um campo">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>+ Novo Campo</Strong>.</li>
            <li>Informe o nome, escolha se aplica a Projeto ou Tarefa e selecione o tipo.</li>
            <li>Para campos de <Strong>Seleção</Strong>, informe as opções separadas por vírgula.</li>
            <li>Clique em <Strong>Criar Campo</Strong>.</li>
          </ol>
        </Subsection>
        <Tip>Use o filtro no topo para ver apenas campos de Projetos ou apenas campos de Tarefas.</Tip>
        <Subsection title="Excluir um campo">
          <p className="text-sm text-muted-foreground">
            Passe o mouse sobre o campo e clique no ícone de lixeira que aparece à direita. A exclusão é permanente.
          </p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "diario-obra",
    title: "Diário de Obra",
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Registro diário das atividades executadas em campo — clima, efetivo, ocorrências e observações — acessível dentro de cada projeto.
        </p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">
            Abra o <Strong>Detalhe de um Projeto</Strong> e role a página até encontrar o card <Strong>Diário de Obra</Strong>.
          </p>
        </Subsection>
        <Subsection title="Criar um registro">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>Novo Registro</Strong>.</li>
            <li>Selecione a <Strong>data</Strong> e o número de pessoas em campo (<Strong>Efetivo</Strong>).</li>
            <li>Escolha o <Strong>clima</Strong> do dia (opcional).</li>
            <li>Descreva as <Strong>Atividades executadas</Strong> (campo obrigatório).</li>
            <li>Preencha <Strong>Observações</Strong> e <Strong>Ocorrências</Strong> se houver.</li>
            <li>Clique em <Strong>Salvar Registro</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Visualizar registros">
          <p className="text-sm text-muted-foreground">
            Os registros aparecem em ordem cronológica. Clique em um registro para expandi-lo e ver todos os detalhes. Clique novamente para recolher.
          </p>
        </Subsection>
        <Tip>O campo <Strong>Ocorrências</Strong> é ideal para registrar acidentes, imprevistos, falta de material ou qualquer situação que afete o andamento da obra.</Tip>
        <Subsection title="Excluir um registro">
          <p className="text-sm text-muted-foreground">
            Expanda o registro e clique em <Strong>Excluir</Strong> no rodapé. A ação é irreversível.
          </p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "materiais",
    title: "Controle de Materiais",
    icon: Package,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Registre entradas, saídas e estoque de materiais utilizados em cada projeto, com quantidade, valor unitário e histórico completo.
        </p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">
            Abra o <Strong>Detalhe de um Projeto</Strong> e role a página até encontrar o card <Strong>Controle de Materiais</Strong>.
          </p>
        </Subsection>
        <Subsection title="Tipos de movimentação">
          <Table
            headers={["Tipo", "Quando usar"]}
            rows={[
              ["Entrada", "Material chegou ao projeto (compra, transferência recebida)"],
              ["Saída", "Material foi utilizado, retirado ou devolvido"],
              ["Estoque", "Inventário atual — quantidade disponível no momento"],
            ]}
          />
        </Subsection>
        <Subsection title="Registrar um material">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>Registrar</Strong>.</li>
            <li>Informe o <Strong>nome</Strong> do material, <Strong>unidade</Strong> (sacos, m², kg...) e <Strong>tipo</Strong>.</li>
            <li>Preencha a <Strong>quantidade</Strong> e, opcionalmente, o <Strong>valor unitário</Strong>.</li>
            <li>Selecione a <Strong>data</Strong> da movimentação.</li>
            <li>Adicione <Strong>observações</Strong> como fornecedor ou nota fiscal (opcional).</li>
            <li>Clique em <Strong>Registrar</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Cards de resumo">
          <p className="text-sm text-muted-foreground">
            Quando há registros, aparecem 3 cards automáticos: total de entradas, total de saídas e valor financeiro total (soma de quantidade × valor unitário de todos os registros com preço informado).
          </p>
        </Subsection>
        <Tip>Informe o <Strong>valor unitário</Strong> sempre que possível — isso permite acompanhar o custo total de materiais por projeto.</Tip>
      </div>
    ),
  },
  {
    id: "marcos",
    title: "Marcos do Projeto",
    icon: Flag,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Marcos são datas-chave intermediárias dentro de um projeto — como "Aprovação do projeto", "Início da instalação" ou "Entrega ao cliente". Ficam visíveis no detalhe de cada projeto com indicador de prazo e status.
        </p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">
            Abra o <Strong>Detalhe de um Projeto</Strong> e localize o card <Strong>Marcos do Projeto</Strong> (aparece ao lado do Gráfico de Progresso Semanal).
          </p>
        </Subsection>
        <Subsection title="Criar um marco">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>+ Adicionar marco</Strong> (visível apenas para Gestores).</li>
            <li>Informe o <Strong>nome do marco</Strong> e selecione a <Strong>data prevista</Strong>.</li>
            <li>Clique em <Strong>Salvar</Strong> ou pressione Enter.</li>
          </ol>
        </Subsection>
        <Subsection title="Status dos marcos">
          <Table
            headers={["Ícone", "Significado"]}
            rows={[
              ["✅ Verde", "Marco concluído — clique para reabrir se necessário"],
              ["🕐 Muted", "Marco futuro — dentro do prazo"],
              ["🟡 Âmbar", "Marco vence em 7 dias ou menos"],
              ["🔴 Vermelho", "Marco vencido — data já passou e não foi concluído"],
            ]}
          />
        </Subsection>
        <Subsection title="Marcar como concluído">
          <p className="text-sm text-muted-foreground">
            Clique no ícone de círculo à esquerda do marco para alternar entre concluído e pendente. Qualquer membro pode fazer isso. Marcos concluídos ficam com texto riscado e fundo verde claro.
          </p>
        </Subsection>
        <Tip>Use marcos para monitorar etapas críticas que não dependem de tarefas — como aprovações externas, datas de entrega contratuais ou vistorias.</Tip>
        <Subsection title="Excluir um marco">
          <p className="text-sm text-muted-foreground">
            Passe o mouse sobre o marco e clique no ícone de lixeira que aparece à direita (visível apenas para Gestores). A exclusão é permanente.
          </p>
        </Subsection>
      </div>
    ),
  },
  {
    id: "burndown",
    title: "Gráfico de Progresso Semanal",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gráfico de barras que mostra a evolução semanal de tarefas criadas versus tarefas concluídas nas últimas 12 semanas de cada projeto. Permite identificar ritmo de trabalho, gargalos e períodos de alta entrega.
        </p>
        <Subsection title="Como acessar">
          <p className="text-sm text-muted-foreground">
            Abra o <Strong>Detalhe de um Projeto</Strong> e localize o card <Strong>Progresso Semanal</Strong> (aparece ao lado dos Marcos do Projeto).
          </p>
        </Subsection>
        <Subsection title="Como ler o gráfico">
          <Table
            headers={["Barra", "Significado"]}
            rows={[
              ["Cinza (Criadas)", "Tarefas criadas naquela semana — crescimento do escopo"],
              ["Azul/Primária (Concluídas)", "Tarefas concluídas naquela semana — velocidade de entrega"],
            ]}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Semanas em que as barras <Strong>azuis superam as cinzas</Strong> indicam alta produtividade. Semanas em que as cinzas dominam podem indicar escopo crescendo mais rápido que a equipe entrega.
          </p>
        </Subsection>
        <Tip>Se o gráfico aparecer vazio, significa que nenhuma tarefa foi criada ou concluída nas últimas 12 semanas. Adicione tarefas ao projeto para começar a ver o histórico.</Tip>
      </div>
    ),
  },
  {
    id: "dashboard-analytics",
    title: "Dashboard — Análises e Alertas",
    icon: AlertCircle,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O Dashboard ganhou duas novas seções de análise na parte inferior: <Strong>Carga da Equipe</Strong> e <Strong>Projetos com Prazo Vencido</Strong>.
        </p>
        <Subsection title="Carga da Equipe">
          <p className="text-sm text-muted-foreground mb-2">
            Exibe todos os membros que possuem tarefas atribuídas, com:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Tarefas abertas</Strong> — quantidade de tarefas ainda não concluídas atribuídas ao membro.</li>
            <li><Strong>Tarefas vencidas</Strong> — abertas com prazo já expirado (aparece em vermelho).</li>
            <li><Strong>Barra de progresso</Strong> — percentual de tarefas concluídas em relação ao total atribuído.</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">Os membros com mais tarefas abertas aparecem no topo da lista.</p>
        </Subsection>
        <Subsection title="Projetos com Prazo Vencido">
          <p className="text-sm text-muted-foreground">
            Lista todos os projetos que têm pelo menos uma data de fase no passado (fim estimado, entrega, produção etc.), agrupados por projeto. Cada item mostra quantos prazos estão vencidos e qual o maior atraso em dias. Clique no item para ir direto ao projeto.
          </p>
        </Subsection>
        <Tip>Use o card <Strong>Alertas de Prazo</Strong> (existente) para ver todas as datas próximas, e o novo card <Strong>Projetos com Prazo Vencido</Strong> para focar exclusivamente no que já passou da data.</Tip>
        <Subsection title="Complemento: Desempenho">
          <p className="text-sm text-muted-foreground">
            Para uma análise mais completa por membro, acesse <Strong>Desempenho</Strong> (menu Análises) — a tabela por pessoa mostra concluídas, pontualidade, abertas e atrasadas de cada membro.
          </p>
        </Subsection>
      </div>
    ),
  },
];

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-foreground">{children}</span>;
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
      <span className="text-blue-500 mt-0.5 shrink-0">💡</span>
      <p className="text-sm text-blue-800 dark:text-blue-200">{children}</p>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-md border overflow-hidden text-sm">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 font-medium text-foreground text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="bg-card hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={cn("px-3 py-2 text-muted-foreground", j === 0 && "font-medium text-foreground")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: "blue" | "amber" | "green" | "red" }) {
  const classes = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", classes[color])}>
      {label}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="ml-auto mr-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase tracking-wide">
      Novo
    </span>
  );
}

function SectionCard({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  const Icon = section.icon;
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="flex-1 font-semibold text-foreground text-sm">{section.title}</span>
        {section.isNew && <NewBadge />}
        {isOpen
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t bg-muted/10">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function Ajuda() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["acesso"]));

  function toggle(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setOpenSections(new Set(sections.map((s) => s.id)));
  }

  function collapseAll() {
    setOpenSections(new Set());
  }

  const newCount = sections.filter((s) => s.isNew).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Ajuda</h1>
            {newCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {newCount} novidades
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Manual de uso do sistema Ulimax &amp; Co. — clique em uma seção para expandir.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={openTour}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5"
          >
            ✨ Tour rápido
          </button>
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            Expandir tudo
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            Recolher tudo
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Ulimax &amp; Co. · Sistema de Controle de Projetos · Uso interno
      </p>
    </div>
  );
}
