-- =============================================================================
-- PF - Consultas de comprovação para a demonstração (console SQL / psql)
-- Sistema de Gestão de Cursos
--
-- Use após cada ação na interface para provar que a operação chegou ao banco.
-- Conexão na VM:  sudo -u postgres psql -d tp3
-- Os comentários indicam a qual item do roteiro cada consulta corresponde.
-- =============================================================================

-- 0. Quem está conectado: as sessões da API aparecem como 'gestao-cursos-api'
SELECT pid, usename, application_name, client_addr, state, left(query, 60) AS ultima_consulta
FROM pg_stat_activity
WHERE application_name = 'gestao-cursos-api';

-- 1. INSERÇÃO (Novo aluno): pessoa e aluno gravados juntos (RT01)
SELECT p.id_pessoa, p.nome, p.email, p.tipo_pessoa, a.numero_matricula, a.data_ingresso
FROM pessoa p JOIN aluno a ON a.id_pessoa = p.id_pessoa
ORDER BY p.id_pessoa DESC
LIMIT 3;

-- 2. ATUALIZAÇÃO (status/nota de matrícula)
SELECT * FROM vw_historico_matricula
ORDER BY data_matricula DESC, nome_aluno
LIMIT 5;

-- 3. REMOÇÃO (DELETE de matrícula): troque os ids pelos usados na demonstração
-- SELECT count(*) FROM matricula WHERE id_aluno = 1 AND id_turma = 2;   -- deve dar 0

-- 4. EXCLUSÃO LÓGICA (inativar)
SELECT 'pessoa' AS tabela, count(*) FILTER (WHERE NOT ativo) AS inativos FROM pessoa
UNION ALL SELECT 'curso', count(*) FILTER (WHERE NOT ativo) FROM curso
UNION ALL SELECT 'turma', count(*) FILTER (WHERE NOT ativo) FROM turma
UNION ALL SELECT 'disciplina', count(*) FILTER (WHERE NOT ativo) FROM disciplina;

-- 5. BUSCA POR SUBSTRING (a mesma lógica da tela de Alunos)
SELECT p.nome, p.email, a.numero_matricula
FROM aluno a JOIN pessoa p ON p.id_pessoa = a.id_pessoa
WHERE p.nome ILIKE '%silva%' OR p.email ILIKE '%silva%' OR a.numero_matricula ILIKE '%silva%';

-- 6. OPERAÇÃO COMPOSTA: turma recém-criada com suas alocações; matrículas em lote
SELECT t.id_turma, t.codigo, t.ano_letivo, count(DISTINCT al.id_professor || '-' || al.id_disciplina) AS alocacoes,
       count(DISTINCT m.id_aluno) AS matriculas
FROM turma t
LEFT JOIN alocacao al ON al.id_turma = t.id_turma
LEFT JOIN matricula m ON m.id_turma = t.id_turma
GROUP BY t.id_turma
ORDER BY t.id_turma DESC
LIMIT 3;

-- 7. GATILHO RT02: toda turma continua com pelo menos uma alocação
--    (resultado esperado: nenhuma linha)
SELECT t.id_turma, t.codigo
FROM turma t
WHERE NOT EXISTS (SELECT 1 FROM alocacao al WHERE al.id_turma = t.id_turma);

-- 7b. Prova direta do gatilho no console (é desfeito ao final)
-- BEGIN;
-- DELETE FROM alocacao WHERE id_turma = (SELECT id_turma FROM turma ORDER BY id_turma DESC LIMIT 1);
-- COMMIT;   -- ERROR: RT02 violada: turma N deve possuir pelo menos uma alocação

-- 8. Gatilhos instalados
SELECT tgrelid::regclass AS tabela, tgname AS gatilho, tgdeferrable AS diferido
FROM pg_trigger WHERE NOT tgisinternal ORDER BY 1, 2;

-- 9. INTEGRIDADE: e-mail duplicado é recusado pelo banco (uk_pessoa_email)
-- INSERT INTO pessoa (nome, email, tipo_pessoa) VALUES ('X', 'ana.silva@aluno.edu.br', 'A');
-- ERROR: duplicate key value violates unique constraint "uk_pessoa_email"

-- 10. Privilégios do usuário da aplicação (ajuste do PF)
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
FROM information_schema.role_table_grants
WHERE grantee = 'gestao_app'
GROUP BY table_name ORDER BY table_name;
