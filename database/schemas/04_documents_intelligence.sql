-- ============================================================================
-- DOCUMENTS & INTELLIGENCE SCHEMA
-- ============================================================================
-- Universal document infrastructure for all 8 products:
-- - Document storage and versioning
-- - AI-powered extraction and verification
-- - Fact graphs and truth engine (Cyloid)
-- - 3-way matching and reconciliation
-- ============================================================================

-- ============================================================================
-- DOCUMENT STORAGE
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('DOC-'),
    
    -- Ownership
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    
    -- Product context
    product product_type NOT NULL,
    
    -- Document info
    name TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    file_size_bytes BIGINT,
    page_count INTEGER,
    
    -- Storage
    storage_provider TEXT DEFAULT 's3',    -- 's3', 'azure_blob', 'gcs', 'local'
    storage_bucket TEXT,
    storage_key TEXT,
    storage_region TEXT,
    
    -- Security
    encryption_key_id UUID,
    checksum_sha256 TEXT,
    is_encrypted BOOLEAN DEFAULT TRUE,
    security_classification security_classification DEFAULT 'confidential',
    
    -- Document type
    document_type TEXT,                    -- 'invoice', 'receipt', 'contract', 'bank_statement', etc.
    document_subtype TEXT,
    
    -- Processing status
    status document_status DEFAULT 'uploaded',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    
    -- AI extraction
    extraction_confidence DECIMAL(5,4),
    extraction_method TEXT,                -- 'ocr', 'native_pdf', 'structured'
    
    -- Verification (Cyloid Truth Engine)
    verification_status TEXT,              -- 'pending', 'verified', 'disputed', 'failed'
    verification_score DECIMAL(5,4),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    
    -- Metadata
    source_channel TEXT,                   -- 'upload', 'email', 'api', 'scanner'
    language TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- Retention
    retention_until TIMESTAMPTZ
);

-- Document versions
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    version_number INTEGER NOT NULL,
    
    -- Storage
    storage_key TEXT,
    file_size_bytes BIGINT,
    checksum_sha256 TEXT,
    
    -- Change tracking
    change_summary TEXT,
    changed_by UUID REFERENCES users(id),
    
    -- Status
    is_current BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, version_number)
);

-- Document pages (for multi-page documents)
CREATE TABLE document_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    page_number INTEGER NOT NULL,
    
    -- Storage
    image_storage_key TEXT,
    thumbnail_storage_key TEXT,
    
    -- OCR
    raw_text TEXT,
    ocr_confidence DECIMAL(5,4),
    
    -- Layout
    width_px INTEGER,
    height_px INTEGER,
    dpi INTEGER,
    orientation INTEGER,                   -- 0, 90, 180, 270
    
    -- Extracted elements
    extracted_blocks JSONB DEFAULT '[]',   -- [{type, bbox, text, confidence}]
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, page_number)
);

-- ============================================================================
-- EXTRACTED DATA
-- ============================================================================
CREATE TABLE extracted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Extraction context
    extraction_run_id UUID,
    agent_id UUID REFERENCES ai_agents(id),
    extraction_model TEXT,
    extraction_version TEXT,
    
    -- Extracted fields
    extracted_fields JSONB NOT NULL,       -- {field_name: {value, confidence, bbox, page}}
    
    -- Structured output
    structured_output JSONB,               -- Normalized/typed output
    
    -- Quality metrics
    overall_confidence DECIMAL(5,4),
    fields_extracted INTEGER,
    fields_verified INTEGER,
    
    -- Status
    status TEXT DEFAULT 'extracted',       -- 'extracted', 'reviewed', 'approved', 'rejected'
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_changes JSONB,                  -- Fields that were manually corrected
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Extraction templates (document schemas)
CREATE TABLE extraction_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Template identity
    name TEXT NOT NULL,
    description TEXT,
    document_type TEXT NOT NULL,
    
    -- Schema
    field_definitions JSONB NOT NULL,      -- [{name, type, required, validation, extraction_hints}]
    
    -- AI configuration
    extraction_prompts JSONB,
    post_processing_rules JSONB,
    
    -- Training data
    sample_document_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, name)
);

