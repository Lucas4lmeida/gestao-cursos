"""Alunos: especialização de pessoa (pessoa + aluno)."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import sessao, transacao
from ..util import exigir, opt, padrao_busca

router = APIRouter(prefix="/api/alunos", tags=["Alunos"])


class AlunoIn(BaseModel):
    nome: str
    email: str
    telefone: str | None = None
    data_nascimento: date | None = None
    numero_matricula: str
    data_ingresso: date
    observacao: str | None = None
    telefone_responsavel: str | None = None


class AtivoIn(BaseModel):
    ativo: bool


@router.get("")
def listar(q: str | None = None, ativo: bool | None = None):
    """Listagem com busca por substring (ILIKE) em nome, e-mail e nº de matrícula."""
    sql = """
        SELECT p.id_pessoa, p.nome, p.email, p.telefone, p.data_nascimento, p.ativo,
               a.numero_matricula, a.data_ingresso,
               count(m.id_turma) AS total_matriculas,
               count(m.id_turma) FILTER (WHERE m.status = 'Ativa') AS matriculas_ativas
        FROM aluno a
        JOIN pessoa p ON p.id_pessoa = a.id_pessoa
        LEFT JOIN matricula m ON m.id_aluno = a.id_pessoa
    """
    filtros, params = [], {}
    padrao = padrao_busca(q)
    if padrao:
        filtros.append("(p.nome ILIKE %(padrao)s OR p.email ILIKE %(padrao)s OR a.numero_matricula ILIKE %(padrao)s)")
        params["padrao"] = padrao
    if ativo is not None:
        filtros.append("p.ativo = %(ativo)s")
        params["ativo"] = ativo
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " GROUP BY p.id_pessoa, a.id_pessoa ORDER BY p.nome"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/{id_aluno}")
def consultar(id_aluno: int):
    with sessao() as s:
        aluno = exigir(s.um("""
            SELECT p.id_pessoa, p.nome, p.email, p.telefone, p.data_nascimento, p.ativo, p.tipo_pessoa,
                   a.numero_matricula, a.data_ingresso, a.observacao, a.telefone_responsavel
            FROM aluno a
            JOIN pessoa p ON p.id_pessoa = a.id_pessoa
            WHERE a.id_pessoa = %s
        """, (id_aluno,)), "Aluno")
        aluno["matriculas"] = s.todos("""
            SELECT id_turma, codigo_turma, ano_letivo, curso, data_matricula, status, nota_final
            FROM vw_historico_matricula
            WHERE id_aluno = %s
            ORDER BY ano_letivo DESC, codigo_turma
        """, (id_aluno,))
        return aluno


@router.post("", status_code=201)
def inserir(dados: AlunoIn):
    """Operação composta: pessoa + aluno na MESMA transação.
    O gatilho diferido RT01 confere, no COMMIT, que a pessoa tem exatamente uma subclasse."""
    with transacao() as s:
        p = s.um("""
            INSERT INTO pessoa (nome, email, telefone, data_nascimento, tipo_pessoa)
            VALUES (%s, %s, %s, %s, 'A')
            RETURNING id_pessoa
        """, (dados.nome, dados.email, opt(dados.telefone), dados.data_nascimento))
        s.executar("""
            INSERT INTO aluno (id_pessoa, tipo_pessoa, numero_matricula, data_ingresso, observacao, telefone_responsavel)
            VALUES (%s, 'A', %s, %s, %s, %s)
        """, (p["id_pessoa"], dados.numero_matricula, dados.data_ingresso,
              opt(dados.observacao), opt(dados.telefone_responsavel)))
    return {"id_pessoa": p["id_pessoa"]}


@router.put("/{id_aluno}")
def atualizar(id_aluno: int, dados: AlunoIn):
    with transacao() as s:
        n = s.executar("""
            UPDATE pessoa
               SET nome = %s, email = %s, telefone = %s, data_nascimento = %s
             WHERE id_pessoa = %s AND tipo_pessoa = 'A'
        """, (dados.nome, dados.email, opt(dados.telefone), dados.data_nascimento, id_aluno))
        exigir(n, "Aluno")
        s.executar("""
            UPDATE aluno
               SET numero_matricula = %s, data_ingresso = %s, observacao = %s, telefone_responsavel = %s
             WHERE id_pessoa = %s
        """, (dados.numero_matricula, dados.data_ingresso, opt(dados.observacao),
              opt(dados.telefone_responsavel), id_aluno))
    return {"id_pessoa": id_aluno}


@router.patch("/{id_aluno}/ativo")
def alterar_ativo(id_aluno: int, dados: AtivoIn):
    """Exclusão lógica (ativo = FALSE) ou reativação."""
    with sessao() as s:
        exigir(s.executar("UPDATE pessoa SET ativo = %s WHERE id_pessoa = %s AND tipo_pessoa = 'A'",
                          (dados.ativo, id_aluno)), "Aluno")
    return {"id_pessoa": id_aluno, "ativo": dados.ativo}


@router.delete("/{id_aluno}")
def remover(id_aluno: int):
    """Remoção física: aluno e pessoa na mesma transação.
    Se houver matrículas, a FK fk_matricula_aluno (ON DELETE RESTRICT) impede."""
    with transacao() as s:
        exigir(s.executar("DELETE FROM aluno WHERE id_pessoa = %s", (id_aluno,)), "Aluno")
        s.executar("DELETE FROM pessoa WHERE id_pessoa = %s", (id_aluno,))
    return {"removido": id_aluno}
