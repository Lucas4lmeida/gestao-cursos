import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { Brasao } from "../components/Layout";
import { Aviso, Botao, Campo, Entrada } from "../components/ui";
import { ApiError, api } from "../lib/api";
import { definirSessao, useSessao } from "../lib/sessao";

export default function Login() {
  const sessao = useSessao();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await api.post("/api/auth/entrar", { usuario, senha }, { acao: "Entrar no sistema" });
      definirSessao({ status: "autenticado", usuario: r.usuario, perfil: r.perfil });
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-papel lg:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-brand-900 px-8 py-10 text-white lg:w-[46%] lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border-[40px] border-white/[.04]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full border-[40px] border-ouro-400/[.07]" />
        <div className="relative flex items-center gap-4">
          <Brasao className="h-14 w-12" />
          <div>
            <div className="font-serif text-2xl font-semibold">Portal Acadêmico</div>
            <div className="text-sm text-brand-200">Sistema de Gestão de Cursos</div>
          </div>
        </div>
        <div className="relative my-10 hidden lg:block">
          <div className="mb-4 h-1 w-16 bg-ouro-500" />
          <p className="max-w-md font-serif text-3xl leading-snug">
            Cursos, turmas, docentes e matrículas reunidos em um só lugar.
          </p>
          <p className="mt-4 max-w-md text-brand-200">
            Ambiente da Secretaria Acadêmica para cadastro, acompanhamento e emissão de relatórios.
          </p>
        </div>
        <div className="relative hidden text-xs text-brand-300 lg:block">Acesso restrito à equipe autorizada.</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <form onSubmit={entrar} className="w-full max-w-sm" noValidate>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-800"><Lock className="h-5 w-5" /></div>
          <h1 className="font-serif text-3xl font-semibold text-brand-900">Entrar</h1>
          <p className="mt-1 text-slate-600">Use as credenciais fornecidas pela secretaria.</p>

          <div className="mt-6 space-y-3">
            {sessao.expirou && !erro && <Aviso tipo="atencao">Sua sessão expirou. Entre novamente para continuar.</Aviso>}
            {erro && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13.5px] text-rose-800">{erro}</div>}
          </div>

          <div className="mt-4 space-y-4">
            <Campo rotulo="Usuário">
              <Entrada value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoFocus required />
            </Campo>
            <Campo rotulo="Senha">
              <div className="relative">
                <Entrada type={ver ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required className="pr-10" />
                <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
                  {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Campo>
          </div>
          <Botao type="submit" carregando={enviando} disabled={!usuario || !senha} className="mt-6 w-full">Entrar</Botao>
          <p className="mt-6 text-center text-xs text-slate-500">Esqueceu a senha? Procure o administrador do sistema.</p>
        </form>
      </div>
    </div>
  );
}
