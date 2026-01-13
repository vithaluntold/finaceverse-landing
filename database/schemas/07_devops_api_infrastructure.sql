-- ============================================================================
-- COMMAND CENTER: DEVOPS, API PORTAL & INFRASTRUCTURE
-- ============================================================================
-- Module 3: DevOps Center (module builder, feature flags, deployments)
-- Module 8: API & Developer Portal
-- Module 12: Infrastructure Control
-- ============================================================================

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identity
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Scope
    product product_type,
    
    -- Status
    status feature_flag_status DEFAULT 'disabled',
    
    -- Configuration
    percentage_rollout INTEGER,            -- 0-100 for gradual rollout
    
    -- Targeting rules
    targeting_rules JSONB DEFAULT '[]',    -- [{attribute, operator, value, percentage}]
    
    -- Default value
    default_value JSONB DEFAULT 'false',
    
    -- Variants (for A/B testing)
    variants JSONB DEFAULT '[]',           -- [{key, value, weight}]
    
    -- Tags
    tags TEXT[],
    
    -- Ownership
    owner_team TEXT,
    owner_user_id UUID REFERENCES users(id),
    
    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    stale_at TIMESTAMPTZ,                  -- When flag should be reviewed
    archived_at TIMESTAMPTZ
);

-- Feature flag overrides (per tenant/user)
CREATE TABLE feature_flag_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    
    -- Target
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- Override
    value JSONB NOT NULL,
    
    -- Reason
    reason TEXT,
    
    -- Validity
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    CHECK (tenant_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Feature flag evaluation history
CREATE TABLE feature_flag_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_id UUID NOT NULL,
    flag_key TEXT NOT NULL,
    
    tenant_id UUID,
    user_id UUID,
    
    -- Result
    value JSONB NOT NULL,
    reason TEXT,                           -- 'default', 'targeting', 'override', 'percentage'
    
    -- Context
    context JSONB,
    
    evaluated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================
CREATE TABLE deployment_environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    code deploy_environment NOT NULL,
    description TEXT,
    
    -- Configuration
    config JSONB DEFAULT '{}',
    
    -- Protection
    requires_approval BOOLEAN DEFAULT FALSE,
    required_approvers INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('DEP-'),
    
    -- Target
    environment_id UUID NOT NULL REFERENCES deployment_environments(id),
    
    -- What's being deployed
    service_name TEXT NOT NULL,
    version TEXT NOT NULL,
    commit_sha TEXT,
    
    -- Source
    source_type TEXT,                      -- 'github', 'gitlab', 'manual'
    source_ref TEXT,                       -- Branch/tag name
    source_url TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'in_progress', 'succeeded', 'failed', 'rolled_back'
    
    -- Progress
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Rollback
    previous_version TEXT,
    rollback_version TEXT,
    rolled_back_at TIMESTAMPTZ,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Initiator
    triggered_by UUID REFERENCES users(id),
    trigger_type TEXT,                     -- 'manual', 'ci', 'scheduled', 'rollback'
    
    -- Logs
    logs_url TEXT,
    
    -- Metrics
    duration_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Deployment steps
CREATE TABLE deployment_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    
    -- Step info
    name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Output
    output TEXT,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MODULE BUILDER (Custom Modules/Apps)
-- ============================================================================
CREATE TABLE custom_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('MOD-'),
    
    -- Ownership
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    
    -- Module identity
    name TEXT NOT NULL,
    slug CITEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    
    -- Type
    module_type TEXT NOT NULL,             -- 'data_model', 'workflow', 'report', 'integration'
    product product_type,
    
    -- Definition
    schema_definition JSONB NOT NULL,      -- Data model schema
    ui_definition JSONB,                   -- UI components
    workflow_definition JSONB,             -- Automation rules
    
    -- Permissions
    permissions_required TEXT[],
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'active', 'deprecated'
    
    -- Marketplace
    is_public BOOLEAN DEFAULT FALSE,
    marketplace_listing_id UUID,
    
    -- Metrics
    install_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, slug)
);

