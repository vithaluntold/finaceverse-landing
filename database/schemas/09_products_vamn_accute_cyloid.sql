-- ============================================================================
-- PRODUCT-SPECIFIC SCHEMAS: VAMN, ACCUTE, CYLOID
-- ============================================================================
-- VAMN: Verifiable Arithmetic Multi-stream Network
-- Accute: AI-Native Practice Management for Accounting Firms
-- Cyloid: Deterministic Financial Document Intelligence
-- ============================================================================

-- ============================================================================
-- VAMN - Verifiable Arithmetic Multi-stream Network
-- ============================================================================
-- Core AI Engine with triple-stream architecture for deterministic calculations

CREATE TABLE vamn_calculation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('VAMN-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- Source
    source_product product_type,           -- Which product initiated
    source_document_id UUID REFERENCES documents(id),
    
    -- Session type
    calculation_type TEXT NOT NULL,        -- 'tax', 'audit', 'reconciliation', 'forecast'
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'active', 'completed', 'failed'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- VAMN calculation streams (triple-stream architecture)
CREATE TABLE vamn_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES vamn_calculation_sessions(id) ON DELETE CASCADE,
    
    -- Stream identification
    stream_type TEXT NOT NULL,             -- 'primary', 'verification', 'audit'
    stream_order INTEGER NOT NULL,
    
    -- Input
    input_data JSONB NOT NULL,
    input_hash TEXT NOT NULL,              -- SHA-256 of input for verification
    
    -- Calculation
    calculation_expression TEXT,
    intermediate_steps JSONB DEFAULT '[]',
    
    -- Output
    output_data JSONB,
    output_hash TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT,
    verifier_stream_id UUID REFERENCES vamn_streams(id),
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    execution_time_ms INTEGER,
    
    UNIQUE(session_id, stream_type)
);

-- VAMN verification results
CREATE TABLE vamn_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES vamn_calculation_sessions(id),
    
    -- Streams compared
    primary_stream_id UUID NOT NULL REFERENCES vamn_streams(id),
    verification_stream_id UUID NOT NULL REFERENCES vamn_streams(id),
    audit_stream_id UUID REFERENCES vamn_streams(id),
    
    -- Results
    is_verified BOOLEAN NOT NULL,
    discrepancies JSONB DEFAULT '[]',
    
    -- Confidence
    confidence_score DECIMAL(5,4),
    
    -- Timestamps
    verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- VAMN calculation templates
CREATE TABLE vamn_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Template identity
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,                -- 'tax', 'depreciation', 'amortization', etc.
    
    -- Formula definition
    formula_expression TEXT NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    
    -- Verification requirements
    requires_triple_stream BOOLEAN DEFAULT TRUE,
    precision_decimals INTEGER DEFAULT 4,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ACCUTE - AI-Native Practice Management for Accounting Firms
-- ============================================================================

-- Accounting firms (tenant extensions)
CREATE TABLE accute_firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
    
    -- Firm details
    firm_name TEXT NOT NULL,
    firm_type TEXT,                        -- 'cpa', 'bookkeeping', 'tax', 'full_service'
    
    -- Licensing
    licenses JSONB DEFAULT '[]',           -- [{state, license_number, expiry}]
    
    -- Team structure
    partner_count INTEGER DEFAULT 0,
    staff_count INTEGER DEFAULT 0,
    
    -- Settings
    fiscal_year_end_month INTEGER DEFAULT 12,
    default_billing_rate_cents INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Clients of accounting firms
CREATE TABLE accute_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('CLT-'),
    
    -- Firm
    firm_id UUID NOT NULL REFERENCES accute_firms(id) ON DELETE CASCADE,
    
    -- Client info
    client_type TEXT NOT NULL,             -- 'individual', 'business', 'nonprofit', 'trust'
    name TEXT NOT NULL,
    
    -- Contact
    email TEXT,
    phone TEXT,
    address JSONB,
    
    -- Business details (for business clients)
    business_type TEXT,
    industry TEXT,
    ein TEXT,                              -- Encrypted
    fiscal_year_end DATE,
    
    -- Individual details
    ssn_last4 TEXT,
    date_of_birth DATE,
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'prospect', 'active', 'inactive', 'former'
    
    -- Billing
    billing_rate_cents INTEGER,
    billing_method TEXT DEFAULT 'hourly',  -- 'hourly', 'fixed', 'retainer', 'value'
    
    -- Assigned team
    primary_partner_id UUID REFERENCES users(id),
    primary_manager_id UUID REFERENCES users(id),
    assigned_staff UUID[],
    
    -- Portal
    portal_enabled BOOLEAN DEFAULT FALSE,
    portal_user_id UUID REFERENCES users(id),
    
    -- Tags
    tags TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Engagements (projects/jobs)
