"""Relatórios: JOIN, GROUP BY com agregação, HAVING e subconsulta."""
from __future__ import annotations

from fastapi import APIRouter

from ..db import sessao

router = APIRouter(prefix="/api/relatorios", tags=["Relatórios"])


@router.get("/historico")
def historico(curso: int | None = None, status: str | None = None, ano_letivo: int | None = None):
    """JOIN explícito de 5 tabelas: matricula, aluno, pessoa, turma e curso."""
    sql = """
        SELECT p.nome AS aluno, a.numero_matricula, c.nome AS curso, t.codigo AS turma, t.ano_letivo,
               m.data_matricula, m.status, m.nota_final
        FROM matricula m
        JOIN aluno  a ON a.id_pessoa = m.id_aluno
        JOIN pessoa p ON p.id_pessoa = a.id_pessoa
        JOIN turma  t ON t.id_turma  = m.id_turma
        JOIN curso  c ON c.id_curso  = t.id_curso
    """
    filtros, params = [], {}
    if curso is not None:
        filtros.append("c.id_curso = %(curso)s")
        params["curso"] = curso
    if status:
        filtros.append("m.status = %(status)s")
        params["status"] = status
    if ano_letivo is not None:
        filtros.append("t.ano_letivo = %(ano)s")
        params["ano"] = ano_letivo
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " ORDER BY c.nome, t.codigo, p.nome"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/desempenho-cursos")
def desempenho_cursos():
    """GROUP BY curso com COUNT, COUNT FILTER, AVG, MIN e MAX."""
    with sessao() as s:
        return s.todos("""
            SELECT c.id_curso, c.nome AS curso,
                   count(DISTINCT t.id_turma)                              AS turmas,
                   count(m.id_aluno)                                       AS matriculas,
                   count(m.id_aluno) FILTER (WHERE m.status = 'Ativa')     AS ativas,
                   count(m.id_aluno) FILTER (WHERE m.status = 'Concluída') AS concluidas,
                   count(m.id_aluno) FILTER (WHERE m.status = 'Trancada')  AS trancadas,
                   count(m.id_aluno) FILTER (WHERE m.status = 'Cancelada') AS canceladas,
                   count(m.nota_final)                                     AS com_nota,
                   round(avg(m.nota_final), 2)                             AS media_notas,
                   min(m.nota_final)                                       AS menor_nota,
                   max(m.nota_final)                                       AS maior_nota
            FROM curso c
            LEFT JOIN turma t     ON t.id_curso = c.id_curso
            LEFT JOIN matricula m ON m.id_turma = t.id_turma
            GROUP BY c.id_curso, c.nome
            ORDER BY matriculas DESC, c.nome
        """)


@router.get("/turmas-por-matriculas")
def turmas_por_matriculas(minimo: int = 5):
    """GROUP BY turma + HAVING count(*) >= mínimo informado na tela."""
    with sessao() as s:
        return s.todos("""
            SELECT t.id_turma, t.codigo, t.ano_letivo, c.nome AS curso,
                   count(m.id_aluno)            AS matriculas,
                   round(avg(m.nota_final), 2)  AS media_notas
            FROM turma t
            JOIN curso c     ON c.id_curso = t.id_curso
            JOIN matricula m ON m.id_turma = t.id_turma
            GROUP BY t.id_turma, t.codigo, t.ano_letivo, c.nome
            HAVING count(m.id_aluno) >= %s
            ORDER BY matriculas DESC, t.codigo
        """, (minimo,))


@router.get("/carga-docente")
def carga_docente(minimo: int = 8):
    """GROUP BY professor + HAVING sum(carga_horaria_semanal) >= mínimo."""
    with sessao() as s:
        return s.todos("""
            SELECT p.id_pessoa, p.nome AS professor, pr.titulacao,
                   count(*)                        AS alocacoes,
                   count(DISTINCT al.id_turma)     AS turmas,
                   count(DISTINCT al.id_disciplina) AS disciplinas,
                   sum(al.carga_horaria_semanal)   AS carga_semanal
            FROM professor pr
            JOIN pessoa p    ON p.id_pessoa = pr.id_pessoa
            JOIN alocacao al ON al.id_professor = pr.id_pessoa
            GROUP BY p.id_pessoa, p.nome, pr.titulacao
            HAVING sum(al.carga_horaria_semanal) >= %s
            ORDER BY carga_semanal DESC, p.nome
        """, (minimo,))


@router.get("/acima-da-media")
def acima_da_media():
    """Subconsulta escalar: alunos com nota acima da média geral."""
    with sessao() as s:
        media = s.um("SELECT round(avg(nota_final), 2) AS media FROM matricula")
        linhas = s.todos("""
            SELECT p.nome AS aluno, c.nome AS curso, t.codigo AS turma, t.ano_letivo, m.nota_final
            FROM matricula m
            JOIN pessoa p ON p.id_pessoa = m.id_aluno
            JOIN turma  t ON t.id_turma  = m.id_turma
            JOIN curso  c ON c.id_curso  = t.id_curso
            WHERE m.nota_final > (SELECT avg(nota_final) FROM matricula)
            ORDER BY m.nota_final DESC
        """)
        return {"media_geral": media["media"] if media else None, "alunos": linhas}
