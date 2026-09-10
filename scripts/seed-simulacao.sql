-- =============================================================================
-- SIMULAÇÃO — um mês de operação da Ulimax (setembro/2026)
-- =============================================================================
-- Popula o app com VOLUME de verdade para você sentir onde ele trava: 8 obras
-- em fases diferentes, ~45 tarefas (incluindo fornecedores externos), visitas
-- com e sem RDO, agenda de equipes, assistências e amostras.
--
-- Tudo prefixado com "[SIM]" — o bloco de limpeza no final remove só isto,
-- sem tocar nos seus dados reais nem no seed antigo "[DEMO]".
-- As datas são RELATIVAS a hoje (CURRENT_DATE): rodando em qualquer dia, os
-- atrasos e alertas caem certo.
--
-- Rode UMA vez no Supabase → SQL Editor.
-- =============================================================================
BEGIN;

-- 1) Equipe -------------------------------------------------------------------
INSERT INTO members (name, role, email, team) VALUES
  ('[SIM] Ana Projetista',     'Projetista',      'sim.ana@ulimax.test',     'projetos'),
  ('[SIM] Bruno Projetista',   'Projetista',      'sim.bruno@ulimax.test',   'projetos'),
  ('[SIM] Carla Gestora Obras','Gestor de Obras', 'sim.carla@ulimax.test',   'tecnica'),
  ('[SIM] Diego Instalador',   'Instalador',      'sim.diego@ulimax.test',   'tecnica'),
  ('[SIM] Elaine Compras',     'Suprimentos',     'sim.elaine@ulimax.test',  'projetos')
ON CONFLICT (email) DO NOTHING;

-- 2) Obras — uma em cada fase, com datas coerentes ----------------------------
INSERT INTO projects
  (name, description, status, priority, material_type,
   start_date, end_date, final_date,
   producao_start_date, producao_end_date, producao_final_date,
   medicao_date, instalacao_start_date, approval_status, approval_note, approval_at)
