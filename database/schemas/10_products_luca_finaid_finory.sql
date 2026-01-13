-- ============================================================================
-- PRODUCT-SPECIFIC SCHEMAS: LUCA AI, FIN(AI)D HUB, FINORY
-- ============================================================================
-- Luca AI: Multi-Modal Tax Intelligence Assistant
-- Fin(Ai)d Hub: Agent Factory & Marketplace
-- Finory: AI-Powered ERP with Module Builder
-- ============================================================================

-- ============================================================================
-- LUCA AI - Multi-Modal Tax Intelligence Assistant
-- ============================================================================

-- Luca AI chat sessions
CREATE TABLE luca_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('LUCA-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Session type
    chat_mode TEXT NOT NULL,               -- One of 10 modes
    -- Modes: 'tax_planning', 'compliance', 'research', 'preparation', 'advisory',
    --        'audit_support', 'entity_planning', 'international', 'estate', 'general'
    
    -- Subject
    tax_year INTEGER,
    jurisdiction TEXT,                     -- 'us_federal', 'us_state_ca', 'uk', etc.
    entity_type TEXT,                      -- 'individual', 'c_corp', 's_corp', 'partnership', 'trust'
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'active', 'completed', 'archived'
    
    -- Context
    context JSONB DEFAULT '{}',            -- Accumulated context from conversation
    
    -- Metrics
    message_count INTEGER DEFAULT 0,
    agent_invocations INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMPTZ
);

-- Luca AI chat messages
CREATE TABLE luca_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES luca_chat_sessions(id) ON DELETE CASCADE,
    
    -- Message
    role TEXT NOT NULL,                    -- 'user', 'assistant', 'system', 'agent'
    content TEXT NOT NULL,
    
    -- Multi-modal
    content_type TEXT DEFAULT 'text',      -- 'text', 'document', 'image', 'chart', 'form'
    attachments JSONB DEFAULT '[]',
    
    -- Agent involvement
    agents_invoked TEXT[],
    agent_outputs JSONB DEFAULT '{}',
    
    -- Citations
    citations JSONB DEFAULT '[]',          -- [{source, section, quote}]
    
    -- Feedback
    user_rating INTEGER,
    user_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Luca AI specialized agents (36 agents)
CREATE TABLE luca_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_agent_id UUID NOT NULL REFERENCES ai_agents(id),
    
    -- Specialization
    agent_category TEXT NOT NULL,          -- 'research', 'computation', 'compliance', 'advisory', 'forms'
    tax_domains TEXT[],                    -- ['income', 'estate', 'gift', 'excise', 'employment']
    jurisdictions TEXT[],                  -- ['us_federal', 'us_state', 'international']
    
    -- Knowledge
    irc_sections TEXT[],                   -- ['162', '179', '199A', etc.]
    form_expertise TEXT[],                 -- ['1040', '1120', 'K-1', etc.]
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Luca tax research results
CREATE TABLE luca_research_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES luca_chat_sessions(id),
    
    -- Query
    research_query TEXT NOT NULL,
    research_type TEXT,                    -- 'code', 'regulations', 'case_law', 'irs_guidance', 'planning'
    
    -- Results
    findings JSONB NOT NULL,
    citations JSONB DEFAULT '[]',
    
    -- Confidence
    confidence_score DECIMAL(5,4),
    
    -- Caveats
    limitations TEXT[],
    effective_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Luca tax calculations
CREATE TABLE luca_tax_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES luca_chat_sessions(id),
    
    -- Calculation type
    calculation_type TEXT NOT NULL,        -- 'tax_liability', 'deduction', 'credit', 'basis', 'depreciation'
    
    -- Input
    input_data JSONB NOT NULL,
    
    -- VAMN integration
    vamn_session_id UUID REFERENCES vamn_calculation_sessions(id),
    
    -- Output
    result JSONB NOT NULL,
    breakdown JSONB DEFAULT '[]',
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FIN(AI)D HUB - Agent Factory & Marketplace
-- ============================================================================

-- Universal Document Interface configurations
CREATE TABLE finaid_udi_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Configuration
    name TEXT NOT NULL,
    description TEXT,
    
    -- Document types supported
    document_types TEXT[],
    
    -- Input adapters
    input_adapters JSONB NOT NULL,         -- [{source, format, mapping}]
    
    -- Output adapters
    output_adapters JSONB NOT NULL,        -- [{destination, format, mapping}]
    
    -- Transformations
    transformation_rules JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Agent factory builds
