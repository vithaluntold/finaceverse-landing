-- ============================================================================
-- AI AGENTS & FEDERATED LEARNING SCHEMA
-- ============================================================================
-- Core infrastructure for:
-- - AI Agent Factory (building, deploying, marketplace)
-- - Agent orchestration (Roundtable multi-agent)
-- - Federated learning infrastructure
-- - Cross-product intelligence sharing
-- ============================================================================

-- ============================================================================
-- AI AGENT DEFINITIONS
-- ============================================================================
CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('AGT-'),
    
    -- Ownership
    tenant_id UUID REFERENCES tenants(id),  -- NULL = platform agent
    created_by UUID REFERENCES users(id),
    
    -- Agent identity
    name TEXT NOT NULL,
    slug CITEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    
    -- Classification
    agent_type agent_type NOT NULL,
    product product_type,                   -- Primary product association
    products_compatible product_type[],     -- Cross-product compatibility
    
    -- Capabilities
    capabilities JSONB NOT NULL DEFAULT '[]',
    input_schema JSONB,                     -- Expected input format
    output_schema JSONB,                    -- Guaranteed output format
    
    -- Model configuration
    model_provider TEXT,                    -- 'openai', 'anthropic', 'custom'
    model_name TEXT,
    model_version TEXT,
    model_parameters JSONB DEFAULT '{}',   -- temperature, max_tokens, etc.
    
    -- System prompt and instructions
    system_prompt TEXT,
    instructions JSONB DEFAULT '[]',
    tools_available TEXT[],
    
    -- VAMN integration (triple-stream architecture)
    vamn_arithmetic_enabled BOOLEAN DEFAULT FALSE,
    vamn_verification_level TEXT,          -- 'standard', 'enhanced', 'deterministic'
    
    -- Behavior
    requires_human_approval BOOLEAN DEFAULT FALSE,
    max_iterations INTEGER DEFAULT 10,
    timeout_seconds INTEGER DEFAULT 300,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'active', 'deprecated', 'archived'
    is_public BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Metrics
    execution_count BIGINT DEFAULT 0,
    success_rate DECIMAL(5,2),
    avg_execution_time_ms INTEGER,
    
    -- Marketplace
    marketplace_listing_id UUID,
    price_per_execution_cents INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, slug, version)
);

-- Agent versions (for rollback and A/B testing)
CREATE TABLE ai_agent_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    
    version TEXT NOT NULL,
    
    -- Snapshot of configuration
    config_snapshot JSONB NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    traffic_percentage INTEGER DEFAULT 0,  -- For gradual rollout
    
    -- Metrics
    execution_count BIGINT DEFAULT 0,
    success_rate DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    UNIQUE(agent_id, version)
);

-- ============================================================================
-- AGENT EXECUTIONS (Partitioned for scale)
-- ============================================================================
CREATE TABLE agent_executions (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    external_id TEXT NOT NULL DEFAULT generate_short_id('EXE-'),
    
    -- Context
    tenant_id UUID NOT NULL,
    user_id UUID,
    agent_id UUID NOT NULL,
    agent_version TEXT,
    
    -- Execution context
    product product_type NOT NULL,
    session_id UUID,
    correlation_id TEXT,
    parent_execution_id UUID,              -- For nested/chained executions
    
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    
    -- Status
    status agent_execution_status DEFAULT 'queued',
    
    -- Timing
    queued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Resources
    tokens_used INTEGER,
    cost_cents INTEGER,
    
    -- Error handling
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit
    execution_log JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for agent executions
CREATE TABLE agent_executions_2024_q1 PARTITION OF agent_executions
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE agent_executions_2024_q2 PARTITION OF agent_executions
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE agent_executions_2024_q3 PARTITION OF agent_executions
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE agent_executions_2024_q4 PARTITION OF agent_executions
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE agent_executions_2025_q1 PARTITION OF agent_executions
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE agent_executions_2025_q2 PARTITION OF agent_executions
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE agent_executions_2025_q3 PARTITION OF agent_executions
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE agent_executions_2025_q4 PARTITION OF agent_executions
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE agent_executions_2026_q1 PARTITION OF agent_executions
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE agent_executions_2026_q2 PARTITION OF agent_executions
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- ============================================================================
-- ROUNDTABLE (Multi-Agent Orchestration)
-- ============================================================================
CREATE TABLE roundtables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('RT-'),
    
    -- Ownership
    tenant_id UUID REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    
    -- Roundtable identity
    name TEXT NOT NULL,
    description TEXT,
    product product_type,
    
    -- Orchestration strategy
    orchestration_type TEXT NOT NULL,      -- 'sequential', 'parallel', 'voting', 'debate'
    decision_strategy TEXT,                -- 'consensus', 'majority', 'weighted', 'leader'
    
    -- Participating agents
    agent_configuration JSONB NOT NULL,    -- [{agent_id, role, weight, sequence}]
    
    -- Execution parameters
    max_rounds INTEGER DEFAULT 5,
    timeout_seconds INTEGER DEFAULT 600,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Roundtable sessions (execution instances)
CREATE TABLE roundtable_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roundtable_id UUID NOT NULL REFERENCES roundtables(id),
    
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- Session details
    input_data JSONB NOT NULL,
    context JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'running',         -- 'running', 'completed', 'failed', 'timeout'
    current_round INTEGER DEFAULT 1,
    
    -- Results
    final_output JSONB,
    agent_contributions JSONB DEFAULT '[]',
    decision_rationale TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    
    -- Metrics
    total_tokens_used INTEGER,
    total_cost_cents INTEGER
);

