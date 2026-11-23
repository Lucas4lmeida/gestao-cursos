# Sistema de Gestão de Cursos — Projeto Final (PF)

Aplicação full stack que gerencia alunos, professores, cursos, disciplinas, turmas, alocações e matrículas,
usando o banco PostgreSQL modelado no TP1, TP2 e TP3.

**Equipe:** Evellin Serra de Moura (1620764) · Lucas Almeida Silveira de Souza (1568007) · Wallison Vieira de Aquino (1590537)

## Arquitetura

```
 Navegador ──HTTPS──▶ Caddy :443 ──▶ Back-end/API (FastAPI) ──psycopg 3──▶ PostgreSQL 16 (banco tp3)
 React (SPA)          certificado     127.0.0.1:8000, /api/*      pool        mesma VM, 127.0.0.1:5432
```

Endereço: **https://134-65-230-190.sslip.io/** (também `http://134.65.230.190/`). O acesso exige login.

| Camada | Tecnologia | Onde está |
|---|---|---|
| Front-end | React 18 + Vite + Tailwind CSS | `frontend/src` (build em `backend/app/static`) |
| Back-end/API | Python 3 + FastAPI + Uvicorn | `backend/app` (rotas em `backend/app/routers`) |
| Conexão com o banco | psycopg 3 + psycopg_pool | `backend/app/db.py` |
| SGBD | PostgreSQL 16 | VM Oracle Cloud (Ubuntu), banco `tp3` |

O front-end nunca acessa o banco: toda operação passa por `/api/*`. Cada resposta da API traz o
cabeçalho `X-SQL-Trace` com os comandos SQL executados (tempo, linhas, erro). Com o **modo demonstração
técnica** ligado (caixa no rodapé), a interface mostra o **Console SQL** com a sequência
*front-end → API → PostgreSQL → retorno*, as notas técnicas (restrições, gatilhos) e a tela **Arquitetura**.
Com o modo desligado, a interface é a de uso normal da secretaria, sem termos técnicos.

## Acesso (login)

Toda rota da API exige sessão. Os usuários ficam em `/etc/gestao-cursos/gestao.env` (`APP_USUARIOS`, senha em
hash PBKDF2), sem tabelas novas no banco. Na primeira instalação é criado o usuário `secretaria` com senha aleatória:

```bash
sudo cat /etc/gestao-cursos/credenciais-iniciais.txt            # senha inicial
sudo bash ~/gestao-cursos/deploy/definir_senha.sh secretaria     # trocar senha (apaga o arquivo acima)
sudo bash ~/gestao-cursos/deploy/definir_senha.sh professor1     # criar outro usuário
```

Regras de negócio não são duplicadas na API: PK, UNIQUE, FK, CHECK e os gatilhos RT01/RT02 são do banco.
A API traduz o erro (SQLSTATE + nome da restrição) em mensagem amigável (`backend/app/erros.py`).

## Funcionalidades exigidas → onde demonstrar

| Requisito | Tela / ação | SQL |
|---|---|---|
| Inserção | Alunos → Novo aluno | `INSERT pessoa` + `INSERT aluno` (transação) |
| Atualização | Matrículas → editar status/nota | `UPDATE matricula` |
| Remoção | Matrículas → excluir | `DELETE FROM matricula` |
| Listagem | Todas as telas de cadastro | `SELECT … ORDER BY` |
| Consulta específica | Alunos → ficha (ícone de olho) | `SELECT … WHERE id = ?` + VIEW |
| Busca por substring | Caixa de busca (Alunos, Professores, Cursos…) | `ILIKE '%texto%'` |
| Operação composta | Turma → Matricular alunos (lote), Lançar notas, Nova turma | `BEGIN` … N comandos … `COMMIT` |
| JOIN | Relatórios → Histórico acadêmico | JOIN de 5 tabelas |
| GROUP BY + agregação | Relatórios → Desempenho por curso; Painel | `COUNT`, `AVG`, `MIN`, `MAX` |
| HAVING | Relatórios → Turmas por matrículas; Carga docente | `HAVING count(*) >= n` |
| Gatilho | Turma → remover a última alocação; Nova turma sem alocação | `trg_rt02_*` rejeita no `COMMIT` |
| Erro de integridade | Novo aluno com e-mail repetido; excluir curso com turmas | `23505`, `23503`, `23514` |

O roteiro completo está na tela **Arquitetura** (visível no modo demonstração) e em [`docs/ROTEIRO_DEMONSTRACAO.md`](docs/ROTEIRO_DEMONSTRACAO.md).
Consultas de comprovação no console: [`database/06_verificacao_demo.sql`](database/06_verificacao_demo.sql).

## Banco de dados

- `database/01_create.sql`, `02_insert.sql`, `03_objects.sql`, `04_tests.sql`: scripts do TP3 (versão revisada instalada na VM).
- `database/05_ajustes_pf.sql`: **único ajuste do PF** — cria o usuário `gestao_app` com privilégio mínimo (só DML) para a API.
- `database/06_verificacao_demo.sql`: consultas para provar cada operação no console SQL.

## Executar em desenvolvimento

```bash
# back-end
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt   # Windows: .venv\Scripts\pip
cp .env.example .env        # ajuste DATABASE_URL
.venv/bin/uvicorn app.main:app --reload --port 8000

# front-end (outro terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173 (encaminha /api para :8000)
npm run build                # gera backend/app/static
```

Documentação interativa da API: `http://<host>/api/docs`.

## Implantação na VM

```bash
scp -r backend database deploy ubuntu@<IP>:~/gestao-cursos/
ssh ubuntu@<IP> 'cd ~/gestao-cursos && sudo IP_PUBLICO=<IP> bash deploy/install.sh'
```

O script instala o ambiente Python e o Caddy, cria (se faltar) o banco `tp3`, aplica `05_ajustes_pf.sql`, gera a
senha do `gestao_app` e o usuário inicial em `/etc/gestao-cursos/`, sobe o serviço `gestao-cursos` (systemd, só em
`127.0.0.1:8000`) e configura o Caddy com HTTPS automático em `<ip-com-hifens>.sslip.io`. Pode ser executado de novo
para atualizar; senhas e usuários são preservados.

Comandos úteis na VM:

```bash
sudo systemctl status gestao-cursos
sudo journalctl -u gestao-cursos -f
sudo -u postgres psql -d tp3 -f /opt/gestao-cursos/database/06_verificacao_demo.sql
```

> Oracle Cloud: além do iptables da VM (o script libera as portas), é preciso liberar TCP 80 e 443 na
> *Security List* (ou NSG) da VCN, no console da Oracle.
