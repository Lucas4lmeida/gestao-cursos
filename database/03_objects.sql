-- =============================================================================
-- TP3 - Etapa 3: Objetos físicos complementares (PostgreSQL)
-- Sistema de Gestão de Cursos
-- Executar após 01_create.sql e 02_insert.sql.
--
-- Conteúdo: 1) VIEW; 2) índices; 3) funções PL/pgSQL e gatilhos de RT01 e RT02.
-- Script reexecutável: remove os objetos deste arquivo antes de recriá-los.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Remoção dos objetos deste arquivo (idempotência)
-- -----------------------------------------------------------------------------
DROP VIEW     IF EXISTS vw_historico_matricula;
DROP INDEX    IF EXISTS idx_matricula_id_turma;
DROP INDEX    IF EXISTS idx_alocacao_id_turma;
DROP TRIGGER  IF EXISTS trg_rt01_pessoa    ON pessoa;
DROP TRIGGER  IF EXISTS trg_rt01_aluno     ON aluno;
DROP TRIGGER  IF EXISTS trg_rt01_professor ON professor;
DROP TRIGGER  IF EXISTS trg_rt02_turma     ON turma;
DROP TRIGGER  IF EXISTS trg_rt02_alocacao  ON alocacao;
DROP FUNCTION IF EXISTS fn_rt01_verifica_pessoa(INTEGER);
DROP FUNCTION IF EXISTS fn_rt01_trg_pessoa();
DROP FUNCTION IF EXISTS fn_rt01_trg_subclasse();
DROP FUNCTION IF EXISTS fn_rt02_verifica_turma(INTEGER);
DROP FUNCTION IF EXISTS fn_rt02_trg_turma();
DROP FUNCTION IF EXISTS fn_rt02_trg_alocacao();

-- -----------------------------------------------------------------------------
-- 1. VIEW
-- Histórico de matrículas com dados do aluno, da turma e do curso.
-- Útil para secretaria e relatórios de desempenho por turma e curso.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_historico_matricula AS
SELECT
    m.id_aluno,
    p.nome            AS nome_aluno,
    a.numero_matricula,
    t.id_turma,
    t.codigo          AS codigo_turma,
    t.ano_letivo,
    c.nome            AS curso,
    m.data_matricula,
    m.status,
    m.nota_final
FROM matricula m
JOIN aluno  a ON a.id_pessoa = m.id_aluno
JOIN pessoa p ON p.id_pessoa = a.id_pessoa
JOIN turma  t ON t.id_turma  = m.id_turma
JOIN curso  c ON c.id_curso  = t.id_curso;

-- -----------------------------------------------------------------------------
-- 2. Índices adicionais
-- As PKs de matricula (id_aluno, id_turma) e alocacao (id_professor, id_disciplina,
-- id_turma) têm outras colunas à esquerda. Os índices abaixo favorecem
-- essas buscas: junções da VIEW e a verificação de RT02, que procura alocações
-- por turma. Não repetem nenhum índice gerado por PRIMARY KEY ou UNIQUE.
-- -----------------------------------------------------------------------------
CREATE INDEX idx_matricula_id_turma ON matricula (id_turma);
CREATE INDEX idx_alocacao_id_turma  ON alocacao  (id_turma);

-- -----------------------------------------------------------------------------
-- 3. Gatilhos de integridade não declarativa
--
-- RT01 (totalidade da especialização): toda pessoa deve ter exatamente um
-- registro em aluno ou professor, coerente com tipo_pessoa ('A' ou 'P').
-- RT02 (participação obrigatória): toda turma deve ter pelo menos uma alocação.
--
-- Todos os gatilhos são CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED:
-- a verificação ocorre no COMMIT, sobre o estado final da transação. Assim,
-- pessoa e subclasse (ou turma e alocação) podem ser inseridas na mesma transação.
-- -----------------------------------------------------------------------------

-- 3.1 RT01: verificação reutilizada pelos gatilhos de pessoa, aluno e professor.
-- Se a pessoa não existir mais (removida na mesma transação), não há o que validar.
CREATE FUNCTION fn_rt01_verifica_pessoa(p_id_pessoa INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_tipo      CHAR(1);
    v_alunos    INTEGER;
    v_professor INTEGER;
BEGIN
    IF p_id_pessoa IS NULL THEN
        RETURN;
    END IF;

    SELECT tipo_pessoa INTO v_tipo FROM pessoa WHERE id_pessoa = p_id_pessoa;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT count(*) INTO v_alunos    FROM aluno     WHERE id_pessoa = p_id_pessoa;
    SELECT count(*) INTO v_professor FROM professor WHERE id_pessoa = p_id_pessoa;

    IF NOT ((v_tipo = 'A' AND v_alunos = 1 AND v_professor = 0)
         OR (v_tipo = 'P' AND v_professor = 1 AND v_alunos = 0)) THEN
        RAISE EXCEPTION 'RT01 violada: pessoa % (tipo %) deve ter exatamente um registro em aluno ou professor coerente com tipo_pessoa (aluno=%, professor=%)',
            p_id_pessoa, v_tipo, v_alunos, v_professor
            USING ERRCODE = 'check_violation';
    END IF;
END;
$$;

-- 3.2 RT01 disparado por alterações em pessoa (inclusão ou troca de tipo_pessoa).
CREATE FUNCTION fn_rt01_trg_pessoa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_rt01_verifica_pessoa(NEW.id_pessoa);
    RETURN NULL;
END;
$$;

-- 3.3 RT01 disparado por alterações nas subclasses aluno e professor.
-- Em UPDATE e DELETE, a pessoa original (OLD) é verificada; em UPDATE, a nova também.
CREATE FUNCTION fn_rt01_trg_subclasse()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        PERFORM fn_rt01_verifica_pessoa(OLD.id_pessoa);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM fn_rt01_verifica_pessoa(NEW.id_pessoa);
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_rt01_pessoa
    AFTER INSERT OR UPDATE ON pessoa
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_rt01_trg_pessoa();

CREATE CONSTRAINT TRIGGER trg_rt01_aluno
    AFTER INSERT OR UPDATE OR DELETE ON aluno
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_rt01_trg_subclasse();

CREATE CONSTRAINT TRIGGER trg_rt01_professor
    AFTER INSERT OR UPDATE OR DELETE ON professor
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_rt01_trg_subclasse();

-- 3.4 RT02: verificação reutilizada pelos gatilhos de turma e alocacao.
-- Se a turma não existir mais (removida na mesma transação), não há o que validar.
CREATE FUNCTION fn_rt02_verifica_turma(p_id_turma INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_id_turma IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM turma WHERE id_turma = p_id_turma) THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM alocacao WHERE id_turma = p_id_turma) THEN
        RAISE EXCEPTION 'RT02 violada: turma % deve possuir pelo menos uma alocação',
            p_id_turma
            USING ERRCODE = 'check_violation';
    END IF;
