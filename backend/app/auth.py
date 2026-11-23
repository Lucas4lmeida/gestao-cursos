"""Autenticação simples por sessão (cookie assinado).

Os usuários do sistema (equipe da secretaria) ficam na configuração do servidor
(variável APP_USUARIOS em /etc/gestao-cursos/gestao.env), com senha armazenada
apenas como hash PBKDF2-SHA256. Assim o modelo do banco do TP3 não é alterado.

    APP_USUARIOS="secretaria:pbkdf2_sha256$310000$<sal>$<hash>;outro:..."
    SESSION_SECRET="<texto aleatório longo>"

Gerar um hash:  python -m app.auth   (pede a senha no terminal)
"""
from __future__ import annotations

import base64
import getpass
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

COOKIE = "gc_sessao"
DURACAO_S = 8 * 3600
ITERACOES = 310_000

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


# ------------------------------------------------------------------ senhas
def gerar_hash(senha: str) -> str:
    sal = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", senha.encode(), bytes.fromhex(sal), ITERACOES).hex()
    return f"pbkdf2_sha256${ITERACOES}${sal}${h}"


def conferir_senha(senha: str, armazenado: str) -> bool:
    try:
        alg, it, sal, h = armazenado.split("$")
        if alg != "pbkdf2_sha256":
            return False
        calc = hashlib.pbkdf2_hmac("sha256", senha.encode(), bytes.fromhex(sal), int(it)).hex()
        return hmac.compare_digest(calc, h)
    except Exception:
        return False


def _usuarios() -> dict[str, str]:
    bruto = os.environ.get("APP_USUARIOS", "")
    out = {}
    for item in bruto.split(";"):
        if ":" in item:
            u, h = item.split(":", 1)
            out[u.strip().lower()] = h.strip()
    return out


# ------------------------------------------------------------------ tokens
def _segredo() -> bytes:
    s = os.environ.get("SESSION_SECRET")
    if not s:
        raise RuntimeError("SESSION_SECRET não configurado")
    return s.encode()


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def criar_token(usuario: str) -> str:
    carga = f"{usuario}|{int(time.time()) + DURACAO_S}"
    assinatura = hmac.new(_segredo(), carga.encode(), hashlib.sha256).digest()
    return f"{_b64(carga.encode())}.{_b64(assinatura)}"


def ler_token(token: str | None) -> str | None:
    if not token or "." not in token:
        return None
    try:
        p1, p2 = token.split(".", 1)
        carga = base64.urlsafe_b64decode(p1 + "=" * (-len(p1) % 4)).decode()
        assinatura = base64.urlsafe_b64decode(p2 + "=" * (-len(p2) % 4))
        esperado = hmac.new(_segredo(), carga.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(assinatura, esperado):
            return None
        usuario, expira = carga.rsplit("|", 1)
        if int(expira) < time.time() or usuario not in _usuarios():
            return None
        return usuario
    except Exception:
        return None


def usuario_da_requisicao(request: Request) -> str | None:
    if os.environ.get("AUTH_DESATIVADA") == "1":
        return "desenvolvimento"
    return ler_token(request.cookies.get(COOKIE))


# ------------------------------------------- limite de tentativas por IP
_falhas: dict[str, deque] = defaultdict(deque)
JANELA_S, MAX_FALHAS = 300, 8


def _bloqueado(ip: str) -> bool:
    fila = _falhas[ip]
    while fila and fila[0] < time.time() - JANELA_S:
        fila.popleft()
    return len(fila) >= MAX_FALHAS


# ------------------------------------------------------------------ rotas
class LoginIn(BaseModel):
    usuario: str
    senha: str


@router.post("/entrar")
def entrar(dados: LoginIn, request: Request, response: Response):
    ip = request.client.host if request.client else "?"
    if _bloqueado(ip):
        raise HTTPException(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.")
    usuario = dados.usuario.strip().lower()
    armazenado = _usuarios().get(usuario)
    if not armazenado or not conferir_senha(dados.senha, armazenado):
        _falhas[ip].append(time.time())
        raise HTTPException(401, "Usuário ou senha incorretos.")
    _falhas.pop(ip, None)
    response.set_cookie(
        COOKIE, criar_token(usuario), max_age=DURACAO_S, httponly=True, samesite="lax",
        secure=request.url.scheme == "https", path="/",
    )
    return {"usuario": usuario}


@router.post("/sair")
def sair(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/sessao")
def sessao(request: Request):
    usuario = usuario_da_requisicao(request)
    if not usuario:
        raise HTTPException(401, "Sessão expirada ou inexistente.")
    return {"usuario": usuario}


if __name__ == "__main__":
    s1 = getpass.getpass("Nova senha: ")
    s2 = getpass.getpass("Repita a senha: ")
    if s1 != s2 or len(s1) < 8:
        raise SystemExit("As senhas não conferem ou têm menos de 8 caracteres.")
    print(gerar_hash(s1))
