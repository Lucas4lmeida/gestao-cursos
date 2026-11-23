import { CalendarDays, MapPin, Plus, School, Trash2, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiltroAtivo, ativoParam, opcoesAtivo } from "../components/Crud";
import {
  Botao, BotaoIcone, Busca, Cabecalho, Campo, Cartao, Carregando, Entrada, ErroCarga, FiltroSegmentado, Modal,
  Selecao, Selo, SeloAtivo, Vazio,
} from "../components/ui";
import { api, qs } from "../lib/api";
import { hoje } from "../lib/format";
import { notificarErro, notificarSucesso, useApi, useDebounce } from "../lib/hooks";

export const alocacaoVazia = () => ({ id_professor: "", id_disciplina: "", carga_horaria_semanal: "4", data_inicio: hoje(), funcao: "Titular" });

function NovaTurma({ fechar, aoSalvar }: { fechar: () => void; aoSalvar: (id: number) => void }) {
  const { dados: op } = useApi<any>("/api/opcoes", "Carregar opções do formulário");
  const [f, setF] = useState<any>({ codigo: "", ano_letivo: String(new Date().getFullYear()), sala: "", horario: "", id_curso: "" });
  const [alocs, setAlocs] = useState<any[]>([alocacaoVazia()]);
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const setA = (i: number, k: string) => (e: any) => setAlocs(alocs.map((a, j) => (j === i ? { ...a, [k]: e.target.value } : a)));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const r = await api.post("/api/turmas", {
        ...f,
        ano_letivo: Number(f.ano_letivo),
        id_curso: Number(f.id_curso),
        alocacoes: alocs.map((a) => ({ ...a, id_professor: Number(a.id_professor), id_disciplina: Number(a.id_disciplina), carga_horaria_semanal: Number(a.carga_horaria_semanal) })),
      }, { acao: `Criar turma ${f.codigo} com ${alocs.length} alocação(ões)` });
      notificarSucesso("Turma criada", `INSERT turma + ${alocs.length} INSERT alocacao em uma transação; RT02 aprovado no COMMIT.`);
      aoSalvar(r.id_turma);
      fechar();
    } catch (err) {
      notificarErro(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto fechar={fechar} titulo="Nova turma" largura="max-w-3xl"
      subtitulo="Operação composta: a turma e suas alocações são gravadas na mesma transação."
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-turma" carregando={salvando}>Criar turma</Botao></>}>
      <form id="form-turma" onSubmit={salvar} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo rotulo="Código" obrigatorio dica="Único por ano"><Entrada value={f.codigo} onChange={set("codigo")} placeholder="ADS-3C" required /></Campo>
          <Campo rotulo="Ano letivo" obrigatorio dica="2000 a 2100"><Entrada type="number" value={f.ano_letivo} onChange={set("ano_letivo")} required /></Campo>
          <Campo rotulo="Curso" obrigatorio className="sm:col-span-2">
            <Selecao value={f.id_curso} onChange={set("id_curso")} required>
              <option value="">Selecione…</option>
              {op?.cursos.filter((c: any) => c.ativo).map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Sala" className="sm:col-span-2"><Entrada value={f.sala} onChange={set("sala")} placeholder="Laboratório 2" /></Campo>
          <Campo rotulo="Horário" className="sm:col-span-2"><Entrada value={f.horario} onChange={set("horario")} placeholder="Seg/Qua 19:00-22:30" /></Campo>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Alocações (professor + disciplina)</h3>
              <p className="text-xs text-slate-500">Inseridas na mesma transação da turma.</p>
            </div>
            <Botao type="button" tamanho="sm" variante="suave" icone={<Plus className="h-3.5 w-3.5" />} onClick={() => setAlocs([...alocs, alocacaoVazia()])}>Adicionar</Botao>
          </div>
          <div className="space-y-2">
            {alocs.map((a, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                <Campo rotulo="Professor" className="col-span-12 sm:col-span-4">
                  <Selecao value={a.id_professor} onChange={setA(i, "id_professor")} required>
                    <option value="">Selecione…</option>
                    {op?.professores.filter((p: any) => p.ativo).map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Selecao>
                </Campo>
                <Campo rotulo="Disciplina" className="col-span-12 sm:col-span-4">
                  <Selecao value={a.id_disciplina} onChange={setA(i, "id_disciplina")} required>
                    <option value="">Selecione…</option>
                    {op?.disciplinas.filter((d: any) => d.ativo).map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </Selecao>
                </Campo>
                <Campo rotulo="h/sem" className="col-span-4 sm:col-span-1"><Entrada type="number" value={a.carga_horaria_semanal} onChange={setA(i, "carga_horaria_semanal")} required /></Campo>
                <Campo rotulo="Função" className="col-span-6 sm:col-span-2"><Entrada value={a.funcao} onChange={setA(i, "funcao")} /></Campo>
                <div className="col-span-2 flex justify-end sm:col-span-1">
                  <BotaoIcone type="button" titulo="Remover alocação" onClick={() => setAlocs(alocs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></BotaoIcone>
                </div>
              </div>
            ))}
            {alocs.length === 0 && (
              <div className="flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Sem alocações, o gatilho <b>trg_rt02_turma</b> (RT02) rejeitará a transação no COMMIT. Você pode tentar mesmo assim para demonstrar o gatilho.</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Turmas() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("todos");
  const q = useDebounce(busca);
  const { dados, carregando, erro, recarregar } = useApi<any[]>(`/api/turmas${qs({ q, ativo: ativoParam(filtro) })}`, q ? `Buscar turmas por "${q}"` : "Listar turmas");
  const [nova, setNova] = useState(false);
  const navegar = useNavigate();

  return (
    <div>
      <Cabecalho icone={<School className="h-5 w-5" />} titulo="Turmas" subtitulo="Ofertas de um curso por ano letivo, com professores e disciplinas alocados."
        acoes={<Botao icone={<Plus className="h-4 w-4" />} onClick={() => setNova(true)}>Nova turma</Botao>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Busca valor={busca} onChange={setBusca} placeholder="Buscar por código, curso ou sala" />
        <FiltroSegmentado opcoes={opcoesAtivo} valor={filtro} onChange={setFiltro} />
      </div>
      {erro ? <Cartao><ErroCarga msg={erro} tentar={recarregar} /></Cartao> : carregando && !dados ? <Cartao><Carregando /></Cartao> : dados?.length === 0 ? (
        <Cartao><Vazio icone={<School className="h-5 w-5" />} titulo="Nenhuma turma encontrada" /></Cartao>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dados?.map((t) => (
            <Link key={t.id_turma} to={`/turmas/${t.id_turma}`} className="group">
              <Cartao className={`h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg ${!t.ativo ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-lg font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white">{t.codigo}</div>
                    <div className="text-xs text-slate-500">{t.curso}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1"><Selo cor="roxo">{t.ano_letivo}</Selo><SeloAtivo ativo={t.ativo} /></div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{t.sala ?? "Sala não definida"}</div>
                  <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{t.horario ?? "Horário não definido"}</div>
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-slate-400" /><span className="line-clamp-1">{t.professores ?? "—"}</span></div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <span className="text-slate-500"><b className="text-slate-900 dark:text-white">{t.matriculas_ativas}</b> ativas / {t.matriculas} matrículas</span>
                  <span className="text-slate-500">{t.alocacoes} alocação(ões)</span>
                </div>
              </Cartao>
            </Link>
          ))}
        </div>
      )}
      {nova && <NovaTurma fechar={() => setNova(false)} aoSalvar={(id) => { recarregar(); navegar(`/turmas/${id}`); }} />}
    </div>
  );
}
