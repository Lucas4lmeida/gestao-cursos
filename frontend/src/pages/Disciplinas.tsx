import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AcoesLinha, ExcluirRegistro, FiltroAtivo, alternarAtivoRegistro, ativoParam, opcoesAtivo } from "../components/Crud";
import {
  AreaTexto, Botao, Busca, Cabecalho, Campo, Cartao, Carregando, Entrada, ErroCarga, FiltroSegmentado, Gaveta,
  Info, Modal, Selo, SeloAtivo, Tabela, Td, Th, Vazio,
} from "../components/ui";
import { api, qs } from "../lib/api";
import { notificarErro, notificarSucesso, useApi, useDebounce } from "../lib/hooks";

const vazio = { nome: "", carga_horaria: "", ementa: "", bibliografia: "" };

function FormDisciplina({ inicial, id, fechar, aoSalvar }: { inicial: any; id?: number; fechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState<any>(inicial);
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const corpo = { ...f, carga_horaria: Number(f.carga_horaria) };
      if (id) await api.put(`/api/disciplinas/${id}`, corpo, { acao: `Editar disciplina ${f.nome}` });
      else await api.post("/api/disciplinas", corpo, { acao: `Cadastrar disciplina ${f.nome}` });
      notificarSucesso(id ? "Disciplina atualizada" : "Disciplina cadastrada");
      aoSalvar();
      fechar();
    } catch (err) {
      notificarErro(err);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal aberto fechar={fechar} titulo={id ? "Editar disciplina" : "Nova disciplina"} largura="max-w-2xl"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-disc" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-disc" onSubmit={salvar} className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" obrigatorio className="sm:col-span-2" dicaTecnica="uk_disciplina_nome"><Entrada value={f.nome} onChange={set("nome")} required /></Campo>
        <Campo rotulo="Carga horária (horas)" obrigatorio dicaTecnica="ck_disciplina_carga: > 0"><Entrada type="number" value={f.carga_horaria} onChange={set("carga_horaria")} required /></Campo>
        <Campo rotulo="Ementa" className="sm:col-span-3"><AreaTexto value={f.ementa ?? ""} onChange={set("ementa")} /></Campo>
        <Campo rotulo="Bibliografia" className="sm:col-span-3"><AreaTexto value={f.bibliografia ?? ""} onChange={set("bibliografia")} /></Campo>
      </form>
    </Modal>
  );
}

function DetalheDisciplina({ id, fechar }: { id: number; fechar: () => void }) {
  const { dados: d, carregando } = useApi<any>(`/api/disciplinas/${id}`, "Consultar disciplina");
  return (
    <Gaveta aberto fechar={fechar} titulo="Detalhes da disciplina">
      {carregando || !d ? <Carregando /> : (
        <div className="space-y-6 p-5">
          <div>
            <div className="font-serif text-2xl font-semibold text-brand-900">{d.nome}</div>
            <div className="mt-2 flex gap-2"><SeloAtivo ativo={d.ativo} /><Selo>{d.carga_horaria} h</Selo></div>
          </div>
          <dl className="space-y-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <Info rotulo="Ementa">{d.ementa}</Info>
            <Info rotulo="Bibliografia">{d.bibliografia}</Info>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Onde é ministrada</h3>
            {d.alocacoes.length === 0 ? <p className="text-sm text-slate-500">Ainda não alocada em turmas.</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {d.alocacoes.map((a: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="flex-1">
                      <Link to={`/turmas/${a.id_turma}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">{a.codigo_turma}/{a.ano_letivo}</Link>
                      <div className="text-xs text-slate-500">{a.curso} · {a.professor}</div>
                    </div>
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

export default function Disciplinas() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("todos");
  const q = useDebounce(busca);
  const { dados, carregando, erro, recarregar } = useApi<any[]>(`/api/disciplinas${qs({ q, ativo: ativoParam(filtro) })}`, q ? `Buscar disciplinas por "${q}"` : "Listar disciplinas");
  const [form, setForm] = useState<{ inicial: any; id?: number } | null>(null);
  const [ver, setVer] = useState<number | null>(null);
  const [excluir, setExcluir] = useState<any>(null);

  return (
    <div>
      <Cabecalho icone={<BookOpen className="h-5 w-5" />} titulo="Disciplinas" subtitulo="Componentes curriculares, ementas e bibliografia."
        acoes={<Botao icone={<Plus className="h-4 w-4" />} onClick={() => setForm({ inicial: vazio })}>Nova disciplina</Botao>} />
      <Cartao>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome ou ementa" />
          <FiltroSegmentado opcoes={opcoesAtivo} valor={filtro} onChange={setFiltro} />
        </div>
        {erro ? <ErroCarga msg={erro} tentar={recarregar} /> : carregando && !dados ? <Carregando /> : dados?.length === 0 ? (
          <Vazio icone={<BookOpen className="h-5 w-5" />} titulo="Nenhuma disciplina encontrada" />
        ) : (
          <Tabela>
            <thead><tr><Th>Disciplina</Th><Th>Carga</Th><Th className="hidden md:table-cell">Alocações</Th><Th>Situação</Th><Th /></tr></thead>
            <tbody>
              {dados?.map((d) => (
                <tr key={d.id_disciplina} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <Td>
                    <button onClick={() => setVer(d.id_disciplina)} className="text-left">
                      <div className="font-medium text-slate-900 hover:text-brand-600 dark:text-white">{d.nome}</div>
                      <div className="line-clamp-1 max-w-md text-xs text-slate-500">{d.ementa ?? "—"}</div>
                    </button>
                  </Td>
                  <Td>{d.carga_horaria} h</Td>
                  <Td className="hidden md:table-cell">{d.alocacoes} turma(s) · {d.professores} prof.</Td>
                  <Td><SeloAtivo ativo={d.ativo} /></Td>
                  <Td>
                    <AcoesLinha ver={() => setVer(d.id_disciplina)} editar={() => setForm({ id: d.id_disciplina, inicial: { ...d } })} ativo={d.ativo}
                      alternarAtivo={() => alternarAtivoRegistro(`/api/disciplinas/${d.id_disciplina}/ativo`, d.ativo, `disciplina ${d.nome}`, recarregar)}
                      excluir={() => setExcluir(d)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        {dados && <div className="px-4 py-3 text-xs text-slate-500">{dados.length} disciplina(s)</div>}
      </Cartao>
      {form && <FormDisciplina {...form} fechar={() => setForm(null)} aoSalvar={recarregar} />}
      {ver && <DetalheDisciplina id={ver} fechar={() => setVer(null)} />}
      <ExcluirRegistro alvo={excluir} fechar={() => setExcluir(null)} url={`/api/disciplinas/${excluir?.id_disciplina}`} descricao={`a disciplina ${excluir?.nome}`} aoConcluir={recarregar} />
    </div>
  );
}
