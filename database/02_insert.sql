-- =============================================================================
-- TP3 - Etapa 2: População do banco de dados (PostgreSQL)
-- Sistema de Gestão de Cursos
-- Executar após 01_create.sql.
--
-- Toda a carga está em uma única transação. Isso permite que as regras RT01 e
-- RT02 (gatilhos instalados na etapa 03) sejam atendidas ao final da transação: cada pessoa
-- entra junto com sua subclasse e cada turma entra junto com sua alocação.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. pessoa (20 alunos e 6 professores; cada pessoa terá exatamente uma subclasse)
-- Os ids são gerados automaticamente (GENERATED ALWAYS), por isso as demais
-- inserções localizam as linhas pela chave natural (e-mail, código+ano, nome).
-- -----------------------------------------------------------------------------
INSERT INTO pessoa (nome, email, telefone, data_nascimento, tipo_pessoa, ativo) VALUES
    ('Ana Paula Silva',       'ana.silva@aluno.edu.br',        '11987654321', '2003-05-14', 'A', TRUE),
    ('Bruno Costa Lima',      'bruno.lima@aluno.edu.br',       '11976543210', '2001-11-02', 'A', TRUE),
    ('Carla Mendes',          'carla.mendes@aluno.edu.br',     NULL,          '2004-01-20', 'A', TRUE),
    ('Daniel Souza',          'daniel.souza@aluno.edu.br',     '21998877665', '2000-08-30', 'A', TRUE),
    ('Eduarda Rocha',         'eduarda.rocha@aluno.edu.br',    NULL,          NULL,         'A', TRUE),
    ('Felipe Alves',          'felipe.alves@aluno.edu.br',     '11955443322', '2002-03-11', 'A', TRUE),
    ('Gabriela Nunes',        'gabriela.nunes@aluno.edu.br',   '31988776655', '2005-07-07', 'A', TRUE),
    ('Henrique Dias',         'henrique.dias@aluno.edu.br',    '11944332211', '1999-12-19', 'A', TRUE),
    ('Isabela Ramos',         'isabela.ramos@aluno.edu.br',    NULL,          '2003-09-25', 'A', TRUE),
    ('João Pedro Martins',    'joao.martins@aluno.edu.br',     '41999112233', '2001-04-16', 'A', TRUE),
    ('Karen Oliveira',        'karen.oliveira@aluno.edu.br',   '11933221100', '2004-10-03', 'A', TRUE),
    ('Lucas Ferreira',        'lucas.ferreira@aluno.edu.br',   '21977665544', '2002-06-28', 'A', TRUE),
    ('Mariana Lopes',         'mariana.lopes@aluno.edu.br',    NULL,          '2000-02-09', 'A', TRUE),
    ('Nicolas Barbosa',       'nicolas.barbosa@aluno.edu.br',  '11922110099', '2003-12-12', 'A', TRUE),
    ('Olívia Teixeira',       'olivia.teixeira@aluno.edu.br',  '31966554433', '2005-01-05', 'A', TRUE),
    ('Pedro Henrique Gomes',  'pedro.gomes@aluno.edu.br',      '11911009988', '2001-07-22', 'A', TRUE),
    ('Rafaela Castro',        'rafaela.castro@aluno.edu.br',   NULL,          '2004-04-04', 'A', TRUE),
    ('Samuel Pinto',          'samuel.pinto@aluno.edu.br',     '41988001122', '1998-10-10', 'A', FALSE),
    ('Tatiane Moreira',       'tatiane.moreira@aluno.edu.br',  '11900998877', '2006-03-18', 'A', TRUE),
    ('Vinícius Araújo',       'vinicius.araujo@aluno.edu.br',  '11988990011', '2002-09-09', 'A', TRUE),
    ('Helena Prado',          'helena.prado@edu.br',           '11987001122', '1975-02-14', 'P', TRUE),
    ('Ricardo Tavares',       'ricardo.tavares@edu.br',        NULL,          '1980-06-30', 'P', TRUE),
    ('Juliana Campos',        'juliana.campos@edu.br',         '21988112233', '1972-08-08', 'P', TRUE),
    ('Marcos Viana',          'marcos.viana@edu.br',           '11977001234', '1985-11-11', 'P', TRUE),
    ('Simone Batista',        'simone.batista@edu.br',         NULL,          NULL,         'P', TRUE),
    ('Eduardo Freitas',       'eduardo.freitas@edu.br',        '31977889900', '1978-05-05', 'P', FALSE);

