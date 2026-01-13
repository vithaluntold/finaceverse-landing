-- ============================================================================
-- COMMAND CENTER: LEGAL, PARTNERS & BUSINESS INTELLIGENCE
-- ============================================================================
-- Module 10: Legal & Compliance
-- Module 11: Partner & Affiliate Portal
-- Module 13: SEO & Analytics
-- Module 14: Business Intelligence
-- ============================================================================

-- ============================================================================
-- LEGAL & COMPLIANCE
-- ============================================================================
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document identity
    document_type TEXT NOT NULL,           -- 'terms_of_service', 'privacy_policy', 'dpa', 'sla', 'nda'
    version TEXT NOT NULL,
    
    -- Scope
    product product_type,                  -- NULL = platform-wide
    region TEXT,                           -- NULL = global
    
    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    summary TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'active', 'archived'
    
    -- Dates
    effective_date TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    
    UNIQUE(document_type, version, product, region)
);

-- User acceptances of legal documents
CREATE TABLE legal_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legal_document_id UUID NOT NULL REFERENCES legal_documents(id),
    
    -- Context
    tenant_id UUID REFERENCES tenants(id),
    
    -- Acceptance details
    accepted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    -- Signature (if required)
    signature_method TEXT,                 -- 'checkbox', 'typed', 'drawn', 'electronic'
    signature_data JSONB,
    
    UNIQUE(user_id, legal_document_id)
);

-- Contracts (B2B agreements)
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('CON-'),
    
    -- Parties
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Contract details
    contract_type TEXT NOT NULL,           -- 'enterprise', 'reseller', 'partner', 'custom'
    title TEXT NOT NULL,
    
    -- Value
    total_value_cents BIGINT,
    currency TEXT DEFAULT 'USD',
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT FALSE,
    renewal_notice_days INTEGER DEFAULT 30,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'pending_signature', 'active', 'expired', 'terminated'
    
    -- Signatures
    signatures JSONB DEFAULT '[]',         -- [{signer_name, signer_email, signed_at, signature}]
    
    -- Documents
    document_url TEXT,
    
    -- Terms
    custom_terms JSONB,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PARTNER & AFFILIATE PORTAL
-- ============================================================================
CREATE TABLE partner_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Program identity
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Type
    program_type TEXT NOT NULL,            -- 'referral', 'reseller', 'agency', 'technology'
    
    -- Tiers
    tiers JSONB NOT NULL,                  -- [{name, requirements, benefits, commission_rate}]
    
    -- Commission
    default_commission_percent DECIMAL(5,2),
    commission_type TEXT,                  -- 'one_time', 'recurring', 'lifetime'
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('PTN-'),
    
    -- Partner identity
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    program_id UUID NOT NULL REFERENCES partner_programs(id),
    
    -- Referral
    referral_code TEXT UNIQUE NOT NULL,
    referral_url TEXT,
    
    -- Tier
    current_tier TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'approved', 'active', 'suspended', 'terminated'
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    
    -- Payment
    payment_method TEXT,
    payment_details JSONB,
    minimum_payout_cents INTEGER DEFAULT 10000,
    
    -- Metrics
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    total_revenue_cents BIGINT DEFAULT 0,
    total_commissions_cents BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Referrals
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id),
    
    -- Referral details
    referral_code_used TEXT NOT NULL,
    
    -- Referred entity
    referred_tenant_id UUID REFERENCES tenants(id),
    referred_user_id UUID REFERENCES users(id),
    referred_email TEXT,
    
    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    landing_page TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'signed_up', 'converted', 'churned', 'invalid'
    
    -- Conversion
    signed_up_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    conversion_product product_type,
    conversion_plan_id UUID REFERENCES pricing_plans(id),
    
    -- Value
    first_payment_cents INTEGER,
    total_revenue_cents BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Commissions
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id),
    referral_id UUID REFERENCES referrals(id),
    
    -- Commission details
    commission_type TEXT NOT NULL,         -- 'signup_bonus', 'first_payment', 'recurring'
    
    -- Amount
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Source transaction
    source_invoice_id UUID REFERENCES invoices(id),
    source_payment_id UUID REFERENCES payments(id),
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'approved', 'paid', 'cancelled'
    
    -- Payout
    payout_id UUID,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Partner payouts
CREATE TABLE partner_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('PO-'),
    partner_id UUID NOT NULL REFERENCES partners(id),
    
    -- Amount
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Commissions included
    commission_ids UUID[],
    
    -- Period
    period_start DATE,
    period_end DATE,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'processing', 'paid', 'failed'
    
    -- Payment
    payment_method TEXT,
    payment_reference TEXT,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEO & ANALYTICS
