# Dicionário Físico — Sistema de Gestão de Cursos (PostgreSQL)

Descrição física das oito tabelas implementadas em `01_create.sql`. Os objetos complementares (VIEW, índices e gatilhos) estão em `03_objects.sql` e são indicados quando relevantes.

Convenções: "NN" = NOT NULL; "NULL" = aceita nulo. Todas as chaves estrangeiras usam `ON DELETE RESTRICT` e `ON UPDATE NO ACTION`.

---

## 1. pessoa

Superclasse da especialização Pessoa → Aluno / Professor.

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_pessoa | INTEGER | NN | GENERATED ALWAYS AS IDENTITY | PK |
| nome | VARCHAR(150) | NN | — | `ck_pessoa_nome_nao_vazio`: `char_length(trim(nome)) > 0` |
| email | VARCHAR(150) | NN | — | `uk_pessoa_email` (UNIQUE); `ck_pessoa_email`: formato `x@y.z`; `ck_pessoa_email_nao_vazio` |
| telefone | VARCHAR(11) | NULL | — | `ck_pessoa_telefone`: 10 a 11 dígitos, quando informado |
| data_nascimento | DATE | NULL | — | `ck_pessoa_nascimento`: não pode ser futura (`<= CURRENT_DATE`) |
| tipo_pessoa | CHAR(1) | NN | — | `ck_pessoa_tipo`: valor em ('A', 'P') |
| ativo | BOOLEAN | NN | TRUE | Exclusão lógica (RO06) |

**Chave primária:** `pk_pessoa` (`id_pessoa`).

**Chaves estrangeiras:** nenhuma.

**Chave candidata usada como alvo de FK composta:** `uk_pessoa_id_tipo` (`id_pessoa`, `tipo_pessoa`). Referenciada por `fk_aluno_pessoa` e `fk_professor_pessoa`.

**Restrições não declarativas (`03_objects.sql`):** `trg_rt01_pessoa` (RT01: toda pessoa deve ter exatamente um registro em `aluno` ou `professor`, coerente com `tipo_pessoa`). Gatilho `CONSTRAINT TRIGGER` diferido.

---

## 2. aluno

Subclasse de `pessoa`. Um registro por pessoa de tipo 'A'.

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_pessoa | INTEGER | NN | — | PK; FK composta para `pessoa` |
| tipo_pessoa | CHAR(1) | NN | — | `ck_aluno_tipo`: valor = 'A'; parte da FK composta |
| numero_matricula | VARCHAR(20) | NN | — | `uk_aluno_numero_matricula` (UNIQUE); `ck_aluno_num_mat_nao_vazio` |
| data_ingresso | DATE | NN | — | — |
| observacao | TEXT | NULL | — | — |
| telefone_responsavel | VARCHAR(11) | NULL | — | `ck_aluno_tel_resp`: 10 a 11 dígitos, quando informado |

**Chave primária:** `pk_aluno` (`id_pessoa`).

**Chaves estrangeiras:**
- `fk_aluno_pessoa` — **FK composta** (`id_pessoa`, `tipo_pessoa`) → `pessoa` (`id_pessoa`, `tipo_pessoa`). Garante que o aluno só referencia pessoa do tipo 'A'.

**Restrições não declarativas (`03_objects.sql`):** `trg_rt01_aluno` (RT01).

---

## 3. professor

Subclasse de `pessoa`. Um registro por pessoa de tipo 'P'.

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_pessoa | INTEGER | NN | — | PK; FK composta para `pessoa` |
| tipo_pessoa | CHAR(1) | NN | — | `ck_professor_tipo`: valor = 'P'; parte da FK composta |
| titulacao | VARCHAR(30) | NN | — | `ck_professor_titulacao`: valor em ('Graduado', 'Especialista', 'Mestre', 'Doutor', 'Pós-Doutor') |
| data_contratacao | DATE | NN | — | — |
| especialidade | VARCHAR(100) | NULL | — | — |
| curriculo | TEXT | NULL | — | — |

**Chave primária:** `pk_professor` (`id_pessoa`).

**Chaves estrangeiras:**
- `fk_professor_pessoa` — **FK composta** (`id_pessoa`, `tipo_pessoa`) → `pessoa` (`id_pessoa`, `tipo_pessoa`). Garante que o professor só referencia pessoa do tipo 'P'.

**Restrições não declarativas (`03_objects.sql`):** `trg_rt01_professor` (RT01).

---