VALUES
  -- 1. Medição feita, projeto ainda não começou
  ('[SIM] Casa Ipê', 'Esquadrias de madeira — térreo e mezanino', 'a_iniciar', 'medium', 'madeira',
   NULL, to_char(CURRENT_DATE+40,'YYYY-MM-DD'), NULL,
   NULL, NULL, NULL,
   to_char(CURRENT_DATE-3,'YYYY-MM-DD'), NULL, NULL, NULL, NULL),

  -- 2. Em projeto, prazo de desenho vencendo em 2 dias
  ('[SIM] Apartamento Jatobá', 'Janelas e portas de alumínio', 'em_projeto', 'high', 'aluminio',
   to_char(CURRENT_DATE-12,'YYYY-MM-DD'), to_char(CURRENT_DATE+2,'YYYY-MM-DD'), NULL,
   NULL, NULL, NULL,
   to_char(CURRENT_DATE-15,'YYYY-MM-DD'), NULL, NULL, NULL, NULL),

  -- 3. Em projeto ATRASADO (fim do projeto passou, sem data final)
  ('[SIM] Cobertura Cedro', 'Portas de correr e guarda-corpo', 'em_projeto', 'high', 'madeira',
   to_char(CURRENT_DATE-25,'YYYY-MM-DD'), to_char(CURRENT_DATE-4,'YYYY-MM-DD'), NULL,
   NULL, NULL, NULL,
   to_char(CURRENT_DATE-28,'YYYY-MM-DD'), NULL, NULL, NULL, NULL),

  -- 4. NA ARQUITETURA, aguardando decisão há 6 dias
  ('[SIM] Residência Angelim', 'Fachada em alumínio + esquadrias sociais', 'em_aprovacao', 'medium', 'aluminio',
   to_char(CURRENT_DATE-30,'YYYY-MM-DD'), to_char(CURRENT_DATE-6,'YYYY-MM-DD'), to_char(CURRENT_DATE-6,'YYYY-MM-DD'),
   NULL, NULL, NULL,
   to_char(CURRENT_DATE-34,'YYYY-MM-DD'), to_char(CURRENT_DATE+35,'YYYY-MM-DD'), NULL, NULL, NULL),

  -- 5. NA ARQUITETURA e REPROVADA — precisa revisar
  ('[SIM] Loft Peroba', 'Painéis pivotantes de madeira', 'em_aprovacao', 'high', 'madeira',
   to_char(CURRENT_DATE-40,'YYYY-MM-DD'), to_char(CURRENT_DATE-10,'YYYY-MM-DD'), to_char(CURRENT_DATE-9,'YYYY-MM-DD'),
   NULL, NULL, NULL,
   to_char(CURRENT_DATE-45,'YYYY-MM-DD'), NULL,
   'rejected', 'Arquitetura pediu alterar o sentido de abertura das folhas do living.', NOW() - INTERVAL '3 days'),

  -- 6. EM PRODUÇÃO, fim da produção em 5 dias → entra em "visitas sugeridas"
  ('[SIM] Casa Guanandi', 'Esquadrias de alumínio com vidro duplo', 'em_producao', 'medium', 'aluminio',
   to_char(CURRENT_DATE-55,'YYYY-MM-DD'), to_char(CURRENT_DATE-20,'YYYY-MM-DD'), to_char(CURRENT_DATE-20,'YYYY-MM-DD'),
   to_char(CURRENT_DATE-18,'YYYY-MM-DD'), to_char(CURRENT_DATE+5,'YYYY-MM-DD'), NULL,
   to_char(CURRENT_DATE-60,'YYYY-MM-DD'), to_char(CURRENT_DATE+12,'YYYY-MM-DD'),
   'approved', 'Aprovado sem ressalvas.', NOW() - INTERVAL '22 days'),

  -- 7. EM PRODUÇÃO ATRASADA (fim da produção passou, sem data final)
  ('[SIM] Edifício Sucupira', 'Fachada ventilada — 3 pavimentos', 'em_producao', 'high', 'aluminio',
   to_char(CURRENT_DATE-70,'YYYY-MM-DD'), to_char(CURRENT_DATE-35,'YYYY-MM-DD'), to_char(CURRENT_DATE-33,'YYYY-MM-DD'),
   to_char(CURRENT_DATE-30,'YYYY-MM-DD'), to_char(CURRENT_DATE-6,'YYYY-MM-DD'), NULL,
   to_char(CURRENT_DATE-75,'YYYY-MM-DD'), to_char(CURRENT_DATE+3,'YYYY-MM-DD'),
   'approved', 'Aprovado com ressalva no perfil da esquina.', NOW() - INTERVAL '38 days'),

  -- 8. EM INSTALAÇÃO, última visita há 18 dias → pede visita (cadência 15d)
  ('[SIM] Residência Imbuia', 'Esquadrias de madeira maciça', 'em_instalacao', 'high', 'madeira',
   to_char(CURRENT_DATE-90,'YYYY-MM-DD'), to_char(CURRENT_DATE-50,'YYYY-MM-DD'), to_char(CURRENT_DATE-48,'YYYY-MM-DD'),
   to_char(CURRENT_DATE-45,'YYYY-MM-DD'), to_char(CURRENT_DATE-15,'YYYY-MM-DD'), to_char(CURRENT_DATE-14,'YYYY-MM-DD'),
   to_char(CURRENT_DATE-95,'YYYY-MM-DD'), to_char(CURRENT_DATE-10,'YYYY-MM-DD'),
   'approved', NULL, NOW() - INTERVAL '52 days');

-- 3) Participantes (define "Meus projetos" na Prancheta) ----------------------
INSERT INTO project_members (project_id, member_id)
SELECT p.id, m.id
FROM projects p
JOIN members m ON m.email IN ('sim.ana@ulimax.test', 'sim.carla@ulimax.test')
WHERE p.name LIKE '[SIM]%'
ON CONFLICT DO NOTHING;

