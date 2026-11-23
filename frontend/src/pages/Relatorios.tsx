import clsx from "clsx";
import { BarChart3, Code2 } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Cabecalho, Cartao, Carregando, Entrada, ErroCarga, Selecao, Selo, SeloStatus, Tabela, Td, Th, Vazio } from "../components/ui";
import { Rastro, api, qs, traceStore } from "../lib/api";
import { formatarSQL, nota, realcarSQL } from "../lib/format";
import { useDebounce } from "../lib/hooks";
import { useModoDemo } from "../lib/sessao";

/** Carrega um relatório e guarda o SQL que o back-end executou para gerá-lo. */
function useRelatorio(url: string, acao: string) {
  const [dados, setDados] = useState<any>(null);
  const [sql, setSql] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const carregar = async () => {
    setCarregando(true);
    try {
      const antes = Date.now();
      setDados(await api.get(url, { acao }));
      const r: Rastro | undefined = traceStore.todos().find((x) => x.rota === url.split("?")[0] && x.quando.getTime() >= antes - 5);
      setSql(r ? r.sql.map((c) => c.sql) : []);
      setErro(null);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [url]);
  return { dados, sql, erro, carregando, carregar };
}

function PainelSQL({ sql, destaque }: { sql: string[]; destaque: string }) {
  const [aberto, setAberto] = useState(true);
  const demo = useModoDemo();
  if (!demo || !sql.length) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-slate-400 hover:text-slate-200">
        <Code2 className="h-3.5 w-3.5 text-emerald-400" /> SQL executado pelo back-end <Selo cor="verde" className="ml-1">{destaque}</Selo>
        <span className="ml-auto">{aberto ? "ocultar" : "mostrar"}</span>
      </button>
      {aberto && sql.map((s, i) => (
        <pre key={i} className="sql overflow-x-auto whitespace-pre-wrap border-t border-slate-800 px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-200"
          dangerouslySetInnerHTML={{ __html: realcarSQL(formatarSQL(s)) + ";" }} />
      ))}
    </div>
  );
}

function Moldura({ titulo, descricao, controles, children, sql, destaque, erro, carregando, tentar }: {
  titulo: string; descricao: string; controles?: ReactNode; children: ReactNode; sql: string[]; destaque: string; erro: string | null; carregando: boolean; tentar: () => void;
}) {
  return (
    <div>
      <Cartao className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-brand-900">{titulo}</h3>
            <p className="text-sm text-slate-500">{descricao}</p>
          </div>
          {controles}
        </div>
        {erro ? <ErroCarga msg={erro} tentar={tentar} /> : carregando ? <Carregando linhas={4} /> : children}
      </Cartao>
      <PainelSQL sql={sql} destaque={destaque} />
    </div>
  );
}