-- ============================================================================
-- AGENT MARKETPLACE
-- ============================================================================
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id),
    
    -- Publisher
    publisher_tenant_id UUID NOT NULL REFERENCES tenants(id),
    publisher_name TEXT,
    
    -- Listing details
    title TEXT NOT NULL,
    short_description TEXT,
    long_description TEXT,
    
    -- Categorization
    category TEXT,
    tags TEXT[],
    
    -- Pricing
    pricing_model TEXT NOT NULL,           -- 'free', 'per_execution', 'subscription', 'one_time'
    price_cents INTEGER,
    currency TEXT DEFAULT 'USD',
    
    -- Rating & Reviews
    rating_average DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    install_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'approved', 'rejected', 'suspended'
    featured BOOLEAN DEFAULT FALSE,
    
    -- Media
    icon_url TEXT,
    screenshots TEXT[],
    demo_video_url TEXT,
    documentation_url TEXT,
    
    -- Approval
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace installs/subscriptions
CREATE TABLE marketplace_installs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    installed_by UUID REFERENCES users(id),
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'active', 'suspended', 'uninstalled'
    
    -- Usage
    execution_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Subscription details (if applicable)
    subscription_id UUID,
    
    installed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    uninstalled_at TIMESTAMPTZ,
    
    UNIQUE(listing_id, tenant_id)
);

-- Marketplace reviews
CREATE TABLE marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    
    reviewer_user_id UUID NOT NULL REFERENCES users(id),
    reviewer_tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    body TEXT,
    
    -- Status
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Moderation
    flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(listing_id, reviewer_user_id)
);

-- ============================================================================
-- FEDERATED LEARNING INFRASTRUCTURE
-- ============================================================================

-- Federated learning clusters
CREATE TABLE federated_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Cluster configuration
    model_architecture TEXT NOT NULL,
    aggregation_strategy TEXT NOT NULL,    -- 'fedavg', 'fedprox', 'scaffold'
    privacy_mechanism TEXT,                -- 'differential_privacy', 'secure_aggregation'
    privacy_budget DECIMAL(10,4),          -- Epsilon for differential privacy
    
    -- Participation requirements
    min_participants INTEGER DEFAULT 5,
    min_samples_per_participant INTEGER DEFAULT 100,
    
    -- Status
    status TEXT DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Federated nodes (tenant participation)
CREATE TABLE federated_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES federated_clusters(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Node identity
    node_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('FN-'),
    public_key TEXT,
    
    -- Consent
    consent_record_id UUID REFERENCES consent_records(id),
    consent_scope JSONB,                   -- What data types are shared
    
    -- Capabilities
    compute_capacity TEXT,                 -- 'low', 'medium', 'high'
    data_sample_count BIGINT,
    
    -- Status
    status federated_status DEFAULT 'opted_in',
    last_heartbeat_at TIMESTAMPTZ,
    
    -- Metrics
    rounds_participated INTEGER DEFAULT 0,
    total_contribution_score DECIMAL(10,4) DEFAULT 0,
    
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    
    UNIQUE(cluster_id, tenant_id)
);

-- Federated training rounds
CREATE TABLE federated_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES federated_clusters(id),
    
    round_number INTEGER NOT NULL,
    
    -- Configuration
    hyperparameters JSONB,
    
    -- Status
    status TEXT DEFAULT 'initializing',    -- 'initializing', 'training', 'aggregating', 'completed', 'failed'
    
    -- Participation
    invited_nodes UUID[],
    participating_nodes UUID[],
    
    -- Results
    global_model_version TEXT,
    model_metrics JSONB,                   -- accuracy, loss, etc.
    
    -- Timing
    started_at TIMESTAMPTZ,
    training_deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(cluster_id, round_number)
);

-- Node contributions per round
CREATE TABLE federated_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES federated_rounds(id),
    node_id UUID NOT NULL REFERENCES federated_nodes(id),
    
    -- Contribution
    model_update_hash TEXT,                -- Hash of encrypted update
    samples_used INTEGER,
    local_epochs INTEGER,
    
    -- Metrics
    local_loss DECIMAL(10,6),
    local_accuracy DECIMAL(5,4),
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'submitted', 'verified', 'rejected'
    
    -- Privacy
    noise_added BOOLEAN DEFAULT FALSE,
    noise_scale DECIMAL(10,4),
    
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    
    UNIQUE(round_id, node_id)
);