INSERT INTO project_members (project_id, member_id)
SELECT p.id, m.id
FROM projects p
JOIN members m ON m.email = 'sim.bruno@ulimax.test'
WHERE p.name IN ('[SIM] Cobertura Cedro', '[SIM] Loft Peroba', '[SIM] Edifício Sucupira')
ON CONFLICT DO NOTHING;

-- 4) Tarefas — o volume que o dia a dia tem de verdade ------------------------
-- Mistura: em dia, vencendo, atrasadas, concluídas e de fornecedor externo.
INSERT INTO tasks (project_id, title, description, status, priority, assigned_to,
                   responsible_external, due_date, started_at, completed_at)
SELECT p.id, t.title, t.descr, t.status::task_status, t.prio::task_priority,
       (SELECT id FROM members WHERE email = t.email),
       t.externo,
       CASE WHEN t.due IS NULL THEN NULL ELSE to_char(CURRENT_DATE + t.due, 'YYYY-MM-DD') END,
       CASE WHEN t.started IS NULL THEN NULL ELSE NOW() + (t.started || ' days')::interval END,
       CASE WHEN t.done IS NULL THEN NULL ELSE NOW() + (t.done || ' days')::interval END
FROM projects p
JOIN (VALUES
  -- obra                      título                                        descrição                              status         prio      responsável                  externo                prazo início concl.
  ('[SIM] Casa Ipê',           'Conferir medidas do mezanino',               'Cotas do projeto x medição in loco',  'todo',        'medium', 'sim.ana@ulimax.test',       NULL,                    3,   NULL, NULL),
  ('[SIM] Casa Ipê',           'Enviar proposta revisada ao cliente',        NULL,                                  'todo',        'high',   'sim.ana@ulimax.test',       NULL,                    1,   NULL, NULL),
  ('[SIM] Apartamento Jatobá', 'Detalhar perfis da sacada',                  'Perfil série 30 com persiana',        'in_progress', 'high',   'sim.bruno@ulimax.test',     NULL,                    2,   -3,   NULL),
  ('[SIM] Apartamento Jatobá', 'Fechar quantitativo de vidros',              NULL,                                  'todo',        'medium', 'sim.elaine@ulimax.test',    NULL,                    4,   NULL, NULL),
  ('[SIM] Apartamento Jatobá', 'Cotação de ferragens importadas',            'Comparar 3 fornecedores',             'in_progress', 'medium', 'sim.elaine@ulimax.test',    NULL,                    6,   -2,   NULL),
  ('[SIM] Cobertura Cedro',    'Refazer corte do guarda-corpo',              'Cliente pediu montante mais fino',    'todo',        'high',   'sim.bruno@ulimax.test',     NULL,                   -5,   NULL, NULL),
  ('[SIM] Cobertura Cedro',    'Aprovar amostra de acabamento',              NULL,                                  'todo',        'medium', 'sim.ana@ulimax.test',       NULL,                   -2,   NULL, NULL),
  ('[SIM] Cobertura Cedro',    'Enviar desenho executivo por e-mail',        NULL,                                  'review',      'high',   'sim.bruno@ulimax.test',     NULL,                   -1,   -6,   NULL),
  ('[SIM] Residência Angelim', 'Cobrar retorno da arquitetura',              'Enviado há 6 dias, sem resposta',     'todo',        'high',   'sim.ana@ulimax.test',       NULL,                    0,   NULL, NULL),
  ('[SIM] Residência Angelim', 'Preparar lista de produção',                 NULL,                                  'todo',        'medium', 'sim.elaine@ulimax.test',    NULL,                    8,   NULL, NULL),
  ('[SIM] Loft Peroba',        'Revisar sentido de abertura das folhas',     'Pedido da arquitetura na reprovação', 'in_progress', 'high',   'sim.bruno@ulimax.test',     NULL,                    1,   -2,   NULL),
  ('[SIM] Loft Peroba',        'Reenviar desenho para nova aprovação',       NULL,                                  'todo',        'high',   'sim.bruno@ulimax.test',     NULL,                    3,   NULL, NULL),
  ('[SIM] Casa Guanandi',      'Acompanhar montagem dos caixilhos',          NULL,                                  'in_progress', 'medium', 'sim.diego@ulimax.test',     NULL,                    5,   -4,   NULL),
  ('[SIM] Casa Guanandi',      'Programar transporte para a obra',           'Caminhão + içamento',                 'todo',        'medium', 'sim.carla@ulimax.test',     NULL,                   10,   NULL, NULL),
  ('[SIM] Casa Guanandi',      'Entregar vidros duplos na fábrica',          'Pedido 4471',                         'todo',        'high',   NULL,                        'Vidraçaria Cristal',    -3,   NULL, NULL),
  ('[SIM] Edifício Sucupira',  'Cobrar prazo da anodização',                 'Lote 2 parado no fornecedor',         'todo',        'high',   NULL,                        'Anodex Tratamentos',    -8,   NULL, NULL),
  ('[SIM] Edifício Sucupira',  'Refazer 4 perfis fora de esquadro',          NULL,                                  'in_progress', 'high',   'sim.diego@ulimax.test',     NULL,                   -2,   -5,   NULL),
  ('[SIM] Edifício Sucupira',  'Conferir contramarcos do 3º pavimento',      NULL,                                  'todo',        'medium', 'sim.carla@ulimax.test',     NULL,                    2,   NULL, NULL),
  ('[SIM] Edifício Sucupira',  'Liberar pagamento da 2ª parcela',            NULL,                                  'todo',        'low',    'sim.elaine@ulimax.test',    NULL,                    7,   NULL, NULL),
  ('[SIM] Residência Imbuia',  'Instalar esquadrias da suíte',               NULL,                                  'in_progress', 'high',   'sim.diego@ulimax.test',     NULL,                    1,   -3,   NULL),
  ('[SIM] Residência Imbuia',  'Corrigir vedação da janela do living',       'Infiltração vista na última visita',  'todo',        'high',   'sim.diego@ulimax.test',     NULL,                   -4,   NULL, NULL),
  ('[SIM] Residência Imbuia',  'Entregar borrachas de vedação',              'Perfil EPDM 12mm',                    'todo',        'medium', NULL,                        'Vedatec Borrachas',     -1,   NULL, NULL),
  ('[SIM] Residência Imbuia',  'Agendar limpeza final com o cliente',        NULL,                                  'todo',        'low',    'sim.carla@ulimax.test',     NULL,                    9,   NULL, NULL),
  -- concluídas (alimentam o tempo de ciclo e o "O que andou")
  ('[SIM] Residência Imbuia',  'Instalar esquadrias do térreo',              NULL,                                  'done',        'high',   'sim.diego@ulimax.test',     NULL,                   -8,  -20,  -6),
  ('[SIM] Residência Imbuia',  'Conferir aprumo dos batentes',               NULL,                                  'done',        'medium', 'sim.diego@ulimax.test',     NULL,                  -12,  -16,  -11),
  ('[SIM] Edifício Sucupira',  'Fechar projeto executivo da fachada',        NULL,                                  'done',        'high',   'sim.bruno@ulimax.test',     NULL,                  -35,  -60,  -34),
  ('[SIM] Casa Guanandi',      'Aprovar protótipo do caixilho',              NULL,                                  'done',        'medium', 'sim.ana@ulimax.test',       NULL,                  -25,  -30,  -24),
  ('[SIM] Casa Guanandi',      'Comprar perfis série 42',                    NULL,                                  'done',        'high',   'sim.elaine@ulimax.test',    NULL,                  -19,  -22,  -18),
  ('[SIM] Apartamento Jatobá', 'Levantar medidas em campo',                  NULL,                                  'done',        'medium', 'sim.ana@ulimax.test',       NULL,                  -14,  -16,  -13),
  ('[SIM] Casa Ipê',           'Registrar medição no sistema',               NULL,                                  'done',        'low',    'sim.ana@ulimax.test',       NULL,                   -3,   -4,   -2)
) AS t(obra, title, descr, status, prio, email, externo, due, started, done)
  ON p.name = t.obra
