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
    id: "avancado-tarefas",
    title: "Recursos avançados de tarefas",
    icon: CheckSquare,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O básico (criar, atribuir, dar prazo e concluir) resolve o dia a dia. Estes recursos existem para
          quem precisar — todos ficam dentro do painel da tarefa, que abre ao clicar nela.
        </p>
        <Table
          headers={["Recurso", "Para que serve"]}
          rows={[
            ["Subtarefas", "Quebrar uma tarefa grande em passos, com progresso próprio"],
            ["Comentários e anexos", "Conversar sobre a tarefa e guardar arquivos junto dela"],
            ["Etiquetas", "Marcar assuntos (ex.: vidro, ferragem) e filtrar por eles"],
            ["Descrição em Markdown", "Formatar a descrição com listas, negrito e links"],
            ["Recorrência", "Tarefa que se repete (diária, semanal, mensal, anual)"],
            ["Registro de horas", "Apontar o tempo gasto na tarefa"],
            ["Dependências", "Marcar que uma tarefa espera outra terminar"],
            ["Criar em lote", "Colar uma lista e transformar cada linha numa tarefa"],
            ["Operações em massa", "Selecionar várias tarefas e mudar status, responsável ou prazo de uma vez"],
          ]}
        />
        <Tip>Nada disso é obrigatório: uma tarefa com título, responsável e prazo já cumpre o papel.</Tip>
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
                <Subsection title="Agendar uma equipe em 3 cliques">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>No painel <Strong>Aguardando agendamento</Strong> (obras com instalação prevista e ainda sem equipe), clique em <Strong>Agendar equipe</Strong> — ou clique direto numa célula do calendário, na linha da equipe e no dia.</li>
            <li>Escolha a <Strong>obra</Strong> na lista: o título é preenchido sozinho e a data prevista de instalação já vem sugerida. Escolha a <Strong>equipe</Strong> entre as existentes (ou <em>+ Nova equipe…</em>).</li>
            <li>Clique na <Strong>duração</Strong> — 1, 2, 3 ou 5 dias — e salve. Depois, arraste a barra no calendário para remarcar ou trocar de equipe.</li>
          </ol>
          <Tip>Vincular o evento à obra faz ele aparecer no projeto e nas telas de Obras. Escolher a equipe de uma lista evita criar linhas duplicadas por diferença de digitação.</Tip>
        </Subsection>
        <Subsection title="Assistência em obra antiga (fora do sistema)">
          <p className="text-sm text-muted-foreground">
            Obra entregue anos atrás não precisa estar cadastrada como projeto — nem o chamado precisa
            existir antes. No calendário, crie o evento, escolha o tipo <Strong>Assistência</Strong> e use
            <Strong> + Novo chamado (obra antiga)</Strong>: preencha cliente (o título se preenche sozinho),
            contato e o que houve. Ao salvar, o chamado é criado já <em>em andamento</em> e com a data — e
            passa a aparecer em <Strong>Obras → Operação → Assistência</Strong>.
            Se o chamado já existe, ele aparece no painel <Strong>Assistências aguardando equipe</Strong>:
            clique em <Strong>Alocar equipe</Strong> e o diálogo abre preenchido.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            No formulário, escolher o tipo <Strong>Assistência</Strong> troca o campo Obra pelo campo
            <Strong> Chamado de assistência</Strong>.
          </p>
        </Subsection>
        <Subsection title="Aviso de conflito de equipe">
          <p className="text-sm text-muted-foreground">
            Se a equipe escolhida já tiver compromisso no período, um aviso âmbar aparece no formulário
            listando o que já está marcado — e um aviso equivalente surge ao arrastar uma barra para o
            período ou a equipe ocupada. É só alerta: você decide e pode salvar mesmo assim.
          </p>
        </Subsection>
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
  },];

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
