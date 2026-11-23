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
export type Perfil = "padrao" | "apresentacao";
export type EstadoSessao = { status: "verificando" | "anonimo" | "autenticado"; usuario?: string; perfil?: Perfil; expirou?: boolean };
export const sessaoStore = criarStore<EstadoSessao>({ status: "verificando" });
export const useSessao = () => useSyncExternalStore(sessaoStore.inscrever, sessaoStore.get);

// ------------------------------------------------------ modo demonstração
// Só existe para o perfil "apresentacao" (o servidor também só envia o SQL a esse perfil).
// Para esse perfil começa ligado; a preferência fica salva no navegador.
function lerPreferencia() {
  try {
    return localStorage.getItem("modoDemo") !== "0";
  } catch {
    return true;
  }
}
let preferencia = lerPreferencia();
export const demoStore = criarStore<boolean>(false);
export const useModoDemo = () => useSyncExternalStore(demoStore.inscrever, demoStore.get);

function recalcularDemo() {
  demoStore.set(sessaoStore.get().perfil === "apresentacao" && preferencia);
}

export function definirSessao(estado: EstadoSessao) {
  sessaoStore.set(estado);
  recalcularDemo();
}

export function definirModoDemo(v: boolean) {
  preferencia = v;
  try {
    localStorage.setItem("modoDemo", v ? "1" : "0");
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
  recalcularDemo();
}
