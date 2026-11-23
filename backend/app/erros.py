"""Tradução dos erros gerados pelo PostgreSQL em respostas HTTP claras.

A API não valida regras de negócio por conta própria: quem decide é o banco
(PK, UNIQUE, FK, CHECK, NOT NULL e gatilhos RT01/RT02). Este módulo apenas
converte o SQLSTATE e o nome da restrição em uma mensagem amigável, mantendo
os dados técnicos (sqlstate, constraint, tabela) para a demonstração.
"""
from __future__ import annotations

import psycopg
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

MENSAGENS: dict[str, str] = {
    # pessoa
    "uk_pessoa_email": "Já existe uma pessoa cadastrada com este e-mail.",
    "ck_pessoa_email": "E-mail em formato inválido (esperado: nome@dominio.ext).",
    "ck_pessoa_telefone": "Telefone deve conter somente dígitos (DDD + número, 10 ou 11 dígitos).",
    "ck_pessoa_nascimento": "A data de nascimento não pode ser futura.",
    "ck_pessoa_nome_nao_vazio": "O nome não pode ficar em branco.",
    "ck_pessoa_email_nao_vazio": "O e-mail não pode ficar em branco.",
    "ck_pessoa_tipo": "Tipo de pessoa inválido (A ou P).",
    # aluno
    "uk_aluno_numero_matricula": "Este número de matrícula já pertence a outro aluno.",
    "ck_aluno_tel_resp": "Telefone do responsável deve conter somente dígitos (10 ou 11).",
    "ck_aluno_num_mat_nao_vazio": "O número de matrícula não pode ficar em branco.",
    "fk_aluno_pessoa": "Pessoa inexistente ou de outro tipo (exclusividade da especialização).",
    # professor
    "ck_professor_titulacao": "Titulação inválida (Graduado, Especialista, Mestre, Doutor ou Pós-Doutor).",
    "fk_professor_pessoa": "Pessoa inexistente ou de outro tipo (exclusividade da especialização).",
    # curso
    "uk_curso_nome": "Já existe um curso com este nome.",
    "uk_curso_coordenador": "Este professor já coordena outro curso (um professor coordena no máximo um curso).",
    "ck_curso_carga": "A carga horária do curso deve ser maior que zero.",
    "ck_curso_nome_nao_vazio": "O nome do curso não pode ficar em branco.",
    "fk_curso_coordenador": "Professor coordenador inexistente.",
    # turma
    "uk_turma_codigo_ano": "Já existe uma turma com este código neste ano letivo.",
    "ck_turma_ano": "O ano letivo deve estar entre 2000 e 2100.",
    "ck_turma_codigo_nao_vazio": "O código da turma não pode ficar em branco.",
    "fk_turma_curso": "Curso inexistente.",
    # disciplina
    "uk_disciplina_nome": "Já existe uma disciplina com este nome.",
    "ck_disciplina_carga": "A carga horária da disciplina deve ser maior que zero.",
    "ck_disciplina_nome_nao_vazio": "O nome da disciplina não pode ficar em branco.",
    # matricula
    "pk_matricula": "Este aluno já está matriculado nesta turma.",
    "ck_matricula_status": "Status inválido (Ativa, Trancada, Cancelada ou Concluída).",
    "ck_matricula_nota": "A nota final deve estar entre 0 e 10.",
    "fk_matricula_aluno": "Aluno inexistente.",
    "fk_matricula_turma": "Turma inexistente.",
    # alocacao
    "pk_alocacao": "Este professor já está alocado nesta disciplina para esta turma.",
    "ck_alocacao_carga_semanal": "A carga horária semanal deve estar entre 1 e 60 horas.",
    "fk_alocacao_professor": "Professor inexistente.",
    "fk_alocacao_disciplina": "Disciplina inexistente.",
    "fk_alocacao_turma": "Turma inexistente.",
}