CREATE TABLE finaid_agent_builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('BLD-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    
    -- Build specification
    agent_name TEXT NOT NULL,
    agent_description TEXT,
    agent_type agent_type NOT NULL,
    
    -- Configuration
    base_model TEXT,
    system_prompt TEXT,
    tools_config JSONB DEFAULT '[]',
    
    -- Training data
    training_documents UUID[],
    training_examples JSONB DEFAULT '[]',
    
    -- Build status
    status TEXT DEFAULT 'configuring',     -- 'configuring', 'training', 'testing', 'deployed', 'failed'
    
    -- Build results
    training_metrics JSONB,
    test_results JSONB,
    
    -- Resulting agent
    agent_id UUID REFERENCES ai_agents(id),
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Agent factory templates
CREATE TABLE finaid_agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    
    -- Base configuration
    base_config JSONB NOT NULL,
    
    -- Customization points
    customization_schema JSONB,
    
    -- Requirements
    required_integrations TEXT[],
    required_data_types TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Metrics
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ERP Connectors
CREATE TABLE finaid_erp_connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Connector info
    name TEXT NOT NULL,
    erp_system TEXT NOT NULL,              -- 'sap', 'oracle', 'netsuite', 'dynamics', 'quickbooks', etc.
    version TEXT,
    
    -- Connection type
    connection_type TEXT NOT NULL,         -- 'api', 'odbc', 'file_import', 'webhook'
    
    -- Configuration schema
    config_schema JSONB NOT NULL,
    
    -- Mapping templates
    entity_mappings JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_certified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tenant ERP connections
CREATE TABLE finaid_tenant_erp_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    connector_id UUID NOT NULL REFERENCES finaid_erp_connectors(id),
    
    -- Connection name
    name TEXT NOT NULL,
    
    -- Configuration (encrypted)
    config_encrypted TEXT NOT NULL,
    
    -- Status
    status integration_status DEFAULT 'pending_auth',
    
    -- Sync settings
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    
    -- Error handling
    consecutive_failures INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, connector_id, name)
);

-- Federated learning datasets
CREATE TABLE finaid_federated_datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Dataset info
    name TEXT NOT NULL,
    description TEXT,
    dataset_type TEXT NOT NULL,            -- 'document_patterns', 'extraction_rules', 'classifications'
    
    -- Consent
    consent_record_id UUID REFERENCES consent_records(id),
    
    -- Stats
    sample_count BIGINT DEFAULT 0,
    feature_count INTEGER,
    
    -- Privacy
    is_anonymized BOOLEAN DEFAULT TRUE,
    differential_privacy_epsilon DECIMAL(10,4),
    
    -- Contribution
    contributed_to_clusters UUID[],
    
    -- Status
    status TEXT DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FINORY - AI-Powered ERP with Module Builder
-- ============================================================================

-- Finory ERP instances (tenant-specific configuration)
CREATE TABLE finory_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
    
    -- Configuration
    company_name TEXT NOT NULL,
    fiscal_year_start_month INTEGER DEFAULT 1,
    base_currency TEXT DEFAULT 'USD',
    multi_currency_enabled BOOLEAN DEFAULT FALSE,
    
    -- Modules enabled
    modules_enabled TEXT[] DEFAULT ARRAY['gl', 'ap', 'ar'],
    
    -- Chart of Accounts
    coa_template TEXT,
    
    -- Integrations
    bank_connections_enabled BOOLEAN DEFAULT FALSE,
    payroll_integration TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts
CREATE TABLE finory_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES finory_instances(id) ON DELETE CASCADE,
    
    -- Account info
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    
    -- Classification
    account_type TEXT NOT NULL,            -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    account_subtype TEXT,
    
    -- Hierarchy
    parent_account_id UUID REFERENCES finory_accounts(id),
    level INTEGER DEFAULT 1,
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_header BOOLEAN DEFAULT FALSE,
    is_system_account BOOLEAN DEFAULT FALSE,
    
    -- Currency
    currency TEXT,
    
    -- Balances (denormalized for performance)
    current_balance DECIMAL(20,4) DEFAULT 0,
    balance_as_of TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(instance_id, account_number)
);

