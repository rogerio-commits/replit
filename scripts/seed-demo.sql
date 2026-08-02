-- =============================================================================
-- Seed de DEMONSTRAÇÃO — Ulimax Projetos
-- =============================================================================
-- Popula o app com exemplos para testar as funcionalidades do gestor de obras.
-- Tudo é prefixado com "[DEMO]" para facilitar a remoção depois (ver o final).
-- As datas são RELATIVAS a hoje (CURRENT_DATE), então os alertas disparam certo
-- em qualquer dia que você rodar.
--
-- Rode UMA vez no Supabase (SQL Editor). Rodar de novo duplica os projetos
-- (membros e snapshots são idempotentes). Para recomeçar, use o bloco de
-- limpeza no final e rode o seed novamente.
-- =============================================================================
BEGIN;

-- 1) Membros ------------------------------------------------------------------
INSERT INTO members (name, role, email, team) VALUES
  ('[DEMO] João Instalador',      'Instalador',       'demo.joao@ulimax.test',   'tecnica'),
  ('[DEMO] Maria Projetista',     'Projetista',       'demo.maria@ulimax.test',  'projetos'),
  ('[DEMO] Carlos Gestor Obras',  'Gestor de Obras',  'demo.carlos@ulimax.test', 'tecnica')
ON CONFLICT (email) DO NOTHING;

-- 2) Projetos (cada um exercita uma funcionalidade) ---------------------------
INSERT INTO projects
  (name, description, status, priority, material_type,
   start_date, end_date, final_date,
   producao_start_date, producao_end_date, producao_final_date,
   medicao_date, instalacao_start_date)
VALUES
  -- A: EM INSTALAÇÃO, última visita há 20 dias, sem visita futura -> "Precisam de visita"
  ('[DEMO] Residência Alfa', 'Cozinha e dormitórios planejados', 'em_instalacao', 'high', 'madeira',
    to_char(CURRENT_DATE-45,'YYYY-MM-DD'), to_char(CURRENT_DATE-2,'YYYY-MM-DD'), to_char(CURRENT_DATE-2,'YYYY-MM-DD'),
    to_char(CURRENT_DATE-40,'YYYY-MM-DD'), to_char(CURRENT_DATE-15,'YYYY-MM-DD'), to_char(CURRENT_DATE-13,'YYYY-MM-DD'),
    to_char(CURRENT_DATE-42,'YYYY-MM-DD'), to_char(CURRENT_DATE-6,'YYYY-MM-DD')),

  -- B: EM PRODUÇÃO, produção estourou sem data final -> "Datas de obra vencidas"
  ('[DEMO] Edifício Beta', 'Painéis de alumínio da fachada', 'em_producao', 'medium', 'aluminio',
    to_char(CURRENT_DATE-30,'YYYY-MM-DD'), to_char(CURRENT_DATE+20,'YYYY-MM-DD'), NULL,
    to_char(CURRENT_DATE-20,'YYYY-MM-DD'), to_char(CURRENT_DATE-4,'YYYY-MM-DD'), NULL,
    to_char(CURRENT_DATE-25,'YYYY-MM-DD'), NULL),

  -- C: AGUARDANDO INSTALAÇÃO, prazo do projeto vencido e instalação atrasada;
  --    tem visita agendada em 3 dias -> "Próximas visitas" + "Prazo vencido"
  ('[DEMO] Loja Gama', 'Móveis comerciais e balcão', 'aguardando_instalacao', 'high', 'madeira',
    to_char(CURRENT_DATE-35,'YYYY-MM-DD'), to_char(CURRENT_DATE-5,'YYYY-MM-DD'), NULL,
    to_char(CURRENT_DATE-28,'YYYY-MM-DD'), to_char(CURRENT_DATE-10,'YYYY-MM-DD'), to_char(CURRENT_DATE-9,'YYYY-MM-DD'),
    to_char(CURRENT_DATE-30,'YYYY-MM-DD'), to_char(CURRENT_DATE-1,'YYYY-MM-DD')),

  -- D: EM PROJETO, medição marcada para daqui a 4 dias -> Agenda (datas futuras)
  ('[DEMO] Apartamento Delta', 'Home office e closet', 'em_projeto', 'low', 'madeira',
    to_char(CURRENT_DATE-8,'YYYY-MM-DD'), to_char(CURRENT_DATE+30,'YYYY-MM-DD'), NULL,
    NULL, NULL, NULL,
    to_char(CURRENT_DATE+4,'YYYY-MM-DD'), to_char(CURRENT_DATE+18,'YYYY-MM-DD')),

  -- E: EM INSTALAÇÃO, NUNCA visitada -> "Precisam de visita" (nunca visitada)
  ('[DEMO] Casa Épsilon', 'Cozinha em L', 'em_instalacao', 'medium', 'aluminio',
    to_char(CURRENT_DATE-38,'YYYY-MM-DD'), to_char(CURRENT_DATE+3,'YYYY-MM-DD'), NULL,
    to_char(CURRENT_DATE-33,'YYYY-MM-DD'), to_char(CURRENT_DATE-6,'YYYY-MM-DD'), to_char(CURRENT_DATE-5,'YYYY-MM-DD'),
    to_char(CURRENT_DATE-35,'YYYY-MM-DD'), to_char(CURRENT_DATE-4,'YYYY-MM-DD'));

