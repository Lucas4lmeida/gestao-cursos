"""Painel, opções para formulários e informações da arquitetura."""
from __future__ import annotations

import platform

import fastapi
import psycopg
from fastapi import APIRouter, HTTPException, Request

from .. import auth
from ..db import sessao

router = APIRouter(prefix="/api", tags=["Sistema"])


@router.get("/saude")
def saude(request: Request):
    """Identifica a instância PostgreSQL usada pelo back-end (somente perfil de apresentação)."""
    if not auth.eh_apresentacao(request):
        raise HTTPException(403, "Disponível apenas para o perfil de apresentação.")
    with sessao() as s:
        info = s.um("""
            SELECT version()                     AS versao,
                   current_database()            AS banco,
                   current_user                  AS usuario,
                   inet_server_addr()::text      AS host,
                   inet_server_port()            AS porta,
                   pg_postmaster_start_time()    AS iniciado_em,
                   now()                         AS agora
        """)
        objetos = s.todos("""
            SELECT 'tabela' AS tipo, c.relname AS nome FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind = 'r'
            UNION ALL
            SELECT 'view', viewname FROM pg_views WHERE schemaname = 'public'
            UNION ALL
            SELECT 'gatilho', tgname || ' (' || tgrelid::regclass || ')'
              FROM pg_trigger WHERE NOT tgisinternal
            ORDER BY 1, 2
        """)
    return {
        "banco": info,
        "objetos": objetos,
        "backend": {
            "framework": f"FastAPI {fastapi.__version__}",
            "driver": f"psycopg {psycopg.__version__} (libpq {psycopg.pq.version() / 10000:.1f})",
            "python": platform.python_version(),
            "servidor": platform.node(),
        },
    }


@router.get("/painel")
def painel():
    with sessao() as s:
        totais = s.um("""
            SELECT (SELECT count(*) FROM aluno a JOIN pessoa p USING (id_pessoa) WHERE p.ativo)      AS alunos_ativos,
                   (SELECT count(*) FROM professor pr JOIN pessoa p USING (id_pessoa) WHERE p.ativo) AS professores_ativos,
                   (SELECT count(*) FROM curso WHERE ativo)                                          AS cursos_ativos,
                   (SELECT count(*) FROM turma WHERE ativo)                                          AS turmas_ativas,
                   (SELECT count(*) FROM disciplina WHERE ativo)                                     AS disciplinas_ativas,
                   (SELECT count(*) FROM matricula WHERE status = 'Ativa')                           AS matriculas_ativas,
                   (SELECT count(*) FROM matricula)                                                  AS matriculas_total,
                   (SELECT round(avg(nota_final), 2) FROM matricula)                                 AS media_geral
        """)
        por_status = s.todos("""
            SELECT status, count(*) AS total
            FROM matricula
            GROUP BY status
            ORDER BY total DESC
        """)
        por_curso = s.todos("""
            SELECT c.nome AS curso, count(m.id_aluno) AS matriculas, round(avg(m.nota_final), 2) AS media
            FROM curso c
            LEFT JOIN turma t     ON t.id_curso = c.id_curso
            LEFT JOIN matricula m ON m.id_turma = t.id_turma
            GROUP BY c.id_curso, c.nome
            ORDER BY matriculas DESC
        """)
        recentes = s.todos("""
            SELECT nome_aluno, codigo_turma, ano_letivo, curso, data_matricula, status
            FROM vw_historico_matricula
            ORDER BY data_matricula DESC, nome_aluno
            LIMIT 6
        """)
    return {"totais": totais, "por_status": por_status, "por_curso": por_curso, "recentes": recentes}


@router.get("/opcoes")
def opcoes():
    """Listas enxutas para preencher os campos de seleção dos formulários."""
    with sessao() as s:
        return {
            "alunos": s.todos("""
                SELECT a.id_pessoa AS id, p.nome, a.numero_matricula, p.ativo
                FROM aluno a JOIN pessoa p ON p.id_pessoa = a.id_pessoa ORDER BY p.nome
            """),
            "professores": s.todos("""
                SELECT pr.id_pessoa AS id, p.nome, pr.titulacao, p.ativo,
                       EXISTS (SELECT 1 FROM curso c WHERE c.id_professor_coordenador = pr.id_pessoa) AS coordena
                FROM professor pr JOIN pessoa p ON p.id_pessoa = pr.id_pessoa ORDER BY p.nome
            """),
            "cursos": s.todos("SELECT id_curso AS id, nome, ativo FROM curso ORDER BY nome"),
            "disciplinas": s.todos("SELECT id_disciplina AS id, nome, ativo FROM disciplina ORDER BY nome"),
            "turmas": s.todos("""
                SELECT t.id_turma AS id, t.codigo, t.ano_letivo, c.nome AS curso, t.ativo
                FROM turma t JOIN curso c ON c.id_curso = t.id_curso
                ORDER BY t.ano_letivo DESC, t.codigo
            """),
        }
