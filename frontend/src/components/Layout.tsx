import clsx from "clsx";
import { LogOut, Menu, Terminal, UserCircle2, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { api, consoleSQL, useRastros } from "../lib/api";
import { definirModoDemo, sessaoStore, useModoDemo, useSessao } from "../lib/sessao";
import ConsoleSQL, { SeloMetodo } from "./ConsoleSQL";

export function Brasao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden>
      <path d="M24 2l20 8v13c0 13-8.7 24-20 30C12.7 47 4 36 4 23V10z" fill="#152745" stroke="#d4ae46" strokeWidth="2" />
      <path d="M12 22l12-6 12 6-12 6z" fill="none" stroke="#d4ae46" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 25.5v6c0 2 3.1 4 7 4s7-2 7-4v-6" fill="none" stroke="#d4ae46" strokeWidth="2" strokeLinejoin="round" />
      <path d="M36 22v8" stroke="#d4ae46" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const menu = [
  { to: "/", rotulo: "Início" },
  { to: "/alunos", rotulo: "Alunos" },
  { to: "/professores", rotulo: "Professores" },
  { to: "/cursos", rotulo: "Cursos" },
  { to: "/disciplinas", rotulo: "Disciplinas" },
  { to: "/turmas", rotulo: "Turmas" },
  { to: "/matriculas", rotulo: "Matrículas" },
  { to: "/relatorios", rotulo: "Relatórios" },
];

function UltimaRequisicao() {
  const rastros = useRastros();
  const r = rastros[0];
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!r) return;
    setVisivel(true);
    const t = setTimeout(() => setVisivel(false), 5000);
    return () => clearTimeout(t);
  }, [r?.id]);
  if (!r) return null;
  const n = r.sql.filter((s) => !/^(BEGIN|COMMIT|ROLLBACK)$/.test(s.sql)).length;
  return (
    <button
      onClick={() => consoleSQL.abrir(r.id)}
      className={clsx(
        "fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs text-slate-200 shadow-xl transition-all duration-300",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <span className={clsx("h-2 w-2 rounded-full", r.status < 400 ? "bg-emerald-400" : "bg-rose-400")} />
      <SeloMetodo m={r.metodo} />
      <span className="truncate font-mono">{r.rota}</span>
      <span className="hidden text-slate-400 md:inline">→ PostgreSQL: {n} comando(s) · {r.ms} ms</span>
      <span className="text-ouro-300">ver SQL</span>
    </button>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const demo = useModoDemo();
  const sessao = useSessao();
  const rastros = useRastros();
  const local = useLocation();
  useEffect(() => { setMenuAberto(false); window.scrollTo(0, 0); }, [local.pathname]);

  const sair = async () => {
    try { await api.post("/api/auth/sair", {}, { silencioso: true }); } catch { /* ignora */ }
    sessaoStore.set({ status: "anonimo" });
  };

  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hoje = dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1);
  const itens = demo ? [...menu, { to: "/arquitetura", rotulo: "Arquitetura" }] : menu;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Pular para o conteúdo</a>

      {/* Barra utilitária */}
      <div className="bg-brand-950 text-[12.5px] text-brand-100">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <span className="hidden sm:inline">{hoje}</span>
          <span className="sm:hidden">Secretaria Acadêmica</span>
          <div className="flex items-center gap-4">
            {demo && <span className="hidden rounded bg-ouro-500/20 px-2 py-0.5 font-semibold text-ouro-300 sm:inline">Modo demonstração</span>}
            <span className="flex items-center gap-1.5"><UserCircle2 className="h-4 w-4" />{sessao.usuario}</span>
            <button onClick={sair} className="flex items-center gap-1 font-semibold text-white hover:text-ouro-300"><LogOut className="h-3.5 w-3.5" />Sair</button>
          </div>
        </div>
      </div>

      {/* Cabeçalho institucional */}
      <header className="bg-brand-900">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Brasao className="h-12 w-11 shrink-0" />
          <div className="min-w-0">
            <div className="font-serif text-xl font-semibold leading-tight text-white sm:text-2xl">Portal Acadêmico</div>
            <div className="truncate text-[13px] tracking-wide text-brand-200">Sistema de Gestão de Cursos · Secretaria Acadêmica</div>
          </div>
          <button className="ml-auto rounded p-2 text-white lg:hidden" onClick={() => setMenuAberto(!menuAberto)} aria-label="Abrir menu" aria-expanded={menuAberto}>
            {menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Navegação principal */}
      <nav aria-label="Navegação principal" className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <ul className="hidden flex-1 lg:flex">
            {itens.map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.to === "/"}
                  className={({ isActive }) => clsx(
                    "block border-b-[3px] px-3.5 py-3.5 text-[14.5px] font-semibold transition-colors",
                    isActive ? "border-ouro-500 text-brand-900" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-brand-900",
                  )}>
                  {i.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
          {demo && (
            <button onClick={() => consoleSQL.alternar()}
              className="my-2 ml-auto flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-xs font-semibold text-emerald-300 hover:bg-slate-800">
              <Terminal className="h-4 w-4" />Console SQL
              {rastros.length > 0 && <span className="rounded bg-emerald-400/20 px-1.5 text-[10px] text-emerald-200">{rastros.length}</span>}
            </button>
          )}
          {!demo && <div className="h-[52px] lg:hidden" />}
        </div>
        {menuAberto && (
          <ul className="border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
            {itens.map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.to === "/"}
                  className={({ isActive }) => clsx("block rounded px-3 py-2.5 text-[15px] font-semibold",
                    isActive ? "bg-brand-50 text-brand-900" : "text-slate-700 hover:bg-slate-50")}>
                  {i.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Brasao className="h-8 w-7" />
            <div>
              <div className="font-serif font-semibold text-brand-900">Portal Acadêmico</div>
              <div>Sistema de Gestão de Cursos — Projeto Final de Banco de Dados</div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-start sm:self-auto">
            <input type="checkbox" checked={demo} onChange={(e) => definirModoDemo(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-brand-600" />
            <span>Modo demonstração técnica <span className="text-slate-400">(exibe o SQL executado)</span></span>
          </label>
        </div>
      </footer>

      {demo && <ConsoleSQL />}
      {demo && <UltimaRequisicao />}
    </div>
  );
}
