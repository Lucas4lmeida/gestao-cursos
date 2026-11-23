"""Gera docs/PF_Entrega_Gestao_de_Cursos.pdf (documento exigido na entrega do PF).

Uso:  pip install reportlab==4.2.5
      python docs/gerar_pdf_entrega.py --repo https://github.com/usuario/gestao-cursos
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

AQUI = Path(__file__).resolve().parent

# ----------------------------------------------------------------- fontes
def registrar_fontes() -> tuple[str, str, str]:
    candidatos = [
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/consola.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
    ]
    for normal, negrito, mono in candidatos:
        if all(os.path.exists(f) for f in (normal, negrito, mono)):
            pdfmetrics.registerFont(TTFont("Texto", normal))
            pdfmetrics.registerFont(TTFont("Texto-B", negrito))
            pdfmetrics.registerFont(TTFont("Mono", mono))
            pdfmetrics.registerFontFamily("Texto", normal="Texto", bold="Texto-B")
            return "Texto", "Texto-B", "Mono"
    return "Helvetica", "Helvetica-Bold", "Courier"


F, FB, FM = registrar_fontes()
AZUL = colors.HexColor("#3730a3")
AZUL_CLARO = colors.HexColor("#eef2ff")
CINZA = colors.HexColor("#475569")
BORDA = colors.HexColor("#cbd5e1")

st = {
    "titulo": ParagraphStyle("t", fontName=FB, fontSize=20, leading=24, textColor=AZUL, spaceAfter=2),
    "sub": ParagraphStyle("s", fontName=F, fontSize=11.5, leading=15, textColor=CINZA, spaceAfter=10),
    "h": ParagraphStyle("h", fontName=FB, fontSize=13, leading=16, textColor=AZUL, spaceBefore=12, spaceAfter=6),
    "p": ParagraphStyle("p", fontName=F, fontSize=9.6, leading=13.4, alignment=TA_LEFT, spaceAfter=5),
    "cel": ParagraphStyle("c", fontName=F, fontSize=8.8, leading=11.6),
    "celb": ParagraphStyle("cb", fontName=FB, fontSize=8.8, leading=11.6),
    "cab": ParagraphStyle("ch", fontName=FB, fontSize=8.8, leading=11.6, textColor=colors.white),
    "code": ParagraphStyle("code", fontName=FM, fontSize=8, leading=10.5, textColor=colors.HexColor("#0f172a"),
                           backColor=colors.HexColor("#f1f5f9"), borderPadding=6, spaceBefore=4, spaceAfter=8),
}


def P(t, s="p"):
    return Paragraph(t, st[s])


def tabela(linhas, larguras, cabecalho=True, chave=False):
    dados = []
    for i, linha in enumerate(linhas):
        estilo = "cab" if (cabecalho and i == 0) else "cel"
        dados.append([Paragraph(str(c), st["celb"] if (chave and j == 0 and not (cabecalho and i == 0)) else st[estilo])
                      for j, c in enumerate(linha)])
    t = Table(dados, colWidths=larguras, repeatRows=1 if cabecalho else 0)
    estilos = [
        ("GRID", (0, 0), (-1, -1), 0.5, BORDA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    if cabecalho:
        estilos += [("BACKGROUND", (0, 0), (-1, 0), AZUL)]
        estilos += [("BACKGROUND", (0, i), (-1, i), AZUL_CLARO) for i in range(2, len(linhas), 2)]
    elif chave:
        estilos += [("BACKGROUND", (0, 0), (0, -1), AZUL_CLARO)]
    t.setStyle(TableStyle(estilos))
    return t


def rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont(F, 7.5)
    canvas.setFillColor(CINZA)
    canvas.drawString(2 * cm, 1.2 * cm, "PF — Sistema de Gestão de Cursos | Aplicação Full Stack com PostgreSQL")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pág. {doc.page}")
    canvas.restoreState()


def gerar(repo: str, url_app: str, saida: Path):
    W = A4[0] - 4 * cm
    h = []
    h += [P("Projeto Final — Aplicação Full Stack com PostgreSQL", "titulo"),
          P("Sistema de Gestão de Cursos", "sub")]

    h += [P("1. Identificação", "h"), tabela([
        ["Nome do sistema", "<b>Sistema de Gestão de Cursos</b>"],
        ["Integrantes", "Evellin Serra de Moura — 1620764<br/>Lucas Almeida Silveira de Souza — 1568007<br/>"
                        "Wallison Vieira de Aquino — 1590537"],
        ["Repositório do projeto", repo],
        ["Aplicação em execução", url_app],
    ], [4.2 * cm, W - 4.2 * cm], cabecalho=False, chave=True)]

    h += [P("2. Tecnologias, frameworks e ferramentas", "h"), tabela([
        ["Camada", "Tecnologia", "Detalhes"],
        ["Front-end", "React 18.3 + Vite 5.4 + TypeScript", "Tailwind CSS 3.4 (estilo), React Router 6 (rotas), Recharts (gráficos), "
                                                          "lucide-react (ícones), sonner (notificações)."],
        ["Back-end/API", "Python 3 + FastAPI 0.115", "Servidor ASGI Uvicorn 0.32; validação de tipos com Pydantic; login com sessão (cookie assinado, senha em hash PBKDF2); "
                                                    "documentação automática OpenAPI em <font name='%s'>/api/docs</font>." % FM],
        ["Acesso ao banco", "psycopg 3.2 + psycopg_pool 3.2", "Driver oficial PostgreSQL para Python (libpq), com pool de conexões."],
        ["SGBD", "PostgreSQL 16.16", "Banco <font name='%s'>tp3</font> do TP3 (8 tabelas, VIEW, índices e gatilhos)." % FM],
        ["Infraestrutura", "Oracle Cloud — Ubuntu 26.04 LTS", "VM <font name='%s'>vm-gestao-cursos</font>; serviço systemd "
                                                              "<font name='%s'>gestao-cursos</font>; Caddy como proxy HTTPS (certificado Let's Encrypt)." % (FM, FM)],
        ["IDE / ferramentas", "Visual Studio Code", "Git, Node.js/npm (build do front-end), psql (console SQL), SSH."],
    ], [3 * cm, 4.6 * cm, W - 7.6 * cm])]

    h += [P("3. Arquitetura e identificação das camadas", "h"),
          P("As três camadas rodam na mesma VM. O navegador só conversa com a API por HTTPS (via Caddy); somente a API abre "
            "conexões com o PostgreSQL, sempre por <font name='%s'>127.0.0.1:5432</font>. Toda rota da API exige login." % FM),
          Paragraph("Navegador (React)  --HTTPS-->  Caddy :443  -->  FastAPI 127.0.0.1:8000 (/api/*)  --psycopg 3-->  PostgreSQL 16 (tp3)", st["code"]),
          tabela([
              ["Camada", "Onde está no repositório", "Responsabilidade"],
              ["<b>Front-end</b>", "<font name='%s'>frontend/src</font> (páginas em <font name='%s'>pages/</font>); "
                                   "o build fica em <font name='%s'>backend/app/static</font>" % (FM, FM, FM),
               "Telas de Painel, Alunos, Professores, Cursos, Disciplinas, Turmas, Matrículas, Relatórios e "
               "Arquitetura; tela de login; Console SQL com o rastro de cada requisição (ativado pelo <i>modo demonstração técnica</i>, no rodapé)."],
              ["<b>Back-end/API</b>", "<font name='%s'>backend/app/main.py</font> e <font name='%s'>backend/app/routers/*.py</font>" % (FM, FM),
               "API REST em <font name='%s'>/api/*</font>: CRUD, operações compostas, relatórios; traduz erros do banco "
               "(<font name='%s'>erros.py</font>) e serve o front-end." % (FM, FM)],
              ["<b>Conexão</b>", "<font name='%s'>backend/app/db.py</font>" % FM,
               "Pool de conexões psycopg; comandos parametrizados; transações explícitas (BEGIN/COMMIT/ROLLBACK); "
               "registro do SQL executado no cabeçalho <font name='%s'>X-SQL-Trace</font>." % FM],
          ], [2.8 * cm, 6 * cm, W - 8.8 * cm])]

    h += [P("4. Instância PostgreSQL utilizada", "h"), tabela([
        ["SGBD / versão", "PostgreSQL 16.16 (pacote PGDG para Ubuntu 26.04)"],
        ["Servidor", "VM Oracle Cloud <font name='%s'>vm-gestao-cursos</font> (134.65.230.190), a mesma VM do back-end" % FM],
        ["Banco de dados", "<font name='%s'>tp3</font> — esquema físico do TP3" % FM],
        ["Endereço usado pela API", "<font name='%s'>127.0.0.1:5432</font> (conexão local; autenticação scram-sha-256)" % FM],
        ["Usuário da aplicação", "<font name='%s'>gestao_app</font> — somente SELECT/INSERT/UPDATE/DELETE (sem DDL); "
                                 "senha em <font name='%s'>/etc/gestao-cursos/gestao.env</font>" % (FM, FM)],
        ["Objetos usados", "8 tabelas; VIEW <font name='%s'>vw_historico_matricula</font>; gatilhos RT01 e RT02 "
                           "(CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED)" % FM],
    ], [4.2 * cm, W - 4.2 * cm], cabecalho=False, chave=True)]

    h += [KeepTogether([P("5. Conexão do back-end/API com o PostgreSQL", "h"),
          P("Biblioteca: <b>psycopg 3</b> (driver nativo, sobre a libpq) com <b>psycopg_pool.ConnectionPool</b>. Não há ORM: "
            "o SQL é escrito explicitamente e os valores são sempre passados como parâmetros. Trecho de "
            "<font name='%s'>backend/app/db.py</font>:" % FM),
          Paragraph("pool = ConnectionPool(conninfo=os.environ['DATABASE_URL'], min_size=1, max_size=5,<br/>"
                    "&nbsp;&nbsp;&nbsp;&nbsp;kwargs={'autocommit': True, 'row_factory': dict_row, 'cursor_factory': ClientCursor})<br/><br/>"
                    "with transacao() as s:&nbsp;&nbsp;# BEGIN<br/>"
                    "&nbsp;&nbsp;&nbsp;&nbsp;p = s.um('INSERT INTO pessoa (...) VALUES (%s, %s, ...) RETURNING id_pessoa', (...))<br/>"
                    "&nbsp;&nbsp;&nbsp;&nbsp;s.executar('INSERT INTO aluno (...) VALUES (%s, ...)', (...))<br/>"
                    "# COMMIT: o gatilho diferido RT01 é verificado aqui; em caso de erro, ROLLBACK", st["code"])])]

    h += [P("6. Funcionalidades mínimas e onde são demonstradas", "h"), tabela([
        ["Requisito", "Tela / ação na interface", "Operação no PostgreSQL"],
        ["Inserção", "Alunos → Novo aluno", "INSERT pessoa + INSERT aluno (transação)"],
        ["Atualização", "Matrículas → editar status e nota", "UPDATE matricula"],
        ["Remoção", "Matrículas → excluir", "DELETE FROM matricula"],
        ["Listagem", "Todas as telas de cadastro", "SELECT … ORDER BY"],
        ["Consulta específica", "Alunos → ficha do aluno", "SELECT … WHERE id_pessoa = ? + VIEW"],
        ["Busca por substring", "Caixa de busca (Alunos, Professores, Cursos, Turmas…)", "ILIKE '%texto%'"],
        ["Operação composta", "Turma → Matricular alunos (lote); Lançar notas; Nova turma com alocações",
         "Vários INSERT/UPDATE em uma transação (tudo ou nada)"],
        ["JOIN", "Relatórios → Histórico acadêmico", "JOIN matricula, aluno, pessoa, turma, curso"],
        ["GROUP BY + agregação", "Relatórios → Desempenho por curso; Painel", "COUNT, COUNT FILTER, AVG, MIN, MAX"],
        ["HAVING", "Relatórios → Turmas por matrículas; Carga docente", "HAVING count(*) &gt;= n; HAVING sum(...) &gt;= n"],
        ["Gatilho", "Turma → remover a última alocação; Nova turma sem alocação",
         "trg_rt02_alocacao / trg_rt02_turma rejeitam no COMMIT"],
        ["Erro de integridade", "Aluno com e-mail repetido; excluir curso com turmas; nota 11",
         "23505 uk_pessoa_email; 23503 fk_turma_curso; 23514 ck_matricula_nota"],
    ], [3.3 * cm, 6.3 * cm, W - 9.6 * cm])]
    h += [Spacer(1, 4), P("Para a demonstração, ative o <b>modo demonstração técnica</b> (rodapé da aplicação). Em todas as ações, o <b>Console SQL</b> da interface mostra as etapas (1) ação no front-end, "
                          "(2) rota da API, (3) comandos SQL executados no PostgreSQL e (4) retorno (status HTTP e tempo). "
                          "A comprovação no banco é feita com <font name='%s'>psql</font> usando "
                          "<font name='%s'>database/06_verificacao_demo.sql</font>." % (FM, FM))]

    h += [P("7. Ajustes realizados após o TP3", "h"),
          P("<b>Nenhuma tabela, coluna ou restrição do TP3 foi alterada</b> para o funcionamento da aplicação. Ajustes:"),
          tabela([
              ["Ajuste", "Motivo"],
              ["Script <font name='%s'>05_ajustes_pf.sql</font>: cria o role <font name='%s'>gestao_app</font> "
               "(LOGIN, sem superusuário) com GRANT apenas de SELECT, INSERT, UPDATE e DELETE." % (FM, FM),
               "A API não deve usar o superusuário nem ter permissão de DDL (princípio do menor privilégio)."],
              ["Versão revisada dos scripts do TP3 instalada na VM: CHECK de identificadores positivos "
               "(<font name='%s'>ck_*_id_positivo</font>), gatilho <font name='%s'>trg_rt02_serializa</font>, "
               "<font name='%s'>trg_protege_truncate</font> e <font name='%s'>trg_id_imutavel</font> (RR06)." % (FM, FM, FM, FM),
               "Proteções físicas que não mudam o modelo: serializam remoções concorrentes de alocações (RT02), "
               "impedem TRUNCATE que ignoraria RT01/RT02 e tornam as chaves substitutas imutáveis."],
              ["Autenticação na API (login e sessão) com usuários definidos na configuração do servidor; nenhuma tabela nova.",
               "A aplicação será usada por pessoas reais: os dados pessoais de alunos e professores não podem ficar públicos."],
              ["Script <font name='%s'>06_verificacao_demo.sql</font>." % FM,
               "Consultas para comprovar no console SQL cada operação feita pela aplicação."],
          ], [W * 0.55, W * 0.45])]

    doc = SimpleDocTemplate(str(saida), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm,
                            bottomMargin=1.8 * cm, title="PF — Sistema de Gestão de Cursos",
                            author="Evellin Serra de Moura, Lucas Almeida Silveira de Souza, Wallison Vieira de Aquino")
    doc.build(h, onFirstPage=rodape, onLaterPages=rodape)
    print(f"PDF gerado: {saida}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default="<i>(preencher com o link do repositório)</i>")
    ap.add_argument("--url", default="https://134-65-230-190.sslip.io/  (também http://134.65.230.190/)")
    ap.add_argument("--saida", default=str(AQUI / "PF_Entrega_Gestao_de_Cursos.pdf"))
    a = ap.parse_args()
    gerar(a.repo, a.url, Path(a.saida))