-- 3) Tarefas (mistura de status; algumas com início e conclusão p/ tempo de ciclo)
INSERT INTO tasks (project_id, title, status, priority, assigned_to, due_date, started_at, completed_at)
VALUES
  ((SELECT id FROM projects WHERE name='[DEMO] Residência Alfa'), 'Montar bancada da cozinha', 'in_progress', 'high',
     (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), to_char(CURRENT_DATE-1,'YYYY-MM-DD'), now()-interval '4 days', NULL),
  ((SELECT id FROM projects WHERE name='[DEMO] Residência Alfa'), 'Revisar acabamento', 'done', 'medium',
     (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), to_char(CURRENT_DATE-6,'YYYY-MM-DD'), now()-interval '9 days', now()-interval '5 days'),
  ((SELECT id FROM projects WHERE name='[DEMO] Edifício Beta'), 'Cortar chapas de alumínio', 'done', 'high',
     (SELECT id FROM members WHERE email='demo.maria@ulimax.test'), to_char(CURRENT_DATE-8,'YYYY-MM-DD'), now()-interval '12 days', now()-interval '7 days'),
  ((SELECT id FROM projects WHERE name='[DEMO] Edifício Beta'), 'Preparar logística de entrega', 'todo', 'medium',
     (SELECT id FROM members WHERE email='demo.maria@ulimax.test'), to_char(CURRENT_DATE+2,'YYYY-MM-DD'), NULL, NULL),
  ((SELECT id FROM projects WHERE name='[DEMO] Loja Gama'), 'Confirmar data de instalação', 'in_progress', 'high',
     (SELECT id FROM members WHERE email='demo.carlos@ulimax.test'), to_char(CURRENT_DATE-2,'YYYY-MM-DD'), now()-interval '3 days', NULL);

-- 4) Planos de ação (um por obra; itens em aberto, vencidos, concluídos e externo)
INSERT INTO project_action_plans (project_id, title) VALUES
  ((SELECT id FROM projects WHERE name='[DEMO] Residência Alfa'), '[DEMO] Plano — Residência Alfa'),
  ((SELECT id FROM projects WHERE name='[DEMO] Edifício Beta'),   '[DEMO] Plano — Edifício Beta'),
  ((SELECT id FROM projects WHERE name='[DEMO] Loja Gama'),       '[DEMO] Plano — Loja Gama');

INSERT INTO project_action_items (plan_id, description, responsible_id, responsible_external, due_date, notes, completed_at)
VALUES
  -- Alfa: 1 vencido, 1 aberto futuro, 1 concluído
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Residência Alfa'),
     'Ajustar porta do armário superior', (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), NULL,
     to_char(CURRENT_DATE-3,'YYYY-MM-DD'), 'Cliente reclamou do alinhamento', NULL),
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Residência Alfa'),
     'Aplicar silicone na bancada', (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), NULL,
     to_char(CURRENT_DATE+2,'YYYY-MM-DD'), NULL, NULL),
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Residência Alfa'),
     'Conferir nivelamento do piso', (SELECT id FROM members WHERE email='demo.carlos@ulimax.test'), NULL,
     to_char(CURRENT_DATE-10,'YYYY-MM-DD'), NULL, now()-interval '2 days'),

  -- Beta: 1 vencido com responsável EXTERNO (testar WhatsApp), 1 aberto
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Edifício Beta'),
     'Reenviar amostra de pintura', NULL, 'Serralheria Progresso',
     to_char(CURRENT_DATE-2,'YYYY-MM-DD'), 'Fornecedor externo — cobrar por WhatsApp', NULL),
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Edifício Beta'),
     'Validar medidas com o cliente', (SELECT id FROM members WHERE email='demo.maria@ulimax.test'), NULL,
     to_char(CURRENT_DATE+1,'YYYY-MM-DD'), NULL, NULL),

  -- Gama: 2 vencidos
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Loja Gama'),
     'Refazer prateleira danificada no transporte', (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), NULL,
     to_char(CURRENT_DATE-4,'YYYY-MM-DD'), NULL, NULL),
  ((SELECT id FROM project_action_plans WHERE title='[DEMO] Plano — Loja Gama'),
     'Agendar guindaste para içamento', NULL, 'Locadora Alto Ltda',
     to_char(CURRENT_DATE-1,'YYYY-MM-DD'), 'Externo — WhatsApp', NULL);