-- -----------------------------------------------------------------------------
-- 2. aluno (subclasse de pessoa; id_pessoa vem da pessoa com tipo 'A')
-- -----------------------------------------------------------------------------
INSERT INTO aluno (id_pessoa, tipo_pessoa, numero_matricula, data_ingresso, observacao, telefone_responsavel)
SELECT p.id_pessoa, p.tipo_pessoa, v.numero_matricula, v.data_ingresso::date, v.observacao, v.telefone_responsavel
FROM (VALUES
    ('ana.silva@aluno.edu.br',       '2025001', '2024-02-05', 'Bolsista PROUNI',           '11911112222'),
    ('bruno.lima@aluno.edu.br',      '2025002', '2024-02-05', NULL,                        NULL),
    ('carla.mendes@aluno.edu.br',    '2025003', '2024-02-05', 'Transferência externa',     NULL),
    ('daniel.souza@aluno.edu.br',    '2025004', '2024-02-05', NULL,                        NULL),
    ('eduarda.rocha@aluno.edu.br',   '2025005', '2024-02-05', NULL,                        NULL),
    ('felipe.alves@aluno.edu.br',    '2025006', '2024-02-05', NULL,                        NULL),
    ('gabriela.nunes@aluno.edu.br',  '2025007', '2024-02-05', 'Intercâmbio previsto',      NULL),
    ('henrique.dias@aluno.edu.br',   '2025008', '2024-02-05', NULL,                        NULL),
    ('isabela.ramos@aluno.edu.br',   '2025009', '2024-02-05', NULL,                        NULL),
    ('joao.martins@aluno.edu.br',    '2025010', '2024-02-05', NULL,                        NULL),
    ('karen.oliveira@aluno.edu.br',  '2025011', '2025-02-03', NULL,                        NULL),
    ('lucas.ferreira@aluno.edu.br',  '2025012', '2025-02-03', NULL,                        NULL),
    ('mariana.lopes@aluno.edu.br',   '2025013', '2025-02-03', NULL,                        NULL),
    ('nicolas.barbosa@aluno.edu.br', '2025014', '2025-02-03', NULL,                        NULL),
    ('olivia.teixeira@aluno.edu.br', '2025015', '2025-02-03', NULL,                        NULL),
    ('pedro.gomes@aluno.edu.br',     '2025016', '2024-08-05', NULL,                        NULL),
    ('rafaela.castro@aluno.edu.br',  '2025017', '2024-08-05', NULL,                        NULL),
    ('samuel.pinto@aluno.edu.br',    '2025018', '2024-08-05', 'Desligado (cadastro inativo)', NULL),
    ('tatiane.moreira@aluno.edu.br', '2025019', '2024-08-05', NULL,                        NULL),
    ('vinicius.araujo@aluno.edu.br', '2025020', '2024-08-05', NULL,                        '11999000011')
) AS v(email, numero_matricula, data_ingresso, observacao, telefone_responsavel)
JOIN pessoa p ON p.email = v.email AND p.tipo_pessoa = 'A';

-- -----------------------------------------------------------------------------
-- 3. professor (subclasse de pessoa; id_pessoa vem da pessoa com tipo 'P')
-- -----------------------------------------------------------------------------
INSERT INTO professor (id_pessoa, tipo_pessoa, titulacao, data_contratacao, especialidade, curriculo)
SELECT p.id_pessoa, p.tipo_pessoa, v.titulacao, v.data_contratacao::date, v.especialidade, v.curriculo
FROM (VALUES
    ('helena.prado@edu.br',      'Doutor',       '2010-02-01', 'Banco de Dados',          'Pesquisa em modelagem e otimização de SGBDs.'),
    ('ricardo.tavares@edu.br',   'Mestre',       '2014-03-01', 'Engenharia de Software',  NULL),
    ('juliana.campos@edu.br',    'Pós-Doutor',   '2005-08-01', 'Inteligência Artificial', 'Pesquisa em aprendizado de máquina e processamento de linguagem natural.'),
    ('marcos.viana@edu.br',      'Especialista', '2018-02-01', NULL,                      NULL),
    ('simone.batista@edu.br',    'Graduado',     '2020-08-01', 'Redes de Computadores',   NULL),
    ('eduardo.freitas@edu.br',   'Doutor',       '2012-02-01', 'Matemática Discreta',     NULL)
) AS v(email, titulacao, data_contratacao, especialidade, curriculo)
JOIN pessoa p ON p.email = v.email AND p.tipo_pessoa = 'P';

