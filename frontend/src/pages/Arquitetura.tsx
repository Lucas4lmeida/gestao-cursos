import clsx from "clsx";
import { ArrowDown, ArrowRight, CheckCircle2, Database, Layers, MonitorSmartphone, Network, Server, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Cabecalho, Cartao, Carregando, ErroCarga, Selo } from "../components/ui";
import { useApi } from "../lib/hooks";

const ROTEIRO = [
  { req: "Inserção de registro", onde: "Alunos → Novo aluno", to: "/alunos", sql: "INSERT pessoa + INSERT aluno" },
  { req: "Atualização de registro", onde: "Matrículas → lápis (status/nota)", to: "/matriculas", sql: "UPDATE matricula" },
  { req: "Remoção de registro", onde: "Matrículas → lixeira", to: "/matriculas", sql: "DELETE FROM matricula" },
  { req: "Listagem de registros", onde: "Qualquer cadastro (ex.: Alunos)", to: "/alunos", sql: "SELECT … ORDER BY" },
  { req: "Consulta de registro específico", onde: "Alunos → olho (ficha do aluno)", to: "/alunos", sql: "SELECT … WHERE id_pessoa = ?" },
  { req: "Busca por substring", onde: "Caixa de busca em Alunos/Cursos", to: "/alunos", sql: "ILIKE '%texto%'" },
  { req: "Operação composta (múltiplos registros)", onde: "Turma → Matricular alunos / Lançar notas / Nova turma", to: "/turmas", sql: "BEGIN … N comandos … COMMIT" },
  { req: "Consulta com JOIN", onde: "Relatórios → Histórico acadêmico", to: "/relatorios", sql: "JOIN de 5 tabelas" },
  { req: "GROUP BY + agregação", onde: "Relatórios → Desempenho por curso", to: "/relatorios", sql: "COUNT, AVG, MIN, MAX" },
  { req: "HAVING", onde: "Relatórios → Turmas por matrículas", to: "/relatorios", sql: "HAVING count(*) >= n" },
  { req: "Acionar gatilho", onde: "Turma → remover a última alocação / Nova turma sem alocação", to: "/turmas", sql: "trg_rt02_* (RT02)" },
  { req: "Erro de integridade", onde: "Novo aluno com e-mail repetido; excluir curso com turmas", to: "/cursos", sql: "23505 / 23503 / 23514" },
];

function Camada({ icone: I, cor, titulo, subtitulo, itens }: { icone: any; cor: string; titulo: string; subtitulo: string; itens: [string, any][] }) {
  return (
    <Cartao className="flex-1 p-5">
      <div className="flex items-center gap-3">
        <div className={clsx("flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg", cor)}><I className="h-5 w-5" /></div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{titulo}</div>
          <div className="text-xs text-slate-500">{subtitulo}</div>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {itens.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5 dark:border-slate-800">
            <dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
    </Cartao>
  );
}

export default function Arquitetura() {
  const { dados, carregando, erro, recarregar } = useApi<any>("/api/saude", "Verificar conexão com o PostgreSQL");
  const b = dados?.banco;
  const versao = b?.versao?.split(" on ")[0].replace(/\s*\(.*\)/, "");
  const grupos = (dados?.objetos ?? []).reduce((acc: any, o: any) => ((acc[o.tipo] ||= []).push(o.nome), acc), {});

  return (
    <div>
      <Cabecalho icone={<Network className="h-5 w-5" />} titulo="Arquitetura & roteiro da demonstração"
        subtitulo="Onde está cada camada do sistema e onde demonstrar cada funcionalidade exigida." />
      {erro && <Cartao><ErroCarga msg={erro} tentar={recarregar} /></Cartao>}
      {carregando && !dados && <Cartao><Carregando /></Cartao>}
      {dados && (
        <div className="space-y-6">
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            <Camada icone={MonitorSmartphone} cor="bg-gradient-to-br from-sky-500 to-indigo-500" titulo="Front-end" subtitulo="Interface no navegador"
              itens={[["Tecnologia", "React 18 + Vite"], ["Estilo", "Tailwind CSS"], ["Código", "frontend/src"], ["Acesso ao banco", "nenhum (só HTTP /api)"]]} />
            <div className="flex justify-center text-slate-400"><ArrowRight className="hidden h-6 w-6 lg:block" /><ArrowDown className="h-6 w-6 lg:hidden" /></div>
            <Camada icone={Server} cor="bg-gradient-to-br from-violet-500 to-fuchsia-500" titulo="Back-end / API" subtitulo="REST em /api/*"
              itens={[["Framework", dados.backend.framework], ["Driver", dados.backend.driver], ["Python", dados.backend.python], ["Servidor", dados.backend.servidor]]} />
            <div className="flex justify-center text-slate-400"><ArrowRight className="hidden h-6 w-6 lg:block" /><ArrowDown className="h-6 w-6 lg:hidden" /></div>
            <Camada icone={Database} cor="bg-gradient-to-br from-emerald-500 to-teal-500" titulo="PostgreSQL" subtitulo="SGBD da aplicação"
              itens={[["Versão", versao], ["Banco", b.banco], ["Usuário", b.usuario], ["Endereço", `${b.host?.split("/")[0]}:${b.porta}`]]} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Cartao className="p-5 lg:col-span-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Roteiro: funcionalidades mínimas exigidas</h3>
              <p className="mt-1 text-xs text-slate-500">Em cada ação, abra o <b>Console SQL</b> (canto superior direito) para mostrar as etapas: front-end → API → SQL no PostgreSQL → retorno.</p>
              <ol className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {ROTEIRO.map((r, i) => (
                  <li key={r.req} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.req}</div>
                      <Link to={r.to} className="text-xs text-brand-600 hover:underline dark:text-brand-400">{r.onde}</Link>
                    </div>
                    <code className="hidden shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 sm:block dark:bg-slate-800 dark:text-slate-300">{r.sql}</code>
                  </li>
                ))}
              </ol>
            </Cartao>
            <Cartao className="p-5">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Layers className="h-4 w-4 text-brand-500" />Objetos do banco (TP3)</h3>
              <p className="mt-1 text-xs text-slate-500">Lidos do catálogo do PostgreSQL agora.</p>
              {Object.entries(grupos).map(([tipo, nomes]: any) => (
                <div key={tipo} className="mt-4">
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {tipo === "gatilho" && <Zap className="h-3 w-3 text-amber-500" />}{tipo}s ({nomes.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {nomes.map((n: string) => <Selo key={n} cor={tipo === "gatilho" ? "ambar" : tipo === "view" ? "azul" : "cinza"} className="font-mono">{n}</Selo>)}
                  </div>
                </div>
              ))}
            </Cartao>
          </div>
        </div>
      )}
    </div>
  );
}
