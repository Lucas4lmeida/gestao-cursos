import { Crown, Plus, UserSquare2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AcoesLinha, ExcluirRegistro, FiltroAtivo, alternarAtivoRegistro, ativoParam, opcoesAtivo } from "../components/Crud";
import {
  AreaTexto, Avatar, Botao, Busca, Cabecalho, Campo, Cartao, Carregando, Entrada, ErroCarga, FiltroSegmentado,
  Gaveta, Info, Modal, Selecao, Selo, SeloAtivo, Tabela, Td, Th, Vazio,
} from "../components/ui";
import { api, qs } from "../lib/api";
import { data, hoje, soDigitos } from "../lib/format";
import { notificarErro, notificarSucesso, useApi, useDebounce } from "../lib/hooks";

export const TITULACOES = ["Graduado", "Especialista", "Mestre", "Doutor", "Pós-Doutor"];
const vazio = { nome: "", email: "", telefone: "", data_nascimento: "", titulacao: "Mestre", data_contratacao: hoje(), especialidade: "", curriculo: "" };

function FormProfessor({ inicial, id, fechar, aoSalvar }: { inicial: any; id?: number; fechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState<any>(inicial);
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const corpo = { ...f, data_nascimento: f.data_nascimento || null, telefone: soDigitos(f.telefone) };
    try {
      if (id) await api.put(`/api/professores/${id}`, corpo, { acao: `Editar professor ${f.nome}` });
      else await api.post("/api/professores", corpo, { acao: `Cadastrar professor ${f.nome}` });
      notificarSucesso(id ? "Professor atualizado" : "Professor cadastrado", "INSERT/UPDATE em pessoa + professor na mesma transação");
      aoSalvar();
      fechar();
    } catch (err) {
      notificarErro(err);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal aberto fechar={fechar} titulo={id ? "Editar professor" : "Novo professor"} largura="max-w-2xl"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-prof" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-prof" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" obrigatorio className="sm:col-span-2"><Entrada value={f.nome} onChange={set("nome")} required /></Campo>
        <Campo rotulo="E-mail" obrigatorio dicaTecnica="uk_pessoa_email · ck_pessoa_email"><Entrada inputMode="email" autoComplete="off" value={f.email} onChange={set("email")} required /></Campo>
        <Campo rotulo="Telefone" dica="Com DDD"><Entrada type="tel" value={f.telefone ?? ""} onChange={set("telefone")} placeholder="(11) 98765-4321" /></Campo>
        <Campo rotulo="Titulação" obrigatorio dicaTecnica="ck_professor_titulacao">
          <Selecao value={f.titulacao} onChange={set("titulacao")}>{TITULACOES.map((t) => <option key={t}>{t}</option>)}</Selecao>
        </Campo>
        <Campo rotulo="Data de contratação" obrigatorio><Entrada type="date" value={f.data_contratacao ?? ""} onChange={set("data_contratacao")} required /></Campo>
        <Campo rotulo="Especialidade"><Entrada value={f.especialidade ?? ""} onChange={set("especialidade")} /></Campo>
        <Campo rotulo="Data de nascimento"><Entrada type="date" value={f.data_nascimento ?? ""} onChange={set("data_nascimento")} /></Campo>
        <Campo rotulo="Currículo" className="sm:col-span-2"><AreaTexto value={f.curriculo ?? ""} onChange={set("curriculo")} /></Campo>
      </form>
    </Modal>
  );
}

function DetalheProfessor({ id, fechar, editar }: { id: number; fechar: () => void; editar: (p: any) => void }) {
  const { dados: p, carregando } = useApi<any>(`/api/professores/${id}`, "Consultar professor");
  return (
    <Gaveta aberto fechar={fechar} titulo="Ficha do professor" acoes={p && <Botao tamanho="sm" variante="secundario" onClick={() => editar(p)}>Editar</Botao>}>
      {carregando || !p ? <Carregando /> : (
        <div className="space-y-6 p-5">
          <div className="flex items-center gap-4">
            <Avatar nome={p.nome} tamanho="lg" />
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{p.nome}</div>
              <div className="text-sm text-slate-500">{p.email}</div>
              <div className="mt-1 flex flex-wrap gap-2"><SeloAtivo ativo={p.ativo} /><Selo cor="roxo">{p.titulacao}</Selo>
                {p.curso_coordenado && <Selo cor="ambar"><Crown className="h-3 w-3" />Coordena {p.curso_coordenado}</Selo>}</div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <Info rotulo="Contratação">{data(p.data_contratacao)}</Info>
            <Info rotulo="Especialidade">{p.especialidade}</Info>
            <Info rotulo="Telefone">{p.telefone}</Info>
            <Info rotulo="Nascimento">{data(p.data_nascimento)}</Info>
            <div className="col-span-2"><Info rotulo="Currículo">{p.curriculo}</Info></div>
          </dl>
          <div>
            <h3 className="mb-2 font-serif text-base font-semibold text-brand-900">Disciplinas e turmas que leciona</h3>
            {p.alocacoes.length === 0 ? <p className="text-sm text-slate-500">Sem alocações.</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {p.alocacoes.map((a: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{a.disciplina}</div>
                      <Link to={`/turmas/${a.id_turma}`} className="text-xs text-brand-600 hover:underline dark:text-brand-400">{a.codigo_turma}/{a.ano_letivo} · {a.curso}</Link>
                    </div>
                    {a.funcao && <Selo>{a.funcao}</Selo>}
                    <span className="text-xs text-slate-500">{a.carga_horaria_semanal} h/sem</span>
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

export default function Professores() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("todos");
  const q = useDebounce(busca);
  const { dados, carregando, erro, recarregar } = useApi<any[]>(`/api/professores${qs({ q, ativo: ativoParam(filtro) })}`, q ? `Buscar professores por "${q}"` : "Listar professores");
  const [form, setForm] = useState<{ inicial: any; id?: number } | null>(null);
  const [ver, setVer] = useState<number | null>(null);
  const [excluir, setExcluir] = useState<any>(null);

  const editar = (p: any) => { setVer(null); setForm({ id: p.id_pessoa, inicial: { ...vazio, ...p, data_nascimento: p.data_nascimento ?? "" } }); };
  const abrirEdicao = async (id: number) => {
    try { editar(await api.get(`/api/professores/${id}`, { acao: "Consultar professor para edição" })); } catch (e) { notificarErro(e); }
  };

  return (
    <div>
      <Cabecalho icone={<UserSquare2 className="h-5 w-5" />} titulo="Professores" subtitulo="Corpo docente, titulação, coordenação de cursos e carga horária semanal."
        acoes={<Botao icone={<Plus className="h-4 w-4" />} onClick={() => setForm({ inicial: vazio })}>Novo professor</Botao>} />
      <Cartao>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome, e-mail ou especialidade" />
          <FiltroSegmentado opcoes={opcoesAtivo} valor={filtro} onChange={setFiltro} />
        </div>
        {erro ? <ErroCarga msg={erro} tentar={recarregar} /> : carregando && !dados ? <Carregando /> : dados?.length === 0 ? (
          <Vazio icone={<UserSquare2 className="h-5 w-5" />} titulo="Nenhum professor encontrado" />
        ) : (
          <Tabela>
            <thead><tr><Th>Professor</Th><Th>Titulação</Th><Th className="hidden lg:table-cell">Coordenação</Th><Th>Carga semanal</Th><Th>Situação</Th><Th /></tr></thead>
            <tbody>
              {dados?.map((p) => (
                <tr key={p.id_pessoa} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <Td>
                    <button onClick={() => setVer(p.id_pessoa)} className="flex items-center gap-3 text-left">
                      <Avatar nome={p.nome} />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 hover:text-brand-600 dark:text-white">{p.nome}</div>
                        <div className="truncate text-xs text-slate-500">{p.especialidade ?? p.email}</div>
                      </div>
                    </button>
                  </Td>
                  <Td><Selo cor="roxo">{p.titulacao}</Selo></Td>
                  <Td className="hidden lg:table-cell">{p.curso_coordenado ? <span className="inline-flex items-center gap-1 text-xs"><Crown className="h-3.5 w-3.5 text-amber-500" />{p.curso_coordenado}</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td><b className="text-slate-900 dark:text-white">{p.carga_semanal} h</b> <span className="text-xs text-slate-400">· {p.alocacoes} aloc.</span></Td>
                  <Td><SeloAtivo ativo={p.ativo} /></Td>
                  <Td>
                    <AcoesLinha ver={() => setVer(p.id_pessoa)} editar={() => abrirEdicao(p.id_pessoa)} ativo={p.ativo}
                      alternarAtivo={() => alternarAtivoRegistro(`/api/professores/${p.id_pessoa}/ativo`, p.ativo, `professor ${p.nome}`, recarregar)}
                      excluir={() => setExcluir(p)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        {dados && <div className="px-4 py-3 text-xs text-slate-500">{dados.length} professor(es)</div>}
      </Cartao>
      {form && <FormProfessor {...form} fechar={() => setForm(null)} aoSalvar={recarregar} />}
      {ver && <DetalheProfessor id={ver} fechar={() => setVer(null)} editar={editar} />}
      <ExcluirRegistro alvo={excluir} fechar={() => setExcluir(null)} url={`/api/professores/${excluir?.id_pessoa}`} descricao={`o professor ${excluir?.nome}`} aoConcluir={recarregar} />
    </div>
  );
}
