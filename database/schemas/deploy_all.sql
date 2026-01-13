-- ============================================================================
-- FINACEVERSE DATABASE SCHEMA - MASTER DEPLOYMENT SCRIPT
-- ============================================================================
-- The World's First Cognitive Operating System for Finance
-- 
-- This script deploys all schema files in the correct order
-- Run this file to create the complete database structure
-- ============================================================================

-- Configuration
\set ON_ERROR_STOP on
\timing on

-- Display banner
\echo '============================================================================'
\echo '  FinACEverse - Cognitive Operating System for Finance'
\echo '  Database Schema Deployment'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- SCHEMA DEPLOYMENT ORDER
-- ============================================================================

\echo 'Step 1/14: Creating extensions and types...'
\i 00_extensions_and_types.sql
\echo 'Done!'
\echo ''

\echo 'Step 2/14: Creating core identity schema...'
\i 01_core_identity.sql
\echo 'Done!'
\echo ''

\echo 'Step 3/14: Creating audit and security schema...'
\i 02_audit_security.sql
\echo 'Done!'
\echo ''

\echo 'Step 4/14: Creating AI agents and federated learning schema...'
\i 03_ai_agents_federated.sql
\echo 'Done!'
\echo ''

\echo 'Step 5/14: Creating documents and intelligence schema...'
\i 04_documents_intelligence.sql
\echo 'Done!'
\echo ''

\echo 'Step 6/14: Creating billing and subscriptions schema...'
\i 05_billing_subscriptions.sql
\echo 'Done!'
\echo ''

\echo 'Step 7/14: Creating support and communications schema...'
\i 06_support_communications.sql
\echo 'Done!'
\echo ''

\echo 'Step 8/14: Creating DevOps, API and infrastructure schema...'
\i 07_devops_api_infrastructure.sql
\echo 'Done!'
\echo ''

\echo 'Step 9/14: Creating legal, partners and BI schema...'
\i 08_legal_partners_bi.sql
\echo 'Done!'
\echo ''

\echo 'Step 10/14: Creating VAMN, Accute, Cyloid product schemas...'
\i 09_products_vamn_accute_cyloid.sql
\echo 'Done!'
\echo ''

\echo 'Step 11/14: Creating Luca AI, Fin(Ai)d Hub, Finory product schemas...'
\i 10_products_luca_finaid_finory.sql
\echo 'Done!'
\echo ''

\echo 'Step 12/14: Creating EPI-Q and SumBuddy product schemas...'
\i 11_products_epiq_sumbuddy.sql
\echo 'Done!'
\echo ''

\echo 'Step 13/14: Creating views and materialized views...'
\i 12_views_materialized.sql
\echo 'Done!'
\echo ''

\echo 'Step 14/14: Creating procedures and functions...'
\i 13_procedures_functions.sql
\echo 'Done!'
\echo ''

-- ============================================================================
-- POST-DEPLOYMENT TASKS
-- ============================================================================

\echo 'Running post-deployment tasks...'

-- Refresh materialized views with initial (empty) data
REFRESH MATERIALIZED VIEW mv_platform_metrics;
REFRESH MATERIALIZED VIEW mv_product_usage_daily;
REFRESH MATERIALIZED VIEW mv_tenant_health;
REFRESH MATERIALIZED VIEW mv_federated_contributions;

\echo 'Materialized views refreshed!'
\echo ''

-- Verify deployment
\echo 'Verifying deployment...'

SELECT 'Extensions' AS category, COUNT(*)::TEXT AS count 
FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'btree_gin', 'btree_gist')
UNION ALL
SELECT 'Tables', COUNT(*)::TEXT FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Views', COUNT(*)::TEXT FROM information_schema.views WHERE table_schema = 'public'
UNION ALL
SELECT 'Materialized Views', COUNT(*)::TEXT FROM pg_matviews WHERE schemaname = 'public'
UNION ALL
SELECT 'Functions', COUNT(*)::TEXT FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
UNION ALL
SELECT 'Indexes', COUNT(*)::TEXT FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'Custom Types', COUNT(*)::TEXT FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e';

\echo ''
\echo '============================================================================'
\echo '  Deployment Complete!'
\echo '============================================================================'
\echo ''
\echo 'Next Steps:'
\echo '  1. Create initial admin user'
\echo '  2. Configure environment variables'
\echo '  3. Set up scheduled jobs for materialized view refresh'
\echo '  4. Configure pg_cron or external scheduler for partitioning'
\echo ''
