-- ============================================================================
-- CORE IDENTITY & MULTI-TENANCY SCHEMA
-- ============================================================================
-- This schema handles:
-- - Unified identity across all 8 products
-- - Multi-tenant isolation with organization-level boundaries
-- - Platform-wide authentication and authorization
-- - Consent management for GDPR/privacy compliance
-- ============================================================================

-- ============================================================================
-- TENANTS (Organizations)
-- ============================================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('TN-'),
    
    -- Basic Info
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    
    -- Classification
    tenant_type tenant_type NOT NULL DEFAULT 'small_business',
    industry TEXT,
    employee_count_range TEXT,
    annual_revenue_range TEXT,
    
    -- Deployment Configuration
    deployment_mode deployment_mode NOT NULL DEFAULT 'saas_cloud',
    data_residency_region TEXT DEFAULT 'us-east-1',
    dedicated_infrastructure BOOLEAN DEFAULT FALSE,
    custom_domain TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    
    -- Subscription
    subscription_tier subscription_tier DEFAULT 'free',
    sla_tier sla_tier DEFAULT 'basic',
    trial_ends_at TIMESTAMPTZ,
    
    -- Federated Learning
    federated_status federated_status DEFAULT 'opted_out',
    federated_node_id UUID,
    
    -- Settings & Metadata
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}',           -- Logo, colors, etc.
    compliance_requirements TEXT[],         -- ['soc2', 'gdpr', 'hipaa']
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Tenant product subscriptions
CREATE TABLE tenant_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product product_type NOT NULL,
    
    -- Subscription details
    is_enabled BOOLEAN DEFAULT TRUE,
    subscription_tier subscription_tier DEFAULT 'free',
    
    -- Limits
    user_limit INTEGER,
    storage_limit_gb INTEGER,
    api_calls_limit_monthly BIGINT,
    
    -- Feature flags
    enabled_features TEXT[] DEFAULT '{}',
    disabled_features TEXT[] DEFAULT '{}',
    
    -- Usage tracking
    current_users INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    api_calls_this_month BIGINT DEFAULT 0,
    
    -- Billing
    monthly_price_cents INTEGER,
    billing_cycle_day INTEGER DEFAULT 1,
    
    -- Timestamps
    activated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, product)
);

-- ============================================================================
-- USERS (Global Identity)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('USR-'),
    
    -- Authentication
    email CITEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT,                     -- NULL for SSO-only users
    password_changed_at TIMESTAMPTZ,
    requires_password_change BOOLEAN DEFAULT FALSE,
    
    -- Profile
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en-US',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_platform_admin BOOLEAN DEFAULT FALSE,
    platform_role platform_role,
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_methods JSONB DEFAULT '[]',         -- [{"type": "totp", "verified": true}]
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_active_at TIMESTAMPTZ,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    
    -- Metadata
    signup_source TEXT,
    signup_campaign TEXT,
    referral_code TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- TENANT MEMBERSHIPS (User-Tenant Relationship)
-- ============================================================================
CREATE TABLE tenant_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role within tenant
    role_id UUID,                           -- References tenant_roles
    is_owner BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_billing_contact BOOLEAN DEFAULT FALSE,
    
    -- Product-specific access
    product_access product_type[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'active',           -- active, invited, suspended, removed
    invited_at TIMESTAMPTZ,
    invited_by_user_id UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, user_id)
);

-- ============================================================================
-- TENANT ROLES (Custom roles per tenant)
-- ============================================================================
CREATE TABLE tenant_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,   -- Can't be deleted
    is_default BOOLEAN DEFAULT FALSE,       -- Assigned to new users
    
    -- Role hierarchy
    parent_role_id UUID REFERENCES tenant_roles(id),
    priority INTEGER DEFAULT 0,             -- Higher = more authority
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, name)
);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Scope
    product product_type,                   -- NULL = platform-wide
    resource TEXT NOT NULL,                 -- e.g., 'documents', 'reports', 'users'
    action TEXT NOT NULL,                   -- e.g., 'create', 'read', 'update', 'delete'
    
    -- Metadata
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Constraints
    requires_mfa BOOLEAN DEFAULT FALSE,
    requires_audit BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product, resource, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Conditions
    conditions JSONB DEFAULT '{}',          -- {"department": "finance", "max_amount": 10000}
    
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    
    UNIQUE(role_id, permission_id)
);

-- Direct user permissions (override role)
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Grant type
    is_grant BOOLEAN DEFAULT TRUE,          -- FALSE = explicit deny
    
    -- Conditions
    conditions JSONB DEFAULT '{}',
    
    -- Validity
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    
    UNIQUE(user_id, tenant_id, permission_id)
);

-- ============================================================================
-- AUTHENTICATION
-- ============================================================================

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Session info
    session_token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    
    -- Device info
    user_agent TEXT,
    ip_address INET,
    device_id TEXT,
    device_fingerprint TEXT,
    geo_location JSONB,                     -- {"country": "US", "city": "NYC"}
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    mfa_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

