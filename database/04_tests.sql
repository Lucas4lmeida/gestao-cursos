-- Consultas e testes. Executar depois de 03_objects.sql.

-- 1. Matrículas com aluno, curso e turma (JOIN).
SELECT p.nome      AS aluno,
       c.nome      AS curso,
       t.codigo    AS turma,
       t.ano_letivo,
       m.status
FROM matricula m
JOIN aluno  a ON a.id_pessoa = m.id_aluno
JOIN pessoa p ON p.id_pessoa = a.id_pessoa
JOIN turma  t ON t.id_turma  = m.id_turma
JOIN curso  c ON c.id_curso  = t.id_curso
ORDER BY c.nome, t.codigo, p.nome;

-- 2. Quantidade de matrículas e média de notas por curso (GROUP BY).
SELECT c.nome                          AS curso,
       count(m.id_aluno)               AS total_matriculas,
       count(m.nota_final)             AS com_nota,
       round(avg(m.nota_final), 2)     AS media_notas
FROM curso c
JOIN turma     t ON t.id_curso = c.id_curso
JOIN matricula m ON m.id_turma = t.id_turma
GROUP BY c.nome
ORDER BY c.nome;

-- 3. Turmas com pelo menos cinco matrículas (HAVING).
SELECT t.codigo,
       t.ano_letivo,
       count(*) AS matriculas
FROM turma t
JOIN matricula m ON m.id_turma = t.id_turma
GROUP BY t.id_turma, t.codigo, t.ano_letivo
HAVING count(*) >= 5
ORDER BY t.codigo, t.ano_letivo;

-- 4. Alunos com nota acima da média geral (subconsulta).
SELECT p.nome,
       m.nota_final
FROM matricula m
JOIN aluno  a ON a.id_pessoa = m.id_aluno
JOIN pessoa p ON p.id_pessoa = a.id_pessoa
WHERE m.nota_final > (SELECT avg(nota_final) FROM matricula)
ORDER BY m.nota_final DESC;

-- 5. Matrículas concluídas pela visão do histórico.
SELECT nome_aluno,
       codigo_turma,
       ano_letivo,
       curso,
       nota_final
FROM vw_historico_matricula
WHERE status = 'Concluída'
ORDER BY nota_final DESC;

-- 6. Consulta por turma e seu plano de execução.
EXPLAIN SELECT * FROM matricula
WHERE id_turma = (SELECT id_turma FROM turma WHERE codigo='ADS-2B' AND ano_letivo=2026);
SELECT * FROM matricula
WHERE id_turma = (SELECT id_turma FROM turma WHERE codigo='ADS-2B' AND ano_letivo=2026);

