-- ============================================================================
-- COMMAND CENTER: FINANCIAL OPERATIONS & BILLING
-- ============================================================================
-- Module 1: Financial Operations Center
-- - Subscriptions and billing
-- - Payment processing
-- - Dunning and collections
-- - Revenue recognition
-- ============================================================================

-- ============================================================================
-- PRICING & PLANS
-- ============================================================================
CREATE TABLE pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Plan identity
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Scope
    product product_type,                  -- NULL = platform plan
    tier subscription_tier NOT NULL,
    
    -- Pricing
    currency TEXT DEFAULT 'USD',
    
    -- Monthly pricing
    monthly_price_cents INTEGER,
    monthly_billing_cycle INTEGER DEFAULT 1,
    
    -- Annual pricing
    annual_price_cents INTEGER,
    annual_discount_percent DECIMAL(5,2),
    
    -- Usage-based pricing
    is_usage_based BOOLEAN DEFAULT FALSE,
    usage_metrics JSONB,                   -- [{metric, unit_price, included_units}]
    
    -- Features included
    features JSONB NOT NULL DEFAULT '[]',  -- [{feature_code, limit, unlimited}]
    
    -- Limits
    user_limit INTEGER,
    storage_limit_gb INTEGER,
    api_calls_monthly BIGINT,
    
    -- Trial
    trial_days INTEGER DEFAULT 14,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    badge TEXT,                            -- 'popular', 'best_value', 'enterprise'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Plan add-ons
CREATE TABLE pricing_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Scope
    compatible_plans UUID[],
    product product_type,
    
    -- Pricing
    price_cents INTEGER NOT NULL,
    billing_frequency TEXT DEFAULT 'monthly',
    
    -- What it provides
    features JSONB NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('SUB-'),
    
    -- Owner
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Plan
    plan_id UUID NOT NULL REFERENCES pricing_plans(id),
    product product_type,
    
    -- Status
    status billing_status NOT NULL DEFAULT 'trial',
    
    -- Billing
    billing_email TEXT,
    billing_name TEXT,
    billing_address JSONB,
    
    -- Cycle
    billing_cycle_anchor TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancellation_feedback TEXT,
    
    -- Pricing
    currency TEXT DEFAULT 'USD',
    quantity INTEGER DEFAULT 1,            -- Number of seats/units
    unit_amount_cents INTEGER,
    discount_percent DECIMAL(5,2),
    discount_amount_cents INTEGER,
    
    -- Payment
    default_payment_method_id UUID,
    
    -- Usage (for usage-based billing)
    current_usage JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ
);

-- Subscription items (for multi-product subscriptions)
CREATE TABLE subscription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Item
    plan_id UUID REFERENCES pricing_plans(id),
    addon_id UUID REFERENCES pricing_addons(id),
    product product_type,
    
    -- Quantity and pricing
    quantity INTEGER DEFAULT 1,
    unit_amount_cents INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (plan_id IS NOT NULL OR addon_id IS NOT NULL)
);

-- Subscription history (for tracking changes)
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Change details
    change_type TEXT NOT NULL,             -- 'created', 'upgraded', 'downgraded', 'canceled', 'reactivated'
    old_plan_id UUID REFERENCES pricing_plans(id),
    new_plan_id UUID REFERENCES pricing_plans(id),
    
    -- Snapshot
    snapshot JSONB NOT NULL,
    
    -- Context
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Type
    method_type TEXT NOT NULL,             -- 'card', 'bank_account', 'paypal', 'invoice'
    
    -- Card details (encrypted/tokenized)
    card_brand TEXT,                       -- 'visa', 'mastercard', etc.
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Bank account details
    bank_name TEXT,
    bank_last4 TEXT,
    bank_routing_last4 TEXT,
    
    -- External provider
    provider TEXT,                         -- 'stripe', 'braintree', 'adyen'
    provider_payment_method_id TEXT,
    
    -- Billing address
    billing_address JSONB,
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INVOICES
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('INV-'),
    
    -- Parties
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Invoice details
    invoice_number TEXT UNIQUE NOT NULL,
    
    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Amounts (in cents)
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    amount_due_cents INTEGER NOT NULL,
    amount_paid_cents INTEGER DEFAULT 0,
    
    -- Currency
    currency TEXT DEFAULT 'USD',
    
    -- Tax
    tax_rate DECIMAL(5,2),
    tax_id TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'open', 'paid', 'void', 'uncollectible'
    
    -- Payment
    payment_intent_id TEXT,
    paid_at TIMESTAMPTZ,
    payment_method_id UUID REFERENCES payment_methods(id),
    
    -- Dunning
    attempt_count INTEGER DEFAULT 0,
    next_payment_attempt TIMESTAMPTZ,
    
    -- Due date
    due_date TIMESTAMPTZ,
    
    -- PDF
    pdf_url TEXT,
    
    -- Metadata
    memo TEXT,
    footer TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMPTZ
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_amount_cents INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    
    -- Reference
    subscription_item_id UUID REFERENCES subscription_items(id),
    product product_type,
    
    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Proration
    is_proration BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('PAY-'),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id UUID REFERENCES invoices(id),
    
    -- Amount
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Status
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- Payment method
    payment_method_id UUID REFERENCES payment_methods(id),
    payment_method_type TEXT,
    
    -- External provider
    provider TEXT,
    provider_payment_id TEXT,
    provider_status TEXT,
    
    -- Processing
    processed_at TIMESTAMPTZ,
    
    -- Failure
    failure_code TEXT,
    failure_message TEXT,
    
    -- Refund
    refunded_amount_cents INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREDITS & BALANCE