END;
$$;

-- 3.5 RT02 disparado por inclusão ou alteração de turma.
CREATE FUNCTION fn_rt02_trg_turma()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_rt02_verifica_turma(NEW.id_turma);
    RETURN NULL;
END;
$$;

-- 3.6 RT02 disparado por alteração ou exclusão de alocação.
-- A inclusão de alocação nunca viola RT02, então não é verificada.
CREATE FUNCTION fn_rt02_trg_alocacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_rt02_verifica_turma(OLD.id_turma);
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_rt02_turma
    AFTER INSERT OR UPDATE ON turma
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_rt02_trg_turma();

CREATE CONSTRAINT TRIGGER trg_rt02_alocacao
    AFTER UPDATE OR DELETE ON alocacao
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_rt02_trg_alocacao();

-- Proteções físicas: não mudam tabelas nem cardinalidades do TP2.
-- Serializa remoções de alocações da mesma turma. A atualização da linha pai
-- também causa conflito de serialização em REPEATABLE READ/SERIALIZABLE.
CREATE OR REPLACE FUNCTION fn_rt02_serializa() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE turma SET ativo = ativo WHERE id_turma = OLD.id_turma;
    IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
    RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_rt02_serializa ON alocacao;
CREATE TRIGGER trg_rt02_serializa BEFORE DELETE OR UPDATE ON alocacao
FOR EACH ROW EXECUTE FUNCTION fn_rt02_serializa();

-- TRUNCATE não dispara os gatilhos por linha. Use DELETE transacional
-- para remoções; a recriação do esquema continua sendo feita por DROP TABLE.
CREATE OR REPLACE FUNCTION fn_protege_truncate() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Use DELETE em transação para preservar RT01/RT02'
      USING ERRCODE = 'check_violation';
END $$;
DROP TRIGGER IF EXISTS trg_protege_truncate ON aluno;
CREATE TRIGGER trg_protege_truncate BEFORE TRUNCATE ON aluno FOR EACH STATEMENT EXECUTE FUNCTION fn_protege_truncate();
DROP TRIGGER IF EXISTS trg_protege_truncate ON professor;
CREATE TRIGGER trg_protege_truncate BEFORE TRUNCATE ON professor FOR EACH STATEMENT EXECUTE FUNCTION fn_protege_truncate();
DROP TRIGGER IF EXISTS trg_protege_truncate ON alocacao;
CREATE TRIGGER trg_protege_truncate BEFORE TRUNCATE ON alocacao FOR EACH STATEMENT EXECUTE FUNCTION fn_protege_truncate();

-- RR06: identificadores substitutos são imutáveis.
CREATE OR REPLACE FUNCTION fn_id_imutavel() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW)->TG_ARGV[0] IS DISTINCT FROM to_jsonb(OLD)->TG_ARGV[0] THEN
      RAISE EXCEPTION 'RR06: identificador substituto imutável' USING ERRCODE='check_violation';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_id_imutavel ON pessoa;
CREATE TRIGGER trg_id_imutavel BEFORE UPDATE OF id_pessoa ON pessoa FOR EACH ROW EXECUTE FUNCTION fn_id_imutavel('id_pessoa');
DROP TRIGGER IF EXISTS trg_id_imutavel ON curso;
CREATE TRIGGER trg_id_imutavel BEFORE UPDATE OF id_curso ON curso FOR EACH ROW EXECUTE FUNCTION fn_id_imutavel('id_curso');
DROP TRIGGER IF EXISTS trg_id_imutavel ON turma;
CREATE TRIGGER trg_id_imutavel BEFORE UPDATE OF id_turma ON turma FOR EACH ROW EXECUTE FUNCTION fn_id_imutavel('id_turma');
DROP TRIGGER IF EXISTS trg_id_imutavel ON disciplina;
CREATE TRIGGER trg_id_imutavel BEFORE UPDATE OF id_disciplina ON disciplina FOR EACH ROW EXECUTE FUNCTION fn_id_imutavel('id_disciplina');

-- Gatilhos recém-criados não validam retroativamente a população anterior.
DO $$ DECLARE r RECORD; BEGIN
 FOR r IN SELECT id_pessoa FROM pessoa LOOP PERFORM fn_rt01_verifica_pessoa(r.id_pessoa); END LOOP;
 FOR r IN SELECT id_turma FROM turma LOOP PERFORM fn_rt02_verifica_turma(r.id_turma); END LOOP;
END $$;

COMMIT;
