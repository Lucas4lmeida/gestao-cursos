"""Turmas e alocações (Professor x Disciplina x Turma).

RT02 (gatilho diferido): toda turma precisa de ao menos uma alocação. Por isso a
criação da turma é uma operação composta (turma + alocações na mesma transação)
e a remoção da última alocação de uma turma é rejeitada pelo PostgreSQL.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..db import sessao, transacao
from ..util import exigir, opt, padrao_busca

router = APIRouter(prefix="/api/turmas", tags=["Turmas e alocações"])


class AlocacaoIn(BaseModel):
    id_professor: int
    id_disciplina: int
    carga_horaria_semanal: int
    data_inicio: date
    funcao: str | None = None
    observacao: str | None = None


class AlocacaoUpd(BaseModel):
    carga_horaria_semanal: int
    data_inicio: date
    funcao: str | None = None
    observacao: str | None = None


class TurmaIn(BaseModel):
    codigo: str
    ano_letivo: int
    sala: str | None = None
    horario: str | None = None
    id_curso: int


class TurmaNovaIn(TurmaIn):
    alocacoes: list[AlocacaoIn] = Field(default_factory=list)


class AtivoIn(BaseModel):
    ativo: bool


class NotaIn(BaseModel):
    id_aluno: int
    nota_final: Decimal | None = None
    status: str


class LancamentoNotasIn(BaseModel):
    notas: list[NotaIn]


@router.get("")
def listar(q: str | None = None, ativo: bool | None = None, id_curso: int | None = None,
           ano_letivo: int | None = None):
    sql = """
        SELECT t.id_turma, t.codigo, t.ano_letivo, t.sala, t.horario, t.ativo,
               t.id_curso, c.nome AS curso,
               (SELECT count(*) FROM matricula m WHERE m.id_turma = t.id_turma) AS matriculas,
               (SELECT count(*) FROM matricula m WHERE m.id_turma = t.id_turma AND m.status = 'Ativa') AS matriculas_ativas,
               (SELECT string_agg(DISTINCT p.nome, ', ')
                  FROM alocacao al JOIN pessoa p ON p.id_pessoa = al.id_professor
                 WHERE al.id_turma = t.id_turma) AS professores,
               (SELECT count(*) FROM alocacao al WHERE al.id_turma = t.id_turma) AS alocacoes
        FROM turma t
        JOIN curso c ON c.id_curso = t.id_curso
    """
    filtros, params = [], {}
    padrao = padrao_busca(q)
    if padrao:
        filtros.append("(t.codigo ILIKE %(padrao)s OR c.nome ILIKE %(padrao)s OR t.sala ILIKE %(padrao)s)")
        params["padrao"] = padrao
    if ativo is not None:
        filtros.append("t.ativo = %(ativo)s")
        params["ativo"] = ativo
    if id_curso is not None:
        filtros.append("t.id_curso = %(id_curso)s")
        params["id_curso"] = id_curso
    if ano_letivo is not None:
        filtros.append("t.ano_letivo = %(ano)s")
        params["ano"] = ano_letivo
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " ORDER BY t.ano_letivo DESC, t.codigo"
    with sessao() as s:
        return s.todos(sql, params)


@router.get("/{id_turma}")
def consultar(id_turma: int):
    with sessao() as s:
        turma = exigir(s.um("""
            SELECT t.*, c.nome AS curso, p.nome AS coordenador
            FROM turma t
            JOIN curso c  ON c.id_curso = t.id_curso
            JOIN pessoa p ON p.id_pessoa = c.id_professor_coordenador
            WHERE t.id_turma = %s
        """, (id_turma,)), "Turma")
        turma["alocacoes"] = s.todos("""
            SELECT al.id_professor, p.nome AS professor, pr.titulacao,
                   al.id_disciplina, d.nome AS disciplina,
                   al.carga_horaria_semanal, al.data_inicio, al.funcao, al.observacao
            FROM alocacao al
            JOIN professor pr ON pr.id_pessoa = al.id_professor
            JOIN pessoa p     ON p.id_pessoa = pr.id_pessoa
            JOIN disciplina d ON d.id_disciplina = al.id_disciplina
            WHERE al.id_turma = %s
            ORDER BY d.nome, p.nome
        """, (id_turma,))
        turma["matriculas"] = s.todos("""
            SELECT id_aluno, nome_aluno, numero_matricula, data_matricula, status, nota_final
            FROM vw_historico_matricula
            WHERE id_turma = %s
            ORDER BY nome_aluno
        """, (id_turma,))
        return turma


@router.post("", status_code=201)
def inserir(dados: TurmaNovaIn):
    """Operação composta: INSERT turma + N INSERT alocacao em uma única transação.
    O gatilho trg_rt02_turma é verificado no COMMIT; sem alocação, tudo é desfeito."""
    with transacao() as s:
        t = s.um("""
            INSERT INTO turma (codigo, ano_letivo, sala, horario, id_curso)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id_turma
        """, (dados.codigo, dados.ano_letivo, opt(dados.sala), opt(dados.horario), dados.id_curso))
        for a in dados.alocacoes:
            s.executar("""
                INSERT INTO alocacao (id_professor, id_disciplina, id_turma, carga_horaria_semanal,
                                      data_inicio, funcao, observacao)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (a.id_professor, a.id_disciplina, t["id_turma"], a.carga_horaria_semanal,
                  a.data_inicio, opt(a.funcao), opt(a.observacao)))
    return t


