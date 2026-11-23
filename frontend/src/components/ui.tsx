import clsx from "clsx";
import { Loader2, Search, X } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { iniciais } from "../lib/format";

// ------------------------------------------------------------------ botões
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "perigo" | "fantasma" | "suave";
  tamanho?: "sm" | "md";
  carregando?: boolean;
  icone?: ReactNode;
};
export function Botao({ variante = "primario", tamanho = "md", carregando, icone, className, children, disabled, ...r }: BtnProps) {
  return (
    <button
      {...r}
      disabled={disabled || carregando}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        tamanho === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variante === "primario" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:scale-[.98]",
        variante === "secundario" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        variante === "perigo" && "bg-rose-600 text-white hover:bg-rose-700",
        variante === "fantasma" && "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        variante === "suave" && "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20",
        className,
      )}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : icone}
      {children}
    </button>
  );
}

export function BotaoIcone({ titulo, className, children, ...r }: React.ButtonHTMLAttributes<HTMLButtonElement> & { titulo: string }) {
  return (
    <button
      {...r}
      title={titulo}
      aria-label={titulo}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------- formulários
export function Campo({ rotulo, dica, children, className, obrigatorio }: { rotulo: string; dica?: ReactNode; children: ReactNode; className?: string; obrigatorio?: boolean }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
        {rotulo} {obrigatorio && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{dica}</span>}
    </label>
  );
}

const campoBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function Entrada(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={clsx(campoBase, "h-10", p.className)} />;
}
export function AreaTexto(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...p} className={clsx(campoBase, "py-2", p.className)} />;
}
export function Selecao(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={clsx(campoBase, "h-10 pr-8", p.className)} />;
}

export function Busca({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Buscar…"}
        className={clsx(campoBase, "h-10 pl-9 pr-8")}
      />
      {valor && (
        <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FiltroSegmentado<T extends string>({ opcoes, valor, onChange }: { opcoes: { v: T; r: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {opcoes.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            valor === o.v ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
          )}
        >
          {o.r}
        </button>
      ))}
    </div>
  );
}

// -------------------------------------------------------------- estrutura
export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900", className)}>{children}</div>;
}

export function Cabecalho({ titulo, subtitulo, acoes, icone }: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode; icone?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {icone && <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:text-brand-400">{icone}</div>}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>}
        </div>
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function Selo({ cor = "cinza", children, className }: { cor?: "cinza" | "verde" | "azul" | "ambar" | "vermelho" | "roxo"; children: ReactNode; className?: string }) {
  const cores = {
    cinza: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    verde: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    azul: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
    ambar: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    vermelho: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    roxo: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30",
  };
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", cores[cor], className)}>{children}</span>;
}

export function SeloStatus({ status }: { status: string }) {
  const mapa: Record<string, any> = { Ativa: "verde", Concluída: "azul", Trancada: "ambar", Cancelada: "vermelho" };
  return <Selo cor={mapa[status] ?? "cinza"}>{status}</Selo>;
}

export function SeloAtivo({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Selo cor="verde"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Ativo</Selo>
  ) : (
    <Selo cor="cinza"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Inativo</Selo>
  );
}

const coresAvatar = ["bg-indigo-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500", "bg-fuchsia-500"];
export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" | "lg" }) {
  const cor = coresAvatar[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % coresAvatar.length];
  return (
    <div className={clsx("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", cor,
      tamanho === "sm" ? "h-7 w-7 text-[10px]" : tamanho === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs")}>
      {iniciais(nome)}
    </div>
  );
}

// --------------------------------------------------------------- tabela
export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={clsx("border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={clsx("border-b border-slate-100 px-4 py-3 text-slate-700 dark:border-slate-800/70 dark:text-slate-300", className)}>{children}</td>;
}

export function Vazio({ icone, titulo, texto, acao }: { icone?: ReactNode; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icone && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">{icone}</div>}
      <p className="font-medium text-slate-800 dark:text-slate-200">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Carregando({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function ErroCarga({ msg, tentar }: { msg: string; tentar: () => void }) {
  return (
    <Vazio titulo="Não foi possível carregar" texto={msg} acao={<Botao variante="secundario" onClick={tentar}>Tentar novamente</Botao>} />
  );
}

// ---------------------------------------------------------- modal / gaveta
function useEsc(aberto: boolean, fechar: () => void) {
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberto, fechar]);
}

export function Modal({ aberto, fechar, titulo, subtitulo, children, rodape, largura = "max-w-lg" }: {
  aberto: boolean; fechar: () => void; titulo: string; subtitulo?: ReactNode; children: ReactNode; rodape?: ReactNode; largura?: string;
}) {
  useEsc(aberto, fechar);
  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" onClick={fechar} />
      <div className={clsx("relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800", largura)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>}
          </div>
          <BotaoIcone titulo="Fechar" onClick={fechar}><X className="h-4 w-4" /></BotaoIcone>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {rodape && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3 dark:border-slate-800 dark:bg-slate-900">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Gaveta({ aberto, fechar, titulo, children, largura = "max-w-xl", acoes }: {
  aberto: boolean; fechar: () => void; titulo: ReactNode; children: ReactNode; largura?: string; acoes?: ReactNode;
}) {
  useEsc(aberto, fechar);
  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/30" onClick={fechar} />
      <aside className={clsx("relative flex h-full w-full animate-slide-in flex-col bg-white shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800", largura)}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-white">{titulo}</div>
          {acoes}
          <BotaoIcone titulo="Fechar" onClick={fechar}><X className="h-4 w-4" /></BotaoIcone>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

export function Confirmar({ aberto, fechar, titulo, texto, confirmar, rotulo = "Confirmar", perigo, carregando }: {
  aberto: boolean; fechar: () => void; titulo: string; texto: ReactNode; confirmar: () => void; rotulo?: string; perigo?: boolean; carregando?: boolean;
}) {
  return (
    <Modal aberto={aberto} fechar={fechar} titulo={titulo} largura="max-w-md"
      rodape={<>
        <Botao variante="secundario" onClick={fechar}>Cancelar</Botao>
        <Botao variante={perigo ? "perigo" : "primario"} onClick={confirmar} carregando={carregando}>{rotulo}</Botao>
      </>}>
      <div className="text-sm text-slate-600 dark:text-slate-300">{texto}</div>
    </Modal>
  );
}

export function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{children ?? "—"}</dd>
    </div>
  );
}

export function NotaSQL({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-brand-200/70 bg-brand-50/60 px-3 py-2 text-xs text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-brand-200">
      <span className="font-mono font-semibold">SQL</span>
      <span>{children}</span>
    </div>
  );
}