## 4. curso

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_curso | INTEGER | NN | GENERATED ALWAYS AS IDENTITY | PK |
| nome | VARCHAR(150) | NN | — | `uk_curso_nome` (UNIQUE); `ck_curso_nome_nao_vazio` |
| carga_horaria | INTEGER | NN | — | `ck_curso_carga`: maior que 0 |
| descricao | TEXT | NULL | — | — |
| categoria | VARCHAR(80) | NULL | — | — |
| id_professor_coordenador | INTEGER | NN | — | `uk_curso_coordenador` (UNIQUE: cada professor coordena no máximo um curso); FK |
| ativo | BOOLEAN | NN | TRUE | Exclusão lógica (RO06) |

**Chave primária:** `pk_curso` (`id_curso`).

**Chaves estrangeiras:**
- `fk_curso_coordenador` — `id_professor_coordenador` → `professor` (`id_pessoa`). FK simples.

---

## 5. turma

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_turma | INTEGER | NN | GENERATED ALWAYS AS IDENTITY | PK |
| codigo | VARCHAR(20) | NN | — | `ck_turma_codigo_nao_vazio`: não pode ser vazio nem conter apenas espaços (RD11); parte de `uk_turma_codigo_ano` |
| ano_letivo | SMALLINT | NN | — | `ck_turma_ano`: entre 2000 e 2100; parte de `uk_turma_codigo_ano` |
| sala | VARCHAR(30) | NULL | — | — |
| horario | VARCHAR(60) | NULL | — | — |
| id_curso | INTEGER | NN | — | FK |
| ativo | BOOLEAN | NN | TRUE | Exclusão lógica (RO06) |

**Chave primária:** `pk_turma` (`id_turma`).

**Chave candidata composta:** `uk_turma_codigo_ano` (`codigo`, `ano_letivo`) — UNIQUE composta.

**Chaves estrangeiras:**
- `fk_turma_curso` — `id_curso` → `curso` (`id_curso`). FK simples.

**Restrições não declarativas (`03_objects.sql`):** `trg_rt02_turma` (RT02: toda turma deve ter pelo menos uma alocação).

---

## 6. disciplina

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_disciplina | INTEGER | NN | GENERATED ALWAYS AS IDENTITY | PK |
| nome | VARCHAR(150) | NN | — | `uk_disciplina_nome` (UNIQUE); `ck_disciplina_nome_nao_vazio` |
| carga_horaria | INTEGER | NN | — | `ck_disciplina_carga`: maior que 0 |
| ementa | TEXT | NULL | — | — |
| bibliografia | TEXT | NULL | — | — |
| ativo | BOOLEAN | NN | TRUE | Exclusão lógica (RO06) |

**Chave primária:** `pk_disciplina` (`id_disciplina`).

**Chaves estrangeiras:** nenhuma.

---

## 7. matricula

Associativa Aluno × Turma.

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_aluno | INTEGER | NN | — | PK composta; FK |
| id_turma | INTEGER | NN | — | PK composta; FK; índice `idx_matricula_id_turma` (`03_objects.sql`) |
| data_matricula | DATE | NN | — | — |
| status | VARCHAR(15) | NN | 'Ativa' | `ck_matricula_status`: valor em ('Ativa', 'Trancada', 'Cancelada', 'Concluída') |
| nota_final | NUMERIC(4,2) | NULL | — | `ck_matricula_nota`: entre 0 e 10, quando informada |

**Chave primária composta:** `pk_matricula` (`id_aluno`, `id_turma`).

**Chaves estrangeiras:**
- `fk_matricula_aluno` — `id_aluno` → `aluno` (`id_pessoa`).
- `fk_matricula_turma` — `id_turma` → `turma` (`id_turma`).

---

## 8. alocacao

Associativa Professor × Disciplina × Turma.

| Atributo | Tipo PostgreSQL | Nulidade | Padrão | Restrições |
|---|---|---|---|---|
| id_professor | INTEGER | NN | — | PK composta; FK |
| id_disciplina | INTEGER | NN | — | PK composta; FK |
| id_turma | INTEGER | NN | — | PK composta; FK; índice `idx_alocacao_id_turma` (`03_objects.sql`) |
| carga_horaria_semanal | SMALLINT | NN | — | `ck_alocacao_carga_semanal`: entre 1 e 60 |
| data_inicio | DATE | NN | — | — |
| funcao | VARCHAR(50) | NULL | — | — |
| observacao | TEXT | NULL | — | — |

**Chave primária composta:** `pk_alocacao` (`id_professor`, `id_disciplina`, `id_turma`).

**Chaves estrangeiras:**
- `fk_alocacao_professor` — `id_professor` → `professor` (`id_pessoa`).
- `fk_alocacao_disciplina` — `id_disciplina` → `disciplina` (`id_disciplina`).
- `fk_alocacao_turma` — `id_turma` → `turma` (`id_turma`).

**Restrições não declarativas (`03_objects.sql`):** `trg_rt02_alocacao` (RT02: a alteração ou exclusão de alocação não pode deixar turma sem alocação).
