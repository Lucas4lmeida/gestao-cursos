# Roteiro da demonstração (≈ 25 min)

Antes de começar:

1. Abra a aplicação em **https://134-65-230-190.sslip.io/** e entre com o usuário **`apresentacao`**
   (senha: `sudo cat /etc/gestao-cursos/credenciais-apresentacao.txt` na VM). Esse perfil já entra no
   **modo demonstração técnica**: botão **Console SQL**, tela **Arquitetura** e notas técnicas.
   Se quiser mostrar como a secretaria vê o sistema, entre com `secretaria` (sem nenhum detalhe técnico).
2. Em outra janela, abra o console SQL na VM: `ssh ubuntu@134.65.230.190` e depois `sudo -u postgres psql -d tp3`.
3. Deixe o **Console SQL** da aplicação (botão escuro à direita do menu) à mão: ele mostra, para cada ação, as 4 etapas
   (front-end → back-end/API → PostgreSQL → retorno) e os comandos SQL exatos.

Para cada item: (1) faça a ação na tela, (2) abra o Console SQL e mostre a rota e o SQL, (3) mostre a resposta na tela,
(4) comprove no psql com a consulta indicada em `database/06_verificacao_demo.sql`.

| # | Requisito | Passo a passo na interface | Comprovação no psql |
|---|---|---|---|
| 0 | Arquitetura | Tela **Arquitetura**: front-end, API e instância PostgreSQL (versão, banco, usuário). Mostre `backend/app/db.py`. O login (tela inicial) é tratado só pela API. | consulta 0 (`pg_stat_activity` mostra `gestao-cursos-api`) |
| 1 | Inserção | **Alunos → Novo aluno** (ex.: “Maria Demo”, `maria.demo@aluno.edu.br`, matrícula `PF2026`). Console: `BEGIN`, `INSERT pessoa`, `INSERT aluno`, `COMMIT`. | consulta 1 |
| 2 | Busca por substring | Na busca de Alunos digite `demo` → `ILIKE '%demo%'`. | consulta 5 (troque o texto) |
| 3 | Consulta específica | Ícone de olho → ficha do aluno (2 SELECTs, um na VIEW). | `SELECT * FROM pessoa WHERE id_pessoa = …;` |
| 4 | Operação composta | **Turmas → ADS-1A → Matricular alunos**: selecione a Maria Demo e mais 2 alunos → 3 `INSERT` em uma transação. Depois **Lançar notas** → vários `UPDATE` num só `COMMIT`. | consulta 6 / consulta 2 |
| 5 | Atualização | **Matrículas → lápis** em uma matrícula: status `Concluída`, nota `8,5` → `UPDATE matricula`. | consulta 2 |
| 6 | Remoção | **Matrículas → lixeira** na matrícula criada → `DELETE FROM matricula`. | consulta 3 |
| 7 | JOIN | **Relatórios → Histórico acadêmico** (filtre por curso). O SQL aparece abaixo do resultado. | — |
| 8 | GROUP BY + agregação | **Relatórios → Desempenho por curso** (COUNT, AVG, MIN, MAX, FILTER). | — |
| 9 | HAVING | **Relatórios → Turmas por matrículas**: mova o controle de 5 para 6 e veja o `HAVING count(*) >= 6` filtrar. | — |
| 10 | Gatilho | **Turmas → Nova turma**, remova a linha de alocação e clique em *Criar turma* → o `COMMIT` falha com *RT02 violada* e há `ROLLBACK`. Ou, numa turma com 1 alocação, remova-a. | consulta 7 (nenhuma turma sem alocação) |
| 11 | Erro de integridade | **Alunos → Novo aluno** com e-mail `ana.silva@aluno.edu.br` → `23505 uk_pessoa_email`. **Cursos → excluir** um curso com turmas → `23503 fk_turma_curso`. Nota `11` → `23514 ck_matricula_nota`. | consulta 9 |
| 12 | Exclusão lógica | **Alunos → botão de energia** → `UPDATE pessoa SET ativo = FALSE`. | consulta 4 |

Ao final, a aba **Console SQL** tem o histórico de tudo o que foi executado.
