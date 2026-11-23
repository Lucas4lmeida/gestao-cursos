import clsx from "clsx";
import {
  BarChart3, BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Library, Menu, Moon, Network,
  School, Sun, Terminal, UserSquare2, Users, X,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { consoleSQL, useRastros } from "../lib/api";
import ConsoleSQL, { SeloMetodo } from "./ConsoleSQL";

const menu = [
  { grupo: "Visão geral", itens: [{ to: "/", rotulo: "Painel", icone: LayoutDashboard }] },
  {
    grupo: "Cadastros",
    itens: [
      { to: "/alunos", rotulo: "Alunos", icone: Users },
      { to: "/professores", rotulo: "Professores", icone: UserSquare2 },
      { to: "/cursos", rotulo: "Cursos", icone: GraduationCap },
      { to: "/disciplinas", rotulo: "Disciplinas", icone: BookOpen },
    ],
  },
  {
    grupo: "Acadêmico",
    itens: [
      { to: "/turmas", rotulo: "Turmas", icone: School },
      { to: "/matriculas", rotulo: "Matrículas", icone: ClipboardList },
      { to: "/relatorios", rotulo: "Relatórios", icone: BarChart3 },
    ],
  },
  { grupo: "Projeto", itens: [{ to: "/arquitetura", rotulo: "Arquitetura & Demo", icone: Network }] },
];

function useTema() {
  const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    try { localStorage.setItem("tema", escuro ? "escuro" : "claro"); } catch { /* sem armazenamento */ }
  }, [escuro]);
  return [escuro, setEscuro] as const;
}

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
        "fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs text-slate-200 shadow-xl backdrop-blur transition-all duration-300 lg:left-[calc(50%+8rem)]",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <span className={clsx("h-2 w-2 rounded-full", r.status < 400 ? "bg-emerald-400" : "bg-rose-400")} />
      <SeloMetodo m={r.metodo} />
      <span className="truncate font-mono">{r.rota}</span>
      <span className="hidden text-slate-400 md:inline">→ PostgreSQL: {n} comando(s) · {r.ms} ms</span>
      <span className="text-brand-300">ver SQL</span>
    </button>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [escuro, setEscuro] = useTema();
  const [menuAberto, setMenuAberto] = useState(false);
  const rastros = useRastros();
  const local = useLocation();
  useEffect(() => setMenuAberto(false), [local.pathname]);

  const lateral = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/30">
          <Library className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Gestão de Cursos</div>
          <div className="text-[11px] text-slate-400">Projeto Final · BD</div>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {menu.map((g) => (
          <div key={g.grupo}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.grupo}</div>
            {g.itens.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === "/"}
                className={({ isActive }) => clsx(
                  "group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}>
                {({ isActive }) => (<>
                  <i.icone className={clsx("h-4 w-4", isActive ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300")} />
                  {i.rotulo}
                </>)}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="m-3 rounded-xl border border-white/5 bg-white/5 p-3 text-[11px] text-slate-400">
        <div className="mb-1 font-semibold text-slate-300">Arquitetura</div>
        React (front-end) → FastAPI (back-end/API) → PostgreSQL 16
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block dark:border-r dark:border-slate-800">{lateral}</aside>
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuAberto(false)} />
          <aside className="relative h-full w-64 animate-slide-in bg-slate-900">{lateral}
            <button onClick={() => setMenuAberto(false)} className="absolute right-3 top-5 text-slate-400"><X className="h-5 w-5" /></button>
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
          <button className="text-slate-600 lg:hidden dark:text-slate-300" onClick={() => setMenuAberto(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1" />
          <button onClick={() => consoleSQL.alternar()}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-3 text-xs font-medium text-emerald-300 shadow-sm transition hover:bg-slate-800 dark:border-slate-700">
            <Terminal className="h-4 w-4" />
            Console SQL
            {rastros.length > 0 && <span className="rounded-full bg-emerald-400/20 px-1.5 text-[10px] text-emerald-200">{rastros.length}</span>}
          </button>
          <button onClick={() => setEscuro(!escuro)} aria-label="Alternar tema"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <ConsoleSQL />
      <UltimaRequisicao />
    </div>
  );
}
