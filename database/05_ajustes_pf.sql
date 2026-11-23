-- =============================================================================
-- PF - Ajustes para a versão final (executar após 01, 02 e 03)
-- Sistema de Gestão de Cursos
--
-- Único ajuste necessário: um usuário (role) próprio para o back-end/API,
-- com privilégio mínimo (somente DML). O esquema do TP3 não é alterado:
-- tabelas, restrições, VIEW, índices e gatilhos continuam os mesmos.
--
-- Uso (na VM, como superusuário):
--   sudo -u postgres psql -d tp3 -v app_password='SENHA' -f 05_ajustes_pf.sql
-- =============================================================================

\set ON_ERROR_STOP on

-- 1. Cria o role da aplicação, se ainda não existir, e (re)define a senha.
SELECT 'CREATE ROLE gestao_app LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gestao_app')
\gexec

ALTER ROLE gestao_app WITH LOGIN PASSWORD :'app_password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

-- 2. Privilégios no banco atual (o psql -d define qual banco recebe o GRANT).
SELECT format('GRANT CONNECT ON DATABASE %I TO gestao_app', current_database())
\gexec

GRANT USAGE ON SCHEMA public TO gestao_app;

-- Somente DML: a aplicação não cria, altera nem remove objetos do esquema.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gestao_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gestao_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gestao_app;

-- 3. Conferência
SELECT grantee, table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
FROM information_schema.role_table_grants
WHERE grantee = 'gestao_app'
GROUP BY grantee, table_name
ORDER BY table_name;
