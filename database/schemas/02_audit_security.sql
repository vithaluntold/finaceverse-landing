-- ============================================================================
-- AUDIT, COMPLIANCE & SECURITY SCHEMA
-- ============================================================================
-- SOC 2, GDPR, HIPAA-ready audit infrastructure
-- 121 security layers foundation
-- Comprehensive logging and compliance tracking
-- ============================================================================

-- ============================================================================
-- AUDIT LOGS (Partitioned by month for scale)
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Context
    tenant_id UUID,
    user_id UUID,
    session_id UUID,
    api_key_id UUID,
    
    -- Event
    action audit_action NOT NULL,
    table_name TEXT,
    record_id UUID,
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    
    -- Metadata
    product product_type,
    module TEXT,
    function_name TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    correlation_id TEXT,
    
    -- Classification
    security_classification security_classification DEFAULT 'internal',
    is_sensitive BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions (automated via pg_partman in production)
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE audit_logs_2024_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE audit_logs_2024_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE audit_logs_2024_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE audit_logs_2024_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE audit_logs_2024_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE audit_logs_2024_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE audit_logs_2024_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE audit_logs_2024_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE audit_logs_2024_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- 2025 partitions
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE audit_logs_2025_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE audit_logs_2025_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE audit_logs_2025_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE audit_logs_2025_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE audit_logs_2025_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE audit_logs_2025_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE audit_logs_2025_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 2026 partitions
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- ============================================================================
-- SECURITY EVENTS (SIEM Integration)
-- ============================================================================
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- Event classification
    event_type TEXT NOT NULL,               -- 'login_failure', 'brute_force', 'anomaly', etc.
    severity TEXT NOT NULL,                 -- 'critical', 'high', 'medium', 'low', 'info'
    category TEXT NOT NULL,                 -- 'authentication', 'authorization', 'data_access', etc.
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    raw_event JSONB,
    
    -- Source
    source_ip INET,
    source_country TEXT,
    source_asn TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    
    -- Target
    target_resource TEXT,
    target_action TEXT,
    
    -- Threat intelligence
    threat_score INTEGER,                   -- 0-100
    threat_indicators JSONB,
    ioc_matches TEXT[],                     -- Indicator of Compromise matches
    
    -- Response
    action_taken TEXT,                      -- 'blocked', 'allowed', 'flagged', 'quarantined'
    automated_response BOOLEAN DEFAULT FALSE,
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Correlation
    correlation_id TEXT,
    related_events UUID[],
    
    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECURITY RULES & POLICIES
-- ============================================================================
CREATE TABLE security_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),  -- NULL = platform-wide
    
    -- Rule definition
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,                 -- 'waf', 'rate_limit', 'access_control', etc.
    
    -- Conditions (JSON-based DSL)
    conditions JSONB NOT NULL,
    
    -- Actions
    action TEXT NOT NULL,                   -- 'block', 'allow', 'challenge', 'log', 'alert'
    action_params JSONB DEFAULT '{}',
    
    -- Priority (lower = higher priority)
    priority INTEGER DEFAULT 100,
    
    -- Status
    is_enabled BOOLEAN DEFAULT TRUE,
    is_system_rule BOOLEAN DEFAULT FALSE,
    
    -- Effectiveness tracking
    trigger_count BIGINT DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- IP-based access control
CREATE TABLE ip_access_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Rule
    list_type TEXT NOT NULL,                -- 'whitelist', 'blacklist'
    ip_range INET NOT NULL,
    
    -- Metadata
    description TEXT,
    source TEXT,                            -- 'manual', 'auto_blocked', 'threat_intel'
    
    -- Validity
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Rate limiting configuration
CREATE TABLE rate_limit_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Scope
    resource_pattern TEXT NOT NULL,         -- '/api/v1/*', '/auth/*'
    
    -- Limits
    requests_per_second INTEGER,
    requests_per_minute INTEGER,
    requests_per_hour INTEGER,
    requests_per_day INTEGER,
    
    -- Burst
    burst_size INTEGER DEFAULT 10,
    
    -- Response
    exceeded_response_code INTEGER DEFAULT 429,
    exceeded_message TEXT DEFAULT 'Rate limit exceeded',
    
    -- Exemptions
    exempt_roles TEXT[],
    exempt_api_keys UUID[],
    
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMPLIANCE FRAMEWORKS
-- ============================================================================
CREATE TABLE compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    code TEXT UNIQUE NOT NULL,              -- 'soc2', 'gdpr', 'hipaa', 'pci_dss'
    name TEXT NOT NULL,
    description TEXT,
    version TEXT,
    
    -- Structure
    requirements JSONB,                     -- Hierarchical requirements
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Compliance controls
CREATE TABLE compliance_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
    
    -- Control info
    control_id TEXT NOT NULL,               -- e.g., 'CC6.1', 'HIPAA.164.312(a)'
    title TEXT NOT NULL,
    description TEXT,
    
    -- Classification
    category TEXT,
    subcategory TEXT,
    control_type TEXT,                      -- 'preventive', 'detective', 'corrective'
    
    -- Implementation
    implementation_guidance TEXT,
    evidence_requirements TEXT[],
    
    -- Frequency
    testing_frequency TEXT,                 -- 'continuous', 'quarterly', 'annual'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(framework_id, control_id)
);