-- Custom module fields (for data model modules)
CREATE TABLE custom_module_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES custom_modules(id) ON DELETE CASCADE,
    
    -- Field definition
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,              -- 'text', 'number', 'date', 'lookup', 'formula', etc.
    
    -- Configuration
    is_required BOOLEAN DEFAULT FALSE,
    is_unique BOOLEAN DEFAULT FALSE,
    default_value JSONB,
    
    -- Validation
    validation_rules JSONB,
    
    -- Lookup
    lookup_module_id UUID REFERENCES custom_modules(id),
    lookup_field_name TEXT,
    
    -- Formula
    formula_expression TEXT,
    
    -- UI
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(module_id, field_name)
);

-- Custom module data (EAV pattern for flexibility)
CREATE TABLE custom_module_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES custom_modules(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Record data
    data JSONB NOT NULL DEFAULT '{}',
    
    -- Computed/formula fields cache
    computed_data JSONB DEFAULT '{}',
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- API & DEVELOPER PORTAL
-- ============================================================================
CREATE TABLE api_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    version TEXT UNIQUE NOT NULL,          -- 'v1', 'v2', 'v2.1'
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'active', 'deprecated', 'sunset'
    
    -- Dates
    released_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    sunset_at TIMESTAMPTZ,
    
    -- Documentation
    changelog TEXT,
    documentation_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_version_id UUID NOT NULL REFERENCES api_versions(id),
    
    -- Endpoint
    method TEXT NOT NULL,                  -- 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
    path TEXT NOT NULL,
    
    -- Description
    summary TEXT NOT NULL,
    description TEXT,
    
    -- Classification
    category TEXT,
    product product_type,
    
    -- Request
    request_schema JSONB,
    request_example JSONB,
    
    -- Response
    response_schema JSONB,
    response_example JSONB,
    
    -- Authentication
    auth_required BOOLEAN DEFAULT TRUE,
    scopes_required TEXT[],
    
    -- Rate limiting
    rate_limit_per_minute INTEGER,
    
    -- Status
    is_deprecated BOOLEAN DEFAULT FALSE,
    deprecated_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(api_version_id, method, path)
);

-- Webhook configurations
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Configuration
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    
    -- Events
    events TEXT[] NOT NULL,                -- ['invoice.created', 'document.processed']
    
    -- Security
    secret TEXT NOT NULL,                  -- For signature verification
    
    -- Headers
    custom_headers JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Retry configuration
    max_retries INTEGER DEFAULT 5,
    retry_delay_seconds INTEGER DEFAULT 60,
    
    -- Metrics
    total_deliveries BIGINT DEFAULT 0,
    successful_deliveries BIGINT DEFAULT 0,
    failed_deliveries BIGINT DEFAULT 0,
    last_delivery_at TIMESTAMPTZ,
    last_delivery_status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Webhook deliveries
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    
    -- Event
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL,
    
    -- Request
    request_url TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB NOT NULL,
    
    -- Response
    response_status_code INTEGER,
    response_headers JSONB,
    response_body TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'success', 'failed', 'retrying'
    
    -- Retry
    attempt_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    
    -- Timing
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Error
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INFRASTRUCTURE CONTROL
-- ============================================================================
CREATE TABLE infrastructure_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    code TEXT UNIQUE NOT NULL,             -- 'us-east-1', 'eu-west-1'
    name TEXT NOT NULL,
    provider TEXT NOT NULL,                -- 'aws', 'gcp', 'azure', 'on_prem'
    
    -- Location
    country TEXT,
    city TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Capabilities
    capabilities TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE infrastructure_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identity
    resource_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,           -- 'instance', 'database', 'storage', 'load_balancer'
    resource_name TEXT,
    
    -- Location
    region_id UUID REFERENCES infrastructure_regions(id),
    availability_zone TEXT,
    
    -- Tenant (for dedicated resources)
    tenant_id UUID REFERENCES tenants(id),
    
    -- Specification
    specs JSONB,                           -- CPU, memory, storage, etc.
    
    -- Status
    status TEXT DEFAULT 'running',         -- 'running', 'stopped', 'terminated', 'error'
    
    -- Costs
    hourly_cost_cents INTEGER,
    monthly_cost_cents INTEGER,
    
    -- Metadata
    tags JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_health_check TIMESTAMPTZ
);

