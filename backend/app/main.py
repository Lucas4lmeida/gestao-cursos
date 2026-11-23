"""Back-end/API do Sistema de Gestão de Cursos (FastAPI + psycopg 3 + PostgreSQL).

Camadas:
  * Front-end  : React (build estático em app/static), servido por este mesmo processo.
  * Back-end   : esta API REST em /api/* (FastAPI).
  * SGBD       : PostgreSQL 16, acessado somente por aqui via psycopg (db.py).
"""
from __future__ import annotations

import base64
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from . import auth, db  # noqa: E402
from .erros import tratar_erro_postgres, tratar_erro_validacao  # noqa: E402
from .routers import alunos, cursos, disciplinas, matriculas, professores, relatorios, sistema, turmas  # noqa: E402

STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parent / "static"))


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    db.abrir_pool()
    yield
    db.fechar_pool()


app = FastAPI(
    title="Sistema de Gestão de Cursos — API",
    description="Back-end/API do PF. Toda operação é executada no PostgreSQL via psycopg.",
    version="1.0.0",
    lifespan=ciclo_de_vida,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_exception_handler(psycopg.Error, tratar_erro_postgres)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, tratar_erro_validacao)  # type: ignore[arg-type]


@app.middleware("http")
async def rastrear_sql(request: Request, call_next):
    """Anexa à resposta o rastro dos comandos SQL executados (cabeçalho X-SQL-Trace)."""
    if not request.url.path.startswith("/api"):
        return await call_next(request)
    rastro: list = []
    token = db.rastro_sql.set(rastro)
    inicio = time.perf_counter()
    try:
        resposta = await call_next(request)
    finally:
        db.rastro_sql.reset(token)
    ms = round((time.perf_counter() - inicio) * 1000, 2)
    for item in rastro:  # limita o tamanho do cabeçalho
        if len(item["sql"]) > 3000:
            item["sql"] = item["sql"][:3000] + " …"
    payload = {"metodo": request.method, "rota": request.url.path, "query": request.url.query,
               "status": resposta.status_code, "ms": ms, "sql": rastro}
    resposta.headers["X-SQL-Trace"] = base64.b64encode(
        json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")).decode("ascii")
    resposta.headers["X-Backend-Time"] = str(ms)
    return resposta


@app.middleware("http")
async def exigir_login(request: Request, call_next):
    """Toda rota /api/* exige sessão válida, exceto as de autenticação."""
    caminho = request.url.path
    if caminho.startswith("/api") and not caminho.startswith("/api/auth/"):
        if not auth.usuario_da_requisicao(request):
            return JSONResponse(status_code=401, content={"detail": "Faça login para continuar."})
    return await call_next(request)


for r in (auth, sistema, alunos, professores, cursos, disciplinas, turmas, matriculas, relatorios):
    app.include_router(r.router)


@app.get("/api/{caminho:path}", include_in_schema=False)
def api_inexistente(caminho: str):
    return JSONResponse(status_code=404, content={"detail": f"Rota /api/{caminho} não existe."})


# ------------------------------------------------------------------ front-end
if (STATIC_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


@app.get("/{caminho:path}", include_in_schema=False)
def spa(caminho: str):
    """Entrega o front-end React (SPA). Rotas desconhecidas caem no index.html."""
    arquivo = STATIC_DIR / caminho
    if caminho and arquivo.is_file() and STATIC_DIR in arquivo.resolve().parents:
        return FileResponse(arquivo)
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return JSONResponse(status_code=503, content={"detail": "Front-end ainda não compilado (npm run build)."})