# Mensagens para FK violada ao EXCLUIR o registro referenciado (ON DELETE RESTRICT).
MENSAGENS_RESTRICT: dict[str, str] = {
    "fk_matricula_aluno": "O aluno possui matrículas e não pode ser excluído. Use a inativação (exclusão lógica).",
    "fk_matricula_turma": "A turma possui matrículas e não pode ser excluída. Use a inativação (exclusão lógica).",
    "fk_turma_curso": "O curso possui turmas vinculadas e não pode ser excluído. Use a inativação (exclusão lógica).",
    "fk_curso_coordenador": "O professor coordena um curso e não pode ser excluído. Troque o coordenador antes.",
    "fk_alocacao_professor": "O professor possui alocações e não pode ser excluído. Use a inativação (exclusão lógica).",
    "fk_alocacao_disciplina": "A disciplina está alocada em turmas e não pode ser excluída. Use a inativação (exclusão lógica).",
    "fk_alocacao_turma": "A turma possui alocações vinculadas.",
}

TIPOS = {
    "23505": "Violação de UNIQUE / PRIMARY KEY",
    "23503": "Violação de FOREIGN KEY",
    "23514": "Violação de CHECK",
    "23502": "Violação de NOT NULL",
    "22003": "Valor numérico fora do intervalo",
    "22007": "Formato de data inválido",
    "22008": "Data/hora fora do intervalo",
    "22P02": "Representação de valor inválida",
    "22001": "Texto maior que o tamanho da coluna",
}


def _origem(msg: str | None, constraint: str | None) -> str:
    if msg and msg.startswith(("RT01", "RT02", "RR06")):
        return "gatilho"
    if constraint:
        return "restrição declarativa"
    return "PostgreSQL"


async def tratar_erro_postgres(request: Request, exc: psycopg.Error) -> JSONResponse:
    diag = exc.diag
    sqlstate = exc.sqlstate or ""
    constraint = diag.constraint_name
    msg = diag.message_primary or str(exc)

    if isinstance(exc, psycopg.OperationalError) and not sqlstate.startswith("2"):
        return JSONResponse(status_code=503, content={
            "detail": "Não foi possível falar com o PostgreSQL. Verifique se o serviço está ativo.",
            "pg": {"sqlstate": sqlstate or None, "mensagem": msg, "origem": "conexão"},
        })

    if msg.startswith("RT02"):
        amigavel = ("Gatilho RT02 bloqueou a operação: toda turma precisa ter pelo menos uma alocação "
                    "(professor + disciplina). Nada foi gravado.")
    elif msg.startswith("RT01"):
        amigavel = ("Gatilho RT01 bloqueou a operação: toda pessoa precisa ter exatamente um registro "
                    "em aluno ou professor.")
    elif msg.startswith("RR06"):
        amigavel = "Gatilho RR06: identificadores são imutáveis."
    elif sqlstate == "23503" and request.method == "DELETE" and constraint in MENSAGENS_RESTRICT:
        amigavel = MENSAGENS_RESTRICT[constraint]
    elif constraint and constraint in MENSAGENS:
        amigavel = MENSAGENS[constraint]
    elif sqlstate == "23502":
        amigavel = f"Campo obrigatório não informado: {diag.column_name}."
    elif sqlstate == "22001":
        amigavel = "Um dos textos excede o tamanho máximo permitido pela coluna."
    elif sqlstate in TIPOS:
        amigavel = TIPOS[sqlstate] + "."
    else:
        amigavel = "O banco de dados rejeitou a operação."

    if sqlstate in ("23505", "23503"):
        status = 409
    elif sqlstate.startswith("23") or sqlstate.startswith("22"):
        status = 422
    else:
        status = 500

    return JSONResponse(status_code=status, content={
        "detail": amigavel,
        "pg": {
            "sqlstate": sqlstate,
            "tipo": TIPOS.get(sqlstate),
            "constraint": constraint,
            "tabela": diag.table_name,
            "coluna": diag.column_name,
            "mensagem": msg,
            "detalhe": diag.message_detail,
            "origem": _origem(msg, constraint),
        },
    })


async def tratar_erro_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    campos = []
    for e in exc.errors():
        loc = [str(p) for p in e.get("loc", []) if p not in ("body",)]
        campos.append(".".join(loc) or "?")
    return JSONResponse(status_code=422, content={
        "detail": "Dados em formato inválido para a API: " + ", ".join(dict.fromkeys(campos)) + ".",
        "api": {"origem": "validação de tipos da API (antes do banco)", "erros": exc.errors()},
    }, )
