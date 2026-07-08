#!/bin/bash
# Script para testar se as extensões PostgreSQL foram instaladas corretamente

set -e

echo "🔍 Testando extensões PostgreSQL para postgres-mcp..."
echo ""

# Aguardar PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL iniciar..."
sleep 5

# Testar conexão e listar extensões instaladas
docker exec cogcs-postgres psql -U cogcs -d cogcs -c "
SELECT
    extname as \"Extension\",
    extversion as \"Version\",
    CASE
        WHEN extname = 'pg_stat_statements' THEN '✓ Rastreamento de queries ativo'
        WHEN extname = 'hypopg' THEN '✓ Índices hipotéticos disponíveis'
        ELSE 'Instalada'
    END as \"Status\"
FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'hypopg', 'plpgsql')
ORDER BY extname;
"

echo ""
echo "📊 Verificando pg_stat_statements..."
docker exec cogcs-postgres psql -U cogcs -d cogcs -c "
SELECT
    count(*) as total_queries_tracked,
    count(DISTINCT userid) as total_users,
    count(DISTINCT dbid) as total_databases
FROM pg_stat_statements;
"

echo ""
echo "⚙️  Configurações pg_stat_statements:"
docker exec cogcs-postgres psql -U cogcs -d cogcs -c "
SHOW shared_preload_libraries;
SHOW pg_stat_statements.track;
"

echo ""
echo "✅ Teste concluído!"
echo ""
echo "📝 Notas:"
echo "  - pg_stat_statements: Deve estar instalada e ativa"
echo "  - hypopg: Opcional, não disponível no postgres:17-alpine por padrão"
echo "  - O postgres-mcp funciona perfeitamente apenas com pg_stat_statements"