-- Scheduled maintenance
CREATE TABLE maintenance_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    title TEXT NOT NULL,
    description TEXT,
    
    -- Scope
    affected_regions TEXT[],
    affected_services TEXT[],
    affected_products product_type[],
    
    -- Schedule
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    
    -- Actual
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'scheduled',       -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    
    -- Impact
    expected_impact TEXT,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- SCHEDULED JOBS
-- ============================================================================
CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job identity
    name TEXT NOT NULL,
    description TEXT,
    
    -- Scope
    tenant_id UUID REFERENCES tenants(id), -- NULL = system job
    product product_type,
    
    -- Schedule
    schedule_type TEXT NOT NULL,           -- 'cron', 'interval', 'one_time'
    cron_expression TEXT,
    interval_seconds INTEGER,
    next_run_at TIMESTAMPTZ,
    
    -- Job configuration
    job_type TEXT NOT NULL,                -- 'report', 'cleanup', 'sync', 'export', etc.
    job_config JSONB NOT NULL,
    
    -- Timeout
    timeout_seconds INTEGER DEFAULT 3600,
    
    -- Status
    is_enabled BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    last_run_duration_ms INTEGER,
    
    -- Failure handling
    consecutive_failures INTEGER DEFAULT 0,
    max_consecutive_failures INTEGER DEFAULT 3,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scheduled_job_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT DEFAULT 'running',         -- 'running', 'completed', 'failed', 'cancelled'
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Output
    output JSONB,
    error_message TEXT,
    
    -- Metrics
    records_processed INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Feature flags
CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_product ON feature_flags(product);
CREATE INDEX idx_feature_flags_status ON feature_flags(status);
CREATE INDEX idx_feature_flags_tags ON feature_flags USING GIN(tags);
CREATE INDEX idx_flag_overrides_flag ON feature_flag_overrides(flag_id);
CREATE INDEX idx_flag_overrides_tenant ON feature_flag_overrides(tenant_id);
CREATE INDEX idx_flag_overrides_user ON feature_flag_overrides(user_id);

-- Deployments
CREATE INDEX idx_deployments_env ON deployments(environment_id);
CREATE INDEX idx_deployments_service ON deployments(service_name);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_created ON deployments(created_at DESC);

-- Custom modules
CREATE INDEX idx_modules_tenant ON custom_modules(tenant_id);
CREATE INDEX idx_modules_type ON custom_modules(module_type);
CREATE INDEX idx_modules_status ON custom_modules(status);
CREATE INDEX idx_module_records_module ON custom_module_records(module_id);
CREATE INDEX idx_module_records_tenant ON custom_module_records(tenant_id);
CREATE INDEX idx_module_records_data ON custom_module_records USING GIN(data);

-- Webhooks
CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';

-- Infrastructure
CREATE INDEX idx_infra_resources_type ON infrastructure_resources(resource_type);
CREATE INDEX idx_infra_resources_region ON infrastructure_resources(region_id);
CREATE INDEX idx_infra_resources_tenant ON infrastructure_resources(tenant_id);
CREATE INDEX idx_infra_resources_status ON infrastructure_resources(status);

-- Scheduled jobs
CREATE INDEX idx_scheduled_jobs_tenant ON scheduled_jobs(tenant_id);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at) WHERE is_enabled = TRUE;
CREATE INDEX idx_job_runs_job ON scheduled_job_runs(job_id);
CREATE INDEX idx_job_runs_status ON scheduled_job_runs(status);