-- -----------------------------------------------------------------------------
-- 4. curso (cada curso tem um coordenador distinto, RO01 / RU03)
-- -----------------------------------------------------------------------------
INSERT INTO curso (nome, carga_horaria, descricao, categoria, id_professor_coordenador)
SELECT v.nome, v.carga_horaria, v.descricao, v.categoria, p.id_pessoa
FROM (VALUES
    ('Análise e Desenvolvimento de Sistemas', 2400, 'Curso superior de tecnologia voltado ao desenvolvimento de software.', 'Tecnologia',  'helena.prado@edu.br'),
    ('Ciência da Computação',                 3600, 'Bacharelado com foco em fundamentos da computação e pesquisa.',     'Computação',   'juliana.campos@edu.br'),
    ('Engenharia de Software',                3200, NULL,                                                                'Engenharia',   'ricardo.tavares@edu.br'),
    ('Sistemas de Informação',                2800, 'Bacharelado que integra tecnologia e processos de negócio.',        NULL,           'marcos.viana@edu.br')
) AS v(nome, carga_horaria, descricao, categoria, email_coordenador)
JOIN pessoa p ON p.email = v.email_coordenador AND p.tipo_pessoa = 'P';

-- -----------------------------------------------------------------------------
-- 5. disciplina
-- -----------------------------------------------------------------------------
INSERT INTO disciplina (nome, carga_horaria, ementa, bibliografia, ativo) VALUES
    ('Banco de Dados',                  60, 'Modelagem relacional, SQL, normalização e transações.',              'Elmasri, R.; Navathe, S. B. Sistemas de Banco de Dados.', TRUE),
    ('Programação Orientada a Objetos', 80, 'Classes, herança, polimorfismo e padrões de projeto.',              NULL,                                                       TRUE),
    ('Engenharia de Requisitos',        60, NULL,                                                                  NULL,                                                       TRUE),
    ('Estruturas de Dados',             80, 'Listas, pilhas, filas, árvores e grafos.',                           'Cormen, T. H. et al. Algoritmos: teoria e prática.',       TRUE),
    ('Redes de Computadores',           60, 'Modelo OSI, TCP/IP e protocolos de aplicação.',                      'Kurose, J.; Ross, K. Redes de Computadores e a Internet.', TRUE),
    ('Cálculo I',                       80, 'Limites, derivadas e aplicações.',                                   NULL,                                                       TRUE),
    ('Inteligência Artificial',         60, 'Busca, representação do conhecimento e aprendizado de máquina.',     'Russell, S.; Norvig, P. Inteligência Artificial.',         TRUE),
    ('Gestão de Projetos de Software',  40, 'Planejamento, escopo, custos e riscos de projetos.',                 NULL,                                                       TRUE),
    ('Lógica Matemática',               40, 'Proposições, predicados e provas.',                                  NULL,                                                       FALSE);

-- -----------------------------------------------------------------------------
-- 6. turma (cada turma pertence a um curso; a alocação que atende a RT02
--    é inserida mais adiante, dentro da mesma transação)
-- -----------------------------------------------------------------------------
INSERT INTO turma (codigo, ano_letivo, sala, horario, id_curso, ativo)
SELECT v.codigo, v.ano_letivo, v.sala, v.horario, c.id_curso, v.ativo
FROM (VALUES
    ('ADS-1A', 2026, 'Laboratório 1', 'Seg/Qua 19:00-22:30',  'Análise e Desenvolvimento de Sistemas', TRUE),
    ('ADS-2B', 2026, NULL,            'Ter/Qui 19:00-22:30',  'Análise e Desenvolvimento de Sistemas', TRUE),
    ('CC-1A',  2026, 'Sala 201',      'Seg a Sex 08:00-12:00', 'Ciência da Computação',                TRUE),
    ('CC-1A',  2025, 'Sala 105',      'Seg a Sex 14:00-17:00', 'Ciência da Computação',                TRUE),
    ('ES-1A',  2026, 'Laboratório 3', 'Sábado 08:00-12:00',    'Engenharia de Software',               TRUE),
    ('SI-1A',  2025, NULL,            NULL,                    'Sistemas de Informação',               TRUE)
) AS v(codigo, ano_letivo, sala, horario, curso, ativo)
JOIN curso c ON c.nome = v.curso;

