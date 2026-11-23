// Peças reutilizadas pelas telas de cadastro (filtros, ações de linha, exclusão).
import { Eye, Pencil, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { notificarErro, notificarSucesso } from "../lib/hooks";
import { Confirmar } from "./ui";

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
      {ver && <button onClick={ver} title="Ver detalhes (consulta)" className={`${b} hover:text-slate-800 dark:hover:text-white`}><Eye className="h-4 w-4" /></button>}
      {editar && <button onClick={editar} title="Editar (UPDATE)" className={`${b} hover:text-brand-600`}><Pencil className="h-4 w-4" /></button>}
      {alternarAtivo && (
        <button onClick={alternarAtivo} title={ativo ? "Inativar (exclusão lógica)" : "Reativar"} className={`${b} ${ativo ? "hover:text-amber-500" : "text-emerald-500 hover:text-emerald-600"}`}>
          <Power className="h-4 w-4" />
        </button>
      )}
      {excluir && <button onClick={excluir} title="Excluir (DELETE)" className={`${b} hover:text-rose-600`}><Trash2 className="h-4 w-4" /></button>}
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
      titulo="Excluir registro?"
      perigo
      rotulo="Excluir definitivamente"
      carregando={carregando}
      confirmar={confirmar}
      texto={
        <>
          <p>Será executado um <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-800">DELETE</code> físico de <b>{descricao}</b>.</p>
          <p className="mt-2 text-xs text-slate-500">Se existirem registros dependentes, o PostgreSQL recusará a operação (FOREIGN KEY com ON DELETE RESTRICT) e a mensagem de integridade será exibida. Para manter o histórico, prefira inativar.</p>
        </>
      }
    />
  );
}

export async function alternarAtivoRegistro(url: string, ativo: boolean, descricao: string, aoConcluir: () => void) {
  try {
    await api.patch(url, { ativo: !ativo }, { acao: `${ativo ? "Inativar" : "Reativar"} ${descricao}` });
    notificarSucesso(ativo ? "Registro inativado" : "Registro reativado", `UPDATE … SET ativo = ${!ativo ? "TRUE" : "FALSE"}`);
    aoConcluir();
  } catch (e) {
    notificarErro(e);
  }
}
