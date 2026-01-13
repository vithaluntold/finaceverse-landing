-- ============================================================================
-- STORED PROCEDURES & FUNCTIONS
-- ============================================================================
-- Business logic procedures
-- Data maintenance functions
-- Scheduled task procedures
-- ============================================================================

-- ============================================================================
-- TENANT MANAGEMENT PROCEDURES
-- ============================================================================

-- Create a new tenant with all required resources
CREATE OR REPLACE FUNCTION create_tenant(
    p_name TEXT,
    p_slug TEXT,
    p_tenant_type tenant_type DEFAULT 'business',
    p_subscription_tier subscription_tier DEFAULT 'professional',
    p_deployment_mode deployment_mode DEFAULT 'saas',
    p_products product_type[] DEFAULT ARRAY['luca_ai']::product_type[],
    p_admin_email TEXT DEFAULT NULL,
    p_admin_first_name TEXT DEFAULT NULL,
    p_admin_last_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    tenant_id UUID,
    admin_user_id UUID,
    api_key TEXT
) AS $$
DECLARE
    v_tenant_id UUID;
    v_admin_user_id UUID;
    v_api_key_id UUID;
    v_api_key TEXT;
    v_product product_type;
BEGIN
    -- Create tenant
    INSERT INTO tenants (
        name, slug, tenant_type, subscription_tier, deployment_mode,
        settings, features
    ) VALUES (
        p_name, p_slug, p_tenant_type, p_subscription_tier, p_deployment_mode,
        jsonb_build_object(
            'timezone', 'UTC',
            'currency', 'USD',
            'date_format', 'YYYY-MM-DD'
        ),
        jsonb_build_object(
            'api_access', TRUE,
            'sso_enabled', FALSE,
            'federated_learning', FALSE
        )
    )
    RETURNING id INTO v_tenant_id;
    
    -- Enable products
    FOREACH v_product IN ARRAY p_products LOOP
        INSERT INTO tenant_products (tenant_id, product, is_enabled, configuration)
        VALUES (v_tenant_id, v_product, TRUE, '{}'::JSONB);
    END LOOP;
    
    -- Create admin user if email provided
    IF p_admin_email IS NOT NULL THEN
        INSERT INTO users (
            email, first_name, last_name, is_verified, is_active
        ) VALUES (
            p_admin_email, 
            COALESCE(p_admin_first_name, 'Admin'), 
            COALESCE(p_admin_last_name, 'User'),
            TRUE, TRUE
        )
        RETURNING id INTO v_admin_user_id;
        
        -- Create membership
        INSERT INTO tenant_memberships (
            user_id, tenant_id, role, status
        ) VALUES (
            v_admin_user_id, v_tenant_id, 'owner', 'active'
        );
    END IF;
    
    -- Generate API key
    v_api_key := 'finace_' || encode(gen_random_bytes(24), 'hex');
    INSERT INTO api_keys (
        tenant_id, name, key_prefix, key_hash, permissions, is_active
    ) VALUES (
        v_tenant_id, 
        'Default API Key', 
        LEFT(v_api_key, 12),
        encode(sha256(v_api_key::bytea), 'hex'),
        ARRAY['read', 'write'],
        TRUE
    )
    RETURNING id INTO v_api_key_id;
    
    RETURN QUERY SELECT v_tenant_id, v_admin_user_id, v_api_key;
END;
$$ LANGUAGE plpgsql;

-- Soft delete tenant and all related data
CREATE OR REPLACE FUNCTION delete_tenant(
    p_tenant_id UUID,
    p_deleted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mark tenant as deleted
    UPDATE tenants SET 
        deleted_at = CURRENT_TIMESTAMP,
        is_active = FALSE
    WHERE id = p_tenant_id;
    
    -- Deactivate all memberships
    UPDATE tenant_memberships SET 
        status = 'removed',
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id;
    
    -- Disable all products
    UPDATE tenant_products SET 
        is_enabled = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id;
    
    -- Revoke all API keys
    UPDATE api_keys SET 
        is_active = FALSE,
        revoked_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id;
    
    -- Cancel subscriptions
    UPDATE subscriptions SET 
        status = 'canceled',
        canceled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id 
      AND status NOT IN ('canceled', 'expired');
    
    -- Log the action
    INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, changes)
    VALUES (p_tenant_id, p_deleted_by, 'delete', 'tenants', p_tenant_id, 
            jsonb_build_object('action', 'tenant_deleted'));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER MANAGEMENT PROCEDURES
-- ============================================================================

