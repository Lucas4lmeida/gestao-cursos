import { ArrowRight, BarChart3, ClipboardList, GraduationCap, School, UserPlus, UserSquare2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar, Cartao, Carregando, ErroCarga, SeloStatus, TituloSecao } from "../components/ui";
import { data, nota, numero } from "../lib/format";
import { useApi } from "../lib/hooks";
import { useSessao } from "../lib/sessao";

const CORES_STATUS: Record<string, string> = { Ativa: "#1f7a5a", Concluída: "#2c4d85", Trancada: "#bf972a", Cancelada: "#9f2a3a" };
const sigla = (v: string) => v.split(" ").filter((w) => w.length > 2).map((w) => w[0]).join("").toUpperCase();

function Indicador({ rotulo, valor, detalhe, to }: { rotulo: string; valor: any; detalhe?: string; to: string }) {
  return (
    <Link to={to} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-elev">
      <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{rotulo}</div>
      <div className="mt-1 font-serif text-4xl font-semibold text-brand-900">{valor}</div>
      {detalhe && <div className="mt-1 text-[13px] text-slate-500">{detalhe}</div>}
      <div className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100">Ver <ArrowRight className="h-3.5 w-3.5" /></div>
    </Link>
  );
}

function Atalho({ to, icone: I, titulo, texto }: { to: string; icone: any; titulo: string; texto: string }) {
  return (
    <Link to={to} className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-800 group-hover:bg-brand-800 group-hover:text-white"><I className="h-5 w-5" /></span>
      <span>
        <span className="block font-semibold text-brand-900">{titulo}</span>
        <span className="block text-[13px] text-slate-500">{texto}</span>
      </span>
    </Link>
  );
}

function Dica({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-elev">
      <div className="font-semibold text-brand-900">{payload[0].payload.curso ?? label ?? payload[0].name}</div>
      {payload.map((p: any) => <div key={p.dataKey} className="text-slate-600">{p.name}: <b>{p.value}</b></div>)}
    </div>
  );
}

export default function Painel() {
  const sessao = useSessao();
  const { dados, carregando, erro, recarregar } = useApi<any>("/api/painel", "Abrir a página inicial");
  const t = dados?.totais;
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-l-4 border-ouro-500 pl-4">
        <h1 className="font-serif text-[30px] font-semibold leading-tight text-brand-900">{saudacao}{sessao.usuario ? `, ${sessao.usuario.charAt(0).toUpperCase()}${sessao.usuario.slice(1)}` : ""}.</h1>
        <p className="text-[15px] text-slate-600">Resumo da Secretaria Acadêmica, com dados atualizados neste momento.</p>
      </div>

      {erro && <Cartao><ErroCarga msg={erro} tentar={recarregar} /></Cartao>}
      {carregando && !dados && <Cartao><Carregando linhas={6} /></Cartao>}
      {dados && (<>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Indicador to="/alunos" rotulo="Alunos ativos" valor={numero(t.alunos_ativos)} detalhe={`${t.professores_ativos} professores em atividade`} />
          <Indicador to="/cursos" rotulo="Cursos" valor={numero(t.cursos_ativos)} detalhe={`${t.disciplinas_ativas} disciplinas oferecidas`} />
          <Indicador to="/turmas" rotulo="Turmas" valor={numero(t.turmas_ativas)} detalhe="turmas ativas" />
          <Indicador to="/matriculas" rotulo="Matrículas ativas" valor={numero(t.matriculas_ativas)} detalhe={`de ${t.matriculas_total} registradas · média ${nota(t.media_geral)}`} />
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-brand-900">Acesso rápido</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Atalho to="/alunos?novo=1" icone={UserPlus} titulo="Cadastrar aluno" texto="Novo registro de estudante" />
            <Atalho to="/matriculas?nova=1" icone={ClipboardList} titulo="Matricular aluno" texto="Vincular aluno a uma turma" />
            <Atalho to="/turmas?nova=1" icone={School} titulo="Abrir turma" texto="Nova oferta de curso" />
            <Atalho to="/relatorios" icone={BarChart3} titulo="Relatórios" texto="Desempenho e histórico" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Cartao className="lg:col-span-2">
            <TituloSecao titulo="Matrículas por curso" subtitulo="Total de matrículas registradas em cada curso" />
            <div className="h-72 p-5">
              <ResponsiveContainer>
                <BarChart data={dados.por_curso} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="curso" tick={{ fontSize: 12, fill: "#475569" }} tickFormatter={sigla} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Dica />} cursor={{ fill: "rgba(21,39,69,.05)" }} />
                  <Bar dataKey="matriculas" name="Matrículas" fill="#1c3359" radius={[3, 3, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Cartao>
          <Cartao>
            <TituloSecao titulo="Situação das matrículas" />
            <div className="relative h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={dados.por_status} dataKey="total" nameKey="status" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="#fff">
                    {dados.por_status.map((s: any) => <Cell key={s.status} fill={CORES_STATUS[s.status] ?? "#94a3b8"} />)}
                  </Pie>
                  <Tooltip content={<Dica />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-3xl font-semibold text-brand-900">{t.matriculas_total}</span>
                <span className="text-xs text-slate-500">matrículas</span>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-2 px-5 pb-5">
              {dados.por_status.map((s: any) => (
                <li key={s.status} className="flex items-center gap-2 text-[13.5px] text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES_STATUS[s.status] }} />
                  {s.status} <b className="ml-auto">{s.total}</b>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Cartao className="lg:col-span-2">
            <TituloSecao titulo="Matrículas recentes" acoes={<Link to="/matriculas" className="text-[13.5px] font-semibold text-brand-700 hover:underline">Ver todas</Link>} />
            <ul className="divide-y divide-slate-100">
              {dados.recentes.map((m: any, i: number) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <Avatar nome={m.nome_aluno} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">{m.nome_aluno}</div>
                    <div className="truncate text-[13px] text-slate-500">{m.curso} · turma {m.codigo_turma}/{m.ano_letivo}</div>
                  </div>
                  <span className="hidden text-[13px] text-slate-500 sm:block">{data(m.data_matricula)}</span>
                  <SeloStatus status={m.status} />
                </li>
              ))}
            </ul>
          </Cartao>
          <Cartao>
            <TituloSecao titulo="Média de notas por curso" subtitulo="Escala de 0 a 10" />
            <ul className="space-y-4 p-5">
              {dados.por_curso.map((c: any) => (
                <li key={c.curso}>
                  <div className="flex justify-between gap-2 text-[13.5px]"><span className="truncate text-slate-700">{c.curso}</span><b className="text-brand-900">{nota(c.media)}</b></div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-ouro-500" style={{ width: `${(Number(c.media ?? 0) / 10) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 border-t border-slate-100 px-5 py-3 text-[13px]">
              <Link to="/professores" className="flex items-center gap-1 text-brand-700 hover:underline"><UserSquare2 className="h-4 w-4" />Professores</Link>
              <Link to="/cursos" className="flex items-center gap-1 text-brand-700 hover:underline"><GraduationCap className="h-4 w-4" />Cursos</Link>
              <Link to="/alunos" className="flex items-center gap-1 text-brand-700 hover:underline"><Users className="h-4 w-4" />Alunos</Link>
            </div>
          </Cartao>
        </div>
      </>)}
    </div>
  );
}