-- 5) Visitas (passadas com follow-ups pendentes; uma futura) -------------------
INSERT INTO site_visits (project_id, date, responsible_id, visitors, objective, notes)
VALUES
  ((SELECT id FROM projects WHERE name='[DEMO] Residência Alfa'), to_char(CURRENT_DATE-20,'YYYY-MM-DD'),
     (SELECT id FROM members WHERE email='demo.carlos@ulimax.test'), 'Carlos, João', 'Acompanhar início da instalação', NULL),
  ((SELECT id FROM projects WHERE name='[DEMO] Edifício Beta'), to_char(CURRENT_DATE-10,'YYYY-MM-DD'),
     (SELECT id FROM members WHERE email='demo.carlos@ulimax.test'), 'Carlos', 'Vistoria de produção', NULL),
  ((SELECT id FROM projects WHERE name='[DEMO] Loja Gama'), to_char(CURRENT_DATE+3,'YYYY-MM-DD'),
     (SELECT id FROM members WHERE email='demo.carlos@ulimax.test'), 'Carlos, cliente', 'Alinhar data de instalação', NULL);

INSERT INTO visit_action_items (visit_id, description, responsible_id, due_date, completed_at)
VALUES
  -- Follow-ups pendentes -> "Checar in loco"
  ((SELECT id FROM site_visits WHERE project_id=(SELECT id FROM projects WHERE name='[DEMO] Residência Alfa') AND date=to_char(CURRENT_DATE-20,'YYYY-MM-DD')),
     'Verificar vedação da pia na próxima visita', (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), to_char(CURRENT_DATE-1,'YYYY-MM-DD'), NULL),
  ((SELECT id FROM site_visits WHERE project_id=(SELECT id FROM projects WHERE name='[DEMO] Edifício Beta') AND date=to_char(CURRENT_DATE-10,'YYYY-MM-DD')),
     'Checar torque dos fixadores', (SELECT id FROM members WHERE email='demo.joao@ulimax.test'), to_char(CURRENT_DATE+2,'YYYY-MM-DD'), NULL);

-- 6) Snapshots de métricas (últimos 8 dias) para o gráfico de Tendência --------
INSERT INTO metrics_snapshots (date, total_projects, active_projects, total_tasks, open_tasks, overdue_tasks, tasks_completed)
VALUES
  (CURRENT_DATE-7, 20, 13, 120, 70, 15, 3),
  (CURRENT_DATE-6, 20, 13, 122, 71, 17, 2),
  (CURRENT_DATE-5, 21, 14, 124, 72, 16, 4),
  (CURRENT_DATE-4, 21, 14, 126, 74, 19, 1),
  (CURRENT_DATE-3, 21, 14, 128, 75, 21, 5),
  (CURRENT_DATE-2, 22, 15, 130, 76, 20, 3),
  (CURRENT_DATE-1, 22, 15, 131, 77, 22, 4)
ON CONFLICT (date) DO NOTHING;

COMMIT;

-- =============================================================================
-- LIMPEZA (rode só quando quiser remover os dados de demonstração)
-- =============================================================================
-- BEGIN;
-- DELETE FROM visit_action_items WHERE visit_id IN
--   (SELECT id FROM site_visits WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[DEMO]%'));
-- DELETE FROM site_visits WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[DEMO]%');
-- DELETE FROM project_action_items WHERE plan_id IN
--   (SELECT id FROM project_action_plans WHERE title LIKE '[DEMO]%');
-- DELETE FROM project_action_plans WHERE title LIKE '[DEMO]%';
-- DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[DEMO]%');
-- DELETE FROM projects WHERE name LIKE '[DEMO]%';
-- DELETE FROM members WHERE email LIKE 'demo.%@ulimax.test';
-- DELETE FROM metrics_snapshots WHERE date >= CURRENT_DATE-7 AND date < CURRENT_DATE;
-- COMMIT;
