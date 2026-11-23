// Cliente HTTP do front-end. Toda operação passa pela API (/api/*);
// o front-end nunca acessa o PostgreSQL diretamente.
import { useSyncExternalStore } from "react";
import { sessaoStore } from "./sessao";

export type ComandoSQL = {
  sql: string;
  ms: number;
  linhas: number | null;
  ok: boolean;
  nota?: string;
  erro?: { sqlstate?: string; mensagem?: string; constraint?: string | null };
};

export type Rastro = {
  id: number;
  quando: Date;
  acao?: string; // descrição da ação no front-end
  metodo: string;
  rota: string;
  query: string;
  status: number;
  ms: number;
  sql: ComandoSQL[];
  erro?: string;
};

export type ErroPg = {
  sqlstate?: string;
  tipo?: string;
  constraint?: string | null;
  tabela?: string | null;
  mensagem?: string;
  detalhe?: string | null;
  origem?: string;
};

export class ApiError extends Error {
  status: number;
  pg?: ErroPg;
  rastro?: Rastro;
  constructor(msg: string, status: number, pg?: ErroPg, rastro?: Rastro) {
    super(msg);
    this.status = status;
    this.pg = pg;
    this.rastro = rastro;
  }
}

// ------------------------------------------------------------ store de rastros
let rastros: Rastro[] = [];
let seq = 0;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

export const traceStore = {
  inscrever(f: () => void) {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  },
  todos: () => rastros,
  limpar() {
    rastros = [];
    emitir();
  },
  adicionar(r: Rastro) {
    rastros = [r, ...rastros].slice(0, 80);
    emitir();
  },
};

export function useRastros() {
  return useSyncExternalStore(traceStore.inscrever, traceStore.todos);
}

// Painel do console (aberto/fechado + item em destaque)
let consoleAberto = false;
let destaque: number | null = null;
const ouvintesConsole = new Set<() => void>();
export const consoleSQL = {
  abrir(id?: number) {
    consoleAberto = true;
    destaque = id ?? null;
    ouvintesConsole.forEach((f) => f());
  },
  fechar() {
    consoleAberto = false;
    ouvintesConsole.forEach((f) => f());
  },
  alternar() {
    consoleAberto ? consoleSQL.fechar() : consoleSQL.abrir();
  },
};
let snapConsole: { aberto: boolean; destaque: number | null } = { aberto: consoleAberto, destaque };
export function useConsoleSQL() {
  return useSyncExternalStore(
    (f) => {
      ouvintesConsole.add(f);
      return () => ouvintesConsole.delete(f);
    },
    () => {
      if (snapConsole.aberto !== consoleAberto || snapConsole.destaque !== destaque)
        snapConsole = { aberto: consoleAberto, destaque };
      return snapConsole;
    },
  );
}

function decodificarRastro(h: string | null): Omit<Rastro, "id" | "quando"> | null {
  if (!h) return null;
  try {
    const bin = atob(h);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ requisição
type Opcoes = { acao?: string; body?: unknown; silencioso?: boolean };

async function requisitar<T>(metodo: string, url: string, op: Opcoes = {}): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: metodo,
      headers: op.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao back-end/API.", 0);
  }
  const bruto = decodificarRastro(resp.headers.get("X-SQL-Trace"));
  let dados: any = null;
  const texto = await resp.text();
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }
  let rastro: Rastro | undefined;
  if (bruto) {
    rastro = {
      ...bruto,
      id: ++seq,
      quando: new Date(),
      acao: op.acao,
      erro: resp.ok ? undefined : dados?.detail,
    };
    if (!op.silencioso || !resp.ok) traceStore.adicionar(rastro);
  }
  if (resp.status === 401 && !url.startsWith("/api/auth/")) {
    sessaoStore.set({ status: "anonimo", expirou: true });
  }
  if (!resp.ok) {
    const msg = typeof dados?.detail === "string" ? dados.detail : `Erro ${resp.status}`;
    throw new ApiError(msg, resp.status, dados?.pg, rastro);
  }
  return dados as T;
}

export const api = {
  get: <T = any>(url: string, op?: Opcoes) => requisitar<T>("GET", url, op),
  post: <T = any>(url: string, body: unknown, op?: Opcoes) => requisitar<T>("POST", url, { ...op, body }),
  put: <T = any>(url: string, body: unknown, op?: Opcoes) => requisitar<T>("PUT", url, { ...op, body }),
  patch: <T = any>(url: string, body: unknown, op?: Opcoes) => requisitar<T>("PATCH", url, { ...op, body }),
  del: <T = any>(url: string, op?: Opcoes) => requisitar<T>("DELETE", url, op),
};

export function qs(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}