-- -----------------------------------------------------------------------------
-- 7. matricula
-- O status não é informado na inclusão (RO03): entra com o default 'Ativa'.
-- As situações diferentes são aplicadas em seguida, por UPDATE.
-- -----------------------------------------------------------------------------
INSERT INTO matricula (id_aluno, id_turma, data_matricula)
SELECT a.id_pessoa, t.id_turma, v.data_matricula::date
FROM (VALUES
    ('ana.silva@aluno.edu.br',       'ADS-1A', 2026, '2026-02-02'),
    ('ana.silva@aluno.edu.br',       'CC-1A',  2026, '2026-02-02'),
    ('bruno.lima@aluno.edu.br',      'ADS-1A', 2026, '2026-02-02'),
    ('carla.mendes@aluno.edu.br',    'ADS-1A', 2026, '2026-02-02'),
    ('carla.mendes@aluno.edu.br',    'ADS-2B', 2026, '2026-02-03'),
    ('daniel.souza@aluno.edu.br',    'ADS-1A', 2026, '2026-02-02'),
    ('eduarda.rocha@aluno.edu.br',   'ADS-2B', 2026, '2026-02-03'),
    ('felipe.alves@aluno.edu.br',    'ADS-2B', 2026, '2026-02-03'),
    ('felipe.alves@aluno.edu.br',    'ES-1A',  2026, '2026-02-07'),
    ('gabriela.nunes@aluno.edu.br',  'ADS-2B', 2026, '2026-02-03'),
    ('henrique.dias@aluno.edu.br',   'CC-1A',  2026, '2026-02-02'),
    ('henrique.dias@aluno.edu.br',   'ES-1A',  2026, '2026-02-07'),
    ('isabela.ramos@aluno.edu.br',   'CC-1A',  2026, '2026-02-02'),
    ('joao.martins@aluno.edu.br',    'CC-1A',  2026, '2026-02-02'),
    ('karen.oliveira@aluno.edu.br',  'CC-1A',  2026, '2026-02-02'),
    ('lucas.ferreira@aluno.edu.br',  'ES-1A',  2026, '2026-02-07'),
    ('mariana.lopes@aluno.edu.br',   'ES-1A',  2026, '2026-02-07'),
    ('nicolas.barbosa@aluno.edu.br', 'SI-1A',  2025, '2025-02-03'),
    ('olivia.teixeira@aluno.edu.br', 'SI-1A',  2025, '2025-02-03'),
    ('pedro.gomes@aluno.edu.br',     'SI-1A',  2025, '2025-02-03'),
    ('pedro.gomes@aluno.edu.br',     'CC-1A',  2025, '2025-02-03'),
    ('rafaela.castro@aluno.edu.br',  'CC-1A',  2025, '2025-02-03'),
    ('samuel.pinto@aluno.edu.br',    'CC-1A',  2025, '2025-02-03'),
    ('tatiane.moreira@aluno.edu.br', 'CC-1A',  2025, '2025-02-03'),
    ('vinicius.araujo@aluno.edu.br', 'SI-1A',  2025, '2025-02-03'),
    ('vinicius.araujo@aluno.edu.br', 'ADS-1A', 2026, '2026-02-02')
) AS v(email, codigo, ano_letivo, data_matricula)
JOIN pessoa p   ON p.email = v.email AND p.tipo_pessoa = 'A'
JOIN aluno a    ON a.id_pessoa = p.id_pessoa
JOIN turma t    ON t.codigo = v.codigo AND t.ano_letivo = v.ano_letivo;

-- Situações diferentes de 'Ativa' (valores permitidos pelo RD08)
UPDATE matricula SET status = 'Trancada'
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'gabriela.nunes@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'ADS-2B' AND ano_letivo = 2026);

UPDATE matricula SET status = 'Trancada'
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'pedro.gomes@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'CC-1A' AND ano_letivo = 2025);

UPDATE matricula SET status = 'Cancelada'
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'isabela.ramos@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'CC-1A' AND ano_letivo = 2026);

