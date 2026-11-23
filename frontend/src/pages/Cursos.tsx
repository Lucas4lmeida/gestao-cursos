import { Clock, Crown, GraduationCap, Plus, School, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AcoesLinha, ExcluirRegistro, FiltroAtivo, alternarAtivoRegistro, ativoParam, opcoesAtivo } from "../components/Crud";
import {
  AreaTexto, Botao, Busca, Cabecalho, Campo, Cartao, Carregando, Entrada, ErroCarga, FiltroSegmentado, Gaveta,
  Info, Modal, Selecao, Selo, SeloAtivo, Vazio,
} from "../components/ui";
import { api, qs } from "../lib/api";
import { numero } from "../lib/format";
import { notificarErro, notificarSucesso, useApi, useDebounce } from "../lib/hooks";

const vazio = { nome: "", carga_horaria: "", descricao: "", categoria: "", id_professor_coordenador: "" };

function FormCurso({ inicial, id, fechar, aoSalvar }: { inicial: any; id?: number; fechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState<any>(inicial);
  const [salvando, setSalvando] = useState(false);
  const { dados: op } = useApi<any>("/api/opcoes", "Carregar opções do formulário");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const corpo = { ...f, carga_horaria: Number(f.carga_horaria), id_professor_coordenador: Number(f.id_professor_coordenador) };
    try {
      if (id) await api.put(`/api/cursos/${id}`, corpo, { acao: `Editar curso ${f.nome}` });
      else await api.post("/api/cursos", corpo, { acao: `Cadastrar curso ${f.nome}` });
      notificarSucesso(id ? "Curso atualizado" : "Curso cadastrado");
      aoSalvar();
      fechar();
    } catch (err) {
      notificarErro(err);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal aberto fechar={fechar} titulo={id ? "Editar curso" : "Novo curso"} largura="max-w-2xl"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-curso" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-curso" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome do curso" obrigatorio className="sm:col-span-2" dicaTecnica="uk_curso_nome"><Entrada value={f.nome} onChange={set("nome")} required /></Campo>
        <Campo rotulo="Carga horária total (horas)" obrigatorio dicaTecnica="ck_curso_carga: carga_horaria > 0"><Entrada type="number" value={f.carga_horaria} onChange={set("carga_horaria")} required /></Campo>
        <Campo rotulo="Categoria"><Entrada value={f.categoria ?? ""} onChange={set("categoria")} placeholder="Tecnologia, Saúde…" /></Campo>
        <Campo rotulo="Professor coordenador" obrigatorio className="sm:col-span-2" dica="Cada professor pode coordenar apenas um curso." dicaTecnica="uk_curso_coordenador (1:1 Coordena)">
          <Selecao value={f.id_professor_coordenador} onChange={set("id_professor_coordenador")} required>
            <option value="">Selecione…</option>
            {op?.professores.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nome} — {p.titulacao}{p.coordena ? " (já coordena um curso)" : ""}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Descrição" className="sm:col-span-2"><AreaTexto value={f.descricao ?? ""} onChange={set("descricao")} /></Campo>
      </form>
    </Modal>
  );
}

function DetalheCurso({ id, fechar }: { id: number; fechar: () => void }) {
  const { dados: c, carregando } = useApi<any>(`/api/cursos/${id}`, "Consultar curso");
  return (
    <Gaveta aberto fechar={fechar} titulo="Detalhes do curso">
      {carregando || !c ? <Carregando /> : (
        <div className="space-y-6 p-5">
          <div>
            <div className="font-serif text-2xl font-semibold text-brand-900">{c.nome}</div>
            <div className="mt-2 flex flex-wrap gap-2"><SeloAtivo ativo={c.ativo} />{c.categoria && <Selo cor="azul">{c.categoria}</Selo>}<Selo>{c.carga_horaria} h</Selo></div>
            {c.descricao && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{c.descricao}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <Info rotulo="Coordenador">{c.coordenador}</Info>
            <Info rotulo="Titulação">{c.titulacao_coordenador}</Info>
            <div className="col-span-2"><Info rotulo="E-mail do coordenador">{c.email_coordenador}</Info></div>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Turmas do curso ({c.turmas.length})</h3>
            {c.turmas.length === 0 ? <p className="text-sm text-slate-500">Nenhuma turma.</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {c.turmas.map((t: any) => (
                  <li key={t.id_turma}>
                    <Link to={`/turmas/${t.id_turma}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <School className="h-4 w-4 text-slate-400" />
                      <div className="flex-1"><b className="text-slate-800 dark:text-slate-100">{t.codigo}/{t.ano_letivo}</b> <span className="text-xs text-slate-500">{t.horario ?? ""}</span></div>
                      <span className="text-xs text-slate-500">{t.matriculas} matrícula(s)</span>
                      {!t.ativo && <Selo>inativa</Selo>}
                    </Link>
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

export default function Cursos() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("todos");
  const q = useDebounce(busca);
  const { dados, carregando, erro, recarregar } = useApi<any[]>(`/api/cursos${qs({ q, ativo: ativoParam(filtro) })}`, q ? `Buscar cursos por "${q}"` : "Listar cursos");
  const [form, setForm] = useState<{ inicial: any; id?: number } | null>(null);
  const [ver, setVer] = useState<number | null>(null);
  const [excluir, setExcluir] = useState<any>(null);

  return (
    <div>
      <Cabecalho icone={<GraduationCap className="h-5 w-5" />} titulo="Cursos" subtitulo="Cursos oferecidos pela instituição, com coordenação, carga horária e turmas."
        acoes={<Botao icone={<Plus className="h-4 w-4" />} onClick={() => setForm({ inicial: vazio })}>Novo curso</Botao>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome, categoria ou descrição" />
        <FiltroSegmentado opcoes={opcoesAtivo} valor={filtro} onChange={setFiltro} />
      </div>
      {erro ? <Cartao><ErroCarga msg={erro} tentar={recarregar} /></Cartao> : carregando && !dados ? <Cartao><Carregando /></Cartao> : dados?.length === 0 ? (
        <Cartao><Vazio icone={<GraduationCap className="h-5 w-5" />} titulo="Nenhum curso encontrado" /></Cartao>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dados?.map((c) => (
            <Cartao key={c.id_curso} className={`flex flex-col p-5 transition hover:shadow-lg ${!c.ativo ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-800"><GraduationCap className="h-5 w-5" /></div>
                <div className="flex gap-2">{c.categoria && <Selo cor="azul">{c.categoria}</Selo>}<SeloAtivo ativo={c.ativo} /></div>
              </div>
              <button onClick={() => setVer(c.id_curso)} className="mt-4 text-left font-serif text-lg font-semibold leading-snug text-brand-900 hover:underline">{c.nome}</button>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{c.descricao ?? "Sem descrição."}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><Crown className="h-3.5 w-3.5 text-amber-500" />{c.coordenador}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                <div><Clock className="mx-auto h-4 w-4 text-slate-400" /><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{numero(c.carga_horaria)}h</div></div>
                <div><School className="mx-auto h-4 w-4 text-slate-400" /><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{c.turmas}</div></div>
                <div><Users className="mx-auto h-4 w-4 text-slate-400" /><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{c.matriculas}</div></div>
              </div>
              <div className="mt-3 flex justify-end">
                <AcoesLinha ver={() => setVer(c.id_curso)} editar={() => setForm({ id: c.id_curso, inicial: { ...c } })} ativo={c.ativo}
                  alternarAtivo={() => alternarAtivoRegistro(`/api/cursos/${c.id_curso}/ativo`, c.ativo, `curso ${c.nome}`, recarregar)}
                  excluir={() => setExcluir(c)} />
              </div>
            </Cartao>
          ))}
        </div>
      )}
      {form && <FormCurso {...form} fechar={() => setForm(null)} aoSalvar={recarregar} />}
      {ver && <DetalheCurso id={ver} fechar={() => setVer(null)} />}
      <ExcluirRegistro alvo={excluir} fechar={() => setExcluir(null)} url={`/api/cursos/${excluir?.id_curso}`} descricao={`o curso ${excluir?.nome}`} aoConcluir={recarregar} />
    </div>
  );
}