-- Tenant compliance status
CREATE TABLE tenant_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
    
    -- Status
    status TEXT DEFAULT 'not_started',      -- 'not_started', 'in_progress', 'compliant', 'non_compliant'
    compliance_score INTEGER,               -- 0-100
    
    -- Dates
    assessment_date TIMESTAMPTZ,
    next_assessment_date TIMESTAMPTZ,
    certification_date TIMESTAMPTZ,
    certification_expires_at TIMESTAMPTZ,
    
    -- Evidence
    evidence_location TEXT,
    auditor_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, framework_id)
);

-- Control evidence
CREATE TABLE compliance_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    control_id UUID NOT NULL REFERENCES compliance_controls(id),
    
    -- Evidence
    evidence_type TEXT NOT NULL,            -- 'document', 'screenshot', 'log', 'automated'
    title TEXT NOT NULL,
    description TEXT,
    
    -- Storage
    file_path TEXT,
    file_hash TEXT,
    
    -- Validity
    collected_at TIMESTAMPTZ NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    
    -- Verification
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DATA CLASSIFICATION & RETENTION
-- ============================================================================
CREATE TABLE data_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Classification
    table_name TEXT NOT NULL,
    column_name TEXT,
    
    classification security_classification NOT NULL,
    data_type TEXT,                         -- 'pii', 'phi', 'financial', 'credential'
    
    -- Retention
    retention_days INTEGER,
    retention_policy TEXT,
    
    -- Handling
    encryption_required BOOLEAN DEFAULT FALSE,
    masking_required BOOLEAN DEFAULT FALSE,
    masking_pattern TEXT,                   -- 'email', 'phone', 'ssn', 'credit_card'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, table_name, column_name)
);

-- Data retention jobs
CREATE TABLE retention_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Target
    table_name TEXT NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    
    -- Policy
    retention_days INTEGER NOT NULL,
    action TEXT NOT NULL,                   -- 'delete', 'archive', 'anonymize'
    
    -- Execution
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    records_processed BIGINT,
    next_run_at TIMESTAMPTZ,
    
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ENCRYPTION KEY MANAGEMENT
-- ============================================================================
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Key info
    key_id TEXT UNIQUE NOT NULL,
    key_type TEXT NOT NULL,                 -- 'master', 'data', 'transport'
    algorithm TEXT NOT NULL,                -- 'AES-256-GCM', 'RSA-4096'
    
    -- Key material (encrypted with master key)
    encrypted_key_material TEXT,
    key_version INTEGER DEFAULT 1,
    
    -- Status
    status TEXT DEFAULT 'active',           -- 'active', 'rotated', 'revoked', 'destroyed'
    
    -- Rotation
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMPTZ,
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    destroyed_at TIMESTAMPTZ,
    
    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT DEFAULT 0
);

-- Key rotation history
CREATE TABLE key_rotation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID NOT NULL REFERENCES encryption_keys(id),
    
    -- Rotation details
    old_version INTEGER NOT NULL,
    new_version INTEGER NOT NULL,
    rotation_reason TEXT,
    
    -- Re-encryption status
    records_to_reencrypt BIGINT,
    records_reencrypted BIGINT DEFAULT 0,
    reencryption_status TEXT DEFAULT 'pending',
    reencryption_completed_at TIMESTAMPTZ,
    
    rotated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    rotated_by UUID REFERENCES users(id)
);

-- ============================================================================
-- VULNERABILITY MANAGEMENT
-- ============================================================================
CREATE TABLE vulnerability_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Scan info
    scan_type TEXT NOT NULL,                -- 'infrastructure', 'application', 'dependency'
    target TEXT NOT NULL,
    
    -- Results
    status TEXT DEFAULT 'running',
    vulnerabilities_found INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    
    -- Report
    report_url TEXT,
    raw_results JSONB,
    
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES vulnerability_scans(id),
    
    -- Vulnerability info
    cve_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    cvss_score DECIMAL(3,1),
    
    -- Affected
    affected_component TEXT,
    affected_version TEXT,
    
    -- Remediation
    remediation TEXT,
    remediation_status TEXT DEFAULT 'open',
    fixed_in_version TEXT,
    
    -- Tracking
    discovered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Audit logs
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, timestamp DESC);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id, timestamp DESC);
CREATE INDEX idx_audit_logs_sensitive ON audit_logs(is_sensitive, timestamp DESC) WHERE is_sensitive = TRUE;

-- Security events
CREATE INDEX idx_security_events_tenant ON security_events(tenant_id, occurred_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, occurred_at DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type, occurred_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_review ON security_events(requires_review, reviewed_at) WHERE requires_review = TRUE;

-- IP access lists
CREATE INDEX idx_ip_access_tenant ON ip_access_lists(tenant_id);
CREATE INDEX idx_ip_access_range ON ip_access_lists USING GIST(ip_range inet_ops);

-- Compliance
CREATE INDEX idx_tenant_compliance_tenant ON tenant_compliance(tenant_id);
CREATE INDEX idx_tenant_compliance_status ON tenant_compliance(status);
CREATE INDEX idx_compliance_evidence_tenant ON compliance_evidence(tenant_id);
CREATE INDEX idx_compliance_evidence_control ON compliance_evidence(control_id);

-- Vulnerabilities
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(remediation_status);
CREATE INDEX idx_vulnerabilities_cve ON vulnerabilities(cve_id);