-- ============================================================================
CREATE TABLE seo_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Page identity
    url_path TEXT UNIQUE NOT NULL,
    
    -- SEO metadata
    title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    canonical_url TEXT,
    
    -- Open Graph
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    og_type TEXT DEFAULT 'website',
    
    -- Twitter Card
    twitter_card TEXT DEFAULT 'summary_large_image',
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_image TEXT,
    
    -- Structured data
    structured_data JSONB,
    
    -- Indexing
    is_indexable BOOLEAN DEFAULT TRUE,
    is_followable BOOLEAN DEFAULT TRUE,
    
    -- Sitemap
    include_in_sitemap BOOLEAN DEFAULT TRUE,
    sitemap_priority DECIMAL(2,1) DEFAULT 0.5,
    sitemap_change_freq TEXT DEFAULT 'weekly',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Page views (partitioned for scale)
CREATE TABLE page_views (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Visitor
    visitor_id TEXT NOT NULL,
    session_id TEXT,
    user_id UUID,
    tenant_id UUID,
    
    -- Page
    url_path TEXT NOT NULL,
    url_query TEXT,
    page_title TEXT,
    
    -- Referrer
    referrer_url TEXT,
    referrer_domain TEXT,
    
    -- UTM
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    
    -- Device
    device_type TEXT,                      -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    
    -- Location
    country TEXT,
    region TEXT,
    city TEXT,
    
    -- Timing
    time_on_page_seconds INTEGER,
    is_bounce BOOLEAN,
    
    -- Timestamp
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, viewed_at)
) PARTITION BY RANGE (viewed_at);