WHERE p.name LIKE '[SIM]%';

-- 5) Visitas — realizadas (umas com RDO, outras sem) e futuras ----------------
INSERT INTO site_visits (project_id, date, responsible_id, visitors, objective, notes, report_file_key)
SELECT p.id, to_char(CURRENT_DATE + v.dia, 'YYYY-MM-DD'),
       (SELECT id FROM members WHERE email = 'sim.carla@ulimax.test'),
       v.visitantes, v.objetivo, v.obs, v.rdo
FROM projects p
JOIN (VALUES
  ('[SIM] Residência Imbuia', -18, 'Carla, Diego',            'Acompanhar instalação do térreo',      'Duas janelas com folga no batente.', '/demo/rdo-imbuia-1.pdf'),
  ('[SIM] Residência Imbuia', -4,  'Carla',                   'Verificar vedação do living',          'Infiltração confirmada; abrir tarefa.', NULL),
  ('[SIM] Edifício Sucupira', -9,  'Carla, Diego, engenheiro','Conferência de contramarcos',          'Pavimento 2 liberado.',              '/demo/rdo-sucupira-1.pdf'),
  ('[SIM] Edifício Sucupira', -2,  'Carla',                   'Medir vãos do 3º pavimento',           NULL,                                  NULL),
  ('[SIM] Casa Guanandi',     -12, 'Carla',                   'Alinhar prazo com o mestre de obras',  'Obra civil atrasada em 1 semana.',   '/demo/rdo-guanandi-1.pdf'),
  ('[SIM] Residência Angelim',-6,  'Ana, Carla',              'Levantamento para produção',           NULL,                                  NULL),
  ('[SIM] Residência Imbuia',  1,  'Carla, Diego',            'Vistoria das esquadrias da suíte',     NULL,                                  NULL),
  ('[SIM] Edifício Sucupira',  4,  'Carla',                   'Liberar início da instalação',         NULL,                                  NULL),
  ('[SIM] Casa Guanandi',      9,  'Carla, Diego',            'Conferir chegada do material',         NULL,                                  NULL)
) AS v(obra, dia, visitantes, objetivo, obs, rdo)
  ON p.name = v.obra
