-- ============================================================================
-- ENTERPRISE SECURITY TABLES
-- Migration for Fortress Security System
-- ============================================================================

-- Encryption Keys Table (for HSM-wrapped DEKs)
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    period VARCHAR(20) NOT NULL UNIQUE,
    wrapped_key TEXT NOT NULL,
    key_version VARCHAR(10) DEFAULT 'v1',
    algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_by VARCHAR(100),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_period ON encryption_keys(period);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active) WHERE is_active = TRUE;

-- Security Audit Log (SIEM)
CREATE TABLE IF NOT EXISTS security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source_ip VARCHAR(45),
    user_id VARCHAR(100),
    tenant_id VARCHAR(100),
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    status_code INTEGER,
    duration_ms INTEGER,
    details JSONB,
    fingerprint VARCHAR(64),
    geo_country VARCHAR(2),
    geo_city VARCHAR(100),
    geo_org VARCHAR(200),
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_reasons TEXT[],
    
    -- Performance indexes
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_source_ip ON security_audit_log(source_ip);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON security_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_audit_anomaly ON security_audit_log(is_anomaly) WHERE is_anomaly = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_geo ON security_audit_log(geo_country);

-- Honeypot Triggers (evidence collection)
CREATE TABLE IF NOT EXISTS honeypot_triggers (
    id SERIAL PRIMARY KEY,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    honeypot_type VARCHAR(50) NOT NULL,
    attempted_credential VARCHAR(200),
    source_ip VARCHAR(45),
    user_agent TEXT,
    headers JSONB,
    request_path VARCHAR(500),
    request_body JSONB,
    geo_country VARCHAR(2),
    geo_city VARCHAR(100),
    geo_org VARCHAR(200),
    
    -- Evidence preservation
    raw_request TEXT,
    evidence_hash VARCHAR(64),
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_honeypot_time ON honeypot_triggers(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_honeypot_ip ON honeypot_triggers(source_ip);
CREATE INDEX IF NOT EXISTS idx_honeypot_reviewed ON honeypot_triggers(is_reviewed) WHERE is_reviewed = FALSE;

-- Canary Triggers (data exfiltration detection)
CREATE TABLE IF NOT EXISTS canary_triggers (
    id SERIAL PRIMARY KEY,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    canary_type VARCHAR(50) NOT NULL,
    pattern_matched VARCHAR(100),
    query_executed TEXT,
    query_params JSONB,
    source_ip VARCHAR(45),
    user_id VARCHAR(100),
    tenant_id VARCHAR(100),
    data_snippet TEXT,
    
    -- Evidence
    evidence_hash VARCHAR(64),
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_canary_time ON canary_triggers(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_canary_user ON canary_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_canary_reviewed ON canary_triggers(is_reviewed) WHERE is_reviewed = FALSE;

-- Geographic Anomalies
CREATE TABLE IF NOT EXISTS geo_anomalies (
    id SERIAL PRIMARY KEY,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    user_id VARCHAR(100) NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    
    -- From location
    from_ip VARCHAR(45),
    from_country VARCHAR(2),
    from_city VARCHAR(100),
    from_lat DECIMAL(10, 7),
    from_lon DECIMAL(10, 7),
    from_timestamp TIMESTAMPTZ,
    
    -- To location  
    to_ip VARCHAR(45),
    to_country VARCHAR(2),
    to_city VARCHAR(100),
    to_lat DECIMAL(10, 7),
    to_lon DECIMAL(10, 7),
    
    -- Analysis
    distance_km INTEGER,
    time_diff_hours DECIMAL(10, 2),
    travel_speed_kmh DECIMAL(10, 2),
    
    -- Response
    was_blocked BOOLEAN DEFAULT FALSE,
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_legitimate BOOLEAN,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_geo_anomaly_time ON geo_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_anomaly_user ON geo_anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_anomaly_type ON geo_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_geo_anomaly_reviewed ON geo_anomalies(is_reviewed) WHERE is_reviewed = FALSE;

-- Known User Locations (for faster geo checks)
CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    country VARCHAR(2),
    city VARCHAR(100),
    lat DECIMAL(10, 7),
    lon DECIMAL(10, 7),
    org VARCHAR(200),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    login_count INTEGER DEFAULT 1,
    is_trusted BOOLEAN DEFAULT FALSE,
    
    UNIQUE(user_id, ip)
);

CREATE INDEX IF NOT EXISTS idx_user_location_user ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_last ON user_locations(last_seen DESC);

-- Red Team Test Results
CREATE TABLE IF NOT EXISTS red_team_results (
    id SERIAL PRIMARY KEY,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    test_name VARCHAR(100) NOT NULL,
    passed BOOLEAN NOT NULL,
    details JSONB,
    error_message TEXT,
    duration_ms INTEGER,
    
    -- Run metadata
    run_id VARCHAR(36),
    environment VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_redteam_time ON red_team_results(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_redteam_failed ON red_team_results(passed) WHERE passed = FALSE;

-- Canary Data (plant these in your main tables)
-- ============================================================================
-- IMPORTANT: Run these AFTER your main tables exist
-- ============================================================================

-- Example: Plant canary customer (adjust table name as needed)
-- INSERT INTO customers (id, name, email, is_canary)
-- VALUES ('cust_CANARY_7742', 'John Wick Holdings LLC', 'j.wick@continental.fake', true)
-- ON CONFLICT DO NOTHING;

-- Dead Man's Switch Status
CREATE TABLE IF NOT EXISTS dead_mans_switch (
    id SERIAL PRIMARY KEY,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    heartbeat_by VARCHAR(100),
    heartbeat_ip VARCHAR(45),
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    trigger_reason TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

-- Initialize with a single row
INSERT INTO dead_mans_switch (last_heartbeat, heartbeat_by) 
VALUES (NOW(), 'SYSTEM_INIT')
ON CONFLICT DO NOTHING;

-- Key Recovery Shares (encrypted storage for emergency recovery)
CREATE TABLE IF NOT EXISTS key_recovery_shares (
    id SERIAL PRIMARY KEY,
    share_index INTEGER NOT NULL,
    custodian VARCHAR(100) NOT NULL,
    share_checksum VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Shares are stored ENCRYPTED or in HSM
    -- This table only tracks metadata
    share_location TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    last_verified TIMESTAMPTZ,
    
    UNIQUE(share_index)
);

-- ============================================================================
-- GRANTS (adjust role name as needed)
-- ============================================================================

-- GRANT SELECT, INSERT ON security_audit_log TO finaceverse_app;
-- GRANT SELECT, INSERT ON honeypot_triggers TO finaceverse_app;
-- GRANT SELECT, INSERT ON canary_triggers TO finaceverse_app;
-- GRANT SELECT, INSERT ON geo_anomalies TO finaceverse_app;
-- GRANT SELECT, INSERT, UPDATE ON user_locations TO finaceverse_app;
-- GRANT SELECT, INSERT ON red_team_results TO finaceverse_app;
-- GRANT SELECT, INSERT, UPDATE ON encryption_keys TO finaceverse_app;
-- GRANT SELECT, UPDATE ON dead_mans_switch TO finaceverse_app;

-- ============================================================================
-- CLEANUP OLD DATA (run periodically)
-- ============================================================================

-- Delete audit logs older than 90 days
-- DELETE FROM security_audit_log WHERE timestamp < NOW() - INTERVAL '90 days';

-- Delete user locations not seen in 180 days
-- DELETE FROM user_locations WHERE last_seen < NOW() - INTERVAL '180 days';
