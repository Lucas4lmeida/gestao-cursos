import clsx from "clsx";
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Database, MonitorSmartphone, Server, Trash2, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ComandoSQL, Rastro, consoleSQL, traceStore, useConsoleSQL, useRastros } from "../lib/api";
import { formatarSQL, realcarSQL } from "../lib/format";
import { BotaoIcone, Gaveta } from "./ui";

const corMetodo: Record<string, string> = {
  GET: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  POST: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  PATCH: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  DELETE: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

export function SeloMetodo({ m }: { m: string }) {
  return <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold", corMetodo[m] ?? "bg-slate-500/15")}>{m}</span>;
}

function BlocoSQL({ c }: { c: ComandoSQL }) {
  const controle = /^(BEGIN|COMMIT|ROLLBACK)$/.test(c.sql);
  const copiar = () => {
    navigator.clipboard?.writeText(c.sql).then(() => toast.success("SQL copiado"));
  };
  if (controle) {
    return (
      <div className={clsx("rounded-md px-3 py-1.5 font-mono text-xs",
        !c.ok ? "bg-rose-500/10 text-rose-400" : c.sql === "ROLLBACK" ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-300")}>
        <div className="flex items-center gap-2">
          <span className="font-bold">{c.sql};</span>
          {c.nota && <span className="font-sans text-[11px] opacity-80">— {c.nota}</span>}
          <span className="ml-auto text-[10px] text-slate-500">{c.ms} ms</span>
        </div>
        {c.erro && (
          <div className="mt-1 text-[11px] text-rose-300">
            <b>ERROR {c.erro.sqlstate}</b>: {c.erro.mensagem}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={clsx("group relative rounded-lg border", c.ok ? "border-slate-700/70 bg-slate-900" : "border-rose-500/40 bg-rose-950/30")}>
      <pre className="sql overflow-x-auto whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-[12px] leading-relaxed text-slate-200"
        dangerouslySetInnerHTML={{ __html: realcarSQL(formatarSQL(c.sql)) + ";" }} />
      <div className="flex items-center gap-3 border-t border-slate-800 px-3 py-1.5 text-[10px] text-slate-400">
        <span>{c.ms} ms</span>
        {c.linhas !== null && c.linhas >= 0 && <span>{c.linhas} linha(s)</span>}
        <button onClick={copiar} className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100 hover:text-white">
          <Copy className="h-3 w-3" /> copiar
        </button>
      </div>
      {c.erro && (
        <div className="border-t border-rose-500/30 px-3 py-2 text-[11px] text-rose-300">
          <span className="font-mono font-bold">ERROR {c.erro.sqlstate}</span> {c.erro.mensagem}
          {c.erro.constraint && <span className="ml-1 rounded bg-rose-500/20 px-1 font-mono">{c.erro.constraint}</span>}
        </div>
      )}
    </div>
  );
}

function Etapas({ r }: { r: Rastro }) {
  const ok = r.status < 400;
  const passos = [
    { icone: MonitorSmartphone, titulo: "Front-end", texto: r.acao ?? "Ação na interface" },
    { icone: Server, titulo: "Back-end/API", texto: `${r.metodo} ${r.rota}` },
    { icone: Database, titulo: "PostgreSQL", texto: `${r.sql.filter((s) => !/^(BEGIN|COMMIT|ROLLBACK)$/.test(s.sql)).length} comando(s) SQL` },
    { icone: ok ? CheckCircle2 : AlertTriangle, titulo: "Retorno", texto: `HTTP ${r.status} · ${r.ms} ms` },
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {passos.map((p, i) => (
        <div key={i} className="relative flex flex-col items-center rounded-lg bg-slate-800/60 px-1.5 py-2 text-center">
          <p.icone className={clsx("h-4 w-4", i === 3 ? (ok ? "text-emerald-400" : "text-rose-400") : "text-brand-300")} />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">{i + 1}. {p.titulo}</span>
          <span className="mt-0.5 line-clamp-2 break-all text-[10px] text-slate-400">{p.texto}</span>
          {i < 3 && <ArrowRight className="absolute -right-2 top-1/2 z-10 h-3 w-3 -translate-y-1/2 text-slate-500" />}
        </div>
      ))}
    </div>
  );
}

function ItemRastro({ r, aberto, alternar }: { r: Rastro; aberto: boolean; alternar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aberto) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [aberto]);
  const ok = r.status < 400;
  const nSql = r.sql.filter((s) => !/^(BEGIN|COMMIT|ROLLBACK)$/.test(s.sql)).length;
  return (
    <div ref={ref} className={clsx("rounded-xl border transition", aberto ? "border-brand-500/40 bg-slate-900" : "border-slate-800 bg-slate-900/60 hover:border-slate-700")}>
      <button onClick={alternar} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <SeloMetodo m={r.metodo} />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">{r.rota}{r.query ? `?${decodeURIComponent(r.query)}` : ""}</span>
        <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold", ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>{r.status}</span>
        <span className="w-14 text-right text-[10px] text-slate-500">{r.quando.toLocaleTimeString("pt-BR")}</span>
      </button>
      {!aberto && (
        <div className="-mt-1 px-3 pb-2 text-[11px] text-slate-500">
          {r.acao && <span className="text-slate-400">{r.acao} · </span>}{nSql} comando(s) · {r.ms} ms
          {r.erro && <span className="ml-1 text-rose-400">· {r.erro}</span>}
        </div>
      )}
      {aberto && (
        <div className="space-y-2 px-3 pb-3">
          <Etapas r={r} />
          {r.erro && (
            <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.erro}
            </div>
          )}
          {r.sql.length === 0 && <p className="text-xs text-slate-500">Nenhum comando SQL (validação feita na própria API).</p>}
          {r.sql.map((c, i) => <BlocoSQL key={i} c={c} />)}
        </div>
      )}
    </div>
  );
}

export default function ConsoleSQL() {
  const rastros = useRastros();
  const { aberto, destaque } = useConsoleSQL();
  const [selecionado, setSelecionado] = useState<number | null>(null);

  useEffect(() => {
    if (aberto) setSelecionado(destaque ?? rastros[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, destaque]);

  return (
    <Gaveta
      aberto={aberto}
      fechar={consoleSQL.fechar}
      largura="max-w-2xl"
      titulo={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-emerald-400 dark:bg-slate-800"><Zap className="h-4 w-4" /></div>
          <div>
            <div className="text-sm">Console SQL da API</div>
            <div className="text-[11px] font-normal text-slate-500">Comandos que o back-end executou no PostgreSQL, em ordem</div>
          </div>
        </div>
      }
      acoes={<BotaoIcone titulo="Limpar histórico" onClick={() => traceStore.limpar()}><Trash2 className="h-4 w-4" /></BotaoIcone>}
    >
      <div className="min-h-full space-y-2 bg-slate-950 p-4">
        {rastros.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma requisição registrada ainda. Use a aplicação e volte aqui.</p>}
        {rastros.map((r) => (
          <ItemRastro key={r.id} r={r} aberto={selecionado === r.id} alternar={() => setSelecionado(selecionado === r.id ? null : r.id)} />
        ))}
      </div>
    </Gaveta>
  );
}
