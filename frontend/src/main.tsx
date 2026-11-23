import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import "./index.css";
import Alunos from "./pages/Alunos";
import Arquitetura from "./pages/Arquitetura";
import Cursos from "./pages/Cursos";
import Disciplinas from "./pages/Disciplinas";
import Matriculas from "./pages/Matriculas";
import Painel from "./pages/Painel";
import Professores from "./pages/Professores";
import Relatorios from "./pages/Relatorios";
import TurmaDetalhe from "./pages/TurmaDetalhe";
import Turmas from "./pages/Turmas";

function App() {
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
        <Route path="/arquitetura" element={<Arquitetura />} />
        <Route path="*" element={<Painel />} />
      </Routes>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster richColors position="top-right" closeButton />
    </BrowserRouter>
  </React.StrictMode>,
);
