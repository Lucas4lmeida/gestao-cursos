"""Disciplinas."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import sessao
from ..util import exigir, opt, padrao_busca

router = APIRouter(prefix="/api/disciplinas", tags=["Disciplinas"])


class DisciplinaIn(BaseModel):
    nome: str
    carga_horaria: int
    ementa: str | None = None
    bibliografia: str | None = None


class AtivoIn(BaseModel):
    ativo: bool


@router.get("")
def listar(q: str | None = None, ativo: bool | None = None):
    sql = """
        SELECT d.id_disciplina, d.nome, d.carga_horaria, d.ementa, d.bibliografia, d.ativo,
               count(al.id_turma) AS alocacoes,
               count(DISTINCT al.id_professor) AS professores
        FROM disciplina d
        LEFT JOIN alocacao al ON al.id_disciplina = d.id_disciplina
    """
    filtros, params = [], {}
    padrao = padrao_busca(q)
    if padrao:
        filtros.append("(d.nome ILIKE %(padrao)s OR d.ementa ILIKE %(padrao)s)")
        params["padrao"] = padrao
    if ativo is not None:
        filtros.append("d.ativo = %(ativo)s")
        params["ativo"] = ativo
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " GROUP BY d.id_disciplina ORDER BY d.nome"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/{id_disc}")
def consultar(id_disc: int):
    with sessao() as s:
        d = exigir(s.um("SELECT * FROM disciplina WHERE id_disciplina = %s", (id_disc,)), "Disciplina")
        d["alocacoes"] = s.todos("""
            SELECT al.id_turma, t.codigo AS codigo_turma, t.ano_letivo, c.nome AS curso,
                   p.id_pessoa AS id_professor, p.nome AS professor, al.carga_horaria_semanal, al.funcao
            FROM alocacao al
            JOIN turma t  ON t.id_turma = al.id_turma
            JOIN curso c  ON c.id_curso = t.id_curso
            JOIN pessoa p ON p.id_pessoa = al.id_professor
            WHERE al.id_disciplina = %s
            ORDER BY t.ano_letivo DESC, t.codigo
        """, (id_disc,))
        return d


@router.post("", status_code=201)
def inserir(dados: DisciplinaIn):
    with sessao() as s:
        return s.um("""
            INSERT INTO disciplina (nome, carga_horaria, ementa, bibliografia)
            VALUES (%s, %s, %s, %s)
            RETURNING id_disciplina
        """, (dados.nome, dados.carga_horaria, opt(dados.ementa), opt(dados.bibliografia)))


@router.put("/{id_disc}")
def atualizar(id_disc: int, dados: DisciplinaIn):
    with sessao() as s:
        exigir(s.executar("""
            UPDATE disciplina SET nome = %s, carga_horaria = %s, ementa = %s, bibliografia = %s
            WHERE id_disciplina = %s
        """, (dados.nome, dados.carga_horaria, opt(dados.ementa), opt(dados.bibliografia), id_disc)), "Disciplina")
    return {"id_disciplina": id_disc}


@router.patch("/{id_disc}/ativo")
def alterar_ativo(id_disc: int, dados: AtivoIn):
    with sessao() as s:
        exigir(s.executar("UPDATE disciplina SET ativo = %s WHERE id_disciplina = %s",
                          (dados.ativo, id_disc)), "Disciplina")
    return {"id_disciplina": id_disc, "ativo": dados.ativo}


@router.delete("/{id_disc}")
def remover(id_disc: int):
    """Remoção física; fk_alocacao_disciplina impede se a disciplina estiver alocada."""
    with sessao() as s:
        exigir(s.executar("DELETE FROM disciplina WHERE id_disciplina = %s", (id_disc,)), "Disciplina")
    return {"removido": id_disc}
