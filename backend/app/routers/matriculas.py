"""Matrículas (Aluno x Turma)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import sessao, transacao
from ..util import exigir, padrao_busca

router = APIRouter(prefix="/api/matriculas", tags=["Matrículas"])


class MatriculaIn(BaseModel):
    id_aluno: int
    id_turma: int
    data_matricula: date | None = None


class MatriculaLoteIn(BaseModel):
    id_turma: int
    alunos: list[int]
    data_matricula: date | None = None


class MatriculaUpd(BaseModel):
    status: str
    nota_final: Decimal | None = None


@router.get("")
def listar(q: str | None = None, status: str | None = None, id_turma: int | None = None):
    """Usa a VIEW vw_historico_matricula (JOIN de matricula, aluno, pessoa, turma e curso)."""
    sql = """
        SELECT id_aluno, nome_aluno, numero_matricula, id_turma, codigo_turma, ano_letivo,
               curso, data_matricula, status, nota_final
        FROM vw_historico_matricula
    """
    filtros, params = [], {}
    padrao = padrao_busca(q)
    if padrao:
        filtros.append("(nome_aluno ILIKE %(padrao)s OR numero_matricula ILIKE %(padrao)s OR curso ILIKE %(padrao)s)")
        params["padrao"] = padrao
    if status:
        filtros.append("status = %(status)s")
        params["status"] = status
    if id_turma is not None:
        filtros.append("id_turma = %(id_turma)s")
        params["id_turma"] = id_turma
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " ORDER BY data_matricula DESC, nome_aluno"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/{id_aluno}/{id_turma}")
def consultar(id_aluno: int, id_turma: int):
    with sessao() as s:
        return exigir(s.um("""
            SELECT * FROM vw_historico_matricula WHERE id_aluno = %s AND id_turma = %s
        """, (id_aluno, id_turma)), "Matrícula")


@router.post("", status_code=201)
def inserir(dados: MatriculaIn):
    """O status não é informado: o banco aplica o DEFAULT 'Ativa' (RO03 / RN09)."""
    with sessao() as s:
        return s.um("""
            INSERT INTO matricula (id_aluno, id_turma, data_matricula)
            VALUES (%s, %s, %s)
            RETURNING id_aluno, id_turma, status
        """, (dados.id_aluno, dados.id_turma, dados.data_matricula or date.today()))


@router.post("/lote", status_code=201)
def inserir_lote(dados: MatriculaLoteIn):
    """Operação composta: matricula vários alunos em uma turma em UMA transação.
    Se um único aluno já estiver na turma (pk_matricula), nenhuma matrícula é gravada."""
    data = dados.data_matricula or date.today()
    with transacao() as s:
        for id_aluno in dados.alunos:
            s.executar("""
                INSERT INTO matricula (id_aluno, id_turma, data_matricula)
                VALUES (%s, %s, %s)
            """, (id_aluno, dados.id_turma, data))
    return {"inseridas": len(dados.alunos)}


@router.put("/{id_aluno}/{id_turma}")
def atualizar(id_aluno: int, id_turma: int, dados: MatriculaUpd):
    with sessao() as s:
        exigir(s.executar("""
            UPDATE matricula SET status = %s, nota_final = %s
            WHERE id_aluno = %s AND id_turma = %s
        """, (dados.status, dados.nota_final, id_aluno, id_turma)), "Matrícula")
    return {"ok": True}


@router.delete("/{id_aluno}/{id_turma}")
def remover(id_aluno: int, id_turma: int):
    with sessao() as s:
        exigir(s.executar("DELETE FROM matricula WHERE id_aluno = %s AND id_turma = %s",
                          (id_aluno, id_turma)), "Matrícula")
    return {"ok": True}
