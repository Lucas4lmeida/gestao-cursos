import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Avatar, Botao, BotaoIcone, Busca, Cabecalho, Campo, Cartao, Carregando, Confirmar, Entrada, ErroCarga, Modal,
  NotaSQL, Selecao, SeloStatus, Tabela, Td, Th, Vazio,
} from "../components/ui";
import { api, qs } from "../lib/api";
import { data, hoje, nota } from "../lib/format";
import { notificarErro, notificarSucesso, useApi, useDebounce } from "../lib/hooks";
import { STATUS } from "./TurmaDetalhe";

function NovaMatricula({ fechar, aoSalvar }: { fechar: () => void; aoSalvar: () => void }) {
  const { dados: op } = useApi<any>("/api/opcoes", "Carregar opções do formulário");
  const [f, setF] = useState<any>({ id_aluno: "", id_turma: "", data_matricula: hoje() });
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const r = await api.post("/api/matriculas", { id_aluno: Number(f.id_aluno), id_turma: Number(f.id_turma), data_matricula: f.data_matricula }, { acao: "Registrar matrícula" });
      notificarSucesso("Matrícula registrada", `Status inicial definido pelo banco: '${r.status}' (DEFAULT).`);
      aoSalvar();
      fechar();
    } catch (err) { notificarErro(err); } finally { setSalvando(false); }
  };
  return (
    <Modal aberto fechar={fechar} titulo="Nova matrícula" largura="max-w-lg"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-mat" carregando={salvando}>Matricular</Botao></>}>
      <form id="form-mat" onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Aluno" obrigatorio>
          <Selecao value={f.id_aluno} onChange={set("id_aluno")} required>
            <option value="">Selecione…</option>
            {op?.alunos.filter((a: any) => a.ativo).map((a: any) => <option key={a.id} value={a.id}>{a.nome} ({a.numero_matricula})</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Turma" obrigatorio>
          <Selecao value={f.id_turma} onChange={set("id_turma")} required>
            <option value="">Selecione…</option>
            {op?.turmas.filter((t: any) => t.ativo).map((t: any) => <option key={t.id} value={t.id}>{t.codigo}/{t.ano_letivo} — {t.curso}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Data da matrícula" obrigatorio><Entrada type="date" value={f.data_matricula} onChange={set("data_matricula")} required /></Campo>
        <NotaSQL>O status não é enviado: o PostgreSQL aplica o DEFAULT 'Ativa' (RO03). Um aluno não pode ter duas matrículas na mesma turma (pk_matricula).</NotaSQL>
      </form>
    </Modal>
  );
}

function EditarMatricula({ m, fechar, aoSalvar }: { m: any; fechar: () => void; aoSalvar: () => void }) {
  const [f, setF] = useState<any>({ status: m.status, nota_final: m.nota_final ?? "" });
  const [salvando, setSalvando] = useState(false);
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.put(`/api/matriculas/${m.id_aluno}/${m.id_turma}`, { status: f.status, nota_final: f.nota_final === "" ? null : Number(String(f.nota_final).replace(",", ".")) }, { acao: `Atualizar matrícula de ${m.nome_aluno}` });
      notificarSucesso("Matrícula atualizada");
      aoSalvar();
      fechar();
    } catch (err) { notificarErro(err); } finally { setSalvando(false); }
  };
  return (
    <Modal aberto fechar={fechar} titulo="Atualizar matrícula" subtitulo={`${m.nome_aluno} · ${m.codigo_turma}/${m.ano_letivo}`} largura="max-w-md"
      rodape={<><Botao variante="secundario" onClick={fechar}>Cancelar</Botao><Botao type="submit" form="form-em" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-em" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Status"><Selecao value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUS.map((s) => <option key={s}>{s}</option>)}</Selecao></Campo>
        <Campo rotulo="Nota final" dica="CHECK entre 0 e 10"><Entrada value={f.nota_final} inputMode="decimal" onChange={(e) => setF({ ...f, nota_final: e.target.value })} /></Campo>
      </form>
    </Modal>
  );
}

export default function Matriculas() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounce(busca);
  const { dados, carregando, erro, recarregar } = useApi<any[]>(`/api/matriculas${qs({ q, status })}`, q ? `Buscar matrículas por "${q}"` : "Listar matrículas");
  const [nova, setNova] = useState(false);
  const [editar, setEditar] = useState<any>(null);
  const [excluir, setExcluir] = useState<any>(null);
  const [excluindo, setExcluindo] = useState(false);

  const confirmarExclusao = async () => {
    setExcluindo(true);
    try {
      await api.del(`/api/matriculas/${excluir.id_aluno}/${excluir.id_turma}`, { acao: `Excluir matrícula de ${excluir.nome_aluno}` });
      notificarSucesso("Matrícula excluída", "DELETE FROM matricula");
      recarregar();
    } catch (e) { notificarErro(e); } finally { setExcluindo(false); setExcluir(null); }
  };

  return (
    <div>
      <Cabecalho icone={<ClipboardList className="h-5 w-5" />} titulo="Matrículas" subtitulo="Relacionamento N:N entre aluno e turma, consultado pela VIEW vw_historico_matricula."
        acoes={<Botao icone={<Plus className="h-4 w-4" />} onClick={() => setNova(true)}>Nova matrícula</Botao>} />
      <Cartao>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar por aluno, nº de matrícula ou curso" />
          <Selecao value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
            <option value="">Todos os status</option>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </Selecao>
        </div>
        {erro ? <ErroCarga msg={erro} tentar={recarregar} /> : carregando && !dados ? <Carregando /> : dados?.length === 0 ? (
          <Vazio icone={<ClipboardList className="h-5 w-5" />} titulo="Nenhuma matrícula encontrada" />
        ) : (
          <Tabela>
            <thead><tr><Th>Aluno</Th><Th>Turma</Th><Th className="hidden lg:table-cell">Curso</Th><Th className="hidden md:table-cell">Data</Th><Th>Nota</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {dados?.map((m) => (
                <tr key={`${m.id_aluno}-${m.id_turma}`} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <Td><div className="flex items-center gap-2"><Avatar nome={m.nome_aluno} tamanho="sm" /><div><div className="font-medium text-slate-900 dark:text-white">{m.nome_aluno}</div><div className="font-mono text-[11px] text-slate-400">{m.numero_matricula}</div></div></div></Td>
                  <Td><Link to={`/turmas/${m.id_turma}`} className="font-mono text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">{m.codigo_turma}/{m.ano_letivo}</Link></Td>
                  <Td className="hidden max-w-[220px] truncate lg:table-cell">{m.curso}</Td>
                  <Td className="hidden md:table-cell">{data(m.data_matricula)}</Td>
                  <Td className="font-semibold">{nota(m.nota_final)}</Td>
                  <Td><SeloStatus status={m.status} /></Td>
                  <Td>
                    <div className="flex justify-end gap-0.5">
                      <BotaoIcone titulo="Atualizar status/nota (UPDATE)" onClick={() => setEditar(m)}><Pencil className="h-4 w-4" /></BotaoIcone>
                      <BotaoIcone titulo="Excluir (DELETE)" onClick={() => setExcluir(m)} className="hover:!text-rose-600"><Trash2 className="h-4 w-4" /></BotaoIcone>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        {dados && <div className="px-4 py-3 text-xs text-slate-500">{dados.length} matrícula(s)</div>}
      </Cartao>
      {nova && <NovaMatricula fechar={() => setNova(false)} aoSalvar={recarregar} />}
      {editar && <EditarMatricula m={editar} fechar={() => setEditar(null)} aoSalvar={recarregar} />}
      <Confirmar aberto={!!excluir} fechar={() => setExcluir(null)} titulo="Excluir matrícula?" perigo rotulo="Excluir" carregando={excluindo} confirmar={confirmarExclusao}
        texto={excluir && <>Remove a matrícula de <b>{excluir.nome_aluno}</b> na turma <b>{excluir.codigo_turma}/{excluir.ano_letivo}</b>.</>} />
    </div>
  );
}