@router.put("/{id_turma}")
def atualizar(id_turma: int, dados: TurmaIn):
    with sessao() as s:
        exigir(s.executar("""
            UPDATE turma SET codigo = %s, ano_letivo = %s, sala = %s, horario = %s, id_curso = %s
            WHERE id_turma = %s
        """, (dados.codigo, dados.ano_letivo, opt(dados.sala), opt(dados.horario), dados.id_curso,
              id_turma)), "Turma")
    return {"id_turma": id_turma}


@router.patch("/{id_turma}/ativo")
def alterar_ativo(id_turma: int, dados: AtivoIn):
    with sessao() as s:
        exigir(s.executar("UPDATE turma SET ativo = %s WHERE id_turma = %s", (dados.ativo, id_turma)), "Turma")
    return {"id_turma": id_turma, "ativo": dados.ativo}


@router.delete("/{id_turma}")
def remover(id_turma: int):
    """Remoção física: alocações + turma na mesma transação.
    Se houver matrículas, fk_matricula_turma (ON DELETE RESTRICT) desfaz tudo."""
    with transacao() as s:
        s.executar("DELETE FROM alocacao WHERE id_turma = %s", (id_turma,))
        exigir(s.executar("DELETE FROM turma WHERE id_turma = %s", (id_turma,)), "Turma")
    return {"removido": id_turma}


# ----------------------------------------------------------------- alocações
@router.post("/{id_turma}/alocacoes", status_code=201)
def inserir_alocacao(id_turma: int, a: AlocacaoIn):
    with sessao() as s:
        s.executar("""
            INSERT INTO alocacao (id_professor, id_disciplina, id_turma, carga_horaria_semanal,
                                  data_inicio, funcao, observacao)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (a.id_professor, a.id_disciplina, id_turma, a.carga_horaria_semanal, a.data_inicio,
              opt(a.funcao), opt(a.observacao)))
    return {"id_turma": id_turma, "id_professor": a.id_professor, "id_disciplina": a.id_disciplina}


@router.put("/{id_turma}/alocacoes/{id_professor}/{id_disciplina}")
def atualizar_alocacao(id_turma: int, id_professor: int, id_disciplina: int, a: AlocacaoUpd):
    with transacao() as s:
        exigir(s.executar("""
            UPDATE alocacao SET carga_horaria_semanal = %s, data_inicio = %s, funcao = %s, observacao = %s
            WHERE id_turma = %s AND id_professor = %s AND id_disciplina = %s
        """, (a.carga_horaria_semanal, a.data_inicio, opt(a.funcao), opt(a.observacao),
              id_turma, id_professor, id_disciplina)), "Alocação")
    return {"ok": True}


@router.delete("/{id_turma}/alocacoes/{id_professor}/{id_disciplina}")
def remover_alocacao(id_turma: int, id_professor: int, id_disciplina: int):
    """Aciona os gatilhos trg_rt02_serializa (BEFORE DELETE) e trg_rt02_alocacao (diferido).
    Se for a última alocação da turma, o COMMIT é rejeitado com 'RT02 violada'."""
    with transacao() as s:
        exigir(s.executar("""
            DELETE FROM alocacao
            WHERE id_turma = %s AND id_professor = %s AND id_disciplina = %s
        """, (id_turma, id_professor, id_disciplina)), "Alocação")
    return {"ok": True}


# ------------------------------------------------- lançamento de notas em lote
@router.put("/{id_turma}/notas")
def lancar_notas(id_turma: int, dados: LancamentoNotasIn):
    """Operação composta: atualiza várias matrículas em uma transação.
    Se qualquer nota violar ck_matricula_nota (0 a 10), nenhuma alteração é gravada."""
    with transacao() as s:
        total = 0
        for n in dados.notas:
            total += s.executar("""
                UPDATE matricula SET nota_final = %s, status = %s
                WHERE id_turma = %s AND id_aluno = %s
            """, (n.nota_final, n.status, id_turma, n.id_aluno))
    return {"atualizadas": total}
