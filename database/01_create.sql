-- =============================================================================
-- TP3 - Etapa 1: Criação do esquema físico (PostgreSQL)
-- Sistema de Gestão de Cursos
-- Baseado no modelo lógico relacional do TP2 (seções 2, 3 e 4).
--
-- Script reexecutável: remove as tabelas existentes e recria tudo do zero.
-- Restrições RT01 e RT02 (não declarativas) serão implementadas em 03_objects.sql.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Remoção das estruturas (ordem inversa das dependências de FK)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS alocacao   CASCADE;
DROP TABLE IF EXISTS matricula  CASCADE;
DROP TABLE IF EXISTS disciplina CASCADE;
DROP TABLE IF EXISTS turma      CASCADE;
DROP TABLE IF EXISTS curso      CASCADE;
DROP TABLE IF EXISTS professor  CASCADE;
DROP TABLE IF EXISTS aluno      CASCADE;
DROP TABLE IF EXISTS pessoa     CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Criação das tabelas (ordem respeitando as dependências de FK)
-- -----------------------------------------------------------------------------

-- Superclasse Pessoa
-- A UNIQUE (id_pessoa, tipo_pessoa) é o alvo das FKs compostas de aluno e professor.
-- Com ela, cada subclasse só pode referenciar uma pessoa do mesmo tipo (A ou P).
CREATE TABLE pessoa (
    id_pessoa       INTEGER      GENERATED ALWAYS AS IDENTITY,
    nome            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    telefone        VARCHAR(11),
    data_nascimento DATE,
    tipo_pessoa     CHAR(1)      NOT NULL,
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_pessoa              PRIMARY KEY (id_pessoa),
    CONSTRAINT ck_pessoa_id_positivo CHECK (id_pessoa > 0),
    CONSTRAINT uk_pessoa_email        UNIQUE (email),
    CONSTRAINT uk_pessoa_id_tipo      UNIQUE (id_pessoa, tipo_pessoa),
    CONSTRAINT ck_pessoa_tipo         CHECK (tipo_pessoa IN ('A', 'P')),
    CONSTRAINT ck_pessoa_email        CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT ck_pessoa_telefone     CHECK (telefone IS NULL OR telefone ~ '^[0-9]{10,11}$'),
    -- Limite semântico: CURRENT_DATE é avaliada na inserção/atualização da linha,
    -- não é reavaliada automaticamente para linhas já existentes.
    CONSTRAINT ck_pessoa_nascimento   CHECK (data_nascimento IS NULL OR data_nascimento <= CURRENT_DATE),
    CONSTRAINT ck_pessoa_nome_nao_vazio  CHECK (char_length(trim(nome)) > 0),
    CONSTRAINT ck_pessoa_email_nao_vazio CHECK (char_length(trim(email)) > 0)
);

-- Subclasse Aluno (especialização de Pessoa)
CREATE TABLE aluno (
    id_pessoa            INTEGER     NOT NULL,
    tipo_pessoa          CHAR(1)     NOT NULL,
    numero_matricula     VARCHAR(20) NOT NULL,
    data_ingresso        DATE        NOT NULL,
    observacao           TEXT,
    telefone_responsavel VARCHAR(11),

    CONSTRAINT pk_aluno               PRIMARY KEY (id_pessoa),
    CONSTRAINT fk_aluno_pessoa        FOREIGN KEY (id_pessoa, tipo_pessoa)
        REFERENCES pessoa (id_pessoa, tipo_pessoa)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT uk_aluno_numero_matricula UNIQUE (numero_matricula),
    CONSTRAINT ck_aluno_tipo          CHECK (tipo_pessoa = 'A'),
    CONSTRAINT ck_aluno_tel_resp      CHECK (telefone_responsavel IS NULL OR telefone_responsavel ~ '^[0-9]{10,11}$'),
    CONSTRAINT ck_aluno_num_mat_nao_vazio CHECK (char_length(trim(numero_matricula)) > 0)
);

-- Subclasse Professor (especialização de Pessoa)
CREATE TABLE professor (
    id_pessoa        INTEGER      NOT NULL,
    tipo_pessoa      CHAR(1)      NOT NULL,
    titulacao        VARCHAR(30)  NOT NULL,
    data_contratacao DATE         NOT NULL,
    especialidade    VARCHAR(100),
    curriculo        TEXT,

    CONSTRAINT pk_professor           PRIMARY KEY (id_pessoa),
    CONSTRAINT fk_professor_pessoa    FOREIGN KEY (id_pessoa, tipo_pessoa)
        REFERENCES pessoa (id_pessoa, tipo_pessoa)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT ck_professor_tipo      CHECK (tipo_pessoa = 'P'),
    CONSTRAINT ck_professor_titulacao CHECK (titulacao IN ('Graduado', 'Especialista', 'Mestre', 'Doutor', 'Pós-Doutor'))
);