-- 7. Preparação dos testes. Executar este bloco inteiro, até o COMMIT.
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.exige(ok BOOLEAN, rotulo TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'FALHOU: %',rotulo; END IF;
 RAISE NOTICE 'APROVADO: %',rotulo;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.rejeita(comando TEXT, estado TEXT, restricao TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE e TEXT; c TEXT; falhou BOOLEAN:=FALSE;
BEGIN
 BEGIN
   EXECUTE comando;
 EXCEPTION WHEN OTHERS THEN
   GET STACKED DIAGNOSTICS e=RETURNED_SQLSTATE,c=CONSTRAINT_NAME;
   IF e <> estado OR (restricao IS NOT NULL AND c <> restricao) THEN
     RAISE EXCEPTION 'Erro inesperado: SQLSTATE=%, restrição=%, comando=%',e,c,comando;
   END IF;
   falhou:=TRUE;
 END;
 PERFORM pg_temp.exige(falhou,coalesce(restricao,estado)||': '||comando);
END $$;
COMMIT;

-- 8. Restrições e gatilhos. Executar este bloco inteiro, até o ROLLBACK.
BEGIN;
SELECT pg_temp.exige((SELECT count(*)=26 FROM pessoa),'26 pessoas');
SELECT pg_temp.exige((SELECT count(*)=20 FROM aluno),'20 alunos');
SELECT pg_temp.exige((SELECT count(*)=6 FROM professor),'6 professores');
SELECT pg_temp.exige((SELECT count(*)=4 FROM curso),'4 cursos');
SELECT pg_temp.exige((SELECT count(*)=6 FROM turma),'6 turmas');
SELECT pg_temp.exige((SELECT count(*)=9 FROM disciplina),'9 disciplinas');
SELECT pg_temp.exige((SELECT count(*)=26 FROM matricula),'26 matrículas');
SELECT pg_temp.exige((SELECT count(*)=13 FROM alocacao),'13 alocações');
SELECT pg_temp.exige((SELECT count(*)=26 FROM vw_historico_matricula),'VIEW e JOIN: 26 linhas');
SELECT pg_temp.exige((SELECT count(*)=5 FROM vw_historico_matricula WHERE status='Concluída'),'VIEW: 5 concluídas');
SELECT pg_temp.exige((SELECT avg(nota_final)=7.05 FROM matricula),'AVG = 7,05');
SELECT pg_temp.exige((SELECT count(*)=3 FROM matricula WHERE nota_final>(SELECT avg(nota_final) FROM matricula)),'subconsulta: 3 notas');
SELECT pg_temp.exige((SELECT count(*)=2 FROM (SELECT id_turma FROM matricula GROUP BY id_turma HAVING count(*)>=5) q),'HAVING: 2 turmas');
SELECT pg_temp.exige((SELECT count(*)=4 AND sum(n)=26 FROM (SELECT t.id_curso,count(*) n FROM matricula m JOIN turma t USING(id_turma) GROUP BY t.id_curso) q),'GROUP BY: 4 cursos, 26 matrículas');
SELECT pg_temp.exige(to_regclass('idx_matricula_id_turma') IS NOT NULL,'índice de matrícula existe');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET tipo_pessoa='X' WHERE ctid=(SELECT ctid FROM pessoa LIMIT 1)$q$,'23514','ck_pessoa_tipo');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET email='invalido' WHERE ctid=(SELECT ctid FROM pessoa LIMIT 1)$q$,'23514','ck_pessoa_email');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET telefone='123' WHERE ctid=(SELECT ctid FROM pessoa LIMIT 1)$q$,'23514','ck_pessoa_telefone');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET data_nascimento=CURRENT_DATE+1 WHERE ctid=(SELECT ctid FROM pessoa LIMIT 1)$q$,'23514','ck_pessoa_nascimento');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET nome=' ' WHERE ctid=(SELECT ctid FROM pessoa LIMIT 1)$q$,'23514','ck_pessoa_nome_nao_vazio');
SELECT pg_temp.rejeita($q$UPDATE aluno SET tipo_pessoa='P' WHERE ctid=(SELECT ctid FROM aluno LIMIT 1)$q$,'23514','ck_aluno_tipo');
SELECT pg_temp.rejeita($q$UPDATE aluno SET telefone_responsavel='abc' WHERE ctid=(SELECT ctid FROM aluno LIMIT 1)$q$,'23514','ck_aluno_tel_resp');
SELECT pg_temp.rejeita($q$UPDATE aluno SET numero_matricula=' ' WHERE ctid=(SELECT ctid FROM aluno LIMIT 1)$q$,'23514','ck_aluno_num_mat_nao_vazio');
SELECT pg_temp.rejeita($q$UPDATE professor SET tipo_pessoa='A' WHERE ctid=(SELECT ctid FROM professor LIMIT 1)$q$,'23514','ck_professor_tipo');
SELECT pg_temp.rejeita($q$UPDATE professor SET titulacao='Invalida' WHERE ctid=(SELECT ctid FROM professor LIMIT 1)$q$,'23514','ck_professor_titulacao');
SELECT pg_temp.rejeita($q$UPDATE curso SET carga_horaria=0 WHERE ctid=(SELECT ctid FROM curso LIMIT 1)$q$,'23514','ck_curso_carga');
SELECT pg_temp.rejeita($q$UPDATE curso SET nome=' ' WHERE ctid=(SELECT ctid FROM curso LIMIT 1)$q$,'23514','ck_curso_nome_nao_vazio');
SELECT pg_temp.rejeita($q$UPDATE turma SET ano_letivo=1999 WHERE ctid=(SELECT ctid FROM turma LIMIT 1)$q$,'23514','ck_turma_ano');
SELECT pg_temp.rejeita($q$UPDATE turma SET codigo=' ' WHERE ctid=(SELECT ctid FROM turma LIMIT 1)$q$,'23514','ck_turma_codigo_nao_vazio');
SELECT pg_temp.rejeita($q$UPDATE disciplina SET carga_horaria=0 WHERE ctid=(SELECT ctid FROM disciplina LIMIT 1)$q$,'23514','ck_disciplina_carga');
SELECT pg_temp.rejeita($q$UPDATE disciplina SET nome=' ' WHERE ctid=(SELECT ctid FROM disciplina LIMIT 1)$q$,'23514','ck_disciplina_nome_nao_vazio');
SELECT pg_temp.rejeita($q$UPDATE matricula SET status='Invalido' WHERE ctid=(SELECT ctid FROM matricula LIMIT 1)$q$,'23514','ck_matricula_status');
SELECT pg_temp.rejeita($q$UPDATE matricula SET nota_final=10.01 WHERE ctid=(SELECT ctid FROM matricula LIMIT 1)$q$,'23514','ck_matricula_nota');
SELECT pg_temp.rejeita($q$UPDATE alocacao SET carga_horaria_semanal=0 WHERE ctid=(SELECT ctid FROM alocacao LIMIT 1)$q$,'23514','ck_alocacao_carga_semanal');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET nome=NULL WHERE email='ana.silva@aluno.edu.br'$q$,'23502');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET id_pessoa=id_pessoa+100000 WHERE ctid=(SELECT ctid FROM pessoa LIMIT 1)$q$,'428C9');
SELECT pg_temp.rejeita($q$UPDATE curso SET id_curso=id_curso+100000 WHERE ctid=(SELECT ctid FROM curso LIMIT 1)$q$,'428C9');
SELECT pg_temp.rejeita($q$UPDATE turma SET id_turma=id_turma+100000 WHERE ctid=(SELECT ctid FROM turma LIMIT 1)$q$,'428C9');
SELECT pg_temp.rejeita($q$UPDATE disciplina SET id_disciplina=id_disciplina+100000 WHERE ctid=(SELECT ctid FROM disciplina LIMIT 1)$q$,'428C9');
SELECT pg_temp.rejeita($q$INSERT INTO pessoa(id_pessoa,nome,email,tipo_pessoa) OVERRIDING SYSTEM VALUE VALUES(-1,'Teste','positivo@teste.edu.br','A')$q$,'23514','ck_pessoa_id_positivo');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET email='ana.silva@aluno.edu.br'$q$,'23505','uk_pessoa_email');
SELECT pg_temp.rejeita($q$UPDATE aluno SET numero_matricula=(SELECT numero_matricula FROM aluno LIMIT 1)$q$,'23505','uk_aluno_numero_matricula');
SELECT pg_temp.rejeita($q$UPDATE curso SET nome=(SELECT nome FROM curso LIMIT 1)$q$,'23505','uk_curso_nome');
SELECT pg_temp.rejeita($q$UPDATE curso SET id_professor_coordenador=(SELECT id_professor_coordenador FROM curso LIMIT 1)$q$,'23505','uk_curso_coordenador');
SELECT pg_temp.rejeita($q$UPDATE disciplina SET nome=(SELECT nome FROM disciplina LIMIT 1)$q$,'23505','uk_disciplina_nome');
SELECT pg_temp.rejeita($q$UPDATE turma SET codigo='CC-1A',ano_letivo=2026$q$,'23505','uk_turma_codigo_ano');
SELECT pg_temp.rejeita($q$INSERT INTO matricula SELECT * FROM matricula LIMIT 1$q$,'23505','pk_matricula');
SELECT pg_temp.rejeita($q$INSERT INTO alocacao SELECT * FROM alocacao LIMIT 1$q$,'23505','pk_alocacao');
SELECT pg_temp.rejeita($q$INSERT INTO aluno(id_pessoa,tipo_pessoa,numero_matricula,data_ingresso) VALUES(2147483647,'A','FK-TEST',CURRENT_DATE)$q$,'23503','fk_aluno_pessoa');
SELECT pg_temp.rejeita($q$INSERT INTO professor(id_pessoa,tipo_pessoa,titulacao,data_contratacao) VALUES(2147483647,'P','Mestre',CURRENT_DATE)$q$,'23503','fk_professor_pessoa');
SELECT pg_temp.rejeita($q$UPDATE curso SET id_professor_coordenador=2147483647 WHERE ctid=(SELECT ctid FROM curso LIMIT 1)$q$,'23503','fk_curso_coordenador');
SELECT pg_temp.rejeita($q$UPDATE turma SET id_curso=2147483647 WHERE ctid=(SELECT ctid FROM turma LIMIT 1)$q$,'23503','fk_turma_curso');
SELECT pg_temp.rejeita($q$UPDATE matricula SET id_aluno=2147483647 WHERE ctid=(SELECT ctid FROM matricula LIMIT 1)$q$,'23503','fk_matricula_aluno');
SELECT pg_temp.rejeita($q$UPDATE matricula SET id_turma=2147483647 WHERE ctid=(SELECT ctid FROM matricula LIMIT 1)$q$,'23503','fk_matricula_turma');
SELECT pg_temp.rejeita($q$UPDATE alocacao SET id_professor=2147483647 WHERE ctid=(SELECT ctid FROM alocacao LIMIT 1)$q$,'23503','fk_alocacao_professor');
SELECT pg_temp.rejeita($q$UPDATE alocacao SET id_disciplina=2147483647 WHERE ctid=(SELECT ctid FROM alocacao LIMIT 1)$q$,'23503','fk_alocacao_disciplina');
SELECT pg_temp.rejeita($q$UPDATE alocacao SET id_turma=2147483647 WHERE ctid=(SELECT ctid FROM alocacao LIMIT 1)$q$,'23503','fk_alocacao_turma');
SELECT pg_temp.rejeita($q$DELETE FROM curso WHERE nome='Ciência da Computação'$q$,'23503','fk_turma_curso');
SELECT pg_temp.rejeita($q$UPDATE pessoa SET tipo_pessoa='P' WHERE email='ana.silva@aluno.edu.br'$q$,'23503','fk_aluno_pessoa');