-- ============================================================================
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Credit details
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Type
    credit_type TEXT NOT NULL,             -- 'promotional', 'refund', 'adjustment', 'referral'
    
    -- Usage
    used_amount_cents INTEGER DEFAULT 0,
    remaining_amount_cents INTEGER NOT NULL,
    
    -- Source
    source_type TEXT,                      -- 'manual', 'promotion', 'refund', 'referral'
    source_id UUID,
    
    -- Validity
    expires_at TIMESTAMPTZ,
    
    -- Description
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Credit transactions
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_id UUID NOT NULL REFERENCES credits(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Transaction
    amount_cents INTEGER NOT NULL,         -- Positive for addition, negative for usage
    balance_after_cents INTEGER NOT NULL,
    
    -- Reference
    invoice_id UUID REFERENCES invoices(id),
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DUNNING (Collection Management)
-- ============================================================================
CREATE TABLE dunning_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Configuration
    max_attempts INTEGER DEFAULT 4,
    retry_schedule INTEGER[] DEFAULT ARRAY[1, 3, 5, 7],  -- Days between attempts
    
    -- Actions
    steps JSONB NOT NULL,                  -- [{day, action, template_id}]
    
    -- Final action
    final_action TEXT DEFAULT 'cancel',    -- 'cancel', 'suspend', 'downgrade'
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dunning_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    campaign_id UUID REFERENCES dunning_campaigns(id),
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'active', 'recovered', 'failed', 'cancelled'
    
    -- Progress
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    
    -- Communications sent
    communications_sent JSONB DEFAULT '[]',
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolution_type TEXT,                  -- 'paid', 'card_updated', 'manual', 'failed'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USAGE METERING
-- ============================================================================
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    product product_type,
    
    -- Usage
    metric_name TEXT NOT NULL,             -- 'api_calls', 'storage_gb', 'documents_processed'
    quantity DECIMAL(20,4) NOT NULL,
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Pricing
    unit_price_cents INTEGER,
    total_cents INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for aggregation
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Usage aggregates (pre-computed for billing)
CREATE TABLE usage_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Aggregated metrics
    metrics JSONB NOT NULL,                -- {metric_name: {quantity, cost_cents}}
    
    -- Totals
    total_quantity DECIMAL(20,4),
    total_cost_cents INTEGER,
    
    -- Status
    is_billed BOOLEAN DEFAULT FALSE,
    billed_at TIMESTAMPTZ,
    invoice_id UUID REFERENCES invoices(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, subscription_id, period_start, period_end)
);

-- ============================================================================
-- REVENUE RECOGNITION
-- ============================================================================
CREATE TABLE revenue_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    invoice_line_item_id UUID REFERENCES invoice_line_items(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Amount
    total_amount_cents INTEGER NOT NULL,
    recognized_amount_cents INTEGER DEFAULT 0,
    
    -- Period
    recognition_start TIMESTAMPTZ NOT NULL,
    recognition_end TIMESTAMPTZ NOT NULL,
    
    -- Method
    recognition_method TEXT DEFAULT 'straight_line',
    
    -- Status
    status TEXT DEFAULT 'active',          -- 'active', 'completed', 'cancelled'
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE revenue_recognitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES revenue_schedules(id),
    
    -- Recognition
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount_cents INTEGER NOT NULL,
    
    -- Status
    is_recognized BOOLEAN DEFAULT FALSE,
    recognized_at TIMESTAMPTZ,
    
    -- Accounting
    journal_entry_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Subscriptions
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE status = 'trial';

-- Invoices
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status = 'open';
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Payments
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider, provider_payment_id);

-- Usage
CREATE INDEX idx_usage_tenant_period ON usage_records(tenant_id, period_start, period_end);
CREATE INDEX idx_usage_metric ON usage_records(metric_name, timestamp);
CREATE INDEX idx_usage_aggregates_tenant ON usage_aggregates(tenant_id, period_start);

-- Dunning
CREATE INDEX idx_dunning_subscription ON dunning_records(subscription_id);
CREATE INDEX idx_dunning_status ON dunning_records(status) WHERE status = 'active';
CREATE INDEX idx_dunning_next_attempt ON dunning_records(next_attempt_at) WHERE status = 'active';

-- Revenue
CREATE INDEX idx_revenue_schedules_invoice ON revenue_schedules(invoice_id);
CREATE INDEX idx_revenue_recognitions_period ON revenue_recognitions(period_start, period_end);
