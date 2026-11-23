import { Loader2 } from "lucide-react";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import "./index.css";
import { api } from "./lib/api";
import { definirSessao, useSessao } from "./lib/sessao";
import Alunos from "./pages/Alunos";
import Arquitetura from "./pages/Arquitetura";
import Cursos from "./pages/Cursos";
import Disciplinas from "./pages/Disciplinas";
import Login from "./pages/Login";
import Matriculas from "./pages/Matriculas";
import Painel from "./pages/Painel";
import Professores from "./pages/Professores";
import Relatorios from "./pages/Relatorios";
import TurmaDetalhe from "./pages/TurmaDetalhe";
import Turmas from "./pages/Turmas";

function App() {
  const sessao = useSessao();

  useEffect(() => {
    api.get("/api/auth/sessao", { silencioso: true })
      .then((r) => definirSessao({ status: "autenticado", usuario: r.usuario, perfil: r.perfil }))
      .catch(() => definirSessao({ status: "anonimo" }));
  }, []);

  if (sessao.status === "verificando") {
    return <div className="flex min-h-screen items-center justify-center text-brand-800"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (sessao.status === "anonimo") return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Painel />} />
        <Route path="/alunos" element={<Alunos />} />
        <Route path="/professores" element={<Professores />} />
        <Route path="/cursos" element={<Cursos />} />
        <Route path="/disciplinas" element={<Disciplinas />} />
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/turmas/:id" element={<TurmaDetalhe />} />
        <Route path="/matriculas" element={<Matriculas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        {sessao.perfil === "apresentacao" && <Route path="/arquitetura" element={<Arquitetura />} />}
        <Route path="*" element={<Painel />} />
      </Routes>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster richColors position="top-right" closeButton toastOptions={{ style: { fontFamily: "'Source Sans 3', sans-serif", fontSize: 14 } }} />
    </BrowserRouter>
  </React.StrictMode>,
);