-- ============================================================================
-- FACT GRAPH (Cyloid Truth Engine)
-- ============================================================================
CREATE TABLE fact_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Fact identity
    fact_type TEXT NOT NULL,               -- 'entity', 'amount', 'date', 'reference', 'relationship'
    fact_key TEXT NOT NULL,                -- Unique identifier within type
    
    -- Value
    value_text TEXT,
    value_numeric DECIMAL(20,4),
    value_date DATE,
    value_json JSONB,
    
    -- Confidence and source
    confidence_score DECIMAL(5,4),
    source_documents UUID[],
    source_count INTEGER DEFAULT 1,
    
    -- Verification
    verification_status TEXT DEFAULT 'unverified',
    verification_method TEXT,              -- 'cross_reference', 'external_api', 'human_review'
    verified_at TIMESTAMPTZ,
    
    -- Conflict tracking
    has_conflicts BOOLEAN DEFAULT FALSE,
    conflict_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, fact_type, fact_key)
);

-- Fact relationships (edges in the graph)
CREATE TABLE fact_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Relationship
    source_node_id UUID NOT NULL REFERENCES fact_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES fact_nodes(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,       -- 'belongs_to', 'references', 'matches', 'conflicts_with'
    
    -- Metadata
    confidence_score DECIMAL(5,4),
    evidence_documents UUID[],
    
    -- Properties
    properties JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(source_node_id, target_node_id, relationship_type)
);

-- Fact conflicts
CREATE TABLE fact_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Conflicting nodes
    node_id UUID NOT NULL REFERENCES fact_nodes(id) ON DELETE CASCADE,
    conflicting_node_id UUID REFERENCES fact_nodes(id),
    
    -- Conflict details
    conflict_type TEXT NOT NULL,           -- 'value_mismatch', 'duplicate', 'inconsistency'
    description TEXT,
    
    -- Values in conflict
    original_value JSONB,
    conflicting_value JSONB,
    
    -- Source documents
    original_document_id UUID REFERENCES documents(id),
    conflicting_document_id UUID REFERENCES documents(id),
    
    -- Resolution
    resolution_status TEXT DEFAULT 'open', -- 'open', 'resolved', 'ignored'
    resolution_method TEXT,
    resolved_value JSONB,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3-WAY MATCHING
-- ============================================================================
CREATE TABLE matching_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Rule definition
    name TEXT NOT NULL,
    description TEXT,
    matching_type TEXT NOT NULL,           -- '2way_po_invoice', '3way_po_receipt_invoice', 'bank_recon'
    
    -- Document types involved
    document_types TEXT[] NOT NULL,
    
    -- Matching criteria
    match_fields JSONB NOT NULL,           -- [{field, tolerance, weight}]
    threshold_score DECIMAL(5,4) DEFAULT 0.95,
    
    -- Tolerances
    amount_tolerance_percent DECIMAL(5,2) DEFAULT 0,
    amount_tolerance_absolute DECIMAL(10,2) DEFAULT 0,
    date_tolerance_days INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE matching_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('MS-'),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Configuration
    matching_rule_id UUID REFERENCES matching_rules(id),
    matching_type TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending',         -- 'pending', 'matched', 'partial', 'exception'
    match_score DECIMAL(5,4),
    
    -- Documents in set
    document_ids UUID[],
    
    -- Match details
    match_results JSONB,                   -- Per-field matching details
    exceptions JSONB DEFAULT '[]',         -- List of discrepancies
    
    -- Review
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_decision TEXT,
    review_notes TEXT,
    
    -- Linked records
    linked_transaction_id UUID,
    linked_payment_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DOCUMENT RELATIONSHIPS
