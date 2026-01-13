-- ============================================================================
-- VIEWS, MATERIALIZED VIEWS & PERFORMANCE OPTIMIZATIONS
-- ============================================================================
-- Aggregated views for common queries
-- Materialized views for dashboard performance
-- Cross-product intelligence views
-- ============================================================================

-- ============================================================================
-- TENANT OVERVIEW VIEWS
-- ============================================================================

-- Tenant summary with product usage
CREATE OR REPLACE VIEW v_tenant_summary AS
SELECT 
    t.id AS tenant_id,
    t.external_id,
    t.name,
    t.tenant_type,
    t.subscription_tier,
    t.deployment_mode,
    t.federated_status,
    t.is_active,
    t.created_at,
    
    -- User counts
    (SELECT COUNT(*) FROM tenant_memberships tm WHERE tm.tenant_id = t.id AND tm.status = 'active') AS active_users,
    
    -- Products enabled
    ARRAY(SELECT tp.product FROM tenant_products tp WHERE tp.tenant_id = t.id AND tp.is_enabled = TRUE) AS products_enabled,
    
    -- Subscription
    s.status AS subscription_status,
    s.current_period_end AS subscription_expires,
    
    -- Usage
    COALESCE(ua.total_api_calls, 0) AS total_api_calls_this_month,
    COALESCE(ua.total_storage_bytes, 0) AS total_storage_bytes
    
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status IN ('active', 'trial')
LEFT JOIN LATERAL (
    SELECT 
        SUM(CASE WHEN ur.metric_name = 'api_calls' THEN ur.quantity ELSE 0 END) AS total_api_calls,
        SUM(CASE WHEN ur.metric_name = 'storage_bytes' THEN ur.quantity ELSE 0 END) AS total_storage_bytes
    FROM usage_aggregates ua2
    JOIN usage_records ur ON ur.subscription_id = ua2.subscription_id
    WHERE ua2.tenant_id = t.id 
      AND ua2.period_start >= date_trunc('month', CURRENT_DATE)
) ua ON TRUE
WHERE t.deleted_at IS NULL;

