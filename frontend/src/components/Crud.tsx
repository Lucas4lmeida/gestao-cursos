// Peças reutilizadas pelas telas de cadastro (filtros, ações de linha, exclusão).
import { Eye, Pencil, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { notificarErro, notificarSucesso } from "../lib/hooks";
import { Confirmar, NotaSQL } from "./ui";

export type FiltroAtivo = "todos" | "ativos" | "inativos";
export const opcoesAtivo: { v: FiltroAtivo; r: string }[] = [
  { v: "todos", r: "Todos" },
  { v: "ativos", r: "Ativos" },
  { v: "inativos", r: "Inativos" },
];
export const ativoParam = (f: FiltroAtivo) => (f === "todos" ? undefined : f === "ativos");

export function AcoesLinha({ ver, editar, ativo, alternarAtivo, excluir }: {
  ver?: () => void; editar?: () => void; ativo?: boolean; alternarAtivo?: () => void; excluir?: () => void;
}) {
  const b = "rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div className="flex justify-end gap-0.5">
      {ver && <button onClick={ver} title="Ver detalhes" className={`${b} hover:text-slate-800 dark:hover:text-white`}><Eye className="h-4 w-4" /></button>}
      {editar && <button onClick={editar} title="Editar" className={`${b} hover:text-brand-600`}><Pencil className="h-4 w-4" /></button>}
      {alternarAtivo && (
        <button onClick={alternarAtivo} title={ativo ? "Inativar" : "Reativar"} className={`${b} ${ativo ? "hover:text-amber-500" : "text-emerald-500 hover:text-emerald-600"}`}>
          <Power className="h-4 w-4" />
        </button>
      )}
      {excluir && <button onClick={excluir} title="Excluir" className={`${b} hover:text-rose-600`}><Trash2 className="h-4 w-4" /></button>}
    </div>
  );
}

/** Diálogo de exclusão física: executa DELETE na API e mostra o erro do banco, se houver. */
export function ExcluirRegistro({ alvo, fechar, url, descricao, aoConcluir }: {
  alvo: any; fechar: () => void; url: string; descricao: string; aoConcluir: () => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const confirmar = async () => {
    setCarregando(true);
    try {
      await api.del(url, { acao: `Excluir ${descricao}` });
      notificarSucesso("Registro excluído", `${descricao} removido(a) do banco.`);
      aoConcluir();
      fechar();
    } catch (e) {
      notificarErro(e);
      fechar();
    } finally {
      setCarregando(false);
    }
  };
  return (
    <Confirmar
      aberto={!!alvo}
      fechar={fechar}
      titulo="Excluir definitivamente?"
      perigo
      rotulo="Excluir definitivamente"
      carregando={carregando}
      confirmar={confirmar}
      texto={
        <>
          <p>Esta ação remove <b>{descricao}</b> de forma definitiva.</p>
          <p className="mt-2 text-sm text-slate-500">Se houver informações vinculadas (matrículas, turmas, alocações), o sistema não permitirá a exclusão. Para preservar o histórico, prefira <b>Inativar</b>.</p>
          <div className="mt-3"><NotaSQL>DELETE físico; FOREIGN KEY com ON DELETE RESTRICT impede a remoção se houver dependentes (SQLSTATE 23503).</NotaSQL></div>
        </>
      }
    />
  );
}

export async function alternarAtivoRegistro(url: string, ativo: boolean, descricao: string, aoConcluir: () => void) {
  try {
    await api.patch(url, { ativo: !ativo }, { acao: `${ativo ? "Inativar" : "Reativar"} ${descricao}` });
    notificarSucesso(ativo ? "Cadastro inativado" : "Cadastro reativado", `UPDATE … SET ativo = ${!ativo ? "TRUE" : "FALSE"}`);
    aoConcluir();
  } catch (e) {
    notificarErro(e);
  }
}
