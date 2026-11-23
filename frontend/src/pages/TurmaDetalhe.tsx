import { ArrowLeft, CalendarDays, ClipboardCheck, Crown, MapPin, Pencil, Plus, Power, Trash2, UserPlus, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExcluirRegistro, alternarAtivoRegistro } from "../components/Crud";
import {
  Avatar, Botao, BotaoIcone, Busca, Cabecalho, Campo, Cartao, Carregando, Confirmar, Entrada, ErroCarga, Modal,
  NotaSQL, Selecao, Selo, SeloAtivo, SeloStatus, Tabela, Td, Th, Vazio,
} from "../components/ui";
import { api } from "../lib/api";
import { data, hoje, nota } from "../lib/format";
import { notificarErro, notificarSucesso, useApi } from "../lib/hooks";
import { alocacaoVazia } from "./Turmas";

export const STATUS = ["Ativa", "Trancada", "Cancelada", "Concluída"];

function EditarTurma({ t, fechar, aoSalvar }: { t: any; fechar: () => void; aoSalvar: () => void }) {
  const { dados: op } = useApi<any>("/api/opcoes", "Carregar opções do formulário");
  const [f, setF] = useState<any>({ codigo: t.codigo, ano_letivo: t.ano_letivo, sala: t.sala ?? "", horario: t.horario ?? "", id_curso: t.id_curso });
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.put(`/api/turmas/${t.id_turma}`, { ...f, ano_letivo: Number(f.ano_letivo), id_curso: Number(f.id_curso) }, { acao: `Editar turma ${f.codigo}` });
      notificarSucesso("Turma atualizada");
      aoSalvar();
      fechar();
    } catch (err) { notificarErro(err); } finally { setSalvando(false); }
  };
  return (
    <Modal aberto fechar={fechar} titulo="Editar turma" largura="max-w-xl"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-et" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-et" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Código" obrigatorio><Entrada value={f.codigo} onChange={set("codigo")} required /></Campo>
        <Campo rotulo="Ano letivo" obrigatorio><Entrada type="number" value={f.ano_letivo} onChange={set("ano_letivo")} required /></Campo>
        <Campo rotulo="Curso" obrigatorio className="sm:col-span-2">
          <Selecao value={f.id_curso} onChange={set("id_curso")}>{op?.cursos.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Selecao>
        </Campo>
        <Campo rotulo="Sala"><Entrada value={f.sala} onChange={set("sala")} /></Campo>
        <Campo rotulo="Horário"><Entrada value={f.horario} onChange={set("horario")} /></Campo>
      </form>
    </Modal>
  );
}

