# Sistema de Gestão de Cursos

Projeto Final (PF) — aplicação full stack conectada ao PostgreSQL com dados persistentes, construída sobre o banco
modelado e implementado no TP1, TP2 e TP3. Gerencia alunos, professores, cursos, disciplinas, turmas, alocações de
professores e matrículas.

**Equipe:** Evellin Serra de Moura (1620764) · Lucas Almeida Silveira de Souza (1568007) · Wallison Vieira de Aquino (1590537)

- Aplicação: **https://134-65-230-190.sslip.io/** (acesso com login)
- Documento de entrega: [`docs/PF_Entrega_Gestao_de_Cursos.pdf`](docs/PF_Entrega_Gestao_de_Cursos.pdf)
- Roteiro da demonstração: [`docs/ROTEIRO_DEMONSTRACAO.md`](docs/ROTEIRO_DEMONSTRACAO.md)

## Arquitetura

```
 Navegador (React) ──HTTPS──▶ Back-end/API (FastAPI) ──psycopg 3──▶ PostgreSQL 16 (banco tp3)
                              /api/*                                mesma VM, 127.0.0.1:5432
```

As três camadas rodam na mesma VM (Oracle Cloud, Ubuntu). O front-end nunca acessa o banco: toda operação passa
pela API, que é a única a abrir conexões com o PostgreSQL.

| Camada | Tecnologia | Onde está no repositório |
|---|---|---|
| Front-end | React 18 + TypeScript + Vite + Tailwind CSS | `frontend/src` (telas em `frontend/src/pages`) |
| Back-end/API | Python 3 + FastAPI (servidor Uvicorn) | `backend/app/main.py` e `backend/app/routers/` |
| Conexão com o banco | psycopg 3 + psycopg_pool (driver nativo, sem ORM) | `backend/app/db.py` |
| SGBD | PostgreSQL 16.16, banco `tp3` | `database/` (scripts do TP3) |
| Ferramentas | Visual Studio Code, Git, Node.js/npm, psql | — |

## Instância PostgreSQL e conexão

- **Servidor:** VM Oracle Cloud `134.65.230.190`, a mesma do back-end; a API conecta por `127.0.0.1:5432`.
- **Banco:** `tp3`, com o esquema físico do TP3 (8 tabelas, VIEW `vw_historico_matricula`, índices e gatilhos).
- **Usuário da aplicação:** `gestao_app`, com permissão só de `SELECT`, `INSERT`, `UPDATE` e `DELETE` (sem DDL).
- **Acesso:** SQL escrito explicitamente, sempre com parâmetros, e transações explícitas
  (`BEGIN` / `COMMIT` / `ROLLBACK`) nas operações compostas.

As regras de negócio não são duplicadas na API: chaves, `UNIQUE`, `FK`, `CHECK` e os gatilhos RT01/RT02 são do
banco. Quando o banco recusa uma operação, a API traduz o erro (código SQLSTATE e nome da restrição) em uma mensagem
clara para o usuário (`backend/app/erros.py`).

## Funcionalidades mínimas

| Requisito | Tela / ação na interface | Operação no PostgreSQL |
|---|---|---|
| Inserção | Alunos → Novo aluno | `INSERT pessoa` + `INSERT aluno` (uma transação) |
| Atualização | Matrículas → editar status e nota | `UPDATE matricula` |
| Remoção | Matrículas → excluir | `DELETE FROM matricula` |
| Listagem | Todas as telas de cadastro | `SELECT … ORDER BY` |
| Consulta específica | Alunos → ficha do aluno | `SELECT … WHERE id_pessoa = ?` + VIEW |
| Busca por substring | Caixa de busca (Alunos, Professores, Cursos, Turmas…) | `ILIKE '%texto%'` |
| Operação composta | Turma → Matricular alunos (lote); Lançar notas; Nova turma com professores | vários `INSERT`/`UPDATE` em uma transação (tudo ou nada) |
| JOIN | Relatórios → Histórico acadêmico | JOIN de `matricula`, `aluno`, `pessoa`, `turma`, `curso` |
| GROUP BY + agregação | Relatórios → Desempenho por curso; Painel | `COUNT`, `AVG`, `MIN`, `MAX` |
| HAVING | Relatórios → Turmas por matrículas; Carga docente | `HAVING count(*) >= n`; `HAVING sum(…) >= n` |
| Gatilho | Turma → remover o último professor; Nova turma sem professor | `trg_rt02_*` rejeita no `COMMIT` e há `ROLLBACK` |
| Erro de integridade | Aluno com e-mail repetido; excluir curso com turmas; nota 11 | `23505 uk_pessoa_email`; `23503 fk_turma_curso`; `23514 ck_matricula_nota` |

## Como a demonstração mostra cada etapa

A aplicação tem dois perfis de usuário:

| Perfil | Quem usa | O que vê |
|---|---|---|
| Padrão | secretaria acadêmica | a aplicação normal, sem termos técnicos |
| Apresentação | a equipe, na demonstração | tudo do padrão e mais o **Console SQL**, a tela **Arquitetura** e o SQL de cada relatório |

Com o perfil de apresentação, cada ação feita na tela aparece no Console SQL em quatro etapas:
(1) ação no front-end → (2) rota da API → (3) comandos SQL executados no PostgreSQL → (4) retorno (status e tempo).
A etapa (5), comprovação no banco, é feita no `psql` com as consultas de
[`database/06_verificacao_demo.sql`](database/06_verificacao_demo.sql). Para usuários do perfil padrão, a API não
envia nenhum desses detalhes.

## Ajustes realizados após o TP3

Nenhuma tabela, coluna ou restrição do modelo do TP3 foi alterada.

| Ajuste | Motivo |
|---|---|
| `database/05_ajustes_pf.sql`: cria o usuário `gestao_app` só com permissões de leitura e escrita de dados | a API não usa o superusuário nem pode alterar a estrutura do banco |
| Versão revisada dos scripts do TP3 (`ck_*_id_positivo`, `trg_rt02_serializa`, `trg_protege_truncate`, `trg_id_imutavel`) | proteções físicas que não mudam o modelo |
| Login na aplicação, com perfis padrão e apresentação (sem tabelas novas) | a aplicação guarda dados pessoais de alunos e professores |
| `database/06_verificacao_demo.sql` | consultas para comprovar no console SQL cada operação feita pela aplicação |

## Estrutura do repositório

```
backend/    API em FastAPI (rotas, conexão com o banco, tratamento de erros) e o front-end já compilado
frontend/   código-fonte do front-end em React
database/   scripts do TP3 (01 a 04), dicionário físico, ajustes do PF (05) e consultas de verificação (06)
deploy/     arquivos de instalação na VM (serviço, proxy HTTPS e script de instalação)
docs/       documento de entrega em PDF e roteiro da demonstração
```