WHERE p.name LIKE '[SIM]%';

-- 6) Agenda das equipes (calendário) ------------------------------------------
INSERT INTO installation_events (title, project_id, team_description, event_type, start_date, end_date, notes, color)
SELECT e.titulo, p.id, e.equipe, e.tipo::installation_event_type,
       to_char(CURRENT_DATE + e.ini, 'YYYY-MM-DD'),
       to_char(CURRENT_DATE + e.fim, 'YYYY-MM-DD'),
       e.obs, e.cor
FROM projects p
JOIN (VALUES
  ('Instalação — Residência Imbuia', '[SIM] Residência Imbuia', 'Equipe A — Diego e Paulo', 'instalacao',  -10,  -1, 'Térreo concluído', 'orange'),
  ('Instalação — Residência Imbuia', '[SIM] Residência Imbuia', 'Equipe A — Diego e Paulo', 'instalacao',    2,   6, 'Suíte e mezanino', 'orange'),
  ('Instalação — Edifício Sucupira', '[SIM] Edifício Sucupira', 'Equipe B — Marcos e Ivo',  'instalacao',    3,   9, 'Pavimentos 1 e 2', 'blue'),
  ('Instalação — Casa Guanandi',     '[SIM] Casa Guanandi',     'Equipe A — Diego e Paulo', 'instalacao',   12,  16, NULL,               'orange'),
  ('Medição — Casa Ipê',             '[SIM] Casa Ipê',          'Equipe C — Ana',           'instalacao',   -3,  -3, 'Medição inicial',  'green')
) AS e(titulo, obra, equipe, tipo, ini, fim, obs, cor)
  ON p.name = e.obra