-- User activity summary
CREATE OR REPLACE VIEW v_user_activity AS
SELECT 
    u.id AS user_id,
    u.external_id,
    u.email,
    u.first_name,
    u.last_name,
    u.is_active,
    u.last_login_at,
    u.last_active_at,
    
    -- Sessions
    (SELECT COUNT(*) FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = TRUE) AS active_sessions,
    
    -- Tenant memberships
    ARRAY(SELECT tm.tenant_id FROM tenant_memberships tm WHERE tm.user_id = u.id AND tm.status = 'active') AS tenant_ids,
    
    -- Recent activity
    (SELECT COUNT(*) FROM audit_logs al 
     WHERE al.user_id = u.id 
       AND al.timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days') AS actions_last_7_days
       
FROM users u
WHERE u.deleted_at IS NULL;

-- ============================================================================
-- BILLING & REVENUE VIEWS
-- ============================================================================

-- Monthly Recurring Revenue (MRR) by product
CREATE OR REPLACE VIEW v_mrr_by_product AS
SELECT 
    date_trunc('month', s.created_at) AS month,
    tp.product,
    COUNT(DISTINCT s.tenant_id) AS subscribers,
    SUM(s.unit_amount_cents * s.quantity) AS mrr_cents
FROM subscriptions s
JOIN tenant_products tp ON tp.tenant_id = s.tenant_id
WHERE s.status IN ('active', 'trial')
GROUP BY date_trunc('month', s.created_at), tp.product;

-- Revenue per tenant
CREATE OR REPLACE VIEW v_tenant_revenue AS
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.subscription_tier,
    COALESCE(SUM(p.amount_cents), 0) AS total_revenue_cents,
    COALESCE(SUM(p.amount_cents) FILTER (WHERE p.created_at >= date_trunc('month', CURRENT_DATE)), 0) AS revenue_this_month_cents,
    COALESCE(SUM(p.amount_cents) FILTER (WHERE p.created_at >= date_trunc('year', CURRENT_DATE)), 0) AS revenue_this_year_cents,
    COUNT(p.id) AS total_payments,
    MAX(p.created_at) AS last_payment_at
FROM tenants t
LEFT JOIN payments p ON p.tenant_id = t.id AND p.status = 'succeeded'
GROUP BY t.id, t.name, t.subscription_tier;

-- Invoice aging
CREATE OR REPLACE VIEW v_invoice_aging AS
SELECT 
    i.tenant_id,
    t.name AS tenant_name,
    i.id AS invoice_id,
    i.invoice_number,
    i.total_cents,
    i.amount_due_cents,
    i.due_date,
    CURRENT_DATE - i.due_date::DATE AS days_overdue,
    CASE 
        WHEN CURRENT_DATE <= i.due_date THEN 'current'
        WHEN CURRENT_DATE - i.due_date::DATE <= 30 THEN '1-30 days'
        WHEN CURRENT_DATE - i.due_date::DATE <= 60 THEN '31-60 days'
        WHEN CURRENT_DATE - i.due_date::DATE <= 90 THEN '61-90 days'
        ELSE '90+ days'
    END AS aging_bucket
FROM invoices i
JOIN tenants t ON t.id = i.tenant_id
WHERE i.status = 'open'
  AND i.amount_due_cents > 0;

-- ============================================================================
-- SUPPORT VIEWS
-- ============================================================================

-- Ticket SLA performance
CREATE OR REPLACE VIEW v_ticket_sla_performance AS
SELECT 
    date_trunc('day', st.created_at) AS date,
    st.priority,
    st.category,
    COUNT(*) AS total_tickets,
    
    -- First response SLA
    COUNT(*) FILTER (WHERE st.first_response_at <= st.first_response_due) AS first_response_met,
    COUNT(*) FILTER (WHERE st.first_response_at > st.first_response_due OR (st.first_response_at IS NULL AND st.first_response_due < CURRENT_TIMESTAMP)) AS first_response_breached,
    
    -- Resolution SLA
    COUNT(*) FILTER (WHERE st.resolved_at <= st.resolution_due) AS resolution_met,
    COUNT(*) FILTER (WHERE st.resolved_at > st.resolution_due OR (st.resolved_at IS NULL AND st.resolution_due < CURRENT_TIMESTAMP)) AS resolution_breached,
    
    -- Average times
    AVG(EXTRACT(EPOCH FROM (st.first_response_at - st.created_at)) / 60) AS avg_first_response_minutes,
    AVG(EXTRACT(EPOCH FROM (st.resolved_at - st.created_at)) / 60) AS avg_resolution_minutes
    
FROM support_tickets st
WHERE st.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', st.created_at), st.priority, st.category;

-- Agent performance
CREATE OR REPLACE VIEW v_support_agent_performance AS
SELECT 
    st.assigned_to AS agent_id,
    u.first_name || ' ' || u.last_name AS agent_name,
    COUNT(*) AS tickets_handled,
    COUNT(*) FILTER (WHERE st.status = 'closed' OR st.status = 'resolved') AS tickets_resolved,
    AVG(EXTRACT(EPOCH FROM (st.first_response_at - st.created_at)) / 60) AS avg_first_response_minutes,
    AVG(EXTRACT(EPOCH FROM (st.resolved_at - st.created_at)) / 60) AS avg_resolution_minutes,
    AVG(st.satisfaction_rating) AS avg_satisfaction_rating
FROM support_tickets st
JOIN users u ON u.id = st.assigned_to
WHERE st.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND st.assigned_to IS NOT NULL
GROUP BY st.assigned_to, u.first_name, u.last_name;

-- ============================================================================
-- AI AGENT VIEWS
-- ============================================================================

-- Agent performance metrics
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT 
    a.id AS agent_id,
    a.name AS agent_name,
    a.agent_type,
    a.product,
    a.status,
    a.execution_count,
    a.success_rate,
    a.avg_execution_time_ms,
    
    -- Recent performance
    recent.executions_last_7_days,
    recent.success_rate_last_7_days,
    recent.avg_tokens_last_7_days
    
FROM ai_agents a
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) AS executions_last_7_days,
        ROUND(COUNT(*) FILTER (WHERE ae.status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) AS success_rate_last_7_days,
        AVG(ae.tokens_used) AS avg_tokens_last_7_days
    FROM agent_executions ae
    WHERE ae.agent_id = a.id 
      AND ae.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
) recent ON TRUE
WHERE a.status = 'active';

-- ============================================================================
-- DOCUMENT INTELLIGENCE VIEWS
-- ============================================================================