-- ============================================================================
CREATE TABLE document_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Related documents
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Relationship
    relationship_type TEXT NOT NULL,       -- 'amendment', 'attachment', 'reference', 'supersedes'
    
    -- Metadata
    description TEXT,
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(source_document_id, target_document_id, relationship_type)
);

-- ============================================================================
-- DOCUMENT WORKFLOWS
-- ============================================================================
CREATE TABLE document_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Workflow definition
    name TEXT NOT NULL,
    description TEXT,
    document_types TEXT[],
    
    -- Steps
    workflow_steps JSONB NOT NULL,         -- [{step_id, name, type, config, transitions}]
    
    -- Settings
    auto_start BOOLEAN DEFAULT TRUE,
    parallel_execution BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES document_workflows(id),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Current state
    current_step TEXT,
    status workflow_status DEFAULT 'active',
    
    -- Progress
    completed_steps TEXT[],
    step_history JSONB DEFAULT '[]',       -- [{step, started_at, completed_at, outcome}]
    
    -- Context
    context_data JSONB DEFAULT '{}',
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    
    -- Error handling
    error_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- ============================================================================
-- DOCUMENT ANNOTATIONS
-- ============================================================================
CREATE TABLE document_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Location
    page_number INTEGER,
    bbox JSONB,                            -- {x, y, width, height}
    
    -- Annotation
    annotation_type TEXT NOT NULL,         -- 'comment', 'highlight', 'stamp', 'signature', 'redaction'
    content JSONB,
    
    -- Author
    created_by UUID REFERENCES users(id),
    
    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DOCUMENT SEARCH (Full-text + Vector)
-- ============================================================================
CREATE TABLE document_search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Full-text search
    search_vector TSVECTOR,
    
    -- Key metadata for filtering
    tenant_id UUID NOT NULL,
    document_type TEXT,
    document_date DATE,
    
    -- Extracted entities for search
    extracted_amounts DECIMAL(20,4)[],
    extracted_dates DATE[],
    extracted_entities TEXT[],
    extracted_references TEXT[],
    
    -- Vector embeddings (for semantic search)
    content_embedding VECTOR(1536),        -- Requires pgvector extension
    
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Documents
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_product ON documents(product);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_documents_verification ON documents(verification_status);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);

-- Document pages
CREATE INDEX idx_pages_document ON document_pages(document_id);

-- Extracted data
CREATE INDEX idx_extracted_document ON extracted_data(document_id);
CREATE INDEX idx_extracted_status ON extracted_data(status);

-- Fact graph
CREATE INDEX idx_fact_nodes_tenant ON fact_nodes(tenant_id);
CREATE INDEX idx_fact_nodes_type ON fact_nodes(fact_type);
CREATE INDEX idx_fact_nodes_key ON fact_nodes(tenant_id, fact_type, fact_key);
CREATE INDEX idx_fact_edges_source ON fact_edges(source_node_id);
CREATE INDEX idx_fact_edges_target ON fact_edges(target_node_id);
CREATE INDEX idx_fact_conflicts_node ON fact_conflicts(node_id);
CREATE INDEX idx_fact_conflicts_status ON fact_conflicts(resolution_status);

-- 3-way matching
CREATE INDEX idx_matching_sets_tenant ON matching_sets(tenant_id);
CREATE INDEX idx_matching_sets_status ON matching_sets(status);
CREATE INDEX idx_matching_sets_documents ON matching_sets USING GIN(document_ids);

-- Search
CREATE INDEX idx_search_tenant ON document_search_index(tenant_id);
CREATE INDEX idx_search_vector ON document_search_index USING GIN(search_vector);
CREATE INDEX idx_search_type_date ON document_search_index(document_type, document_date);
-- Vector index (requires pgvector)
-- CREATE INDEX idx_search_embedding ON document_search_index USING ivfflat(content_embedding vector_cosine_ops);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_documents_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_extracted_data_timestamp
    BEFORE UPDATE ON extracted_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.document_type, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