-- A inativação mantém o histórico e não libera o e-mail.
UPDATE pessoa SET ativo=FALSE WHERE email='ana.silva@aluno.edu.br';
SELECT pg_temp.rejeita($q$INSERT INTO pessoa(nome,email,tipo_pessoa) VALUES('Duplicada','ana.silva@aluno.edu.br','A')$q$,'23505','uk_pessoa_email');
SELECT pg_temp.exige((SELECT count(*)=26 FROM matricula),'inativação preserva matrículas');
UPDATE matricula SET nota_final=0;
UPDATE matricula SET nota_final=10;
UPDATE matricula SET nota_final=NULL;
SELECT pg_temp.exige((SELECT bool_and(nota_final IS NULL) FROM matricula),'nota opcional e limites 0/10');
UPDATE alocacao SET carga_horaria_semanal=1;
UPDATE alocacao SET carga_horaria_semanal=60;
-- Antecipa a conferência dos gatilhos para testar as rejeições.
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.rejeita($q$INSERT INTO pessoa(nome,email,tipo_pessoa) VALUES('Sem subclasse','sem@teste.edu.br','A')$q$,'23514');
SELECT pg_temp.rejeita($q$INSERT INTO turma(codigo,ano_letivo,id_curso) SELECT 'SEM-ALOCACAO',2026,id_curso FROM curso LIMIT 1$q$,'23514');
SELECT pg_temp.rejeita($q$DELETE FROM aluno WHERE id_pessoa=(SELECT id_pessoa FROM pessoa WHERE email='ana.silva@aluno.edu.br')$q$,'23503');
SELECT pg_temp.rejeita($q$DELETE FROM alocacao WHERE id_turma=(SELECT id_turma FROM turma WHERE codigo='ADS-1A' AND ano_letivo=2026)$q$,'23514');
SELECT pg_temp.rejeita($q$DELETE FROM professor WHERE id_pessoa=(SELECT id_pessoa FROM pessoa WHERE email='eduardo.freitas@edu.br')$q$,'23514');
SELECT pg_temp.rejeita($q$TRUNCATE aluno CASCADE$q$,'23514');
SELECT pg_temp.rejeita($q$TRUNCATE professor CASCADE$q$,'23514');
SELECT pg_temp.rejeita($q$TRUNCATE alocacao CASCADE$q$,'23514');