-- Document processing metrics
CREATE OR REPLACE VIEW v_document_metrics AS
SELECT 
    date_trunc('day', d.created_at) AS date,
    d.tenant_id,
    d.product,
    d.document_type,
    COUNT(*) AS documents_uploaded,
    COUNT(*) FILTER (WHERE d.status = 'verified') AS documents_verified,
    COUNT(*) FILTER (WHERE d.status = 'failed') AS documents_failed,
    AVG(EXTRACT(EPOCH FROM (d.processing_completed_at - d.processing_started_at))) AS avg_processing_seconds,
    AVG(d.extraction_confidence) AS avg_extraction_confidence
FROM documents d
WHERE d.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', d.created_at), d.tenant_id, d.product, d.document_type;

-- ============================================================================
-- MATERIALIZED VIEWS (Pre-computed for performance)
-- ============================================================================

-- Platform-wide metrics (refresh every hour)
CREATE MATERIALIZED VIEW mv_platform_metrics AS
SELECT 
    CURRENT_TIMESTAMP AS computed_at,
    
    -- Tenants
    (SELECT COUNT(*) FROM tenants WHERE is_active = TRUE AND deleted_at IS NULL) AS active_tenants,
    (SELECT COUNT(*) FROM tenants WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_tenants_30d,
    
    -- Users
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND deleted_at IS NULL) AS active_users,
    (SELECT COUNT(*) FROM users WHERE last_active_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS dau,
    (SELECT COUNT(*) FROM users WHERE last_active_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS wau,
    (SELECT COUNT(*) FROM users WHERE last_active_at >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS mau,
    
    -- Revenue (in cents)
    (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'succeeded' AND created_at >= date_trunc('month', CURRENT_DATE)) AS mrr_cents,
    (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'succeeded' AND created_at >= date_trunc('year', CURRENT_DATE)) AS arr_cents,
    
    -- Documents
    (SELECT COUNT(*) FROM documents WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS documents_processed_30d,
    
    -- AI
    (SELECT COUNT(*) FROM agent_executions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS agent_executions_30d,
    
    -- Support
    (SELECT COUNT(*) FROM support_tickets WHERE status IN ('new', 'open', 'in_progress')) AS open_tickets
WITH NO DATA;

-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_platform_metrics;
CREATE UNIQUE INDEX ON mv_platform_metrics (computed_at);

-- Product usage metrics (refresh daily)
CREATE MATERIALIZED VIEW mv_product_usage_daily AS
SELECT 
    date_trunc('day', ae.created_at)::DATE AS date,
    ae.product,
    COUNT(DISTINCT ae.tenant_id) AS active_tenants,
    COUNT(DISTINCT ae.user_id) AS active_users,
    COUNT(*) AS total_executions,
    SUM(ae.tokens_used) AS total_tokens,
    SUM(ae.cost_cents) AS total_cost_cents
FROM agent_executions ae
WHERE ae.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', ae.created_at), ae.product
WITH NO DATA;

CREATE UNIQUE INDEX ON mv_product_usage_daily (date, product);

-- Tenant health scores (refresh hourly)
CREATE MATERIALIZED VIEW mv_tenant_health AS
SELECT 
    t.id AS tenant_id,
    t.name,
    t.subscription_tier,
    
    -- Activity score (0-100)
    LEAST(100, (
        SELECT COUNT(*) FROM audit_logs al 
        WHERE al.tenant_id = t.id 
          AND al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    ) * 2) AS activity_score,
    
    -- Feature adoption (count of products used)
    (SELECT COUNT(*) FROM tenant_products tp WHERE tp.tenant_id = t.id AND tp.is_enabled = TRUE) AS products_used,
    
    -- Support health (lower is better)
    (SELECT COUNT(*) FROM support_tickets st WHERE st.tenant_id = t.id AND st.status IN ('new', 'open') AND st.priority IN ('critical', 'high')) AS critical_open_tickets,
    
    -- Payment health
    CASE 
        WHEN EXISTS (SELECT 1 FROM invoices i WHERE i.tenant_id = t.id AND i.status = 'open' AND i.due_date < CURRENT_DATE) THEN FALSE
        ELSE TRUE
    END AS payments_current,
    
    -- Last activity
    (SELECT MAX(timestamp) FROM audit_logs al WHERE al.tenant_id = t.id) AS last_activity,
    
    -- Computed at
    CURRENT_TIMESTAMP AS computed_at
    
FROM tenants t
WHERE t.is_active = TRUE
  AND t.deleted_at IS NULL
WITH NO DATA;

CREATE UNIQUE INDEX ON mv_tenant_health (tenant_id);

-- Federated learning contribution scores
CREATE MATERIALIZED VIEW mv_federated_contributions AS
SELECT 
    fn.tenant_id,
    fn.cluster_id,
    fc.name AS cluster_name,
    fn.status,
    fn.rounds_participated,
    fn.total_contribution_score,
    
    -- Recent contributions
    (SELECT COUNT(*) FROM federated_contributions fct 
     WHERE fct.node_id = fn.id 
       AND fct.status = 'verified' 
       AND fct.submitted_at >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS contributions_30d,
    
    -- Model downloads
    (SELECT COUNT(*) FROM federated_models fm 
     WHERE fm.cluster_id = fn.cluster_id 
       AND fn.status = 'opted_in') AS models_available,
       
    CURRENT_TIMESTAMP AS computed_at
    
FROM federated_nodes fn
JOIN federated_clusters fc ON fc.id = fn.cluster_id
WHERE fn.status != 'opted_out'
WITH NO DATA;

CREATE UNIQUE INDEX ON mv_federated_contributions (tenant_id, cluster_id);

-- ============================================================================
-- CROSS-PRODUCT INTELLIGENCE VIEWS
-- ============================================================================

-- Unified activity stream (for Command Center dashboard)
CREATE OR REPLACE VIEW v_activity_stream AS
(
    SELECT 
        al.id,
        al.tenant_id,
        al.user_id,
        'audit' AS activity_type,
        al.action::TEXT AS action,
        al.table_name AS entity_type,
        al.record_id AS entity_id,
        NULL AS title,
        al.timestamp AS occurred_at,
        al.product
    FROM audit_logs al
    WHERE al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    LIMIT 1000
)
UNION ALL
(
    SELECT 
        ae.id,
        ae.tenant_id,
        ae.user_id,
        'agent_execution' AS activity_type,
        ae.status::TEXT AS action,
        'agent' AS entity_type,
        ae.agent_id AS entity_id,
        NULL AS title,
        ae.created_at AS occurred_at,
        ae.product
    FROM agent_executions ae
    WHERE ae.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    LIMIT 1000
)
UNION ALL
(
    SELECT 
        d.id,
        d.tenant_id,
        d.uploaded_by AS user_id,
        'document' AS activity_type,
        d.status::TEXT AS action,
        'document' AS entity_type,
        d.id AS entity_id,
        d.name AS title,
        d.created_at AS occurred_at,
        d.product
    FROM documents d
    WHERE d.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    LIMIT 1000
)
ORDER BY occurred_at DESC;

-- Intelligence sharing opportunities
CREATE OR REPLACE VIEW v_sharing_opportunities AS
SELECT 
    t1.id AS source_tenant_id,
    t1.name AS source_tenant,
    t2.id AS target_tenant_id,
    t2.name AS target_tenant,
    t1.industry AS shared_industry,
    
    -- Common products
    ARRAY(
        SELECT UNNEST(ARRAY(SELECT product FROM tenant_products WHERE tenant_id = t1.id AND is_enabled = TRUE))
        INTERSECT
        SELECT UNNEST(ARRAY(SELECT product FROM tenant_products WHERE tenant_id = t2.id AND is_enabled = TRUE))
    ) AS common_products,
    
    -- Potential value
    CASE 
        WHEN t1.industry = t2.industry THEN 'high'
        ELSE 'medium'
    END AS potential_value
    
FROM tenants t1
JOIN tenants t2 ON t1.id != t2.id
WHERE t1.federated_status = 'opted_in'
  AND t2.federated_status = 'opted_in'
  AND t1.industry = t2.industry
  AND NOT EXISTS (
      SELECT 1 FROM intelligence_sharing_agreements isa 
      WHERE isa.source_tenant_id = t1.id 
        AND isa.target_tenant_id = t2.id
        AND isa.status = 'active'
  );

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_platform_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_usage_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_health;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_federated_contributions;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (run via pg_cron or external scheduler)
-- SELECT cron.schedule('refresh_mvs', '0 * * * *', 'SELECT refresh_all_materialized_views()');

-- ============================================================================
-- INITIAL DATA POPULATION
-- ============================================================================

-- Refresh materialized views with initial data
-- REFRESH MATERIALIZED VIEW mv_platform_metrics;
-- REFRESH MATERIALIZED VIEW mv_product_usage_daily;
-- REFRESH MATERIALIZED VIEW mv_tenant_health;
-- REFRESH MATERIALIZED VIEW mv_federated_contributions;
