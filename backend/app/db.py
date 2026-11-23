"""Camada de acesso ao PostgreSQL (psycopg 3 + pool de conexões).

Todo comando SQL enviado ao banco passa por `Sessao`, que:
  * executa o comando com parâmetros (sem concatenação de valores no SQL);
  * registra o SQL efetivamente enviado, o tempo e o número de linhas no
    "rastro" da requisição atual (exibido no Console SQL do front-end).

Transações explícitas usam `transacao()`, que registra BEGIN / COMMIT / ROLLBACK.
Como os gatilhos RT01 e RT02 são DEFERRABLE INITIALLY DEFERRED, a violação só
aparece no COMMIT; o rastro mostra isso claramente.
"""
from __future__ import annotations

import os
import time
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator

import psycopg
from psycopg import ClientCursor
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

# Lista de comandos SQL da requisição HTTP atual (preenchida pelo middleware).
rastro_sql: ContextVar[list[dict[str, Any]] | None] = ContextVar("rastro_sql", default=None)

_pool: ConnectionPool | None = None


def abrir_pool() -> None:
    global _pool
    _pool = ConnectionPool(
        conninfo=os.environ["DATABASE_URL"],
        min_size=1,
        max_size=int(os.environ.get("DB_POOL_MAX", "5")),
        kwargs={
            "autocommit": True,           # transações são abertas explicitamente
            "row_factory": dict_row,      # linhas como dicionários (viram JSON)
            "cursor_factory": ClientCursor,  # permite registrar o SQL final (mogrify)
            "application_name": "gestao-cursos-api",
        },
        open=True,
    )
    _pool.wait(timeout=15)


def fechar_pool() -> None:
    if _pool is not None:
        _pool.close()


def _registrar(sql: str, inicio: float, linhas: int | None = None, erro: Exception | None = None,
               nota: str | None = None) -> None:
    rastro = rastro_sql.get()
    if rastro is None:
        return
    item: dict[str, Any] = {
        "sql": " ".join(sql.split()),
        "ms": round((time.perf_counter() - inicio) * 1000, 2),
        "linhas": linhas,
        "ok": erro is None,
    }
    if nota:
        item["nota"] = nota
    if isinstance(erro, psycopg.Error):
        item["erro"] = {
            "sqlstate": erro.sqlstate,
            "mensagem": erro.diag.message_primary,
            "constraint": erro.diag.constraint_name,
        }
    elif erro is not None:
        item["erro"] = {"mensagem": str(erro)}
    rastro.append(item)


class Sessao:
    """Envolve uma conexão do pool e registra cada comando executado."""

    def __init__(self, conn: psycopg.Connection):
        self.conn = conn

    def _executar(self, sql: str, params: Any = None) -> ClientCursor:
        cur = self.conn.cursor()
        try:
            texto = cur.mogrify(sql, params) if params is not None else sql
        except Exception:  # pragma: no cover - apenas para exibição
            texto = sql
        inicio = time.perf_counter()
        try:
            cur.execute(sql, params)
        except Exception as e:
            _registrar(texto, inicio, erro=e)
            raise
        _registrar(texto, inicio, linhas=cur.rowcount)
        return cur

    def todos(self, sql: str, params: Any = None) -> list[dict[str, Any]]:
        return self._executar(sql, params).fetchall()

    def um(self, sql: str, params: Any = None) -> dict[str, Any] | None:
        return self._executar(sql, params).fetchone()

    def executar(self, sql: str, params: Any = None) -> int:
        return self._executar(sql, params).rowcount


@contextmanager
def sessao() -> Iterator[Sessao]:
    """Conexão em autocommit: cada comando é uma transação implícita."""
    assert _pool is not None, "pool não inicializado"
    with _pool.connection() as conn:
        yield Sessao(conn)


@contextmanager
def transacao() -> Iterator[Sessao]:
    """Transação explícita: BEGIN ... COMMIT (ou ROLLBACK em caso de erro)."""
    assert _pool is not None, "pool não inicializado"
    with _pool.connection() as conn:
        s = Sessao(conn)
        _registrar("BEGIN", time.perf_counter())
        confirmando = False
        inicio_commit = 0.0
        try:
            with conn.transaction():
                yield s
                confirmando = True
                inicio_commit = time.perf_counter()
        except Exception as e:
            if confirmando:
                # Falha no COMMIT: gatilho diferido (RT01/RT02) rejeitou a transação.
                _registrar("COMMIT", inicio_commit, erro=e,
                           nota="Gatilho diferido verificado no COMMIT rejeitou a transação")
                _registrar("ROLLBACK", time.perf_counter(), nota="automático")
            else:
                _registrar("ROLLBACK", time.perf_counter(),
                           nota="transação desfeita: nenhuma alteração foi gravada")
            raise
        _registrar("COMMIT", inicio_commit,
                   nota="transação confirmada (gatilhos diferidos verificados)")
