-- ============================================================================
-- PRODUCT-SPECIFIC SCHEMAS: EPI-Q, SUMBUDDY
-- ============================================================================
-- EPI-Q: Unified Task Mining + Process Mining Platform
-- SumBuddy: B2B/B2C Financial Services Marketplace
-- ============================================================================

-- ============================================================================
-- EPI-Q - Unified Task Mining + Process Mining Platform
-- ============================================================================

-- EPI-Q Process Definitions
CREATE TABLE epiq_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('PROC-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Process info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Classification
    process_type TEXT NOT NULL,            -- 'financial', 'hr', 'procurement', 'sales', 'custom'
    category TEXT,
    
    -- Process model
    bpmn_xml TEXT,                         -- BPMN 2.0 XML
    process_model JSONB,                   -- Simplified JSON representation
    
    -- Activities
    activities JSONB DEFAULT '[]',         -- [{id, name, type, expected_duration}]
    
    -- Metrics targets
    target_cycle_time_minutes INTEGER,
    target_cost_cents INTEGER,
    target_conformance_rate DECIMAL(5,4),
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'active', 'archived'
    
    -- Versions
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,
    previous_version_id UUID REFERENCES epiq_processes(id),
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- EPI-Q Process Instances (Digital Twin)
CREATE TABLE epiq_process_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('PI-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    process_id UUID NOT NULL REFERENCES epiq_processes(id),
    
    -- Instance info
    case_id TEXT NOT NULL,                 -- Business key (e.g., invoice number)
    
    -- Status
    status TEXT DEFAULT 'running',         -- 'running', 'completed', 'cancelled', 'stuck'
    
    -- Current state
    current_activity TEXT,
    completed_activities TEXT[],
    
    -- Metrics
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    cycle_time_minutes INTEGER,
    
    -- Cost
    total_cost_cents INTEGER DEFAULT 0,
    
    -- Conformance
    deviation_count INTEGER DEFAULT 0,
    is_conformant BOOLEAN DEFAULT TRUE,
    
    -- Attributes
    attributes JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- EPI-Q Activity Logs (Event Log for Process Mining)
CREATE TABLE epiq_activity_logs (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Context
    tenant_id UUID NOT NULL,
    process_instance_id UUID NOT NULL,
    
    -- Event
    activity_name TEXT NOT NULL,
    activity_type TEXT,                    -- 'task', 'gateway', 'event', 'subprocess'
    
    -- Lifecycle
    lifecycle_transition TEXT NOT NULL,    -- 'start', 'complete', 'suspend', 'resume', 'cancel'
    
    -- Actor
    resource_id UUID,                      -- User or agent who performed
    resource_type TEXT,                    -- 'user', 'agent', 'system'
    resource_name TEXT,
    
    -- Timing
    timestamp TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER,
    
    -- Cost
    cost_cents INTEGER,
    
    -- Attributes
    attributes JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for activity logs
CREATE TABLE epiq_activity_logs_2024_q1 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE epiq_activity_logs_2024_q2 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE epiq_activity_logs_2024_q3 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE epiq_activity_logs_2024_q4 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE epiq_activity_logs_2025_q1 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE epiq_activity_logs_2025_q2 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE epiq_activity_logs_2025_q3 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE epiq_activity_logs_2025_q4 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE epiq_activity_logs_2026_q1 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE epiq_activity_logs_2026_q2 PARTITION OF epiq_activity_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- EPI-Q Task Mining (UI interactions)
CREATE TABLE epiq_task_events (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Context
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Application context
    application_name TEXT NOT NULL,
    window_title TEXT,
    url TEXT,
    
    -- Event
    event_type TEXT NOT NULL,              -- 'click', 'type', 'copy', 'paste', 'navigation', 'file_open'
    target_element TEXT,
    target_value TEXT,
    
    -- Coordinates
    x_coordinate INTEGER,
    y_coordinate INTEGER,
    
    -- Screenshot (reference)
    screenshot_id UUID,
    
    -- Timing
    timestamp TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create some initial partitions
CREATE TABLE epiq_task_events_2024_q1 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE epiq_task_events_2024_q2 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE epiq_task_events_2024_q3 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE epiq_task_events_2024_q4 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE epiq_task_events_2025_q1 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE epiq_task_events_2025_q2 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE epiq_task_events_2025_q3 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE epiq_task_events_2025_q4 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE epiq_task_events_2026_q1 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE epiq_task_events_2026_q2 PARTITION OF epiq_task_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- EPI-Q Discovered Patterns (from mining)
CREATE TABLE epiq_discovered_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Discovery context
    discovery_type TEXT NOT NULL,          -- 'process', 'task', 'bottleneck', 'rework', 'automation'
    discovery_job_id UUID,
    
    -- Pattern
    pattern_name TEXT NOT NULL,
    pattern_description TEXT,
    
    -- Pattern definition
    pattern_definition JSONB NOT NULL,
    
    -- Frequency
    occurrence_count INTEGER NOT NULL,
    affected_cases INTEGER NOT NULL,
    
    -- Impact
    time_impact_minutes INTEGER,
    cost_impact_cents INTEGER,
    
    -- Confidence
    confidence_score DECIMAL(5,4),
    support_score DECIMAL(5,4),
    
    -- Status
    status TEXT DEFAULT 'discovered',      -- 'discovered', 'reviewed', 'actionable', 'implemented', 'dismissed'
    
    -- Actions
    recommended_actions JSONB DEFAULT '[]',
    
    discovered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ
);

-- PMQL Saved Queries (Process Mining Query Language)
CREATE TABLE epiq_pmql_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    
    -- Query info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Query
    pmql_query TEXT NOT NULL,
    
    -- Parameters
    parameters JSONB DEFAULT '[]',
    
    -- Results caching
    is_cached BOOLEAN DEFAULT FALSE,
    cache_ttl_minutes INTEGER DEFAULT 60,
    last_executed_at TIMESTAMPTZ,
    cached_results JSONB,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- EPI-Q Digital Twin Simulations
CREATE TABLE epiq_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('SIM-'),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    process_id UUID NOT NULL REFERENCES epiq_processes(id),
    
    -- Simulation config
    name TEXT NOT NULL,
    description TEXT,
    
    -- Parameters
    simulation_parameters JSONB NOT NULL,
    
    -- Changes being tested
    proposed_changes JSONB NOT NULL,
    
    -- Results
    status TEXT DEFAULT 'pending',         -- 'pending', 'running', 'completed', 'failed'
    
    baseline_metrics JSONB,
    simulated_metrics JSONB,
    comparison JSONB,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SUMBUDDY - B2B/B2C Financial Services Marketplace
-- ============================================================================

-- Service categories
CREATE TABLE sumbuddy_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Category info
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES sumbuddy_categories(id),
    level INTEGER DEFAULT 1,
    path TEXT,                             -- Materialized path for queries
    
    -- Display
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Service providers
CREATE TABLE sumbuddy_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('PRV-'),
    
    -- Link to tenant (if using FinACEverse)
    tenant_id UUID REFERENCES tenants(id),
    
    -- Provider info
    name TEXT NOT NULL,
    business_name TEXT,
    
    -- Type
    provider_type TEXT NOT NULL,           -- 'individual', 'firm', 'agency'
    
    -- Contact
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    
    -- Address
    address JSONB,
    service_areas TEXT[],                  -- Geographic areas served
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verification_level TEXT,               -- 'basic', 'professional', 'premium'
    
    -- Credentials
    credentials JSONB DEFAULT '[]',        -- [{type, issuer, number, expiry, verified}]
    
    -- Profile
    bio TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    
    -- Settings
    accepts_new_clients BOOLEAN DEFAULT TRUE,
    response_time_hours INTEGER,
    
    -- Rating
    rating_average DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- Metrics
    clients_served INTEGER DEFAULT 0,
    projects_completed INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'active', 'suspended', 'inactive'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Services offered
CREATE TABLE sumbuddy_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('SVC-'),
    
    provider_id UUID NOT NULL REFERENCES sumbuddy_providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES sumbuddy_categories(id),
    
    -- Service info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Details
    features JSONB DEFAULT '[]',
    deliverables JSONB DEFAULT '[]',
    requirements TEXT,
    
    -- Pricing
    pricing_type TEXT NOT NULL,            -- 'fixed', 'hourly', 'custom', 'package'
    price_cents INTEGER,
    price_currency TEXT DEFAULT 'USD',
    
    -- Packages (for package pricing)
    packages JSONB DEFAULT '[]',           -- [{name, description, price, features}]
    
    -- Timeline
    estimated_duration TEXT,
    turnaround_days INTEGER,
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Media
    images TEXT[],
    video_url TEXT,
    
    -- Tags
    tags TEXT[],
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    
    -- Rating
    rating_average DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'active', 'paused', 'archived'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Service inquiries/leads
CREATE TABLE sumbuddy_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('INQ-'),
    
    -- Service
    service_id UUID NOT NULL REFERENCES sumbuddy_services(id),
    provider_id UUID NOT NULL REFERENCES sumbuddy_providers(id),
    
    -- Client
    client_user_id UUID REFERENCES users(id),
    client_tenant_id UUID REFERENCES tenants(id),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    
    -- Inquiry
    message TEXT NOT NULL,
    
    -- Requirements
    requirements JSONB,
    budget_range TEXT,
    timeline TEXT,
    
    -- Status
    status TEXT DEFAULT 'new',             -- 'new', 'contacted', 'quoted', 'negotiating', 'won', 'lost'
    
    -- Response
    responded_at TIMESTAMPTZ,
    response_message TEXT,
    
    -- Quote
    quoted_amount_cents INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Orders/Engagements
CREATE TABLE sumbuddy_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('ORD-'),
    
    -- Parties
    service_id UUID NOT NULL REFERENCES sumbuddy_services(id),
    provider_id UUID NOT NULL REFERENCES sumbuddy_providers(id),
    client_user_id UUID REFERENCES users(id),
    client_tenant_id UUID REFERENCES tenants(id),
    
    -- From inquiry
    inquiry_id UUID REFERENCES sumbuddy_inquiries(id),
    
    -- Order details
    package_selected TEXT,
    custom_requirements JSONB,
    
    -- Pricing
    subtotal_cents INTEGER NOT NULL,
    platform_fee_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    
    -- Payment
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'released', 'refunded', 'disputed'
    payment_id UUID,
    
    -- Timeline
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'in_progress', 'review', 'revision', 'completed', 'cancelled'
    
    -- Revisions
    revisions_allowed INTEGER DEFAULT 2,
    revisions_used INTEGER DEFAULT 0,
    
    -- Deliverables
    deliverables JSONB DEFAULT '[]',
    
    -- Rating
    client_rating INTEGER,
    client_review TEXT,
    provider_rating INTEGER,
    provider_review TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- Order messages
CREATE TABLE sumbuddy_order_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sumbuddy_orders(id) ON DELETE CASCADE,
    
    -- Sender
    sender_type TEXT NOT NULL,             -- 'client', 'provider', 'system'
    sender_user_id UUID REFERENCES users(id),
    
    -- Content
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    
    -- Read status
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Provider availability
CREATE TABLE sumbuddy_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES sumbuddy_providers(id) ON DELETE CASCADE,
    
    -- Regular hours
    day_of_week INTEGER NOT NULL,          -- 0=Sunday, 6=Saturday
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider_id, day_of_week)
);

-- Provider time off
CREATE TABLE sumbuddy_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES sumbuddy_providers(id) ON DELETE CASCADE,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE sumbuddy_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sumbuddy_orders(id) UNIQUE,
    
    -- Reviewer
    reviewer_type TEXT NOT NULL,           -- 'client', 'provider'
    reviewer_user_id UUID REFERENCES users(id),
    
    -- Reviewee
    reviewee_type TEXT NOT NULL,
    reviewee_provider_id UUID REFERENCES sumbuddy_providers(id),
    reviewee_user_id UUID REFERENCES users(id),
    
    -- Review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    
    -- Breakdown
    rating_communication INTEGER,
    rating_quality INTEGER,
    rating_timeliness INTEGER,
    rating_value INTEGER,
    
    -- Status
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Moderation
    flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    
    -- Response
    response TEXT,
    response_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- EPI-Q
CREATE INDEX idx_epiq_processes_tenant ON epiq_processes(tenant_id);
CREATE INDEX idx_epiq_processes_status ON epiq_processes(status);
CREATE INDEX idx_epiq_instances_tenant ON epiq_process_instances(tenant_id);
CREATE INDEX idx_epiq_instances_process ON epiq_process_instances(process_id);
CREATE INDEX idx_epiq_instances_case ON epiq_process_instances(case_id);
CREATE INDEX idx_epiq_instances_status ON epiq_process_instances(status);
CREATE INDEX idx_epiq_activity_logs_instance ON epiq_activity_logs(process_instance_id, timestamp);
CREATE INDEX idx_epiq_activity_logs_activity ON epiq_activity_logs(activity_name, timestamp);
CREATE INDEX idx_epiq_task_events_user ON epiq_task_events(user_id, timestamp);
CREATE INDEX idx_epiq_task_events_session ON epiq_task_events(session_id, timestamp);
CREATE INDEX idx_epiq_task_events_app ON epiq_task_events(application_name, timestamp);
CREATE INDEX idx_epiq_patterns_tenant ON epiq_discovered_patterns(tenant_id);
CREATE INDEX idx_epiq_patterns_type ON epiq_discovered_patterns(discovery_type);
CREATE INDEX idx_epiq_patterns_status ON epiq_discovered_patterns(status);
CREATE INDEX idx_epiq_pmql_tenant ON epiq_pmql_queries(tenant_id);
CREATE INDEX idx_epiq_simulations_tenant ON epiq_simulations(tenant_id);
CREATE INDEX idx_epiq_simulations_process ON epiq_simulations(process_id);

-- SumBuddy
CREATE INDEX idx_sumbuddy_categories_parent ON sumbuddy_categories(parent_id);
CREATE INDEX idx_sumbuddy_categories_slug ON sumbuddy_categories(slug);
CREATE INDEX idx_sumbuddy_providers_status ON sumbuddy_providers(status);
CREATE INDEX idx_sumbuddy_providers_verified ON sumbuddy_providers(is_verified, verification_level);
CREATE INDEX idx_sumbuddy_providers_rating ON sumbuddy_providers(rating_average DESC);
CREATE INDEX idx_sumbuddy_providers_areas ON sumbuddy_providers USING GIN(service_areas);
CREATE INDEX idx_sumbuddy_services_provider ON sumbuddy_services(provider_id);
CREATE INDEX idx_sumbuddy_services_category ON sumbuddy_services(category_id);
CREATE INDEX idx_sumbuddy_services_status ON sumbuddy_services(status);
CREATE INDEX idx_sumbuddy_services_tags ON sumbuddy_services USING GIN(tags);
CREATE INDEX idx_sumbuddy_services_rating ON sumbuddy_services(rating_average DESC);
CREATE INDEX idx_sumbuddy_inquiries_service ON sumbuddy_inquiries(service_id);
CREATE INDEX idx_sumbuddy_inquiries_provider ON sumbuddy_inquiries(provider_id);
CREATE INDEX idx_sumbuddy_inquiries_status ON sumbuddy_inquiries(status);
CREATE INDEX idx_sumbuddy_orders_provider ON sumbuddy_orders(provider_id);
CREATE INDEX idx_sumbuddy_orders_client ON sumbuddy_orders(client_user_id);
CREATE INDEX idx_sumbuddy_orders_status ON sumbuddy_orders(status);
CREATE INDEX idx_sumbuddy_messages_order ON sumbuddy_order_messages(order_id);
CREATE INDEX idx_sumbuddy_reviews_order ON sumbuddy_reviews(order_id);
CREATE INDEX idx_sumbuddy_reviews_provider ON sumbuddy_reviews(reviewee_provider_id);