CREATE TABLE accute_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('ENG-'),
    
    -- Context
    firm_id UUID NOT NULL REFERENCES accute_firms(id),
    client_id UUID NOT NULL REFERENCES accute_clients(id),
    
    -- Engagement details
    name TEXT NOT NULL,
    engagement_type TEXT NOT NULL,         -- 'tax_return', 'audit', 'bookkeeping', 'advisory', 'compilation'
    
    -- Period
    fiscal_year INTEGER,
    period_start DATE,
    period_end DATE,
    
    -- Status
    status TEXT DEFAULT 'not_started',     -- 'not_started', 'in_progress', 'review', 'completed', 'billed'
    
    -- Workflow
    current_stage TEXT,
    stages_completed TEXT[],
    
    -- Budgeting
    budgeted_hours DECIMAL(10,2),
    budgeted_amount_cents INTEGER,
    
    -- Actual
    actual_hours DECIMAL(10,2) DEFAULT 0,
    actual_amount_cents INTEGER DEFAULT 0,
    
    -- Assignment
    partner_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    assigned_staff UUID[],
    
    -- Deadlines
    internal_deadline DATE,
    external_deadline DATE,
    extended_deadline DATE,
    
    -- Review
    review_status TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Documents
    document_folder_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Time entries
CREATE TABLE accute_time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    firm_id UUID NOT NULL REFERENCES accute_firms(id),
    engagement_id UUID REFERENCES accute_engagements(id),
    client_id UUID REFERENCES accute_clients(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Time
    date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    
    -- Description
    description TEXT,
    activity_code TEXT,
    
    -- Billing
    is_billable BOOLEAN DEFAULT TRUE,
    billing_rate_cents INTEGER,
    amount_cents INTEGER,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'submitted', 'approved', 'billed'
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Invoice
    invoice_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Accute AI Agents (16+ specialized agents)
CREATE TABLE accute_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_agent_id UUID NOT NULL REFERENCES ai_agents(id),
    
    -- Accute-specific configuration
    agent_category TEXT NOT NULL,          -- 'tax', 'audit', 'bookkeeping', 'client_service', 'workflow'
    
    -- Specializations
    specializations TEXT[],
    tax_forms_supported TEXT[],
    
    -- Roundtable participation
    roundtable_roles TEXT[],               -- 'lead', 'reviewer', 'specialist', 'checker'
    
    -- Metrics
    engagements_processed INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,4),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Accute Roundtable Sessions (multi-agent orchestration)
CREATE TABLE accute_roundtable_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_session_id UUID NOT NULL REFERENCES roundtable_sessions(id),
    
    -- Context
    engagement_id UUID REFERENCES accute_engagements(id),
    client_id UUID REFERENCES accute_clients(id),
    
    -- Roundtable type
    roundtable_type TEXT NOT NULL,         -- 'tax_review', 'audit_planning', 'risk_assessment'
    
    -- Participants
    participating_agents UUID[],
    lead_agent_id UUID REFERENCES accute_agents(id),
    
    -- Decisions
    consensus_reached BOOLEAN,
    final_recommendation TEXT,
    dissenting_opinions JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CYLOID - Deterministic Financial Document Intelligence
-- ============================================================================

