-- FinACEverse Command Center - PostgreSQL Initialization
-- Creates databases for Phase 1 + Phase 2 services

-- ============================================
-- PHASE 1: Core Infrastructure
-- ============================================

-- Create Zitadel database and user
CREATE USER zitadel WITH PASSWORD 'Zitadel_Secure_2026!';
CREATE DATABASE zitadel OWNER zitadel;
GRANT ALL PRIVILEGES ON DATABASE zitadel TO zitadel;

-- Create Command Center database
CREATE DATABASE command_center OWNER finaceverse;

-- ============================================
-- PHASE 2: Billing (Lago)
-- ============================================

-- Create Lago database and user
CREATE USER lago WITH PASSWORD 'Lago_Secure_2026!';
CREATE DATABASE lago OWNER lago;
GRANT ALL PRIVILEGES ON DATABASE lago TO lago;

-- ============================================
-- PHASE 2: Support (Chatwoot)
-- ============================================

-- Create Chatwoot database and user
CREATE USER chatwoot WITH PASSWORD 'Chatwoot_Secure_2026!';
CREATE DATABASE chatwoot OWNER chatwoot;
GRANT ALL PRIVILEGES ON DATABASE chatwoot TO chatwoot;

-- Enable pgcrypto for Chatwoot
\c chatwoot
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Command Center Schema
-- ============================================

-- Connect to command_center and create schema
\c command_center

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit log table (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID NOT NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB
);

-- Create index for fast queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- Prevent updates/deletes on audit_logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Cannot modify or delete records.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Admin sessions table
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoke_reason VARCHAR(255)
);

CREATE INDEX idx_admin_sessions_user ON admin_sessions (user_id);
CREATE INDEX idx_admin_sessions_active ON admin_sessions (is_active, expires_at);

-- Command Center settings
CREATE TABLE settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('security.max_login_attempts', '5'),
    ('security.lockout_duration_minutes', '30'),
    ('security.session_timeout_minutes', '60'),
    ('security.require_2fa_for_admins', 'true'),
    ('notifications.email_enabled', 'true'),
    ('notifications.slack_enabled', 'false'),
    ('features.impersonation_enabled', 'true'),
    ('features.audit_log_retention_days', '365');

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all Command Center actions';
COMMENT ON TABLE admin_sessions IS 'Active admin session tracking';
COMMENT ON TABLE settings IS 'Command Center configuration settings';