UPDATE matricula SET status = 'Cancelada'
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'tatiane.moreira@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'CC-1A' AND ano_letivo = 2025);

-- Matrículas concluídas em turmas de 2025, com nota final (RD09 e RO04)
UPDATE matricula SET status = 'Concluída', nota_final = 7.50
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'nicolas.barbosa@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'SI-1A' AND ano_letivo = 2025);

UPDATE matricula SET status = 'Concluída', nota_final = 9.00
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'olivia.teixeira@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'SI-1A' AND ano_letivo = 2025);

UPDATE matricula SET status = 'Concluída', nota_final = 6.25
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'pedro.gomes@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'SI-1A' AND ano_letivo = 2025);

UPDATE matricula SET status = 'Concluída', nota_final = 8.00
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'rafaela.castro@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'CC-1A' AND ano_letivo = 2025);

UPDATE matricula SET status = 'Concluída', nota_final = 4.50
WHERE id_aluno = (SELECT id_pessoa FROM pessoa WHERE email = 'samuel.pinto@aluno.edu.br')
  AND id_turma = (SELECT id_turma FROM turma WHERE codigo = 'CC-1A' AND ano_letivo = 2025);

-- -----------------------------------------------------------------------------
-- 8. alocacao (cada turma recebe pelo menos uma alocação, RT02)
-- -----------------------------------------------------------------------------
INSERT INTO alocacao (id_professor, id_disciplina, id_turma, carga_horaria_semanal, data_inicio, funcao, observacao)
SELECT p.id_pessoa, d.id_disciplina, t.id_turma, v.carga_horaria_semanal, v.data_inicio::date, v.funcao, v.observacao
FROM (VALUES
    ('helena.prado@edu.br',    'Banco de Dados',                  'ADS-1A', 2026, 4, '2026-02-02', 'Titular',  NULL),
    ('ricardo.tavares@edu.br', 'Programação Orientada a Objetos', 'ADS-1A', 2026, 4, '2026-02-02', NULL,       'Aulas práticas em laboratório'),
    ('helena.prado@edu.br',    'Banco de Dados',                  'ADS-2B', 2026, 4, '2026-02-03', 'Titular',  NULL),
    ('simone.batista@edu.br',  'Estruturas de Dados',             'ADS-2B', 2026, 6, '2026-02-03', 'Monitora', NULL),
    ('juliana.campos@edu.br',  'Inteligência Artificial',         'CC-1A',  2026, 4, '2026-02-02', 'Titular',  NULL),
    ('juliana.campos@edu.br',  'Cálculo I',                       'CC-1A',  2026, 6, '2026-02-02', NULL,       NULL),
    ('marcos.viana@edu.br',    'Redes de Computadores',           'CC-1A',  2026, 4, '2026-02-03', NULL,       NULL),
    ('ricardo.tavares@edu.br', 'Engenharia de Requisitos',        'ES-1A',  2026, 6, '2026-02-07', 'Titular',  'Aulas aos sábados pela manhã'),
    ('ricardo.tavares@edu.br', 'Gestão de Projetos de Software',  'ES-1A',  2026, 4, '2026-02-07', NULL,       NULL),
    ('marcos.viana@edu.br',    'Programação Orientada a Objetos', 'SI-1A', 2025, 4, '2025-02-03', 'Titular',  NULL),
    ('marcos.viana@edu.br',    'Estruturas de Dados',             'SI-1A',  2025, 4, '2025-02-03', NULL,       NULL),
    ('juliana.campos@edu.br',  'Cálculo I',                       'CC-1A',  2025, 6, '2025-02-03', 'Titular',  NULL),
    ('simone.batista@edu.br',  'Redes de Computadores',           'CC-1A',  2025, 4, '2025-02-03', 'Monitora', NULL)
) AS v(email_professor, nome_disciplina, codigo, ano_letivo, carga_horaria_semanal, data_inicio, funcao, observacao)
JOIN pessoa p     ON p.email = v.email_professor AND p.tipo_pessoa = 'P'
JOIN professor pr ON pr.id_pessoa = p.id_pessoa
JOIN disciplina d ON d.nome = v.nome_disciplina
JOIN turma t      ON t.codigo = v.codigo AND t.ano_letivo = v.ano_letivo;

COMMIT;
