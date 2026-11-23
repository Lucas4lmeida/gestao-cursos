from __future__ import annotations

from typing import Any

from fastapi import HTTPException


def opt(v: Any) -> Any:
    """Campos opcionais: string vazia vira NULL (o banco decide o resto)."""
    if isinstance(v, str) and v.strip() == "":
        return None
    return v


def exigir(registro: Any, entidade: str) -> Any:
    if not registro:
        raise HTTPException(status_code=404, detail=f"{entidade} não encontrado(a).")
    return registro


def padrao_busca(q: str | None) -> str | None:
    """Monta o padrão do ILIKE para busca por substring."""
    if q is None or q.strip() == "":
        return None
    return f"%{q.strip()}%"
