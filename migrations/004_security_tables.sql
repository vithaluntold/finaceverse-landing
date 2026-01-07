-- MILITARY-GRADE SECURITY TABLES
-- Run this migration to add security-related tables

-- ============================================================================
-- AUDIT LOG TABLE - Tracks all security events
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,  -- LOGIN, LOGOUT, ACCESS_DENIED, CSRF_VIOLATION, etc.
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tenant_id VARCHAR(50) DEFAULT 'platform',
    ip_address INET,
    user_agent TEXT,
    resource VARCHAR(500),  -- Endpoint or resource accessed
    status VARCHAR(20) DEFAULT 'success',  -- success, failed, blocked
    metadata JSONB DEFAULT '{}',  -- Additional context
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON security_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON security_audit_log(ip_address);

-- ============================================================================
-- TENANT CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,  -- cyloid, vamn, accute, etc.
    status VARCHAR(20) DEFAULT 'active',
    config JSONB DEFAULT '{}',  -- Tenant-specific configuration
    encryption_key_id VARCHAR(100),  -- Reference to key management system
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tenants for 7 modules
INSERT INTO tenants (id, name, module, status) VALUES
    ('platform', 'FinACEverse Platform', 'platform', 'active'),
    ('cyloid', 'Cyloid', 'cyloid', 'active'),
    ('vamn', 'VAMN', 'vamn', 'active'),
    ('accute', 'Accute', 'accute', 'active'),
    ('luca-ai', 'Luca AI', 'luca-ai', 'active'),
    ('finaid-hub', 'Finaid Hub', 'finaid-hub', 'active'),
    ('finory', 'Finory', 'finory', 'active'),
    ('epi-q', 'EPI-Q', 'epi-q', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADD TENANT_ID TO EXISTING TABLES (Multi-tenant isolation)
-- ============================================================================

-- Add tenant_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform' REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Add tenant_id to visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_visits_tenant ON visits(tenant_id);

-- Add tenant_id to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);

-- Add tenant_id to performance_metrics
ALTER TABLE performance_metrics ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_performance_tenant ON performance_metrics(tenant_id);

-- Add tenant_id to errors
ALTER TABLE errors ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_errors_tenant ON errors(tenant_id);

-- Add tenant_id to experiments
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_experiments_tenant ON experiments(tenant_id);

-- Add tenant_id to SEO tables
ALTER TABLE target_keywords ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_keywords_tenant ON target_keywords(tenant_id);

ALTER TABLE content_analysis ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_content_analysis_tenant ON content_analysis(tenant_id);

ALTER TABLE seo_issues ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_seo_issues_tenant ON seo_issues(tenant_id);

ALTER TABLE local_seo_presence ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_local_seo_tenant ON local_seo_presence(tenant_id);

ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_city_pages_tenant ON city_pages(tenant_id);

-- ============================================================================
-- REFRESH TOKEN TABLE (for JWT rotation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash of token
    device_fingerprint VARCHAR(64),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- API KEYS TABLE (for service-to-service auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL,  -- First 8 chars for identification
    key_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash of full key
    permissions JSONB DEFAULT '[]',  -- Array of allowed permissions
    rate_limit INTEGER DEFAULT 100,  -- Requests per minute
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_apikey_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apikey_prefix ON api_keys(key_prefix);

-- ============================================================================
-- BLOCKED IPS TABLE (for IP reputation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reason VARCHAR(255),
    blocked_by INTEGER REFERENCES users(id),
    blocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,  -- NULL = permanent
    hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_blocked_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_expires ON blocked_ips(expires_at);

-- ============================================================================
-- ENCRYPTED FIELDS TABLE (tracking which fields are encrypted)
-- ============================================================================
CREATE TABLE IF NOT EXISTS encrypted_fields_registry (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    encryption_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, column_name)
);

-- Register encrypted fields
INSERT INTO encrypted_fields_registry (table_name, column_name) VALUES
    ('users', 'email'),
    ('users', 'phone'),
    ('api_keys', 'key_hash'),
    ('refresh_tokens', 'token_hash')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (PostgreSQL RLS)
-- ============================================================================

-- Enable RLS on key tables
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy function
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN COALESCE(current_setting('app.tenant_id', true), 'platform');
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policy: Users can only see data from their tenant
CREATE POLICY tenant_isolation_visits ON visits
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_events ON events
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_performance ON performance_metrics
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_experiments ON experiments
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- ============================================================================
-- SECURITY MONITORING VIEWS
-- ============================================================================

-- View: Recent security events
CREATE OR REPLACE VIEW v_recent_security_events AS
SELECT 
    action,
    user_id,
    tenant_id,
    ip_address,
    status,
    created_at,
    metadata->>'reason' as reason
FROM security_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- View: Failed login attempts
CREATE OR REPLACE VIEW v_failed_logins AS
SELECT 
    ip_address,
    COUNT(*) as attempt_count,
    MAX(created_at) as last_attempt,
    array_agg(DISTINCT metadata->>'username') as usernames_tried
FROM security_audit_log
WHERE action = 'LOGIN_FAILED'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 3
ORDER BY attempt_count DESC;

-- View: Suspicious activity
CREATE OR REPLACE VIEW v_suspicious_activity AS
SELECT 
    ip_address,
    array_agg(DISTINCT action) as actions,
    COUNT(*) as event_count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM security_audit_log
WHERE action IN ('CSRF_VIOLATION', 'SSRF_BLOCKED', 'ACCESS_DENIED', 'RATE_LIMITED')
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY event_count DESC;

-- ============================================================================
-- CLEANUP JOBS
-- ============================================================================

-- Function to clean up old audit logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
BEGIN
    DELETE FROM security_audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
    
    DELETE FROM blocked_ips 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO PUBLIC;