-- Journal Entries
CREATE TABLE finory_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('JE-'),
    instance_id UUID NOT NULL REFERENCES finory_instances(id),
    
    -- Entry info
    entry_date DATE NOT NULL,
    entry_number TEXT NOT NULL,
    
    -- Type
    entry_type TEXT NOT NULL,              -- 'manual', 'system', 'recurring', 'reversing'
    source_module TEXT,
    source_document_id UUID,
    
    -- Description
    description TEXT,
    memo TEXT,
    
    -- Totals
    total_debit DECIMAL(20,4) NOT NULL,
    total_credit DECIMAL(20,4) NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'posted', 'reversed'
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    
    -- Reversal
    is_reversing BOOLEAN DEFAULT FALSE,
    reversed_by_entry_id UUID REFERENCES finory_journal_entries(id),
    reverses_entry_id UUID REFERENCES finory_journal_entries(id),
    
    -- Approval
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(instance_id, entry_number),
    CHECK(total_debit = total_credit)
);

-- Journal Entry Lines
CREATE TABLE finory_journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES finory_journal_entries(id) ON DELETE CASCADE,
    
    -- Account
    account_id UUID NOT NULL REFERENCES finory_accounts(id),
    
    -- Amounts
    debit DECIMAL(20,4) DEFAULT 0,
    credit DECIMAL(20,4) DEFAULT 0,
    
    -- Description
    description TEXT,
    
    -- Dimensions
    department_id UUID,
    project_id UUID,
    cost_center_id UUID,
    
    -- Multi-currency
    currency TEXT,
    exchange_rate DECIMAL(15,6),
    base_currency_amount DECIMAL(20,4),
    
    line_number INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CHECK((debit = 0 AND credit > 0) OR (debit > 0 AND credit = 0))
);

-- Vendors (Accounts Payable)
CREATE TABLE finory_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('VND-'),
    instance_id UUID NOT NULL REFERENCES finory_instances(id),
    
    -- Vendor info
    name TEXT NOT NULL,
    vendor_code TEXT,
    
    -- Contact
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Address
    address JSONB,
    
    -- Tax
    tax_id TEXT,
    w9_on_file BOOLEAN DEFAULT FALSE,
    requires_1099 BOOLEAN DEFAULT FALSE,
    
    -- Payment
    payment_terms TEXT DEFAULT 'net30',
    default_expense_account_id UUID REFERENCES finory_accounts(id),
    
    -- Currency
    default_currency TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Balance
    current_balance DECIMAL(20,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(instance_id, vendor_code)
);

-- Customers (Accounts Receivable)
CREATE TABLE finory_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('CUS-'),
    instance_id UUID NOT NULL REFERENCES finory_instances(id),
    
    -- Customer info
    name TEXT NOT NULL,
    customer_code TEXT,
    
    -- Contact
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Billing address
    billing_address JSONB,
    
    -- Shipping address
    shipping_address JSONB,
    
    -- Tax
    tax_exempt BOOLEAN DEFAULT FALSE,
    tax_id TEXT,
    
    -- Credit
    credit_limit DECIMAL(20,4),
    payment_terms TEXT DEFAULT 'net30',
    
    -- Revenue account
    default_revenue_account_id UUID REFERENCES finory_accounts(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Balance
    current_balance DECIMAL(20,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(instance_id, customer_code)
);

-- Bills (AP)
CREATE TABLE finory_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('BILL-'),
    instance_id UUID NOT NULL REFERENCES finory_instances(id),
    vendor_id UUID NOT NULL REFERENCES finory_vendors(id),
    
    -- Bill info
    bill_number TEXT NOT NULL,
    vendor_invoice_number TEXT,
    
    -- Dates
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(20,4) NOT NULL,
    tax_amount DECIMAL(20,4) DEFAULT 0,
    total_amount DECIMAL(20,4) NOT NULL,
    amount_paid DECIMAL(20,4) DEFAULT 0,
    balance_due DECIMAL(20,4) NOT NULL,
    
    -- Currency
    currency TEXT,
    exchange_rate DECIMAL(15,6),
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'pending', 'approved', 'paid', 'partial', 'void'
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Payment
    paid_at TIMESTAMPTZ,
    
    -- GL
    journal_entry_id UUID REFERENCES finory_journal_entries(id),
    
    -- Documents
    document_id UUID REFERENCES documents(id),
    
    -- 3-way match
    po_id UUID,
    matching_set_id UUID REFERENCES matching_sets(id),
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(instance_id, bill_number)
);

-- Invoices (AR)
CREATE TABLE finory_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('FINV-'),
    instance_id UUID NOT NULL REFERENCES finory_instances(id),
    customer_id UUID NOT NULL REFERENCES finory_customers(id),
    
    -- Invoice info
    invoice_number TEXT NOT NULL,
    
    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(20,4) NOT NULL,
    tax_amount DECIMAL(20,4) DEFAULT 0,
    discount_amount DECIMAL(20,4) DEFAULT 0,
    total_amount DECIMAL(20,4) NOT NULL,
    amount_paid DECIMAL(20,4) DEFAULT 0,
    balance_due DECIMAL(20,4) NOT NULL,
    
    -- Currency
    currency TEXT,
    exchange_rate DECIMAL(15,6),
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void'
    
    -- Delivery
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    
    -- GL
    journal_entry_id UUID REFERENCES finory_journal_entries(id),
    
    -- Documents
    pdf_url TEXT,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(instance_id, invoice_number)
);

