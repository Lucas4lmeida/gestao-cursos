import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, api, consoleSQL } from "./api";

/** Carrega dados de uma URL da API e permite recarregar. */
export function useApi<T = any>(url: string | null, acao?: string) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const atual = useRef(0);

  const recarregar = useCallback(async () => {
    if (!url) return;
    const id = ++atual.current;
    setCarregando(true);
    try {
      const r = await api.get<T>(url, { acao });
      if (id === atual.current) {
        setDados(r);
        setErro(null);
      }
    } catch (e: any) {
      if (id === atual.current) setErro(e.message);
    } finally {
      if (id === atual.current) setCarregando(false);
    }
  }, [url, acao]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, carregando, erro, recarregar, setDados };
}

export function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/** Exibe o erro vindo do banco (via API) em um toast com SQLSTATE e restrição. */
export function notificarErro(e: unknown) {
  if (e instanceof ApiError) {
    const pg = e.pg;
    const partes = [
      pg?.sqlstate && `SQLSTATE ${pg.sqlstate}`,
      pg?.constraint,
      pg?.origem === "gatilho" ? "gatilho PostgreSQL" : null,
    ].filter(Boolean);
    toast.error(e.message, {
      description: partes.length ? partes.join(" · ") : undefined,
      duration: 8000,
      action: e.rastro ? { label: "Ver SQL", onClick: () => consoleSQL.abrir(e.rastro!.id) } : undefined,
    });
  } else {
    toast.error(String((e as any)?.message ?? e));
  }
}

export function notificarSucesso(msg: string, descricao?: string) {
  toast.success(msg, {
    description: descricao,
    action: { label: "Ver SQL", onClick: () => consoleSQL.abrir() },
  });
}
