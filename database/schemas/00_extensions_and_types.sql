-- ============================================================================
-- FinACEverse Cognitive Operating System - Database Schema
-- Version: 1.0.0
-- Description: World's First Cognitive OS for Finance
-- Scale: Multi-million users across 8 products
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";           -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";            -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";             -- Trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";           -- GIN index support
CREATE EXTENSION IF NOT EXISTS "btree_gist";          -- GIST index support
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "hstore";              -- Key-value storage
CREATE EXTENSION IF NOT EXISTS "citext";              -- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "tablefunc";           -- Crosstab functions
CREATE EXTENSION IF NOT EXISTS "pg_partman";          -- Partition management

-- ============================================================================
-- CUSTOM TYPES - Core Enumerations
-- ============================================================================

-- Deployment modes
CREATE TYPE deployment_mode AS ENUM (
    'saas_cloud',           -- Multi-tenant SaaS
    'on_premise',           -- Self-hosted single tenant
    'hybrid_federated'      -- Federated learning between cloud and on-prem
);

-- Product identifiers
CREATE TYPE product_type AS ENUM (
    'vamn',                 -- Verifiable Arithmetic Multi-stream Network
    'accute',               -- AI-Native Practice Management
    'cyloid',               -- Deterministic Financial Document Intelligence
    'luca_ai',              -- Multi-Modal Tax Intelligence
    'finaid_hub',           -- Agent Factory & Marketplace
    'finory',               -- AI-Powered ERP
    'epiq',                 -- Task Mining + Process Mining
    'sumbuddy'              -- B2B/B2C Financial Marketplace
);

-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM (
    'free',
    'starter',
    'professional',
    'business',
    'enterprise',
    'unlimited'
);

-- Tenant types
CREATE TYPE tenant_type AS ENUM (
    'individual',
    'small_business',
    'mid_market',
    'enterprise',
    'government',
    'nonprofit',
    'educational'
);

-- User roles (platform-wide)
CREATE TYPE platform_role AS ENUM (
    'super_admin',
    'platform_admin',
    'support_admin',
    'security_admin',
    'billing_admin',
    'partner_admin',
    'developer',
    'auditor'
);

-- Consent types for GDPR/privacy
CREATE TYPE consent_type AS ENUM (
    'data_processing',
    'marketing',
    'analytics',
    'federated_learning',
    'cross_product_sharing',
    'third_party_sharing',
    'ai_training'
);

-- Consent status
CREATE TYPE consent_status AS ENUM (
    'granted',
    'denied',
    'withdrawn',
    'pending',
    'expired'
);

-- Audit action types
CREATE TYPE audit_action AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'import',
    'share',
    'consent_change',
    'permission_change',
    'configuration_change',
    'security_event'
);

-- Security classification
CREATE TYPE security_classification AS ENUM (
    'public',
    'internal',
    'confidential',
    'restricted',
    'top_secret'
);

-- AI Agent types
CREATE TYPE agent_type AS ENUM (
    'document_processor',
    'tax_advisor',
    'audit_assistant',
    'compliance_checker',
    'data_extractor',
    'reconciliation',
    'fraud_detector',
    'report_generator',
    'workflow_orchestrator',
    'chat_assistant',
    'custom'
);

-- Agent execution status
CREATE TYPE agent_execution_status AS ENUM (
    'queued',
    'running',
    'paused',
    'completed',
    'failed',
    'cancelled',
    'timeout'
);

-- Billing status
CREATE TYPE billing_status AS ENUM (
    'active',
    'past_due',
    'cancelled',
    'suspended',
    'trial',
    'grace_period'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'disputed',
    'cancelled'
);

-- Ticket status
CREATE TYPE ticket_status AS ENUM (
    'new',
    'open',
    'in_progress',
    'waiting_customer',
    'waiting_internal',
    'resolved',
    'closed',
    'reopened'
);

-- Ticket priority
CREATE TYPE ticket_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);

-- Feature flag status
CREATE TYPE feature_flag_status AS ENUM (
    'enabled',
    'disabled',
    'percentage_rollout',
    'user_targeting',
    'tenant_targeting'
);

-- Deployment environment
CREATE TYPE deploy_environment AS ENUM (
    'development',
    'staging',
    'production',
    'disaster_recovery'
);

-- SLA tier
CREATE TYPE sla_tier AS ENUM (
    'platinum',      -- 99.99% uptime, 15min response
    'gold',          -- 99.95% uptime, 1hr response
    'silver',        -- 99.9% uptime, 4hr response
    'bronze',        -- 99.5% uptime, 24hr response
    'basic'          -- 99% uptime, best effort
);

-- Integration status
CREATE TYPE integration_status AS ENUM (
    'connected',
    'disconnected',
    'error',
    'pending_auth',
    'rate_limited',
    'deprecated'
);

-- Federated learning status
CREATE TYPE federated_status AS ENUM (
    'opted_in',
    'opted_out',
    'contributing',
    'receiving_only',
    'suspended'
);

-- Document processing status
CREATE TYPE document_status AS ENUM (
    'uploaded',
    'queued',
    'processing',
    'extracted',
    'validated',
    'verified',
    'failed',
    'archived'
);

-- Workflow status
CREATE TYPE workflow_status AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'failed',
    'archived'
);

-- Communication channel
CREATE TYPE comm_channel AS ENUM (
    'email',
    'sms',
    'push',
    'in_app',
    'slack',
    'teams',
    'webhook',
    'voice'
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate short unique IDs (for user-facing references)
CREATE OR REPLACE FUNCTION generate_short_id(prefix TEXT DEFAULT '') 
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := prefix;
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    audit_row audit_logs;
    excluded_cols TEXT[] := ARRAY['created_at', 'updated_at'];
BEGIN
    audit_row.id := uuid_generate_v4();
    audit_row.table_name := TG_TABLE_NAME::TEXT;
    audit_row.action := LOWER(TG_OP)::audit_action;
    audit_row.timestamp := CURRENT_TIMESTAMP;
    
    IF TG_OP = 'DELETE' THEN
        audit_row.record_id := OLD.id;
        audit_row.old_values := to_jsonb(OLD);
        audit_row.new_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        audit_row.record_id := NEW.id;
        audit_row.old_values := to_jsonb(OLD);
        audit_row.new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        audit_row.record_id := NEW.id;
        audit_row.old_values := NULL;
        audit_row.new_values := to_jsonb(NEW);
    END IF;
    
    -- Get user context from session variable if set
    BEGIN
        audit_row.user_id := current_setting('app.current_user_id')::UUID;
        audit_row.tenant_id := current_setting('app.current_tenant_id')::UUID;
        audit_row.session_id := current_setting('app.current_session_id')::UUID;
        audit_row.ip_address := current_setting('app.client_ip')::INET;
    EXCEPTION WHEN OTHERS THEN
        -- Variables not set, leave as NULL
        NULL;
    END;
    
    INSERT INTO audit_logs VALUES (audit_row.*);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row-level security policy helper
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_resource TEXT,
    p_action TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
          AND p.resource = p_resource
          AND p.action = p_action
          AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