function Desempenho() {
  const r = useRelatorio("/api/relatorios/desempenho-cursos", "Relatório: desempenho por curso");
  return (
    <Moldura titulo="Desempenho por curso" descricao="Matrículas por situação e estatísticas de notas em cada curso." destaque="GROUP BY + agregação" {...r} tentar={r.carregar}>
      {r.dados && (<>
        <div className="mb-6 h-56">
          <ResponsiveContainer>
            <BarChart data={r.dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / .25)" />
              <XAxis dataKey="curso" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: string) => v.split(" ").filter((w) => w.length > 2).map((w) => w[0]).join("").toUpperCase()} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ativas" stackId="a" name="Ativas" fill="#1f7a5a" />
              <Bar dataKey="concluidas" stackId="a" name="Concluídas" fill="#2c4d85" />
              <Bar dataKey="trancadas" stackId="a" name="Trancadas" fill="#bf972a" />
              <Bar dataKey="canceladas" stackId="a" name="Canceladas" fill="#9f2a3a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Tabela>
          <thead><tr><Th>Curso</Th><Th>Turmas</Th><Th>Matrículas</Th><Th className="hidden md:table-cell">Ativas</Th><Th className="hidden md:table-cell">Concluídas</Th><Th>Com nota</Th><Th>Média</Th><Th className="hidden lg:table-cell">Mín / Máx</Th></tr></thead>
          <tbody>
            {r.dados.map((c: any) => (
              <tr key={c.id_curso}>
                <Td className="font-medium text-slate-900 dark:text-white">{c.curso}</Td>
                <Td>{c.turmas}</Td><Td className="font-semibold">{c.matriculas}</Td>
                <Td className="hidden md:table-cell">{c.ativas}</Td><Td className="hidden md:table-cell">{c.concluidas}</Td>
                <Td>{c.com_nota}</Td><Td className="font-semibold">{nota(c.media_notas)}</Td>
                <Td className="hidden lg:table-cell">{nota(c.menor_nota)} / {nota(c.maior_nota)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </>)}
    </Moldura>
  );
}

function TurmasHaving() {
  const [min, setMin] = useState(5);
  const m = useDebounce(min, 350);
  const r = useRelatorio(`/api/relatorios/turmas-por-matriculas${qs({ minimo: m })}`, `Relatório: turmas com ao menos ${m} matrículas`);
  return (
    <Moldura titulo="Turmas com mais matrículas" descricao="Turmas que atingem o número mínimo de matrículas escolhido." destaque="HAVING count(*) >= mínimo" {...r} tentar={r.carregar}
      controles={<label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">Mínimo de matrículas
        <input type="range" min={1} max={10} value={min} onChange={(e) => setMin(Number(e.target.value))} className="accent-brand-800" />
        <span className="w-6 text-center font-mono font-semibold">{min}</span></label>}>
      {r.dados?.length === 0 ? <Vazio titulo="Nenhuma turma atinge esse mínimo" texto="O HAVING filtrou todos os grupos." /> : r.dados && (
        <Tabela>
          <thead><tr><Th>Turma</Th><Th>Curso</Th><Th>Matrículas</Th><Th>Média de notas</Th></tr></thead>
          <tbody>
            {r.dados.map((t: any) => (
              <tr key={t.id_turma}>
                <Td className="whitespace-nowrap font-mono font-medium text-slate-900 dark:text-white">{t.codigo}/{t.ano_letivo}</Td>
                <Td>{t.curso}</Td>
                <Td><div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-brand-700" style={{ width: `${Math.min(100, t.matriculas * 10)}%` }} /></div><b>{t.matriculas}</b></div></Td>
                <Td>{nota(t.media_notas)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </Moldura>
  );
}

function CargaDocente() {
  const [min, setMin] = useState(12);
  const m = useDebounce(min, 350);
  const r = useRelatorio(`/api/relatorios/carga-docente${qs({ minimo: m })}`, `Relatório: professores com carga >= ${m}h`);
  return (
    <Moldura titulo="Carga docente semanal" descricao="Professores cuja carga horária semanal somada atinge o mínimo informado." destaque="SUM + HAVING" {...r} tentar={r.carregar}
      controles={<label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">Carga mínima (h)
        <Entrada type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} className="!h-9 w-20" /></label>}>
      {r.dados?.length === 0 ? <Vazio titulo="Nenhum professor com essa carga" /> : r.dados && (
        <Tabela>
          <thead><tr><Th>Professor</Th><Th>Titulação</Th><Th>Alocações</Th><Th>Turmas</Th><Th>Disciplinas</Th><Th>Carga semanal</Th></tr></thead>
          <tbody>
            {r.dados.map((p: any) => (
              <tr key={p.id_pessoa}>
                <Td className="font-medium text-slate-900 dark:text-white">{p.professor}</Td>
                <Td><Selo cor="roxo">{p.titulacao}</Selo></Td>
                <Td>{p.alocacoes}</Td><Td>{p.turmas}</Td><Td>{p.disciplinas}</Td>
                <Td className="font-semibold">{p.carga_semanal} h</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </Moldura>
  );
}

function Historico() {
  const [f, setF] = useState<any>({ curso: "", status: "", ano_letivo: "" });
  const [opcoes, setOpcoes] = useState<any>(null);
  useEffect(() => { api.get("/api/opcoes", { silencioso: true }).then(setOpcoes).catch(() => {}); }, []);
  const r = useRelatorio(`/api/relatorios/historico${qs(f)}`, "Relatório: histórico acadêmico (JOIN)");
  return (
    <Moldura titulo="Histórico acadêmico" descricao="Trajetória acadêmica dos alunos: curso, turma, situação e nota." destaque="JOIN de 5 tabelas" {...r} tentar={r.carregar}
      controles={<div className="flex flex-wrap gap-2">
        <Selecao value={f.curso} onChange={(e) => setF({ ...f, curso: e.target.value })} className="!h-9 w-48"><option value="">Todos os cursos</option>{opcoes?.cursos.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Selecao>
        <Selecao value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="!h-9 w-36"><option value="">Status</option>{["Ativa", "Trancada", "Cancelada", "Concluída"].map((s) => <option key={s}>{s}</option>)}</Selecao>
        <Selecao value={f.ano_letivo} onChange={(e) => setF({ ...f, ano_letivo: e.target.value })} className="!h-9 w-28"><option value="">Ano</option>{[2025, 2026, 2027].map((a) => <option key={a}>{a}</option>)}</Selecao>
      </div>}>
      {r.dados?.length === 0 ? <Vazio titulo="Nenhum registro" /> : r.dados && (
        <Tabela>
          <thead><tr><Th>Aluno</Th><Th>Curso</Th><Th>Turma</Th><Th>Status</Th><Th>Nota</Th></tr></thead>
          <tbody>
            {r.dados.map((h: any, i: number) => (
              <tr key={i}>
                <Td><div className="font-medium text-slate-900 dark:text-white">{h.aluno}</div><div className="font-mono text-[11px] text-slate-400">{h.numero_matricula}</div></Td>
                <Td className="max-w-[240px] truncate">{h.curso}</Td>
                <Td className="whitespace-nowrap font-mono text-xs">{h.turma}/{h.ano_letivo}</Td>
                <Td><SeloStatus status={h.status} /></Td>
                <Td className="font-semibold">{nota(h.nota_final)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </Moldura>
  );
}

function AcimaMedia() {
  const r = useRelatorio("/api/relatorios/acima-da-media", "Relatório: alunos acima da média");
  return (
    <Moldura titulo="Alunos acima da média geral" descricao={`Notas maiores que a média de todas as notas lançadas${r.dados ? ` (${nota(r.dados.media_geral)})` : ""}.`} destaque="subconsulta" {...r} tentar={r.carregar}>
      {r.dados && (r.dados.alunos.length === 0 ? <Vazio titulo="Nenhum aluno acima da média" /> : (
        <Tabela>
          <thead><tr><Th>Aluno</Th><Th>Curso</Th><Th>Turma</Th><Th>Nota</Th></tr></thead>
          <tbody>
            {r.dados.alunos.map((a: any, i: number) => (
              <tr key={i}><Td className="font-medium text-slate-900 dark:text-white">{a.aluno}</Td><Td>{a.curso}</Td><Td className="whitespace-nowrap font-mono text-xs">{a.turma}/{a.ano_letivo}</Td><Td className="font-semibold text-emerald-600">{nota(a.nota_final)}</Td></tr>
            ))}
          </tbody>
        </Tabela>
      ))}
    </Moldura>
  );
}

const ABAS = [
  { id: "desempenho", rotulo: "Desempenho por curso", tag: "GROUP BY", C: Desempenho },
  { id: "turmas", rotulo: "Turmas por matrículas", tag: "HAVING", C: TurmasHaving },
  { id: "carga", rotulo: "Carga docente", tag: "HAVING", C: CargaDocente },
  { id: "historico", rotulo: "Histórico acadêmico", tag: "JOIN", C: Historico },
  { id: "media", rotulo: "Acima da média", tag: "Subconsulta", C: AcimaMedia },
];

export default function Relatorios() {
  const [aba, setAba] = useState(ABAS[0].id);
  const demo = useModoDemo();
  const Atual = ABAS.find((a) => a.id === aba)!.C;
  return (
    <div>
      <Cabecalho icone={<BarChart3 className="h-5 w-5" />} titulo="Relatórios" subtitulo="Indicadores acadêmicos, histórico e carga docente, calculados a partir dos registros atuais." />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={clsx("flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-[14px] font-semibold transition",
              aba === a.id ? "bg-brand-800 text-white" : "text-slate-600 hover:bg-slate-100")}>
            {a.rotulo}
            {demo && <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[10px]", aba === a.id ? "bg-white/20" : "bg-slate-100 text-slate-500")}>{a.tag}</span>}
          </button>
        ))}
      </div>
      <Atual key={aba} />
    </div>
  );
}