-- Retirar uma alocação é permitido se a turma ainda tiver outra.
DO $$ DECLARE n INTEGER; BEGIN
 DELETE FROM alocacao WHERE id_turma=(SELECT id_turma FROM turma WHERE codigo='ADS-2B' AND ano_letivo=2026)
 AND id_professor=(SELECT id_pessoa FROM pessoa WHERE email='helena.prado@edu.br');
 GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.exige(n=1,'uma alocação removida');
 PERFORM pg_temp.exige((SELECT count(*)=1 FROM alocacao WHERE id_turma=(SELECT id_turma FROM turma WHERE codigo='ADS-2B' AND ano_letivo=2026)),'uma alocação restante');
END $$;
ROLLBACK;

-- 9. Cadastro e troca de perfil na mesma transação. Executar até o ROLLBACK.
BEGIN;
INSERT INTO pessoa(nome,email,tipo_pessoa) VALUES('Teste transação','tx@teste.edu.br','A');
INSERT INTO aluno(id_pessoa,tipo_pessoa,numero_matricula,data_ingresso)
SELECT id_pessoa,'A','TX-0001',CURRENT_DATE FROM pessoa WHERE email='tx@teste.edu.br';
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.exige((SELECT ativo FROM pessoa WHERE email='tx@teste.edu.br'),'cadastro ativo por padrão');
INSERT INTO matricula(id_aluno,id_turma,data_matricula)
SELECT p.id_pessoa,t.id_turma,CURRENT_DATE FROM pessoa p CROSS JOIN turma t
WHERE p.email='tx@teste.edu.br' AND t.codigo='ADS-1A' AND t.ano_letivo=2026;
SELECT pg_temp.exige((SELECT status='Ativa' AND nota_final IS NULL FROM matricula WHERE id_aluno=(SELECT id_pessoa FROM pessoa WHERE email='tx@teste.edu.br')),'situação inicial Ativa e nota não informada');
DELETE FROM matricula WHERE id_aluno=(SELECT id_pessoa FROM pessoa WHERE email='tx@teste.edu.br');
SET CONSTRAINTS ALL DEFERRED;
DELETE FROM aluno WHERE id_pessoa=(SELECT id_pessoa FROM pessoa WHERE email='tx@teste.edu.br');
UPDATE pessoa SET tipo_pessoa='P' WHERE email='tx@teste.edu.br';
INSERT INTO professor(id_pessoa,tipo_pessoa,titulacao,data_contratacao)
SELECT id_pessoa,'P','Mestre',CURRENT_DATE FROM pessoa WHERE email='tx@teste.edu.br';
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.exige((SELECT count(*)=27 FROM pessoa),'27 pessoas dentro da transação');
ROLLBACK;
SELECT pg_temp.exige((SELECT count(*)=26 FROM pessoa),'ROLLBACK restaura 26 pessoas');
SELECT pg_temp.exige((SELECT count(*)=13 FROM alocacao),'ROLLBACK restaura 13 alocações');