-- Federated model registry
CREATE TABLE federated_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES federated_clusters(id),
    
    version TEXT NOT NULL,
    round_id UUID REFERENCES federated_rounds(id),
    
    -- Model info
    model_hash TEXT NOT NULL,
    model_size_bytes BIGINT,
    
    -- Performance
    metrics JSONB,
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'training', 'active', 'deprecated'
    
    -- Distribution
    distributed_to_nodes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(cluster_id, version)
);

-- ============================================================================
-- CROSS-PRODUCT INTELLIGENCE SHARING
-- ============================================================================
CREATE TABLE intelligence_sharing_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parties
    source_tenant_id UUID NOT NULL REFERENCES tenants(id),
    target_tenant_id UUID REFERENCES tenants(id),  -- NULL = platform-wide sharing
    
    -- Scope
    source_product product_type,
    target_product product_type,
    
    -- What's shared
    shared_data_types TEXT[],              -- ['document_patterns', 'extraction_rules', 'anomaly_signatures']
    
    -- Consent
    consent_record_id UUID REFERENCES consent_records(id),
    
    -- Terms
    is_bidirectional BOOLEAN DEFAULT FALSE,
    anonymization_required BOOLEAN DEFAULT TRUE,
    aggregation_min_count INTEGER DEFAULT 10,
    
    -- Status
    status TEXT DEFAULT 'active',
    
    -- Validity
    effective_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Shared intelligence patterns
CREATE TABLE shared_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source
    source_product product_type NOT NULL,
    source_tenant_count INTEGER,           -- How many tenants contributed
    
    -- Intelligence type
    intelligence_type TEXT NOT NULL,       -- 'pattern', 'rule', 'model', 'embedding'
    category TEXT,
    
    -- Content
    pattern_signature TEXT,
    pattern_data JSONB,
    
    -- Metrics
    confidence_score DECIMAL(5,4),
    usage_count BIGINT DEFAULT 0,
    effectiveness_score DECIMAL(5,4),
    
    -- Privacy
    is_anonymized BOOLEAN DEFAULT TRUE,
    privacy_preserved BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- AI Agents
CREATE INDEX idx_agents_tenant ON ai_agents(tenant_id);
CREATE INDEX idx_agents_type ON ai_agents(agent_type);
CREATE INDEX idx_agents_product ON ai_agents(product);
CREATE INDEX idx_agents_status ON ai_agents(status);
CREATE INDEX idx_agents_public ON ai_agents(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_agents_products_compat ON ai_agents USING GIN(products_compatible);

-- Agent executions
CREATE INDEX idx_executions_tenant ON agent_executions(tenant_id, created_at DESC);
CREATE INDEX idx_executions_agent ON agent_executions(agent_id, created_at DESC);
CREATE INDEX idx_executions_user ON agent_executions(user_id, created_at DESC);
CREATE INDEX idx_executions_status ON agent_executions(status, created_at DESC);
CREATE INDEX idx_executions_correlation ON agent_executions(correlation_id);

-- Roundtables
CREATE INDEX idx_roundtables_tenant ON roundtables(tenant_id);
CREATE INDEX idx_roundtable_sessions_tenant ON roundtable_sessions(tenant_id);
CREATE INDEX idx_roundtable_sessions_roundtable ON roundtable_sessions(roundtable_id);

-- Marketplace
CREATE INDEX idx_listings_agent ON marketplace_listings(agent_id);
CREATE INDEX idx_listings_status ON marketplace_listings(status);
CREATE INDEX idx_listings_category ON marketplace_listings(category);
CREATE INDEX idx_listings_tags ON marketplace_listings USING GIN(tags);
CREATE INDEX idx_installs_tenant ON marketplace_installs(tenant_id);
CREATE INDEX idx_installs_listing ON marketplace_installs(listing_id);

-- Federated learning
CREATE INDEX idx_fed_nodes_cluster ON federated_nodes(cluster_id);
CREATE INDEX idx_fed_nodes_tenant ON federated_nodes(tenant_id);
CREATE INDEX idx_fed_rounds_cluster ON federated_rounds(cluster_id);
CREATE INDEX idx_fed_contributions_round ON federated_contributions(round_id);
CREATE INDEX idx_fed_contributions_node ON federated_contributions(node_id);

-- Intelligence sharing
CREATE INDEX idx_sharing_source_tenant ON intelligence_sharing_agreements(source_tenant_id);
CREATE INDEX idx_sharing_target_tenant ON intelligence_sharing_agreements(target_tenant_id);
CREATE INDEX idx_shared_intel_type ON shared_intelligence(intelligence_type);
CREATE INDEX idx_shared_intel_product ON shared_intelligence(source_product);