-- Finory Multi-Agent Roundtable (Zero-Fallback Protocol)
CREATE TABLE finory_roundtables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_roundtable_id UUID NOT NULL REFERENCES roundtables(id),
    instance_id UUID NOT NULL REFERENCES finory_instances(id),
    
    -- Context
    context_type TEXT NOT NULL,            -- 'transaction_review', 'reconciliation', 'close', 'audit'
    context_reference_id UUID,
    
    -- Zero-Fallback Protocol
    zfp_enabled BOOLEAN DEFAULT TRUE,
    consensus_threshold DECIMAL(3,2) DEFAULT 0.95,
    
    -- Participants
    participating_agents UUID[],
    
    -- Decision
    decision_type TEXT,                    -- 'approve', 'reject', 'escalate', 'defer'
    decision_confidence DECIMAL(5,4),
    decision_rationale TEXT,
    
    -- Dissent tracking
    dissenting_agents UUID[],
    dissent_reasons JSONB DEFAULT '[]',
    
    -- Escalation
    escalated BOOLEAN DEFAULT FALSE,
    escalated_to UUID REFERENCES users(id),
    escalation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Luca AI
CREATE INDEX idx_luca_sessions_tenant ON luca_chat_sessions(tenant_id);
CREATE INDEX idx_luca_sessions_user ON luca_chat_sessions(user_id);
CREATE INDEX idx_luca_sessions_mode ON luca_chat_sessions(chat_mode);
CREATE INDEX idx_luca_sessions_status ON luca_chat_sessions(status);
CREATE INDEX idx_luca_messages_session ON luca_chat_messages(session_id);
CREATE INDEX idx_luca_research_session ON luca_research_results(session_id);
CREATE INDEX idx_luca_calculations_session ON luca_tax_calculations(session_id);

-- Fin(Ai)d Hub
CREATE INDEX idx_finaid_udi_tenant ON finaid_udi_configs(tenant_id);
CREATE INDEX idx_finaid_builds_tenant ON finaid_agent_builds(tenant_id);
CREATE INDEX idx_finaid_builds_status ON finaid_agent_builds(status);
CREATE INDEX idx_finaid_erp_connections_tenant ON finaid_tenant_erp_connections(tenant_id);
CREATE INDEX idx_finaid_erp_connections_status ON finaid_tenant_erp_connections(status);
CREATE INDEX idx_finaid_datasets_tenant ON finaid_federated_datasets(tenant_id);

-- Finory
CREATE INDEX idx_finory_accounts_instance ON finory_accounts(instance_id);
CREATE INDEX idx_finory_accounts_type ON finory_accounts(account_type);
CREATE INDEX idx_finory_accounts_parent ON finory_accounts(parent_account_id);
CREATE INDEX idx_finory_je_instance ON finory_journal_entries(instance_id);
CREATE INDEX idx_finory_je_date ON finory_journal_entries(entry_date);
CREATE INDEX idx_finory_je_status ON finory_journal_entries(status);
CREATE INDEX idx_finory_jl_entry ON finory_journal_lines(entry_id);
CREATE INDEX idx_finory_jl_account ON finory_journal_lines(account_id);
CREATE INDEX idx_finory_vendors_instance ON finory_vendors(instance_id);
CREATE INDEX idx_finory_customers_instance ON finory_customers(instance_id);
CREATE INDEX idx_finory_bills_instance ON finory_bills(instance_id);
CREATE INDEX idx_finory_bills_vendor ON finory_bills(vendor_id);
CREATE INDEX idx_finory_bills_status ON finory_bills(status);
CREATE INDEX idx_finory_bills_due ON finory_bills(due_date) WHERE status NOT IN ('paid', 'void');
CREATE INDEX idx_finory_invoices_instance ON finory_invoices(instance_id);
CREATE INDEX idx_finory_invoices_customer ON finory_invoices(customer_id);
CREATE INDEX idx_finory_invoices_status ON finory_invoices(status);
CREATE INDEX idx_finory_invoices_due ON finory_invoices(due_date) WHERE status NOT IN ('paid', 'void');