-- Create partitions for page views (monthly)
CREATE TABLE page_views_2024_01 PARTITION OF page_views
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE page_views_2024_02 PARTITION OF page_views
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE page_views_2024_03 PARTITION OF page_views
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE page_views_2024_04 PARTITION OF page_views
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE page_views_2024_05 PARTITION OF page_views
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE page_views_2024_06 PARTITION OF page_views
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE page_views_2024_07 PARTITION OF page_views
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE page_views_2024_08 PARTITION OF page_views
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE page_views_2024_09 PARTITION OF page_views
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE page_views_2024_10 PARTITION OF page_views
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE page_views_2024_11 PARTITION OF page_views
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE page_views_2024_12 PARTITION OF page_views
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- 2025 partitions
CREATE TABLE page_views_2025_01 PARTITION OF page_views
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE page_views_2025_02 PARTITION OF page_views
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE page_views_2025_03 PARTITION OF page_views
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE page_views_2025_04 PARTITION OF page_views
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE page_views_2025_05 PARTITION OF page_views
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE page_views_2025_06 PARTITION OF page_views
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE page_views_2025_07 PARTITION OF page_views
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE page_views_2025_08 PARTITION OF page_views
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE page_views_2025_09 PARTITION OF page_views
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE page_views_2025_10 PARTITION OF page_views
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE page_views_2025_11 PARTITION OF page_views
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE page_views_2025_12 PARTITION OF page_views
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 2026 partitions
CREATE TABLE page_views_2026_01 PARTITION OF page_views
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE page_views_2026_02 PARTITION OF page_views
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE page_views_2026_03 PARTITION OF page_views
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE page_views_2026_04 PARTITION OF page_views
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE page_views_2026_05 PARTITION OF page_views
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE page_views_2026_06 PARTITION OF page_views
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Custom events
CREATE TABLE analytics_events (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Context
    visitor_id TEXT NOT NULL,
    session_id TEXT,
    user_id UUID,
    tenant_id UUID,
    
    -- Event
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_properties JSONB DEFAULT '{}',
    
    -- Page context
    page_url TEXT,
    
    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Create some initial partitions for analytics events
CREATE TABLE analytics_events_2024_q1 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE analytics_events_2024_q2 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE analytics_events_2024_q3 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE analytics_events_2024_q4 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE analytics_events_2025_q1 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE analytics_events_2025_q2 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE analytics_events_2025_q3 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE analytics_events_2025_q4 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE analytics_events_2026_q1 PARTITION OF analytics_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE analytics_events_2026_q2 PARTITION OF analytics_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- ============================================================================
-- BUSINESS INTELLIGENCE
-- ============================================================================
CREATE TABLE bi_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ownership
    tenant_id UUID REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    
    -- Dashboard info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Layout
    layout JSONB NOT NULL DEFAULT '[]',    -- Widget positions and sizes
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    shared_with_roles TEXT[],
    shared_with_users UUID[],
    
    -- Status
    is_favorite BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bi_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES bi_dashboards(id) ON DELETE CASCADE,
    
    -- Widget info
    name TEXT NOT NULL,
    widget_type TEXT NOT NULL,             -- 'chart', 'table', 'metric', 'map', 'text'
    
    -- Data source
    data_source_type TEXT NOT NULL,        -- 'query', 'api', 'static'
    data_query TEXT,                       -- SQL or API endpoint
    data_config JSONB,
    
    -- Visualization
    chart_type TEXT,                       -- 'line', 'bar', 'pie', 'area', etc.
    chart_config JSONB,
    
    -- Refresh
    refresh_interval_seconds INTEGER,
    last_refreshed_at TIMESTAMPTZ,
    
    -- Cached data
    cached_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Saved reports
CREATE TABLE bi_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('RPT-'),
    
    -- Ownership
    tenant_id UUID REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    
    -- Report info
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL,             -- 'financial', 'usage', 'compliance', 'custom'
    
    -- Configuration
    data_sources TEXT[],
    filters JSONB DEFAULT '{}',
    columns JSONB DEFAULT '[]',
    grouping JSONB DEFAULT '[]',
    sorting JSONB DEFAULT '[]',
    
    -- Schedule
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron TEXT,
    schedule_recipients TEXT[],
    schedule_format TEXT DEFAULT 'pdf',    -- 'pdf', 'excel', 'csv'
    
    -- Last run
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Report runs/exports
CREATE TABLE bi_report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES bi_reports(id) ON DELETE CASCADE,
    
    -- Run context
    run_type TEXT NOT NULL,                -- 'manual', 'scheduled', 'api'
    run_by UUID REFERENCES users(id),
    
    -- Parameters
    parameters JSONB,
    filters JSONB,
    date_range_start DATE,
    date_range_end DATE,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'running', 'completed', 'failed'
    
    -- Output
    output_format TEXT,
    output_url TEXT,
    row_count INTEGER,
    file_size_bytes BIGINT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Error
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Data exports (for compliance/audit)
CREATE TABLE data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('EXP-'),
    
    -- Requester
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    requested_by UUID REFERENCES users(id),
    
    -- Export scope
    export_type TEXT NOT NULL,             -- 'full_backup', 'user_data', 'audit_logs', 'custom'
    data_types TEXT[],
    date_range_start DATE,
    date_range_end DATE,
    filters JSONB,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'processing', 'completed', 'failed', 'expired'
    
    -- Output
    output_format TEXT DEFAULT 'json',     -- 'json', 'csv', 'parquet'
    file_url TEXT,
    file_size_bytes BIGINT,
    file_checksum TEXT,
    
    -- Encryption
    is_encrypted BOOLEAN DEFAULT TRUE,
    encryption_key_hint TEXT,
    
    -- Validity
    expires_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Legal
CREATE INDEX idx_legal_docs_type ON legal_documents(document_type, status);
CREATE INDEX idx_legal_acceptances_user ON legal_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_doc ON legal_acceptances(legal_document_id);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- Partners
CREATE INDEX idx_partners_tenant ON partners(tenant_id);
CREATE INDEX idx_partners_program ON partners(program_id);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_referral_code ON partners(referral_code);
CREATE INDEX idx_referrals_partner ON referrals(partner_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_tenant ON referrals(referred_tenant_id);
CREATE INDEX idx_commissions_partner ON commissions(partner_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_payouts_partner ON partner_payouts(partner_id);

-- Page views
CREATE INDEX idx_page_views_visitor ON page_views(visitor_id, viewed_at DESC);
CREATE INDEX idx_page_views_session ON page_views(session_id);
CREATE INDEX idx_page_views_path ON page_views(url_path, viewed_at DESC);
CREATE INDEX idx_page_views_user ON page_views(user_id, viewed_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_page_views_tenant ON page_views(tenant_id, viewed_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_page_views_utm ON page_views(utm_source, utm_medium, utm_campaign);

-- Analytics events
CREATE INDEX idx_events_visitor ON analytics_events(visitor_id, occurred_at DESC);
CREATE INDEX idx_events_name ON analytics_events(event_name, occurred_at DESC);
CREATE INDEX idx_events_user ON analytics_events(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_tenant ON analytics_events(tenant_id, occurred_at DESC) WHERE tenant_id IS NOT NULL;

-- BI
CREATE INDEX idx_dashboards_tenant ON bi_dashboards(tenant_id);
CREATE INDEX idx_dashboards_created_by ON bi_dashboards(created_by);
CREATE INDEX idx_widgets_dashboard ON bi_widgets(dashboard_id);
CREATE INDEX idx_reports_tenant ON bi_reports(tenant_id);
CREATE INDEX idx_report_runs_report ON bi_report_runs(report_id);
CREATE INDEX idx_exports_tenant ON data_exports(tenant_id);
CREATE INDEX idx_exports_status ON data_exports(status);
