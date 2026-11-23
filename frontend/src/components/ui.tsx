import clsx from "clsx";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { iniciais } from "../lib/format";
import { useModoDemo } from "../lib/sessao";

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
      type="button"
      {...r}
      disabled={disabled || carregando}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap",
        tamanho === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variante === "primario" && "bg-brand-800 text-white shadow-sm hover:bg-brand-900",
        variante === "secundario" && "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
        variante === "perigo" && "bg-rose-700 text-white hover:bg-rose-800",
        variante === "fantasma" && "text-slate-600 hover:bg-slate-100",
        variante === "suave" && "border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100",
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
      type="button"
      {...r}
      title={titulo}
      aria-label={titulo}
      className={clsx("inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-brand-900", className)}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------- formulários
/** `dica` é para o usuário; `dicaTecnica` (nome da restrição etc.) só aparece no modo demonstração. */
export function Campo({ rotulo, dica, dicaTecnica, children, className, obrigatorio }: {
  rotulo: string; dica?: ReactNode; dicaTecnica?: ReactNode; children: ReactNode; className?: string; obrigatorio?: boolean;
}) {
  const demo = useModoDemo();
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {rotulo} {obrigatorio && <span className="text-rose-700" aria-hidden>*</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
      {demo && dicaTecnica && <span className="mt-1 block font-mono text-[11px] text-brand-600">{dicaTecnica}</span>}
    </label>
  );
}

const campoBase =
  "w-full rounded-md border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15";

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
  const id = useId();
  return (
    <div className="relative w-full sm:w-96">
      <label htmlFor={id} className="sr-only">{placeholder ?? "Buscar"}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input id={id} type="search" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Buscar…"}
        className={clsx(campoBase, "h-10 pl-9 pr-8")} />
      {valor && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FiltroSegmentado<T extends string>({ opcoes, valor, onChange }: { opcoes: { v: T; r: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
      {opcoes.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={valor === o.v} onClick={() => onChange(o.v)}
          className={clsx("rounded px-3 py-1.5 text-[13px] font-semibold transition",
            valor === o.v ? "bg-brand-800 text-white" : "text-slate-600 hover:text-brand-900")}>
          {o.r}
        </button>
      ))}
    </div>
  );
}

// -------------------------------------------------------------- estrutura
export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-lg border border-slate-200 bg-white shadow-card", className)}>{children}</section>;
}

export function TituloSecao({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-brand-900">{titulo}</h2>
        {subtitulo && <p className="text-[13px] text-slate-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Cabecalho({ titulo, subtitulo, acoes, trilha }: {
  titulo: string; subtitulo?: ReactNode; acoes?: ReactNode; icone?: ReactNode; trilha?: { rotulo: string; to?: string }[];
}) {
  const itens = [{ rotulo: "Início", to: "/" }, ...(trilha ?? []), { rotulo: titulo }];
  return (
    <div className="mb-7">
      <nav aria-label="Você está em" className="mb-3 flex flex-wrap items-center gap-1 text-[13px] text-slate-500">
        {itens.map((t, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
            {t.to && i < itens.length - 1 ? <Link to={t.to} className="hover:text-brand-800 hover:underline">{t.rotulo}</Link> : <span className="text-slate-700">{t.rotulo}</span>}
          </span>
        ))}
      </nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="border-l-4 border-ouro-500 pl-4">
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-brand-900">{titulo}</h1>
          {subtitulo && <p className="mt-1 max-w-3xl text-[15px] text-slate-600">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </div>
  );
}

export function Selo({ cor = "cinza", children, className }: { cor?: "cinza" | "verde" | "azul" | "ambar" | "vermelho" | "roxo"; children: ReactNode; className?: string }) {
  const cores = {
    cinza: "bg-slate-100 text-slate-700 ring-slate-200",
    verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    azul: "bg-sky-50 text-sky-800 ring-sky-200",
    ambar: "bg-amber-50 text-amber-800 ring-amber-200",
    vermelho: "bg-rose-50 text-rose-800 ring-rose-200",
    roxo: "bg-brand-50 text-brand-800 ring-brand-200",
  };
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", cores[cor], className)}>{children}</span>;
}

export function SeloStatus({ status }: { status: string }) {
  const mapa: Record<string, any> = { Ativa: "verde", Concluída: "azul", Trancada: "ambar", Cancelada: "vermelho" };
  return <Selo cor={mapa[status] ?? "cinza"}>{status}</Selo>;
}

export function SeloAtivo({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Selo cor="verde"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Ativo</Selo>
  ) : (
    <Selo cor="cinza"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Inativo</Selo>
  );
}

const coresAvatar = ["bg-brand-700", "bg-teal-700", "bg-slate-600", "bg-amber-700", "bg-sky-800", "bg-emerald-800", "bg-rose-800", "bg-indigo-800"];
export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" | "lg" }) {
  const cor = coresAvatar[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % coresAvatar.length];
  return (
    <div aria-hidden className={clsx("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", cor,
      tamanho === "sm" ? "h-7 w-7 text-[10px]" : tamanho === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs")}>
      {iniciais(nome)}
    </div>
  );
}

// --------------------------------------------------------------- tabela
export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[14.5px]">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={clsx("border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={clsx("border-b border-slate-100 px-4 py-3 text-slate-700", className)}>{children}</td>;
}

export function Vazio({ icone, titulo, texto, acao }: { icone?: ReactNode; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icone && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icone}</div>}
      <p className="font-serif text-lg font-semibold text-brand-900">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Carregando({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-slate-100" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function ErroCarga({ msg, tentar }: { msg: string; tentar: () => void }) {
  return <Vazio titulo="Não foi possível carregar as informações" texto={msg} acao={<Botao variante="secundario" onClick={tentar}>Tentar novamente</Botao>} />;
}

// ---------------------------------------------------------- modal / gaveta
function useEsc(aberto: boolean, fechar: () => void) {
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", f);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", f);
      document.body.style.overflow = anterior;
    };
  }, [aberto, fechar]);
}