-- SSO/SAML configurations per tenant
CREATE TABLE sso_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Provider
    provider_type TEXT NOT NULL,            -- 'saml', 'oidc', 'google', 'microsoft', etc.
    provider_name TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- SAML Configuration
    entity_id TEXT,
    sso_url TEXT,
    slo_url TEXT,
    certificate TEXT,
    
    -- OIDC Configuration
    client_id TEXT,
    client_secret_encrypted TEXT,
    authorization_url TEXT,
    token_url TEXT,
    userinfo_url TEXT,
    jwks_url TEXT,
    scopes TEXT[] DEFAULT ARRAY['openid', 'email', 'profile'],
    
    -- Mapping
    attribute_mapping JSONB DEFAULT '{}',   -- {"email": "mail", "first_name": "givenName"}
    default_role_id UUID REFERENCES tenant_roles(id),
    auto_provision_users BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, provider_type)
);

-- API keys for programmatic access
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Key info
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,               -- First 8 chars for identification
    key_hash TEXT NOT NULL,                 -- SHA-256 of full key
    
    -- Scope
    scopes TEXT[] DEFAULT '{}',
    products product_type[] DEFAULT '{}',
    ip_whitelist INET[],
    
    -- Limits
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id)
);

-- ============================================================================
-- CONSENT MANAGEMENT (GDPR/Privacy)
-- ============================================================================
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_type consent_type NOT NULL,
    status consent_status NOT NULL,
    version TEXT NOT NULL,                  -- Policy version consented to
    
    -- Context
    product product_type,                   -- NULL = platform-wide
    purpose TEXT,
    legal_basis TEXT,                       -- 'consent', 'legitimate_interest', 'contract'
    
    -- Collection info
    collected_via TEXT,                     -- 'signup', 'settings', 'banner'
    ip_address INET,
    user_agent TEXT,
    
    -- Evidence
    consent_text TEXT,                      -- Exact text shown to user
    consent_proof JSONB,                    -- Additional evidence
    
    -- Timestamps
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Data processing records (GDPR Article 30)
CREATE TABLE data_processing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Processing activity
    activity_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    
    -- Data subjects
    data_subjects_categories TEXT[],
    
    -- Data categories
    personal_data_categories TEXT[],
    special_categories_data BOOLEAN DEFAULT FALSE,
    
    -- Recipients
    recipients TEXT[],
    third_country_transfers TEXT[],
    transfer_safeguards TEXT,
    
    -- Retention
    retention_period TEXT,
    retention_criteria TEXT,
    
    -- Security measures
    security_measures TEXT[],
    
    -- Metadata
    dpo_contact TEXT,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Data subject requests (DSAR)
CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('DSR-'),
    
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Request details
    request_type TEXT NOT NULL,             -- 'access', 'erasure', 'portability', 'rectification', 'restriction'
    status TEXT DEFAULT 'pending',
    priority ticket_priority DEFAULT 'medium',
    
    -- Requester info (may not be registered user)
    requester_email TEXT NOT NULL,
    requester_name TEXT,
    verification_status TEXT DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    
    -- Request content
    description TEXT,
    scope TEXT[],                           -- Which products/data types
    
    -- Processing
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    response_sent_at TIMESTAMPTZ,
    
    -- Documentation
    internal_notes TEXT,
    response_summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_type ON tenants(tenant_type);
CREATE INDEX idx_tenants_deployment ON tenants(deployment_mode);
CREATE INDEX idx_tenants_subscription ON tenants(subscription_tier);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tenants_federated ON tenants(federated_status) WHERE federated_status != 'opted_out';

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_users_platform_role ON users(platform_role) WHERE platform_role IS NOT NULL;
CREATE INDEX idx_users_created ON users(created_at);

-- Tenant memberships
CREATE INDEX idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_memberships_role ON tenant_memberships(role_id);
CREATE INDEX idx_memberships_products ON tenant_memberships USING GIN(product_access);
CREATE INDEX idx_memberships_status ON tenant_memberships(status);

-- Sessions
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX idx_sessions_device ON user_sessions(device_id);

-- API Keys
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- Consents
CREATE INDEX idx_consents_user ON consent_records(user_id);
CREATE INDEX idx_consents_tenant ON consent_records(tenant_id);
CREATE INDEX idx_consents_type ON consent_records(consent_type, status);
CREATE INDEX idx_consents_product ON consent_records(product);

-- DSAR
CREATE INDEX idx_dsar_user ON data_subject_requests(user_id);
CREATE INDEX idx_dsar_status ON data_subject_requests(status);
CREATE INDEX idx_dsar_due ON data_subject_requests(due_date) WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON tenants
    USING (id = current_tenant_id() OR 
           EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::UUID AND is_platform_admin = TRUE));

-- User visibility within tenant
CREATE POLICY user_tenant_visibility ON users
    USING (id = current_setting('app.current_user_id', true)::UUID OR
           EXISTS (SELECT 1 FROM tenant_memberships tm 
                   WHERE tm.user_id = users.id AND tm.tenant_id = current_tenant_id()));

-- Membership tenant isolation
CREATE POLICY membership_isolation ON tenant_memberships
    USING (tenant_id = current_tenant_id());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_tenants_timestamp
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memberships_timestamp
    BEFORE UPDATE ON tenant_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