function NovaAlocacao({ idTurma, fechar, aoSalvar }: { idTurma: number; fechar: () => void; aoSalvar: () => void }) {
  const { dados: op } = useApi<any>("/api/opcoes", "Carregar opções do formulário");
  const [a, setA] = useState<any>(alocacaoVazia());
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setA({ ...a, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post(`/api/turmas/${idTurma}/alocacoes`, { ...a, id_professor: Number(a.id_professor), id_disciplina: Number(a.id_disciplina), carga_horaria_semanal: Number(a.carga_horaria_semanal) }, { acao: "Alocar professor e disciplina na turma" });
      notificarSucesso("Alocação registrada");
      aoSalvar();
      fechar();
    } catch (err) { notificarErro(err); } finally { setSalvando(false); }
  };
  return (
    <Modal aberto fechar={fechar} titulo="Nova alocação" subtitulo="Professor × Disciplina × Turma" largura="max-w-xl"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-al" carregando={salvando}>Alocar</Botao></>}>
      <form id="form-al" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Professor" obrigatorio className="sm:col-span-2">
          <Selecao value={a.id_professor} onChange={set("id_professor")} required>
            <option value="">Selecione…</option>
            {op?.professores.map((p: any) => <option key={p.id} value={p.id}>{p.nome} — {p.titulacao}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Disciplina" obrigatorio className="sm:col-span-2">
          <Selecao value={a.id_disciplina} onChange={set("id_disciplina")} required>
            <option value="">Selecione…</option>
            {op?.disciplinas.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Carga semanal (h)" obrigatorio dica="CHECK entre 1 e 60"><Entrada type="number" value={a.carga_horaria_semanal} onChange={set("carga_horaria_semanal")} required /></Campo>
        <Campo rotulo="Início" obrigatorio><Entrada type="date" value={a.data_inicio} onChange={set("data_inicio")} required /></Campo>
        <Campo rotulo="Função" className="sm:col-span-2"><Entrada value={a.funcao} onChange={set("funcao")} /></Campo>
      </form>
    </Modal>
  );
}

function MatricularLote({ t, fechar, aoSalvar }: { t: any; fechar: () => void; aoSalvar: () => void }) {
  const { dados: op } = useApi<any>("/api/opcoes", "Carregar opções do formulário");
  const [sel, setSel] = useState<number[]>([]);
  const [busca, setBusca] = useState("");
  const [dataM, setDataM] = useState(hoje());
  const [salvando, setSalvando] = useState(false);
  const jaMatriculados = useMemo(() => new Set(t.matriculas.map((m: any) => m.id_aluno)), [t]);
  const alunos = (op?.alunos ?? []).filter((a: any) => a.ativo && a.nome.toLowerCase().includes(busca.toLowerCase()));
  const alternar = (id: number) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await api.post("/api/matriculas/lote", { id_turma: t.id_turma, alunos: sel, data_matricula: dataM }, { acao: `Matricular ${sel.length} aluno(s) em lote na turma ${t.codigo}` });
      notificarSucesso(`${r.inseridas} matrícula(s) criada(s)`, "Todas na mesma transação, com status DEFAULT 'Ativa'.");
      aoSalvar();
      fechar();
    } catch (err) { notificarErro(err); } finally { setSalvando(false); }
  };

  return (
    <Modal aberto fechar={fechar} titulo={`Matricular alunos em ${t.codigo}/${t.ano_letivo}`} largura="max-w-2xl"
      subtitulo="Operação composta: vários INSERT em uma única transação (tudo ou nada)."
      rodape={<><span className="mr-auto self-center text-xs text-slate-500">{sel.length} selecionado(s)</span>
        <Botao variante="secundario" onClick={fechar}>Cancelar</Botao>
        <Botao onClick={salvar} carregando={salvando} disabled={sel.length === 0}>Matricular {sel.length > 0 && `(${sel.length})`}</Botao></>}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <Busca valor={busca} onChange={setBusca} placeholder="Filtrar alunos" />
        <Entrada type="date" value={dataM} onChange={(e) => setDataM(e.target.value)} className="sm:w-44" />
      </div>
      <div className="mb-3"><NotaSQL>Alunos já matriculados aparecem marcados. Se você incluir um deles, a PK (id_aluno, id_turma) é violada e <b>nenhuma</b> matrícula do lote é gravada (ROLLBACK).</NotaSQL></div>
      <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {alunos.map((a: any) => {
          const ja = jaMatriculados.has(a.id);
          return (
            <label key={a.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <input type="checkbox" checked={sel.includes(a.id)} onChange={() => alternar(a.id)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <Avatar nome={a.nome} tamanho="sm" />
              <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">{a.nome}</span>
              <span className="font-mono text-xs text-slate-400">{a.numero_matricula}</span>
              {ja && <Selo cor="ambar">já matriculado</Selo>}
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

function LancarNotas({ t, fechar, aoSalvar }: { t: any; fechar: () => void; aoSalvar: () => void }) {
  const [linhas, setLinhas] = useState<any[]>(t.matriculas.map((m: any) => ({ id_aluno: m.id_aluno, nome: m.nome_aluno, nota_final: m.nota_final ?? "", status: m.status })));
  const [salvando, setSalvando] = useState(false);
  const set = (i: number, k: string, v: any) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await api.put(`/api/turmas/${t.id_turma}/notas`, {
        notas: linhas.map((l) => ({ id_aluno: l.id_aluno, status: l.status, nota_final: l.nota_final === "" ? null : Number(String(l.nota_final).replace(",", ".")) })),
      }, { acao: `Lançar notas da turma ${t.codigo} (${linhas.length} matrículas)` });
      notificarSucesso(`${r.atualizadas} matrícula(s) atualizada(s)`, "Vários UPDATE confirmados em um único COMMIT.");
      aoSalvar();
      fechar();
    } catch (err) { notificarErro(err); } finally { setSalvando(false); }
  };
  return (
    <Modal aberto fechar={fechar} titulo={`Lançar notas — ${t.codigo}/${t.ano_letivo}`} largura="max-w-2xl"
      subtitulo="Operação composta: atualiza todas as matrículas na mesma transação."
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao onClick={salvar} carregando={salvando}>Salvar notas</Botao></>}>
      <div className="mb-3"><NotaSQL>A nota é validada pelo CHECK <b>ck_matricula_nota</b> (0 a 10). Uma única nota inválida desfaz o lançamento inteiro.</NotaSQL></div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {linhas.map((l, i) => (
          <div key={l.id_aluno} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar nome={l.nome} tamanho="sm" />
            <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{l.nome}</span>
            <Entrada value={l.nota_final} onChange={(e) => set(i, "nota_final", e.target.value)} placeholder="nota" className="!h-9 w-20 text-center" inputMode="decimal" />
            <Selecao value={l.status} onChange={(e) => set(i, "status", e.target.value)} className="!h-9 w-36">{STATUS.map((s) => <option key={s}>{s}</option>)}</Selecao>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function TurmaDetalhe() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { dados: t, carregando, erro, recarregar } = useApi<any>(`/api/turmas/${id}`, "Consultar turma");
  const [modal, setModal] = useState<"editar" | "alocar" | "lote" | "notas" | null>(null);
  const [removerAloc, setRemoverAloc] = useState<any>(null);
  const [removendo, setRemovendo] = useState(false);
  const [excluir, setExcluir] = useState<any>(null);

  const confirmarRemocao = async () => {
    setRemovendo(true);
    try {
      await api.del(`/api/turmas/${id}/alocacoes/${removerAloc.id_professor}/${removerAloc.id_disciplina}`, { acao: `Remover alocação de ${removerAloc.professor} em ${removerAloc.disciplina}` });
      notificarSucesso("Alocação removida");
      recarregar();
    } catch (e) { notificarErro(e); } finally { setRemovendo(false); setRemoverAloc(null); }
  };

  const removerMatricula = async (m: any) => {
    try {
      await api.del(`/api/matriculas/${m.id_aluno}/${id}`, { acao: `Excluir matrícula de ${m.nome_aluno}` });
      notificarSucesso("Matrícula excluída");
      recarregar();
    } catch (e) { notificarErro(e); }
  };

  if (erro) return <Cartao><ErroCarga msg={erro} tentar={recarregar} /></Cartao>;
  if (carregando && !t) return <Cartao><Carregando /></Cartao>;
  if (!t) return null;

  return (
    <div>
      <Link to="/turmas" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />Turmas</Link>
      <Cabecalho
        titulo={`${t.codigo} / ${t.ano_letivo}`}
        subtitulo={<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{t.curso}</span>
          <span className="inline-flex items-center gap-1"><Crown className="h-3.5 w-3.5 text-amber-500" />{t.coordenador}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.sala ?? "—"}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{t.horario ?? "—"}</span>
          <SeloAtivo ativo={t.ativo} />
        </span>}
        acoes={<>
          <Botao variante="secundario" icone={<Pencil className="h-4 w-4" />} onClick={() => setModal("editar")}>Editar</Botao>
          <Botao variante="secundario" icone={<Power className="h-4 w-4" />} onClick={() => alternarAtivoRegistro(`/api/turmas/${id}/ativo`, t.ativo, `turma ${t.codigo}`, recarregar)}>{t.ativo ? "Inativar" : "Reativar"}</Botao>
          <Botao variante="secundario" icone={<Trash2 className="h-4 w-4 text-rose-500" />} onClick={() => setExcluir(t)}>Excluir</Botao>
        </>}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <Cartao className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Alocações</h3>
              <p className="text-xs text-slate-500">Professor × Disciplina nesta turma</p>
            </div>
            <Botao tamanho="sm" variante="suave" icone={<Plus className="h-3.5 w-3.5" />} onClick={() => setModal("alocar")}>Alocar</Botao>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {t.alocacoes.map((a: any) => (
              <li key={`${a.id_professor}-${a.id_disciplina}`} className="flex items-center gap-3 px-5 py-3">
                <Avatar nome={a.professor} tamanho="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{a.disciplina}</div>
                  <div className="truncate text-xs text-slate-500">{a.professor} · {a.carga_horaria_semanal} h/sem {a.funcao ? `· ${a.funcao}` : ""}</div>
                </div>
                <BotaoIcone titulo="Remover alocação (DELETE)" onClick={() => setRemoverAloc(a)}><Trash2 className="h-4 w-4" /></BotaoIcone>
              </li>
            ))}
          </ul>
          <div className="m-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <Zap className="h-4 w-4 shrink-0" />
            <span>Gatilho <b>RT02</b>: a turma precisa manter ao menos uma alocação. Tente remover a última para ver o PostgreSQL bloquear.</span>
          </div>
        </Cartao>

        <Cartao className="xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Matrículas ({t.matriculas.length})</h3>
              <p className="text-xs text-slate-500">Lidas da VIEW vw_historico_matricula</p>
            </div>
            <div className="flex gap-2">
              <Botao tamanho="sm" variante="secundario" icone={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => setModal("notas")} disabled={t.matriculas.length === 0}>Lançar notas</Botao>
              <Botao tamanho="sm" icone={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setModal("lote")}>Matricular alunos</Botao>
            </div>
          </div>
          {t.matriculas.length === 0 ? <Vazio titulo="Nenhum aluno matriculado" texto="Use “Matricular alunos” para inserir vários de uma vez." /> : (
            <Tabela>
              <thead><tr><Th>Aluno</Th><Th className="hidden sm:table-cell">Matrícula em</Th><Th>Nota</Th><Th>Status</Th><Th /></tr></thead>
              <tbody>
                {t.matriculas.map((m: any) => (
                  <tr key={m.id_aluno}>
                    <Td><div className="flex items-center gap-2"><Avatar nome={m.nome_aluno} tamanho="sm" /><div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.nome_aluno}</div><div className="font-mono text-[11px] text-slate-400">{m.numero_matricula}</div></div></div></Td>
                    <Td className="hidden sm:table-cell">{data(m.data_matricula)}</Td>
                    <Td className="font-semibold">{nota(m.nota_final)}</Td>
                    <Td><SeloStatus status={m.status} /></Td>
                    <Td><BotaoIcone titulo="Excluir matrícula" onClick={() => removerMatricula(m)}><Trash2 className="h-4 w-4" /></BotaoIcone></Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </Cartao>
      </div>

      {modal === "editar" && <EditarTurma t={t} fechar={() => setModal(null)} aoSalvar={recarregar} />}
      {modal === "alocar" && <NovaAlocacao idTurma={t.id_turma} fechar={() => setModal(null)} aoSalvar={recarregar} />}
      {modal === "lote" && <MatricularLote t={t} fechar={() => setModal(null)} aoSalvar={recarregar} />}
      {modal === "notas" && <LancarNotas t={t} fechar={() => setModal(null)} aoSalvar={recarregar} />}
      <Confirmar aberto={!!removerAloc} fechar={() => setRemoverAloc(null)} titulo="Remover alocação?" perigo rotulo="Remover" carregando={removendo}
        confirmar={confirmarRemocao}
        texto={removerAloc && <>
          <p>Será executado <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-800">DELETE FROM alocacao</code> para <b>{removerAloc.professor}</b> em <b>{removerAloc.disciplina}</b>.</p>
          {t.alocacoes.length === 1 && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Esta é a última alocação da turma: o gatilho RT02 deve rejeitar a operação no COMMIT.</p>}
        </>} />
      <ExcluirRegistro alvo={excluir} fechar={() => setExcluir(null)} url={`/api/turmas/${id}`} descricao={`a turma ${t.codigo}/${t.ano_letivo}`} aoConcluir={() => navegar("/turmas")} />
    </div>
  );
}
