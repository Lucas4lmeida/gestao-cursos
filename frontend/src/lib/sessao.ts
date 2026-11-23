// Estado global simples: sessão do usuário e "modo demonstração técnica".
import { useSyncExternalStore } from "react";

function criarStore<T>(inicial: T) {
  let valor = inicial;
  const ouvintes = new Set<() => void>();
  return {
    get: () => valor,
    set(v: T) {
      valor = v;
      ouvintes.forEach((f) => f());
    },
    inscrever(f: () => void) {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
  };
}

// ----------------------------------------------------------------- sessão
export type EstadoSessao = { status: "verificando" | "anonimo" | "autenticado"; usuario?: string; expirou?: boolean };
export const sessaoStore = criarStore<EstadoSessao>({ status: "verificando" });
export const useSessao = () => useSyncExternalStore(sessaoStore.inscrever, sessaoStore.get);

// ------------------------------------------------------ modo demonstração
function lerDemo() {
  try {
    return localStorage.getItem("modoDemo") === "1";
  } catch {
    return false;
  }
}
export const demoStore = criarStore<boolean>(lerDemo());
export const useModoDemo = () => useSyncExternalStore(demoStore.inscrever, demoStore.get);
export function definirModoDemo(v: boolean) {
  try {
    localStorage.setItem("modoDemo", v ? "1" : "0");
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
  demoStore.set(v);
}
