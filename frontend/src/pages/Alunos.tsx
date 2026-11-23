import { Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AcoesLinha, ExcluirRegistro, FiltroAtivo, alternarAtivoRegistro, ativoParam, opcoesAtivo } from "../components/Crud";
import {
  AreaTexto, Avatar, Botao, Busca, Cabecalho, Campo, Cartao, Carregando, Entrada, ErroCarga, FiltroSegmentado,
  Gaveta, Info, Modal, NotaSQL, SeloAtivo, SeloStatus, Tabela, Td, Th, Vazio,
} from "../components/ui";
import { api, qs } from "../lib/api";
import { data, hoje, nota, soDigitos } from "../lib/format";
import { notificarErro, notificarSucesso, useApi, useDebounce } from "../lib/hooks";

const vazio = { nome: "", email: "", telefone: "", data_nascimento: "", numero_matricula: "", data_ingresso: hoje(), observacao: "", telefone_responsavel: "" };

function FormAluno({ inicial, id, fechar, aoSalvar }: { inicial: any; id?: number; fechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState<any>(inicial);
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const corpo = { ...f, data_nascimento: f.data_nascimento || null, telefone: soDigitos(f.telefone), telefone_responsavel: soDigitos(f.telefone_responsavel) };
    try {
      if (id) await api.put(`/api/alunos/${id}`, corpo, { acao: `Editar aluno ${f.nome}` });
      else await api.post("/api/alunos", corpo, { acao: `Cadastrar aluno ${f.nome}` });
      notificarSucesso(id ? "Aluno atualizado" : "Aluno cadastrado", id ? "UPDATE pessoa + UPDATE aluno" : "INSERT pessoa + INSERT aluno em uma transação");
      aoSalvar();
      fechar();
    } catch (err) {
      notificarErro(err);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal aberto fechar={fechar} titulo={id ? "Editar aluno" : "Novo aluno"} largura="max-w-2xl"
      subtitulo={id ? `Código interno ${id}` : "Preencha os dados do estudante. Campos com * são obrigatórios."}
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-aluno" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-aluno" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" obrigatorio className="sm:col-span-2"><Entrada value={f.nome} onChange={set("nome")} required /></Campo>
        <Campo rotulo="E-mail" obrigatorio dicaTecnica="uk_pessoa_email · ck_pessoa_email"><Entrada type="text" inputMode="email" autoComplete="off" value={f.email} onChange={set("email")} required /></Campo>
        <Campo rotulo="Telefone" dica="Com DDD" dicaTecnica="ck_pessoa_telefone"><Entrada type="tel" value={f.telefone ?? ""} onChange={set("telefone")} placeholder="(11) 98765-4321" /></Campo>
        <Campo rotulo="Data de nascimento"><Entrada type="date" value={f.data_nascimento ?? ""} onChange={set("data_nascimento")} /></Campo>
        <Campo rotulo="Nº de matrícula" obrigatorio dicaTecnica="uk_aluno_numero_matricula"><Entrada value={f.numero_matricula} onChange={set("numero_matricula")} required /></Campo>
        <Campo rotulo="Data de ingresso" obrigatorio><Entrada type="date" value={f.data_ingresso ?? ""} onChange={set("data_ingresso")} required /></Campo>
        <Campo rotulo="Telefone do responsável" dica="Com DDD"><Entrada type="tel" value={f.telefone_responsavel ?? ""} onChange={set("telefone_responsavel")} placeholder="(11) 98765-4321" /></Campo>
        <Campo rotulo="Observação" className="sm:col-span-2"><AreaTexto value={f.observacao ?? ""} onChange={set("observacao")} /></Campo>
        <div className="sm:col-span-2"><NotaSQL>INSERT pessoa + INSERT aluno em uma transação; RT01 verificado no COMMIT. Formato de e-mail/telefone e unicidade são validados pelo PostgreSQL.</NotaSQL></div>
      </form>
    </Modal>
  );
}

function DetalheAluno({ id, fechar, editar }: { id: number; fechar: () => void; editar: (a: any) => void }) {
  const { dados: a, carregando } = useApi<any>(`/api/alunos/${id}`, "Consultar aluno");
  return (
    <Gaveta aberto fechar={fechar} titulo="Ficha do aluno" acoes={a && <Botao tamanho="sm" variante="secundario" onClick={() => editar(a)}>Editar</Botao>}>
      {carregando || !a ? <Carregando /> : (
        <div className="space-y-6 p-5">
          <div className="flex items-center gap-4">
            <Avatar nome={a.nome} tamanho="lg" />
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{a.nome}</div>
              <div className="text-sm text-slate-500">{a.email}</div>
              <div className="mt-1 flex gap-2"><SeloAtivo ativo={a.ativo} /></div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <Info rotulo="Nº de matrícula">{a.numero_matricula}</Info>
            <Info rotulo="Ingresso">{data(a.data_ingresso)}</Info>
            <Info rotulo="Telefone">{a.telefone}</Info>
            <Info rotulo="Nascimento">{data(a.data_nascimento)}</Info>
            <Info rotulo="Tel. responsável">{a.telefone_responsavel}</Info>
            <Info rotulo="Código interno">{a.id_pessoa}</Info>
            <div className="col-span-2"><Info rotulo="Observação">{a.observacao}</Info></div>
          </dl>
          <div>
            <h3 className="mb-2 font-serif text-base font-semibold text-brand-900">Histórico de matrículas</h3>
            {a.matriculas.length === 0 ? <p className="text-sm text-slate-500">Nenhuma matrícula.</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {a.matriculas.map((m: any) => (
                  <li key={m.id_turma} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{m.codigo_turma}/{m.ano_letivo}</div>
                      <div className="truncate text-xs text-slate-500">{m.curso} · desde {data(m.data_matricula)}</div>
                    </div>
                    <span className="text-xs text-slate-500">nota <b className="text-slate-800 dark:text-slate-100">{nota(m.nota_final)}</b></span>
                    <SeloStatus status={m.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Gaveta>
  );
}

export default function Alunos() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("todos");
  const q = useDebounce(busca);
  const url = `/api/alunos${qs({ q, ativo: ativoParam(filtro) })}`;
  const { dados, carregando, erro, recarregar } = useApi<any[]>(url, q ? `Buscar alunos por "${q}"` : "Listar alunos");
  const [form, setForm] = useState<{ inicial: any; id?: number } | null>(null);
  const [ver, setVer] = useState<number | null>(null);
  const [excluir, setExcluir] = useState<any>(null);
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("novo")) { setForm({ inicial: vazio }); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const editar = (a: any) => {
    setVer(null);
    setForm({ id: a.id_pessoa, inicial: { ...vazio, ...a, data_nascimento: a.data_nascimento ?? "" } });
  };
  const abrirEdicao = async (id: number) => {
    try { editar(await api.get(`/api/alunos/${id}`, { acao: "Consultar aluno para edição" })); } catch (e) { notificarErro(e); }
  };

  return (
    <div>
      <Cabecalho icone={<Users className="h-5 w-5" />} titulo="Alunos" subtitulo="Cadastro dos estudantes da instituição, com dados de contato e histórico de matrículas."
        acoes={<Botao icone={<Plus className="h-4 w-4" />} onClick={() => setForm({ inicial: vazio })}>Novo aluno</Botao>} />
      <Cartao>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome, e-mail ou nº de matrícula" />
          <FiltroSegmentado opcoes={opcoesAtivo} valor={filtro} onChange={setFiltro} />
        </div>
        {erro ? <ErroCarga msg={erro} tentar={recarregar} /> : carregando && !dados ? <Carregando /> : dados?.length === 0 ? (
          <Vazio icone={<Users className="h-5 w-5" />} titulo="Nenhum aluno encontrado" texto={q ? `Nenhum resultado para "${q}".` : undefined} />
        ) : (
          <Tabela>
            <thead><tr><Th>Aluno</Th><Th>Matrícula</Th><Th className="hidden md:table-cell">Ingresso</Th><Th>Matrículas</Th><Th>Situação</Th><Th /></tr></thead>
            <tbody>
              {dados?.map((a) => (
                <tr key={a.id_pessoa} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <Td>
                    <button onClick={() => setVer(a.id_pessoa)} className="flex items-center gap-3 text-left">
                      <Avatar nome={a.nome} />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 hover:text-brand-600 dark:text-white">{a.nome}</div>
                        <div className="truncate text-xs text-slate-500">{a.email}</div>
                      </div>
                    </button>
                  </Td>
                  <Td className="font-mono text-xs">{a.numero_matricula}</Td>
                  <Td className="hidden md:table-cell">{data(a.data_ingresso)}</Td>
                  <Td><span className="font-medium text-slate-900 dark:text-white">{a.matriculas_ativas}</span><span className="text-slate-400"> / {a.total_matriculas}</span></Td>
                  <Td><SeloAtivo ativo={a.ativo} /></Td>
                  <Td>
                    <AcoesLinha ver={() => setVer(a.id_pessoa)} editar={() => abrirEdicao(a.id_pessoa)} ativo={a.ativo}
                      alternarAtivo={() => alternarAtivoRegistro(`/api/alunos/${a.id_pessoa}/ativo`, a.ativo, `aluno ${a.nome}`, recarregar)}
                      excluir={() => setExcluir(a)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        {dados && <div className="px-4 py-3 text-xs text-slate-500">{dados.length} aluno(s)</div>}
      </Cartao>
      {form && <FormAluno {...form} fechar={() => setForm(null)} aoSalvar={recarregar} />}
      {ver && <DetalheAluno id={ver} fechar={() => setVer(null)} editar={editar} />}
      <ExcluirRegistro alvo={excluir} fechar={() => setExcluir(null)} url={`/api/alunos/${excluir?.id_pessoa}`} descricao={`o aluno ${excluir?.nome}`} aoConcluir={recarregar} />
    </div>
  );
}