-- Cyloid processing jobs
CREATE TABLE cyloid_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('CYL-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Documents
    document_ids UUID[] NOT NULL,
    primary_document_id UUID REFERENCES documents(id),
    
    -- Job type
    job_type TEXT NOT NULL,                -- 'extraction', 'verification', 'matching', 'reconciliation'
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'processing', 'completed', 'failed'
    
    -- Results
    extracted_entities INTEGER DEFAULT 0,
    verified_facts INTEGER DEFAULT 0,
    conflicts_found INTEGER DEFAULT 0,
    
    -- Truth Engine
    truth_score DECIMAL(5,4),
    fact_graph_id UUID,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cyloid entity extractions
CREATE TABLE cyloid_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES cyloid_processing_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id),
    
    -- Entity
    entity_type TEXT NOT NULL,             -- 'vendor', 'customer', 'account', 'line_item', 'total'
    entity_key TEXT NOT NULL,
    
    -- Value
    value JSONB NOT NULL,
    
    -- Location in document
    page_number INTEGER,
    bounding_box JSONB,
    
    -- Confidence
    extraction_confidence DECIMAL(5,4),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,                      -- 'truth_engine', 'cross_reference', 'human'
    verification_confidence DECIMAL(5,4),
    
    -- Fact graph link
    fact_node_id UUID REFERENCES fact_nodes(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cyloid 3-way matching results
CREATE TABLE cyloid_matching_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES cyloid_processing_jobs(id),
    matching_set_id UUID REFERENCES matching_sets(id),
    
    -- Documents matched
    po_document_id UUID REFERENCES documents(id),
    receipt_document_id UUID REFERENCES documents(id),
    invoice_document_id UUID REFERENCES documents(id),
    
    -- Match type
    match_type TEXT NOT NULL,              -- '2way', '3way'
    
    -- Results
    overall_match BOOLEAN,
    match_score DECIMAL(5,4),
    
    -- Field-level matching
    field_results JSONB NOT NULL,          -- {field: {matched, po_value, invoice_value, variance}}
    
    -- Discrepancies
    discrepancies JSONB DEFAULT '[]',
    
    -- Resolution
    resolution_status TEXT DEFAULT 'pending',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cyloid verification audit trail
CREATE TABLE cyloid_verification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES cyloid_processing_jobs(id),
    entity_id UUID REFERENCES cyloid_entities(id),
    
    -- Verification step
    step_type TEXT NOT NULL,               -- 'extraction', 'cross_reference', 'truth_engine', 'human_review'
    step_order INTEGER,
    
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    
    -- Result
    passed BOOLEAN NOT NULL,
    confidence DECIMAL(5,4),
    notes TEXT,
    
    -- Actor
    performed_by TEXT,                     -- 'system', 'agent_id', 'user_id'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- VAMN
CREATE INDEX idx_vamn_sessions_tenant ON vamn_calculation_sessions(tenant_id);
CREATE INDEX idx_vamn_sessions_product ON vamn_calculation_sessions(source_product);
CREATE INDEX idx_vamn_streams_session ON vamn_streams(session_id);
CREATE INDEX idx_vamn_verifications_session ON vamn_verifications(session_id);

-- Accute
CREATE INDEX idx_accute_firms_tenant ON accute_firms(tenant_id);
CREATE INDEX idx_accute_clients_firm ON accute_clients(firm_id);
CREATE INDEX idx_accute_clients_status ON accute_clients(status);
CREATE INDEX idx_accute_clients_tags ON accute_clients USING GIN(tags);
CREATE INDEX idx_accute_engagements_firm ON accute_engagements(firm_id);
CREATE INDEX idx_accute_engagements_client ON accute_engagements(client_id);
CREATE INDEX idx_accute_engagements_status ON accute_engagements(status);
CREATE INDEX idx_accute_engagements_deadline ON accute_engagements(external_deadline);
CREATE INDEX idx_accute_time_entries_engagement ON accute_time_entries(engagement_id);
CREATE INDEX idx_accute_time_entries_user ON accute_time_entries(user_id, date);
CREATE INDEX idx_accute_time_entries_status ON accute_time_entries(status);

-- Cyloid
CREATE INDEX idx_cyloid_jobs_tenant ON cyloid_processing_jobs(tenant_id);
CREATE INDEX idx_cyloid_jobs_status ON cyloid_processing_jobs(status);
CREATE INDEX idx_cyloid_jobs_documents ON cyloid_processing_jobs USING GIN(document_ids);
CREATE INDEX idx_cyloid_entities_job ON cyloid_entities(job_id);
CREATE INDEX idx_cyloid_entities_document ON cyloid_entities(document_id);
CREATE INDEX idx_cyloid_entities_type ON cyloid_entities(entity_type);
CREATE INDEX idx_cyloid_matching_job ON cyloid_matching_results(job_id);
