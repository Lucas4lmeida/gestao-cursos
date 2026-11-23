"""Professores: especialização de pessoa (pessoa + professor)."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import sessao, transacao
from ..util import exigir, opt, padrao_busca

router = APIRouter(prefix="/api/professores", tags=["Professores"])


class ProfessorIn(BaseModel):
    nome: str
    email: str
    telefone: str | None = None
    data_nascimento: date | None = None
    titulacao: str
    data_contratacao: date
    especialidade: str | None = None
    curriculo: str | None = None


class AtivoIn(BaseModel):
    ativo: bool


@router.get("")
def listar(q: str | None = None, ativo: bool | None = None):
    sql = """
        SELECT p.id_pessoa, p.nome, p.email, p.telefone, p.ativo,
               pr.titulacao, pr.data_contratacao, pr.especialidade,
               c.id_curso AS id_curso_coordenado, c.nome AS curso_coordenado,
               count(al.id_turma) AS alocacoes,
               COALESCE(sum(al.carga_horaria_semanal), 0) AS carga_semanal
        FROM professor pr
        JOIN pessoa p ON p.id_pessoa = pr.id_pessoa
        LEFT JOIN curso c ON c.id_professor_coordenador = pr.id_pessoa
        LEFT JOIN alocacao al ON al.id_professor = pr.id_pessoa
    """
    filtros, params = [], {}
    padrao = padrao_busca(q)
    if padrao:
        filtros.append("(p.nome ILIKE %(padrao)s OR p.email ILIKE %(padrao)s OR pr.especialidade ILIKE %(padrao)s)")
        params["padrao"] = padrao
    if ativo is not None:
        filtros.append("p.ativo = %(ativo)s")
        params["ativo"] = ativo
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " GROUP BY p.id_pessoa, pr.id_pessoa, c.id_curso ORDER BY p.nome"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/{id_prof}")
def consultar(id_prof: int):
    with sessao() as s:
        prof = exigir(s.um("""
            SELECT p.id_pessoa, p.nome, p.email, p.telefone, p.data_nascimento, p.ativo,
                   pr.titulacao, pr.data_contratacao, pr.especialidade, pr.curriculo,
                   c.id_curso AS id_curso_coordenado, c.nome AS curso_coordenado
            FROM professor pr
            JOIN pessoa p ON p.id_pessoa = pr.id_pessoa
            LEFT JOIN curso c ON c.id_professor_coordenador = pr.id_pessoa
            WHERE pr.id_pessoa = %s
        """, (id_prof,)), "Professor")
        prof["alocacoes"] = s.todos("""
            SELECT al.id_turma, t.codigo AS codigo_turma, t.ano_letivo, cu.nome AS curso,
                   d.id_disciplina, d.nome AS disciplina,
                   al.carga_horaria_semanal, al.data_inicio, al.funcao
            FROM alocacao al
            JOIN turma t      ON t.id_turma = al.id_turma
            JOIN curso cu     ON cu.id_curso = t.id_curso
            JOIN disciplina d ON d.id_disciplina = al.id_disciplina
            WHERE al.id_professor = %s
            ORDER BY t.ano_letivo DESC, t.codigo, d.nome
        """, (id_prof,))
        return prof


@router.post("", status_code=201)
def inserir(dados: ProfessorIn):
    """Operação composta: pessoa + professor na mesma transação (RT01 no COMMIT)."""
    with transacao() as s:
        p = s.um("""
            INSERT INTO pessoa (nome, email, telefone, data_nascimento, tipo_pessoa)
            VALUES (%s, %s, %s, %s, 'P')
            RETURNING id_pessoa
        """, (dados.nome, dados.email, opt(dados.telefone), dados.data_nascimento))
        s.executar("""
            INSERT INTO professor (id_pessoa, tipo_pessoa, titulacao, data_contratacao, especialidade, curriculo)
            VALUES (%s, 'P', %s, %s, %s, %s)
        """, (p["id_pessoa"], dados.titulacao, dados.data_contratacao,
              opt(dados.especialidade), opt(dados.curriculo)))
    return {"id_pessoa": p["id_pessoa"]}


@router.put("/{id_prof}")
def atualizar(id_prof: int, dados: ProfessorIn):
    with transacao() as s:
        exigir(s.executar("""
            UPDATE pessoa
               SET nome = %s, email = %s, telefone = %s, data_nascimento = %s
             WHERE id_pessoa = %s AND tipo_pessoa = 'P'
        """, (dados.nome, dados.email, opt(dados.telefone), dados.data_nascimento, id_prof)), "Professor")
        s.executar("""
            UPDATE professor
               SET titulacao = %s, data_contratacao = %s, especialidade = %s, curriculo = %s
             WHERE id_pessoa = %s
        """, (dados.titulacao, dados.data_contratacao, opt(dados.especialidade), opt(dados.curriculo), id_prof))
    return {"id_pessoa": id_prof}


@router.patch("/{id_prof}/ativo")
def alterar_ativo(id_prof: int, dados: AtivoIn):
    with sessao() as s:
        exigir(s.executar("UPDATE pessoa SET ativo = %s WHERE id_pessoa = %s AND tipo_pessoa = 'P'",
                          (dados.ativo, id_prof)), "Professor")
    return {"id_pessoa": id_prof, "ativo": dados.ativo}


@router.delete("/{id_prof}")
def remover(id_prof: int):
    """Remoção física; FKs de curso (coordenação) e alocacao impedem se houver vínculos."""
    with transacao() as s:
        exigir(s.executar("DELETE FROM professor WHERE id_pessoa = %s", (id_prof,)), "Professor")
        s.executar("DELETE FROM pessoa WHERE id_pessoa = %s", (id_prof,))
    return {"removido": id_prof}