WHERE p.name LIKE '[SIM]%';

-- 7) Assistência técnica — inclusive obra antiga, fora do sistema -------------
INSERT INTO assistencia_tecnica (client_name, contact, description, status, scheduled_date, responsible_members, realizado)
VALUES
  ('[SIM] Família Torres — Rua das Acácias, 120', '(11) 98888-1010',
   'Vedação da janela da suíte soltando (obra entregue em 2021)', 'aberto',
   to_char(CURRENT_DATE+5,'YYYY-MM-DD'), NULL, false),
  ('[SIM] Condomínio Vista Verde', '(11) 97777-2020',
   'Porta de correr do salão travando', 'em_andamento',
   to_char(CURRENT_DATE+2,'YYYY-MM-DD'), 'Diego', false),
  ('[SIM] Sr. Almeida — Alameda Sul, 45', '(11) 96666-3030',
   'Troca de roldanas — garantia', 'aberto', NULL, NULL, false),
  ('[SIM] Padaria Central', '(11) 95555-4040',
   'Ajuste de mola da porta principal', 'concluido',
   to_char(CURRENT_DATE-7,'YYYY-MM-DD'), 'Diego', true);

-- 8) Amostras -----------------------------------------------------------------
INSERT INTO sample_controls (project_id, samples, responsible_id, deadline, requester, notes, ready, delivered)
SELECT p.id, s.amostras,
       (SELECT id FROM members WHERE email = 'sim.elaine@ulimax.test'),
       to_char(CURRENT_DATE + s.prazo, 'YYYY-MM-DD'), s.solicitante, s.obs, s.pronta, s.entregue
FROM projects p
JOIN (VALUES
  ('[SIM] Casa Ipê',           'Amostra de madeira cumaru + verniz fosco', -2, 'Arquiteta Marina', 'Cliente quer comparar 2 tons', false, false),
  ('[SIM] Apartamento Jatobá', 'Perfil série 30 anodizado preto',           3, 'Arquiteto Rafael', NULL,                          true,  false),
  ('[SIM] Loft Peroba',        'Peroba com acabamento natural',             8, 'Arquiteta Marina', NULL,                          false, false),
  ('[SIM] Casa Guanandi',      'Vidro duplo 4+12+4',                      -10, 'Cliente',          'Entregue na obra',            true,  true)
) AS s(obra, amostras, prazo, solicitante, obs, pronta, entregue)
  ON p.name = s.obra
WHERE p.name LIKE '[SIM]%';

COMMIT;

-- =============================================================================
-- O que esperar depois de rodar
-- =============================================================================
-- Dashboard ....... 8 projetos ativos, ~6 em atenção, ~8 tarefas atrasadas
-- Obras/Visitas ... 3 visitas futuras + obras pedindo visita (Imbuia, Guanandi)
-- Obras/Pendências. 3 RDOs faltando, 3 fornecedores para cobrar, datas vencidas
-- Calendário ...... 3 equipes com barras; 1 assistência aguardando equipe
-- Projeto ......... Loft Peroba mostra a arquitetura reprovada, com a nota
-- =============================================================================

-- =============================================================================
-- LIMPEZA — apaga SÓ a simulação (rode este bloco quando quiser recomeçar)
-- =============================================================================
-- BEGIN;
-- DELETE FROM installation_events WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[SIM]%');
-- DELETE FROM sample_controls     WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[SIM]%');
-- DELETE FROM site_visits         WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[SIM]%');
-- DELETE FROM tasks               WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[SIM]%');
-- DELETE FROM project_members     WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[SIM]%');
-- DELETE FROM projects            WHERE name  LIKE '[SIM]%';
-- DELETE FROM assistencia_tecnica WHERE client_name LIKE '[SIM]%';
-- DELETE FROM members             WHERE email LIKE 'sim.%@ulimax.test';
-- COMMIT;
