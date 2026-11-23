"""Cursos (com professor coordenador, relacionamento 1:1 Coordena)."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import sessao
from ..util import exigir, opt, padrao_busca

router = APIRouter(prefix="/api/cursos", tags=["Cursos"])


class CursoIn(BaseModel):
    nome: str
    carga_horaria: int
    descricao: str | None = None
    categoria: str | None = None
    id_professor_coordenador: int


class AtivoIn(BaseModel):
    ativo: bool


@router.get("")
def listar(q: str | None = None, ativo: bool | None = None):
    sql = """
        SELECT c.id_curso, c.nome, c.carga_horaria, c.descricao, c.categoria, c.ativo,
               c.id_professor_coordenador, p.nome AS coordenador,
               count(DISTINCT t.id_turma) AS turmas,
               count(m.id_aluno) AS matriculas
        FROM curso c
        JOIN pessoa p ON p.id_pessoa = c.id_professor_coordenador
        LEFT JOIN turma t ON t.id_curso = c.id_curso
        LEFT JOIN matricula m ON m.id_turma = t.id_turma
    """
    filtros, params = [], {}
    padrao = padrao_busca(q)
    if padrao:
        filtros.append("(c.nome ILIKE %(padrao)s OR c.categoria ILIKE %(padrao)s OR c.descricao ILIKE %(padrao)s)")
        params["padrao"] = padrao
    if ativo is not None:
        filtros.append("c.ativo = %(ativo)s")
        params["ativo"] = ativo
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " GROUP BY c.id_curso, p.nome ORDER BY c.nome"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/{id_curso}")
def consultar(id_curso: int):
    with sessao() as s:
        curso = exigir(s.um("""
            SELECT c.*, p.nome AS coordenador, p.email AS email_coordenador, pr.titulacao AS titulacao_coordenador
            FROM curso c
            JOIN professor pr ON pr.id_pessoa = c.id_professor_coordenador
            JOIN pessoa p     ON p.id_pessoa  = pr.id_pessoa
            WHERE c.id_curso = %s
        """, (id_curso,)), "Curso")
        curso["turmas"] = s.todos("""
            SELECT t.id_turma, t.codigo, t.ano_letivo, t.sala, t.horario, t.ativo,
                   count(m.id_aluno) AS matriculas
            FROM turma t
            LEFT JOIN matricula m ON m.id_turma = t.id_turma
            WHERE t.id_curso = %s
            GROUP BY t.id_turma
            ORDER BY t.ano_letivo DESC, t.codigo
        """, (id_curso,))
        return curso


@router.post("", status_code=201)
def inserir(dados: CursoIn):
    with sessao() as s:
        r = s.um("""
            INSERT INTO curso (nome, carga_horaria, descricao, categoria, id_professor_coordenador)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id_curso
        """, (dados.nome, dados.carga_horaria, opt(dados.descricao), opt(dados.categoria),
              dados.id_professor_coordenador))
    return r


@router.put("/{id_curso}")
def atualizar(id_curso: int, dados: CursoIn):
    with sessao() as s:
        exigir(s.executar("""
            UPDATE curso
               SET nome = %s, carga_horaria = %s, descricao = %s, categoria = %s, id_professor_coordenador = %s
             WHERE id_curso = %s
        """, (dados.nome, dados.carga_horaria, opt(dados.descricao), opt(dados.categoria),
              dados.id_professor_coordenador, id_curso)), "Curso")
    return {"id_curso": id_curso}


@router.patch("/{id_curso}/ativo")
def alterar_ativo(id_curso: int, dados: AtivoIn):
    with sessao() as s:
        exigir(s.executar("UPDATE curso SET ativo = %s WHERE id_curso = %s", (dados.ativo, id_curso)), "Curso")
    return {"id_curso": id_curso, "ativo": dados.ativo}


@router.delete("/{id_curso}")
def remover(id_curso: int):
    """Remoção física; fk_turma_curso (ON DELETE RESTRICT) impede se houver turmas."""
    with sessao() as s:
        exigir(s.executar("DELETE FROM curso WHERE id_curso = %s", (id_curso,)), "Curso")
    return {"removido": id_curso}