export function Modal({ aberto, fechar, titulo, subtitulo, children, rodape, largura = "max-w-lg" }: {
  aberto: boolean; fechar: () => void; titulo: string; subtitulo?: ReactNode; children: ReactNode; rodape?: ReactNode; largura?: string;
}) {
  useEsc(aberto, fechar);
  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 animate-fade-in bg-brand-950/50" onClick={fechar} />
      <div className={clsx("relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-lg bg-white shadow-elev sm:rounded-lg", largura)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-brand-900">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
          </div>
          <BotaoIcone titulo="Fechar" onClick={fechar}><X className="h-4 w-4" /></BotaoIcone>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Gaveta({ aberto, fechar, titulo, children, largura = "max-w-xl", acoes, escura }: {
  aberto: boolean; fechar: () => void; titulo: ReactNode; children: ReactNode; largura?: string; acoes?: ReactNode; escura?: boolean;
}) {
  useEsc(aberto, fechar);
  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-brand-950/40" onClick={fechar} />
      <aside className={clsx("relative flex h-full w-full animate-slide-in flex-col shadow-elev", escura ? "bg-slate-950" : "bg-white", largura)}>
        <div className={clsx("flex items-center justify-between gap-3 border-b px-5 py-4", escura ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200")}>
          <div className="min-w-0 flex-1 font-serif text-lg font-semibold">{titulo}</div>
          {acoes}
          <BotaoIcone titulo="Fechar" onClick={fechar} className={escura ? "text-slate-400 hover:bg-slate-800 hover:text-white" : ""}><X className="h-4 w-4" /></BotaoIcone>
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
      <div className="text-[15px] text-slate-700">{texto}</div>
    </Modal>
  );
}

export function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 text-[15px] text-slate-800">{children ?? "—"}</dd>
    </div>
  );
}

/** Nota técnica (SQL/restrições): visível apenas no modo demonstração. */
export function NotaSQL({ children }: { children: ReactNode }) {
  const demo = useModoDemo();
  if (!demo) return null;
  return (
    <div className="flex gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-[13px] text-brand-900">
      <span className="font-mono text-xs font-bold text-brand-600">SQL</span>
      <span>{children}</span>
    </div>
  );
}

/** Aviso para o usuário (sempre visível). */
export function Aviso({ children, tipo = "info" }: { children: ReactNode; tipo?: "info" | "atencao" }) {
  return (
    <div className={clsx("rounded-md border px-3 py-2 text-[13.5px]",
      tipo === "atencao" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-brand-200 bg-brand-50 text-brand-900")}>
      {children}
    </div>
  );
}