-- Curso (coordenado por um professor; coordenador exclusivo por curso)
CREATE TABLE curso (
    id_curso                  INTEGER      GENERATED ALWAYS AS IDENTITY,
    nome                      VARCHAR(150) NOT NULL,
    carga_horaria             INTEGER      NOT NULL,
    descricao                 TEXT,
    categoria                 VARCHAR(80),
    id_professor_coordenador  INTEGER      NOT NULL,
    ativo                     BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_curso              PRIMARY KEY (id_curso),
    CONSTRAINT ck_curso_id_positivo CHECK (id_curso > 0),
    CONSTRAINT uk_curso_nome         UNIQUE (nome),
    CONSTRAINT uk_curso_coordenador  UNIQUE (id_professor_coordenador),
    CONSTRAINT fk_curso_coordenador  FOREIGN KEY (id_professor_coordenador)
        REFERENCES professor (id_pessoa)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT ck_curso_carga        CHECK (carga_horaria > 0),
    CONSTRAINT ck_curso_nome_nao_vazio CHECK (char_length(trim(nome)) > 0)
);

-- Turma (oferecida por um curso em determinado ano letivo)
CREATE TABLE turma (
    id_turma    INTEGER      GENERATED ALWAYS AS IDENTITY,
    codigo      VARCHAR(20)  NOT NULL,
    ano_letivo  SMALLINT     NOT NULL,
    sala        VARCHAR(30),
    horario     VARCHAR(60),
    id_curso    INTEGER      NOT NULL,
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_turma            PRIMARY KEY (id_turma),
    CONSTRAINT ck_turma_id_positivo CHECK (id_turma > 0),
    CONSTRAINT uk_turma_codigo_ano UNIQUE (codigo, ano_letivo),
    CONSTRAINT fk_turma_curso      FOREIGN KEY (id_curso)
        REFERENCES curso (id_curso)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT ck_turma_ano        CHECK (ano_letivo BETWEEN 2000 AND 2100),
    CONSTRAINT ck_turma_codigo_nao_vazio CHECK (char_length(trim(codigo)) > 0)
);

-- Disciplina (independente de curso no modelo do TP2)
CREATE TABLE disciplina (
    id_disciplina  INTEGER      GENERATED ALWAYS AS IDENTITY,
    nome           VARCHAR(150) NOT NULL,
    carga_horaria  INTEGER      NOT NULL,
    ementa         TEXT,
    bibliografia   TEXT,
    ativo          BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_disciplina         PRIMARY KEY (id_disciplina),
    CONSTRAINT ck_disciplina_id_positivo CHECK (id_disciplina > 0),
    CONSTRAINT uk_disciplina_nome    UNIQUE (nome),
    CONSTRAINT ck_disciplina_carga   CHECK (carga_horaria > 0),
    CONSTRAINT ck_disciplina_nome_nao_vazio CHECK (char_length(trim(nome)) > 0)
);

-- Matrícula (associativa Aluno x Turma)
CREATE TABLE matricula (
    id_aluno        INTEGER      NOT NULL,
    id_turma        INTEGER      NOT NULL,
    data_matricula  DATE         NOT NULL,
    status          VARCHAR(15)  NOT NULL DEFAULT 'Ativa',
    nota_final      NUMERIC(4,2),

    CONSTRAINT pk_matricula          PRIMARY KEY (id_aluno, id_turma),
    CONSTRAINT fk_matricula_aluno    FOREIGN KEY (id_aluno)
        REFERENCES aluno (id_pessoa)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT fk_matricula_turma    FOREIGN KEY (id_turma)
        REFERENCES turma (id_turma)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT ck_matricula_status   CHECK (status IN ('Ativa', 'Trancada', 'Cancelada', 'Concluída')),
    CONSTRAINT ck_matricula_nota     CHECK (nota_final IS NULL OR nota_final BETWEEN 0 AND 10)
);

-- Alocação (associativa Professor x Disciplina x Turma)
CREATE TABLE alocacao (
    id_professor            INTEGER    NOT NULL,
    id_disciplina           INTEGER    NOT NULL,
    id_turma                INTEGER    NOT NULL,
    carga_horaria_semanal   SMALLINT   NOT NULL,
    data_inicio             DATE       NOT NULL,
    funcao                  VARCHAR(50),
    observacao              TEXT,

    CONSTRAINT pk_alocacao              PRIMARY KEY (id_professor, id_disciplina, id_turma),
    CONSTRAINT fk_alocacao_professor    FOREIGN KEY (id_professor)
        REFERENCES professor (id_pessoa)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT fk_alocacao_disciplina   FOREIGN KEY (id_disciplina)
        REFERENCES disciplina (id_disciplina)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT fk_alocacao_turma        FOREIGN KEY (id_turma)
        REFERENCES turma (id_turma)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION,
    CONSTRAINT ck_alocacao_carga_semanal CHECK (carga_horaria_semanal BETWEEN 1 AND 60)
);

COMMIT;
