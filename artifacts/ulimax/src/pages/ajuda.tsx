import { useState } from "react";
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
            ["KPIs", "Total de projetos, projetos ativos, alertas de prazo e percentual de tarefas concluídas"],
            ["Fases dos Projetos", "Quantidade de projetos em cada etapa (A Iniciar → Em Instalação)"],
            ["Visitas em Obras", "Agenda de visitas: data, responsável e objetivo"],
            ["Alertas de Prazo", "Projetos com datas vencidas ou próximas do vencimento"],
            ["Material", "Proporção entre projetos em madeira e alumínio"],
          ]}
        />
        <Tip>Clique em qualquer fase (ex: <em>Em Produção</em>) para acessar a lista de projetos filtrada. Os alertas de prazo são clicáveis e abrem diretamente o projeto correspondente.</Tip>
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
        <Subsection title="Filtros disponíveis">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Busca por texto</Strong>: filtra por nome ou descrição</li>
            <li><Strong>Status</Strong>: A Iniciar · Em Projeto · Em Aprovação · Em Produção · Ag. Instalação · Em Instalação</li>
            <li><Strong>Prioridade</Strong>: Normal ou Alta</li>
          </ul>
        </Subsection>
        <Subsection title="Exportar relatório em PDF">
          <p className="text-sm text-muted-foreground">Dentro de qualquer projeto, clique no botão <Strong>Exportar PDF</Strong> no cabeçalho da página. O arquivo gerado contém nome, status, datas, descrição, lista completa de tarefas e membros da equipe.</p>
        </Subsection>
        <Tip>Clique no nome de um projeto para ver seu detalhe completo com estatísticas, tarefas vinculadas e o botão de exportação em PDF.</Tip>
      </div>
    ),
  },
  {
    id: "tarefas",
    title: "Tarefas",
    icon: CheckSquare,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Lista global de todas as tarefas de todos os projetos, com visão consolidada.</p>
        <Subsection title="Criar uma tarefa">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em <Strong>+ Nova Tarefa</Strong>.</li>
            <li>Preencha: título, descrição (suporta Markdown), projeto vinculado, status, prioridade, responsável e data de entrega.</li>
            <li>Clique em <Strong>Criar Tarefa</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Filtros disponíveis">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Status</Strong>: A Fazer · Em Andamento · Revisão · Concluída</li>
            <li><Strong>Prioridade</Strong>: Alta · Normal · Baixa</li>
            <li><Strong>Projeto</Strong>: exibe somente tarefas de um projeto específico</li>
          </ul>
        </Subsection>
        <Subsection title="Painel de detalhes">
          <p className="text-sm text-muted-foreground mb-2">Clique no botão <Strong>Detalhes</Strong> em qualquer tarefa para abrir um painel com:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Etiquetas</Strong>: tags coloridas para categorizar a tarefa</li>
            <li><Strong>Dependências</Strong>: tarefas que precisam ser concluídas antes</li>
            <li><Strong>Descrição</Strong>: renderizada em Markdown formatado</li>
            <li><Strong>Subtarefas</Strong>: etapas menores com barra de progresso</li>
            <li><Strong>Comentários</Strong>: histórico de mensagens contextualizadas</li>
            <li><Strong>Anexos</Strong>: upload de arquivos por arrastar e soltar</li>
          </ul>
        </Subsection>
        <Tip>Marque múltiplas tarefas com os checkboxes e use a barra de ações em massa para atualizar status ou prioridade de todas de uma vez.</Tip>
      </div>
    ),
  },
  {
    id: "subtarefas",
    title: "Subtarefas",
    icon: ListTree,
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    title: "Relatório PDF de Projeto",
    icon: FileDown,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Gere um relatório completo de qualquer projeto em formato PDF, pronto para compartilhar com clientes ou para arquivo.</p>
        <Subsection title="Gerar o PDF">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Acesse <Strong>Projetos</Strong> e clique no projeto desejado para abrir o detalhe.</li>
            <li>No cabeçalho da página, clique em <Strong>Exportar PDF</Strong>.</li>
            <li>O arquivo é gerado automaticamente e o download começa em instantes.</li>
          </ol>
        </Subsection>
        <Subsection title="O que está no relatório">
          <Table
            headers={["Seção", "Conteúdo"]}
            rows={[
              ["Cabeçalho", "Nome do projeto, status, prioridade e datas de início e entrega"],
              ["Descrição", "Texto completo da descrição do projeto"],
              ["Tarefas", "Lista de todas as tarefas com status, prioridade e responsável"],
              ["Equipe", "Membros participantes com nome e função"],
            ]}
          />
        </Subsection>
        <Tip>O PDF é gerado diretamente no navegador, sem necessidade de servidor externo. O nome do arquivo inclui o nome do projeto para fácil identificação.</Tip>
      </div>
    ),
  },
  {
    id: "notificacoes",
    title: "Notificações",
    icon: Bell,
    isNew: true,
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
              ["Status do projeto mudou de fase", "Todos os membros do projeto"],
              ["Projeto entrou em Em Aprovação", "Todos os membros + gestores"],
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
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cada projeto possui uma aba de <Strong>Linha do Tempo</Strong> que exibe as tarefas em formato Gantt, com barras coloridas representando início, duração e prazo de cada item.</p>
        <Subsection title="Como acessar">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Abra o detalhe de um projeto clicando no seu nome.</li>
            <li>Na área de tarefas, clique na aba <Strong>Linha do Tempo</Strong>.</li>
          </ol>
        </Subsection>
        <Subsection title="Leitura do gráfico">
          <Table
            headers={["Elemento", "Significado"]}
            rows={[
              ["Barra azul", "Tarefa em aberto — a largura representa a duração planejada"],
              ["Barra verde", "Tarefa concluída"],
              ["Barra vermelha", "Tarefa com prazo vencido"],
              ["Linha vertical pontilhada", "Dia de hoje"],
              ["Número ao lado da barra", "Dias restantes (ou dias de atraso se negativo)"],
            ]}
          />
        </Subsection>
        <Subsection title="Filtrar por status">
          <p className="text-sm text-muted-foreground">Use os botões de filtro acima do gráfico (Todas · A Fazer · Em Andamento · Revisão · Concluídas) para focar nas tarefas desejadas sem sair da visualização Gantt.</p>
        </Subsection>
        <Tip>Tarefas sem data de início ou prazo não aparecem na linha do tempo — cadastre as datas na tarefa para que ela seja exibida no gráfico.</Tip>
      </div>
    ),
  },
  {
    id: "fotos-arquivos",
    title: "Fotos e Arquivos do Projeto",
    icon: Camera,
    isNew: true,
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
    title: "Fluxo de Aprovação",
    icon: BadgeCheck,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Quando um projeto avança para a fase <Strong>Em Aprovação</Strong>, um painel de revisão é exibido no topo da página de detalhe para que gestores tomem a decisão de aprovar ou rejeitar.</p>
        <Subsection title="Como funciona o fluxo">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Altere o status do projeto para <Strong>Em Aprovação</Strong> (via edição ou Kanban).</li>
            <li>Todos os membros do projeto e os gestores recebem uma notificação automática.</li>
            <li>O painel âmbar <em>Aguardando Aprovação</em> aparece no detalhe do projeto.</li>
            <li>Um gestor clica em <Strong>Revisar e Decidir</Strong>, adiciona uma nota opcional e escolhe <Strong>Aprovar</Strong> ou <Strong>Rejeitar</Strong>.</li>
            <li>Todos os membros são notificados da decisão.</li>
          </ol>
        </Subsection>
        <Subsection title="Estados do painel">
          <Table
            headers={["Cor do painel", "Estado"]}
            rows={[
              ["Âmbar", "Pendente — aguardando decisão do gestor"],
              ["Verde", "Aprovado — projeto liberado para avançar"],
              ["Vermelho", "Rejeitado — projeto necessita de ajustes"],
            ]}
          />
        </Subsection>
        <Subsection title="Rever uma decisão">
          <p className="text-sm text-muted-foreground">Mesmo após aprovação ou rejeição, gestores podem clicar em <Strong>Rever decisão</Strong> no painel para registrar uma nova nota e mudar o resultado.</p>
        </Subsection>
        <Subsection title="Quem pode aprovar">
          <p className="text-sm text-muted-foreground">Somente usuários com função <Strong>Gestor</Strong> veem os botões de decisão. Executores e Observadores veem o painel em modo leitura, com o status atual e a nota registrada.</p>
        </Subsection>
        <Tip>A nota de aprovação fica visível para toda a equipe no painel do projeto — use-a para registrar condições, ressalvas ou instruções para a próxima etapa.</Tip>
      </div>
    ),
  },
  {
    id: "produtividade",
    title: "Produtividade",
    icon: BarChart2,
    isNew: true,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">O Dashboard de Produtividade oferece uma visão analítica do desempenho individual de cada membro da equipe, com base nas tarefas concluídas.</p>
        <Subsection title="Acessar">
          <p className="text-sm text-muted-foreground">Clique em <Strong>Produtividade</Strong> no menu lateral (visível para Gestores).</p>
        </Subsection>
        <Subsection title="O que você vê">
          <Table
            headers={["Gráfico / Seção", "O que mostra"]}
            rows={[
              ["Ranking de membros", "Quem concluiu mais tarefas no período"],
              ["Tarefas por membro", "Gráfico de barras com o volume de tarefas de cada pessoa"],
              ["Taxa de conclusão", "Percentual de tarefas concluídas em relação ao total atribuído"],
              ["Breakdown por status", "Distribuição das tarefas em A Fazer · Em Andamento · Revisão · Concluída para cada membro"],
            ]}
          />
        </Subsection>
        <Tip>Use esta página para identificar membros sobrecarregados ou subutilizados e redistribuir tarefas de forma mais equilibrada.</Tip>
      </div>
    ),
  },
  {
    id: "kanban",
    title: "Kanban",
    icon: Columns3,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Quadro visual para acompanhar projetos ou tarefas por fase.</p>
        <Subsection title="Modos de visualização">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Tarefas</Strong>: A Fazer · Em Andamento · Revisão · Concluída</li>
            <li><Strong>Projetos</Strong>: A Iniciar · Em Projeto · Em Aprovação · Em Produção · Ag. Instalação · Em Instalação</li>
          </ul>
        </Subsection>
        <Subsection title="Como usar">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Arraste e solte cards entre colunas para atualizar o status automaticamente.</li>
            <li>Clique no <Strong>+</Strong> no cabeçalho de uma coluna para criar um item já naquela fase.</li>
          </ul>
        </Subsection>
        <Tip>Cards com data vencida são destacados em vermelho automaticamente.</Tip>
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
      </div>
    ),
  },
  {
    id: "alertas",
    title: "Alertas",
    icon: Bell,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Central de notificações automáticas do sistema sobre situações críticas.</p>
        <Table
          headers={["Nível", "Quando aparece"]}
          rows={[
            ["🔴 Crítico", "Instalação atrasada, tarefa vencida"],
            ["🟡 Atenção", "Prazo próximo, projeto sem data de instalação"],
            ["🔵 Informativo", "Projetos parados, tarefas sem responsável"],
          ]}
        />
        <Subsection title="Categorias">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><Strong>Minhas Tarefas</Strong>: alertas relacionados ao seu usuário</li>
            <li><Strong>Críticos</Strong>, <Strong>Atenção</Strong>, <Strong>Informativos</Strong></li>
          </ul>
        </Subsection>
        <Tip>Clique em qualquer card de alerta para ser direcionado diretamente ao projeto ou tarefa relacionado.</Tip>
      </div>
    ),
  },
  {
    id: "assistencia",
    title: "Assistência Técnica",
    icon: Wrench,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Abertura e acompanhamento de chamados de suporte pós-entrega.</p>
        <Subsection title="Abrir um chamado">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
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
          <p className="text-sm text-muted-foreground mt-2">Marque o checkbox <Strong>Realizado</Strong> para concluir rapidamente um chamado.</p>
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
            ["Gestor", "Acesso total: criar, editar e excluir qualquer item"],
            ["Executor", "Editar apenas projetos e tarefas em que é participante"],
            ["Observador", "Somente visualização — não pode criar ou editar"],
          ]}
        />
        <Tip>O status de acesso indica se o membro já aceitou o convite (✅ Ativo) ou ainda não (📧 Pendente).</Tip>
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