-- Invite user to tenant
CREATE OR REPLACE FUNCTION invite_user_to_tenant(
    p_tenant_id UUID,
    p_email TEXT,
    p_role platform_role DEFAULT 'member',
    p_invited_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_membership_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO v_user_id FROM users WHERE email = LOWER(TRIM(p_email));
    
    IF v_user_id IS NULL THEN
        -- Create pending user
        INSERT INTO users (email, is_verified, is_active)
        VALUES (LOWER(TRIM(p_email)), FALSE, FALSE)
        RETURNING id INTO v_user_id;
    END IF;
    
    -- Check for existing membership
    IF EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = v_user_id AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'User already has membership in this tenant';
    END IF;
    
    -- Create pending membership
    INSERT INTO tenant_memberships (user_id, tenant_id, role, status, invited_by)
    VALUES (v_user_id, p_tenant_id, p_role, 'pending', p_invited_by)
    RETURNING id INTO v_membership_id;
    
    -- TODO: Trigger email invitation
    
    RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql;

-- Accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
    p_membership_id UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_password_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user from membership
    SELECT user_id INTO v_user_id 
    FROM tenant_memberships 
    WHERE id = p_membership_id AND status = 'pending';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Update user
    UPDATE users SET 
        first_name = p_first_name,
        last_name = p_last_name,
        password_hash = p_password_hash,
        is_verified = TRUE,
        is_active = TRUE,
        verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
    
    -- Activate membership
    UPDATE tenant_memberships SET 
        status = 'active',
        joined_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_membership_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BILLING PROCEDURES
-- ============================================================================

-- Create subscription
CREATE OR REPLACE FUNCTION create_subscription(
    p_tenant_id UUID,
    p_plan_id UUID,
    p_billing_cycle billing_cycle DEFAULT 'monthly',
    p_quantity INTEGER DEFAULT 1,
    p_trial_days INTEGER DEFAULT 14
)
RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
    v_plan RECORD;
    v_trial_end TIMESTAMP WITH TIME ZONE;
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get plan details
    SELECT * INTO v_plan FROM pricing_plans WHERE id = p_plan_id AND is_active = TRUE;
    
    IF v_plan.id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive plan';
    END IF;
    
    -- Calculate dates
    IF p_trial_days > 0 THEN
        v_trial_end := CURRENT_TIMESTAMP + (p_trial_days || ' days')::INTERVAL;
        v_period_end := v_trial_end;
    ELSE
        v_trial_end := NULL;
        v_period_end := CASE p_billing_cycle
            WHEN 'monthly' THEN CURRENT_TIMESTAMP + INTERVAL '1 month'
            WHEN 'quarterly' THEN CURRENT_TIMESTAMP + INTERVAL '3 months'
            WHEN 'annual' THEN CURRENT_TIMESTAMP + INTERVAL '1 year'
        END;
    END IF;
    
    -- Create subscription
    INSERT INTO subscriptions (
        tenant_id, plan_id, status, billing_cycle, quantity,
        unit_amount_cents, currency, trial_start, trial_end,
        current_period_start, current_period_end
    ) VALUES (
        p_tenant_id, p_plan_id, 
        CASE WHEN p_trial_days > 0 THEN 'trial'::billing_status ELSE 'active'::billing_status END,
        p_billing_cycle, p_quantity,
        v_plan.base_price_cents, v_plan.currency,
        CASE WHEN p_trial_days > 0 THEN CURRENT_TIMESTAMP ELSE NULL END,
        v_trial_end,
        CURRENT_TIMESTAMP, v_period_end
    )
    RETURNING id INTO v_subscription_id;
    
    -- Update tenant tier
    UPDATE tenants SET 
        subscription_tier = v_plan.tier,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_tenant_id;
    
    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Record usage
CREATE OR REPLACE FUNCTION record_usage(
    p_subscription_id UUID,
    p_metric_name TEXT,
    p_quantity DECIMAL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_record_id UUID;
BEGIN
    INSERT INTO usage_records (subscription_id, metric_name, quantity, metadata)
    VALUES (p_subscription_id, p_metric_name, p_quantity, COALESCE(p_metadata, '{}'))
    RETURNING id INTO v_record_id;
    
    RETURN v_record_id;
END;
$$ LANGUAGE plpgsql;

-- Generate invoice
CREATE OR REPLACE FUNCTION generate_invoice(
    p_subscription_id UUID,
    p_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_subscription RECORD;
    v_subtotal_cents BIGINT := 0;
    v_tax_cents BIGINT := 0;
    v_invoice_number TEXT;
BEGIN
    -- Get subscription
    SELECT s.*, t.name AS tenant_name 
    INTO v_subscription 
    FROM subscriptions s
    JOIN tenants t ON t.id = s.tenant_id
    WHERE s.id = p_subscription_id;
    
    IF v_subscription.id IS NULL THEN
        RAISE EXCEPTION 'Subscription not found';
    END IF;
    
    -- Calculate subtotal
    v_subtotal_cents := v_subscription.unit_amount_cents * v_subscription.quantity;
    
    -- Generate invoice number
    SELECT 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
           LPAD((COALESCE(MAX(SUBSTRING(invoice_number FROM '\d+$')::INT), 0) + 1)::TEXT, 6, '0')
    INTO v_invoice_number
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-%';
    
    -- Create invoice
    INSERT INTO invoices (
        tenant_id, subscription_id, invoice_number, status,
        subtotal_cents, tax_cents, total_cents, amount_due_cents,
        currency, period_start, period_end, due_date
    ) VALUES (
        v_subscription.tenant_id, p_subscription_id, v_invoice_number, 'draft',
        v_subtotal_cents, v_tax_cents, v_subtotal_cents + v_tax_cents, v_subtotal_cents + v_tax_cents,
        v_subscription.currency,
        COALESCE(p_period_start, v_subscription.current_period_start),
        COALESCE(p_period_end, v_subscription.current_period_end),
        COALESCE(p_period_end, v_subscription.current_period_end) + INTERVAL '30 days'
    )
    RETURNING id INTO v_invoice_id;
    
    -- Add line item
    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_amount_cents, amount_cents)
    VALUES (
        v_invoice_id, 
        'Subscription: ' || v_subscription.tenant_name,
        v_subscription.quantity,
        v_subscription.unit_amount_cents,
        v_subtotal_cents
    );
    
    -- Add usage-based charges
    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_amount_cents, amount_cents)
    SELECT 
        v_invoice_id,
        'Usage: ' || ur.metric_name,
        SUM(ur.quantity),
        10, -- TODO: Get from plan metering
        SUM(ur.quantity) * 10
    FROM usage_records ur
    WHERE ur.subscription_id = p_subscription_id
      AND ur.recorded_at >= COALESCE(p_period_start, v_subscription.current_period_start)
      AND ur.recorded_at < COALESCE(p_period_end, v_subscription.current_period_end)
      AND ur.billed_at IS NULL
    GROUP BY ur.metric_name;
    
    -- Mark usage as billed
    UPDATE usage_records SET billed_at = CURRENT_TIMESTAMP
    WHERE subscription_id = p_subscription_id
      AND recorded_at >= COALESCE(p_period_start, v_subscription.current_period_start)
      AND recorded_at < COALESCE(p_period_end, v_subscription.current_period_end)
      AND billed_at IS NULL;
    
    -- Recalculate totals
    UPDATE invoices SET
        subtotal_cents = (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_line_items WHERE invoice_id = v_invoice_id),
        total_cents = (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_line_items WHERE invoice_id = v_invoice_id) + tax_cents,
        amount_due_cents = (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_line_items WHERE invoice_id = v_invoice_id) + tax_cents
    WHERE id = v_invoice_id;
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AI AGENT PROCEDURES
-- ============================================================================

-- Execute agent
CREATE OR REPLACE FUNCTION execute_agent(
    p_agent_id UUID,
    p_tenant_id UUID,
    p_user_id UUID,
    p_input JSONB,
    p_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_execution_id UUID;
    v_agent RECORD;
BEGIN
    -- Get agent
    SELECT * INTO v_agent FROM ai_agents WHERE id = p_agent_id AND status = 'active';
    
    IF v_agent.id IS NULL THEN
        RAISE EXCEPTION 'Agent not found or inactive';
    END IF;
    
    -- Create execution record
    INSERT INTO agent_executions (
        agent_id, tenant_id, user_id, product, input, context, status
    ) VALUES (
        p_agent_id, p_tenant_id, p_user_id, v_agent.product, p_input, 
        COALESCE(p_context, '{}'), 'queued'
    )
    RETURNING id INTO v_execution_id;
    
    -- Increment execution count
    UPDATE ai_agents SET 
        execution_count = execution_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_agent_id;
    
    RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql;

-- Complete agent execution
CREATE OR REPLACE FUNCTION complete_agent_execution(
    p_execution_id UUID,
    p_output JSONB,
    p_tokens_used INTEGER DEFAULT 0,
    p_cost_cents INTEGER DEFAULT 0,
    p_success BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_execution RECORD;
    v_duration_ms INTEGER;
BEGIN
    -- Get execution
    SELECT * INTO v_execution FROM agent_executions WHERE id = p_execution_id;
    
    IF v_execution.id IS NULL THEN
        RAISE EXCEPTION 'Execution not found';
    END IF;
    
    -- Calculate duration
    v_duration_ms := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_execution.started_at)) * 1000;
    
    -- Update execution
    UPDATE agent_executions SET
        status = CASE WHEN p_success THEN 'completed'::agent_execution_status ELSE 'failed'::agent_execution_status END,
        output = p_output,
        completed_at = CURRENT_TIMESTAMP,
        tokens_used = p_tokens_used,
        cost_cents = p_cost_cents,
        execution_time_ms = v_duration_ms,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_execution_id;
    
    -- Update agent stats
    UPDATE ai_agents SET
        success_rate = (
            SELECT ROUND(COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
                         NULLIF(COUNT(*), 0) * 100, 2)
            FROM agent_executions 
            WHERE agent_id = v_execution.agent_id
        ),
        avg_execution_time_ms = (
            SELECT AVG(execution_time_ms)
            FROM agent_executions
            WHERE agent_id = v_execution.agent_id AND status = 'completed'
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_execution.agent_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DOCUMENT PROCESSING PROCEDURES
-- ============================================================================

-- Process document
CREATE OR REPLACE FUNCTION process_document(
    p_document_id UUID,
    p_processor TEXT DEFAULT 'cyloid'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_document RECORD;
BEGIN
    -- Get document
    SELECT * INTO v_document FROM documents WHERE id = p_document_id;
    
    IF v_document.id IS NULL THEN
        RAISE EXCEPTION 'Document not found';
    END IF;
    
    -- Update status
    UPDATE documents SET
        status = 'processing',
        processing_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_document_id;
    
    -- Create Cyloid processing job if using Cyloid
    IF p_processor = 'cyloid' THEN
        INSERT INTO cyloid_processing_jobs (tenant_id, document_id, job_type, status, configuration)
        VALUES (v_document.tenant_id, p_document_id, 'full_extraction', 'pending', 
                jsonb_build_object('document_type', v_document.document_type));
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Complete document processing
CREATE OR REPLACE FUNCTION complete_document_processing(
    p_document_id UUID,
    p_extracted_data JSONB,
    p_confidence DECIMAL,
    p_page_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update document
    UPDATE documents SET
        status = 'processed',
        processing_completed_at = CURRENT_TIMESTAMP,
        page_count = p_page_count,
        extraction_confidence = p_confidence,
        extracted_data = p_extracted_data,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_document_id;
    
    -- Insert extracted data record
    INSERT INTO extracted_data (document_id, extraction_type, data, confidence_score)
    VALUES (p_document_id, 'full', p_extracted_data, p_confidence);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MAINTENANCE PROCEDURES
-- ============================================================================

-- Create partition for table
CREATE OR REPLACE FUNCTION create_partition_if_not_exists(
    p_table_name TEXT,
    p_partition_key TIMESTAMP WITH TIME ZONE,
    p_interval TEXT DEFAULT 'month'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_sql TEXT;
BEGIN
    -- Calculate partition bounds
    IF p_interval = 'month' THEN
        v_start_date := date_trunc('month', p_partition_key)::DATE;
        v_end_date := (v_start_date + INTERVAL '1 month')::DATE;
        v_partition_name := p_table_name || '_' || TO_CHAR(v_start_date, 'YYYY_MM');
    ELSIF p_interval = 'quarter' THEN
        v_start_date := date_trunc('quarter', p_partition_key)::DATE;
        v_end_date := (v_start_date + INTERVAL '3 months')::DATE;
        v_partition_name := p_table_name || '_' || TO_CHAR(v_start_date, 'YYYY') || '_Q' || 
                           TO_CHAR(v_start_date, 'Q');
    ELSE
        v_start_date := date_trunc('year', p_partition_key)::DATE;
        v_end_date := (v_start_date + INTERVAL '1 year')::DATE;
        v_partition_name := p_table_name || '_' || TO_CHAR(v_start_date, 'YYYY');
    END IF;
    
    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = v_partition_name
    ) THEN
        -- Create partition
        v_sql := format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            v_partition_name, p_table_name, v_start_date, v_end_date
        );
        EXECUTE v_sql;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE (
    table_name TEXT,
    rows_deleted BIGINT
) AS $$
DECLARE
    v_cutoff TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;
BEGIN
    -- Clean up old sessions
    DELETE FROM user_sessions 
    WHERE expires_at < v_cutoff 
       OR (is_active = FALSE AND updated_at < v_cutoff);
    table_name := 'user_sessions';
    rows_deleted := ROW_COUNT;
    RETURN NEXT;
    
    -- Clean up old notifications
    DELETE FROM notifications 
    WHERE is_read = TRUE AND created_at < v_cutoff;
    table_name := 'notifications';
    rows_deleted := ROW_COUNT;
    RETURN NEXT;
    
    -- Clean up old webhook deliveries
    DELETE FROM webhook_deliveries 
    WHERE created_at < v_cutoff AND status != 'pending';
    table_name := 'webhook_deliveries';
    rows_deleted := ROW_COUNT;
    RETURN NEXT;
    
    -- Clean up old job runs
    DELETE FROM scheduled_job_runs 
    WHERE started_at < v_cutoff;
    table_name := 'scheduled_job_runs';
    rows_deleted := ROW_COUNT;
    RETURN NEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANALYTICS PROCEDURES
-- ============================================================================

-- Track page view
CREATE OR REPLACE FUNCTION track_page_view(
    p_page_id UUID,
    p_session_id TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_view_id UUID;
BEGIN
    INSERT INTO page_views (
        page_id, session_id, user_id, referrer, user_agent,
        ip_address, country, device_type
    ) VALUES (
        p_page_id, p_session_id, p_user_id, p_referrer, p_user_agent,
        p_ip_address, p_country, p_device_type
    )
    RETURNING id INTO v_view_id;
    
    -- Update page stats
    UPDATE seo_pages SET
        views = views + 1,
        last_viewed_at = CURRENT_TIMESTAMP
    WHERE id = p_page_id;
    
    RETURN v_view_id;
END;
$$ LANGUAGE plpgsql;

-- Track analytics event
CREATE OR REPLACE FUNCTION track_event(
    p_tenant_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_event_name TEXT,
    p_event_category TEXT DEFAULT 'general',
    p_properties JSONB DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO analytics_events (
        tenant_id, user_id, event_name, event_category,
        properties, session_id
    ) VALUES (
        p_tenant_id, p_user_id, p_event_name, p_event_category,
        COALESCE(p_properties, '{}'), p_session_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSENT & COMPLIANCE PROCEDURES
-- ============================================================================

-- Record consent
CREATE OR REPLACE FUNCTION record_consent(
    p_user_id UUID,
    p_tenant_id UUID,
    p_consent_type consent_type,
    p_granted BOOLEAN,
    p_source TEXT DEFAULT 'web',
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_consent_id UUID;
BEGIN
    -- Expire existing consent of same type
    UPDATE consent_records SET
        expires_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
      AND tenant_id = p_tenant_id
      AND consent_type = p_consent_type
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    -- Record new consent
    INSERT INTO consent_records (
        user_id, tenant_id, consent_type, granted, version,
        source, ip_address
    ) VALUES (
        p_user_id, p_tenant_id, p_consent_type, p_granted, '1.0',
        p_source, p_ip_address
    )
    RETURNING id INTO v_consent_id;
    
    -- Log the action
    INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, changes)
    VALUES (p_tenant_id, p_user_id, 'create', 'consent_records', v_consent_id,
            jsonb_build_object('consent_type', p_consent_type, 'granted', p_granted));
    
    RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql;

-- Handle data subject request (GDPR)
CREATE OR REPLACE FUNCTION create_data_subject_request(
    p_user_id UUID,
    p_request_type TEXT, -- 'access', 'rectification', 'erasure', 'portability', 'restriction'
    p_details TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    INSERT INTO data_subject_requests (
        user_id, request_type, status, details, 
        due_date
    ) VALUES (
        p_user_id, p_request_type, 'pending', p_details,
        CURRENT_TIMESTAMP + INTERVAL '30 days' -- GDPR requires response within 30 days
    )
    RETURNING id INTO v_request_id;
    
    -- Create notification for data protection officer
    INSERT INTO notifications (
        tenant_id, user_id, channel, notification_type,
        title, body, priority
    )
    SELECT DISTINCT 
        tm.tenant_id,
        NULL,
        'email',
        'data_subject_request',
        'New Data Subject Request',
        'A new ' || p_request_type || ' request has been submitted.',
        'high'
    FROM tenant_memberships tm
    WHERE tm.user_id = p_user_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;
