import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, School, Star, UserSquare2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar, Cabecalho, Cartao, Carregando, ErroCarga, SeloStatus } from "../components/ui";
import { data, nota, numero } from "../lib/format";
import { useApi } from "../lib/hooks";

const CORES_STATUS: Record<string, string> = { Ativa: "#10b981", Concluída: "#0ea5e9", Trancada: "#f59e0b", Cancelada: "#f43f5e" };

function Kpi({ icone: I, rotulo, valor, cor, to }: { icone: any; rotulo: string; valor: any; cor: string; to: string }) {
  return (
    <Link to={to} className="group">
      <Cartao className="p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{rotulo}</span>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${cor}`}><I className="h-4 w-4" /></span>
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{valor}</div>
      </Cartao>
    </Link>
  );
}

function DicaGrafico({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="font-medium text-slate-800 dark:text-slate-100">{label ?? payload[0].name}</div>
      {payload.map((p: any) => <div key={p.dataKey} className="text-slate-500">{p.name}: <b className="text-slate-800 dark:text-slate-100">{p.value}</b></div>)}
    </div>
  );
}

export default function Painel() {
  const { dados, carregando, erro, recarregar } = useApi<any>("/api/painel", "Abrir o painel");
  const t = dados?.totais;

  return (
    <div>
      <Cabecalho icone={<LayoutDashboard className="h-5 w-5" />} titulo="Painel" subtitulo="Visão geral da instituição, calculada em tempo real no PostgreSQL (COUNT, AVG e GROUP BY)." />
      {erro && <Cartao><ErroCarga msg={erro} tentar={recarregar} /></Cartao>}
      {carregando && !dados && <Cartao><Carregando linhas={6} /></Cartao>}
      {dados && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Kpi to="/alunos" icone={Users} rotulo="Alunos ativos" valor={numero(t.alunos_ativos)} cor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" />
            <Kpi to="/professores" icone={UserSquare2} rotulo="Professores" valor={numero(t.professores_ativos)} cor="bg-violet-500/10 text-violet-600 dark:text-violet-300" />
            <Kpi to="/cursos" icone={GraduationCap} rotulo="Cursos" valor={numero(t.cursos_ativos)} cor="bg-sky-500/10 text-sky-600 dark:text-sky-300" />
            <Kpi to="/turmas" icone={School} rotulo="Turmas" valor={numero(t.turmas_ativas)} cor="bg-teal-500/10 text-teal-600 dark:text-teal-300" />
            <Kpi to="/matriculas" icone={ClipboardList} rotulo="Matrículas ativas" valor={`${t.matriculas_ativas}/${t.matriculas_total}`} cor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" />
            <Kpi to="/relatorios" icone={Star} rotulo="Média geral" valor={nota(t.media_geral)} cor="bg-amber-500/10 text-amber-600 dark:text-amber-300" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Cartao className="p-5 lg:col-span-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Matrículas por curso</h3>
              <p className="text-xs text-slate-500">COUNT(matrícula) agrupado por curso</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <BarChart data={dados.por_curso} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / .25)" />
                    <XAxis dataKey="curso" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: string) => v.split(" ").filter((w) => w.length > 2).map((w) => w[0]).join("").toUpperCase()} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={<DicaGrafico />} cursor={{ fill: "rgb(99 102 241 / .06)" }} />
                    <Bar dataKey="matriculas" name="Matrículas" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Cartao>
            <Cartao className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white">Situação das matrículas</h3>
              <p className="text-xs text-slate-500">GROUP BY status</p>
              <div className="relative mt-2 h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dados.por_status} dataKey="total" nameKey="status" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                      {dados.por_status.map((s: any) => <Cell key={s.status} fill={CORES_STATUS[s.status] ?? "#94a3b8"} />)}
                    </Pie>
                    <Tooltip content={<DicaGrafico />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-slate-900 dark:text-white">{t.matriculas_total}</span>
                  <span className="text-[11px] text-slate-500">matrículas</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {dados.por_status.map((s: any) => (
                  <div key={s.status} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CORES_STATUS[s.status] }} />
                    {s.status} <b className="ml-auto">{s.total}</b>
                  </div>
                ))}
              </div>
            </Cartao>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Cartao className="lg:col-span-2">
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="font-semibold text-slate-900 dark:text-white">Matrículas recentes</h3>
                <Link to="/matriculas" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">ver todas</Link>
              </div>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {dados.recentes.map((m: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <Avatar nome={m.nome_aluno} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.nome_aluno}</div>
                      <div className="truncate text-xs text-slate-500">{m.codigo_turma}/{m.ano_letivo} · {m.curso}</div>
                    </div>
                    <span className="hidden text-xs text-slate-500 sm:block">{data(m.data_matricula)}</span>
                    <SeloStatus status={m.status} />
                  </li>
                ))}
              </ul>
            </Cartao>
            <Cartao className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white">Média de notas por curso</h3>
              <p className="text-xs text-slate-500">AVG(nota_final) · cursos sem nota lançada aparecem com —</p>
              <ul className="mt-4 space-y-3">
                {dados.por_curso.map((c: any) => (
                  <li key={c.curso}>
                    <div className="flex justify-between text-xs"><span className="truncate pr-2 text-slate-600 dark:text-slate-300">{c.curso}</span><b className="text-slate-800 dark:text-slate-100">{nota(c.media)}</b></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${(Number(c.media ?? 0) / 10) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <Link to="/disciplinas" className="mt-5 flex items-center gap-2 text-xs text-slate-500 hover:text-brand-600"><BookOpen className="h-3.5 w-3.5" />{t.disciplinas_ativas} disciplinas ativas</Link>
            </Cartao>
          </div>
        </div>
      )}
    </div>
  );
}
