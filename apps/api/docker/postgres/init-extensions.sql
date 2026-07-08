-- Script de inicialização para extensões PostgreSQL necessárias para postgres-mcp
-- Executado automaticamente na primeira inicialização do container

-- Extensão pg_stat_statements (rastreamento de queries)
-- Permite análise de performance e identificação de queries lentas
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Nota sobre hypopg:
-- A extensão hypopg (índices hipotéticos) não está disponível por padrão no postgres:17-alpine
-- O postgres-mcp funciona perfeitamente com apenas pg_stat_statements
-- Se precisar de hypopg, considere usar uma imagem customizada como:
--   - ankane/pgvector (inclui várias extensões úteis)
--   - citusdata/postgresql-hll (inclui extensões de análise)
-- Ou compile manualmente: https://github.com/HypoPG/hypopg

-- Verificar extensões instaladas
SELECT
    extname as "Extension",
    extversion as "Version",
    CASE
        WHEN extname = 'pg_stat_statements' THEN '✓ Rastreamento de queries ativo'
        WHEN extname = 'hypopg' THEN '✓ Índices hipotéticos disponíveis'
        ELSE 'Instalada'
    END as "Status"
FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'hypopg', 'plpgsql')
ORDER BY extname;
